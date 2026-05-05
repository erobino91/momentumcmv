"use client";

import { useState, useEffect, useRef } from "react";
import { useConfiguracaoStore, DEFAULT_CATEGORIAS_INSUMO, DEFAULT_CATEGORIAS_PRODUTO } from "@/store/configuracoes";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useProdutoStore } from "@/store/produtos";
import { createBackup, downloadBackup, validateBackup } from "@/lib/backup";
import { restaurarBackup } from "@/lib/actions/backup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Upload, AlertTriangle, Loader2, Plus, X, RotateCcw } from "lucide-react";

const CMV_META_MIN = 1;
const CMV_META_MAX = 100;

// ── Gerenciador de categorias ─────────────────────────────────────────────────
function GerenciadorCategorias({
  titulo,
  descricao,
  categorias,
  defaults,
  onChange,
}: {
  titulo: string;
  descricao: string;
  categorias: string[];
  defaults: string[];
  onChange: (novas: string[]) => void;
}) {
  const [nova, setNova] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function adicionar() {
    const trimmed = nova.trim();
    if (!trimmed) return;
    if (categorias.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setNova("");
      return;
    }
    onChange([...categorias, trimmed]);
    setNova("");
    inputRef.current?.focus();
  }

  function remover(cat: string) {
    onChange(categorias.filter((c) => c !== cat));
  }

  function restaurarPadrao() {
    onChange(defaults);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {categorias.length === 0 ? (
          <span className="text-xs text-muted-foreground italic py-1">Nenhuma categoria. Adicione abaixo ou restaure o padrão.</span>
        ) : (
          categorias.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 bg-muted text-foreground text-xs font-medium px-2.5 py-1 rounded-full border"
            >
              {cat}
              <button
                type="button"
                onClick={() => remover(cat)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                aria-label={`Remover ${cat}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Adicionar */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Nova categoria…"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" onClick={adicionar} disabled={!nova.trim()} className="gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={restaurarPadrao}
          className="gap-1 shrink-0 text-muted-foreground"
          title="Restaurar categorias padrão"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Padrão</span>
        </Button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const {
    nomeEstabelecimento,
    metaCmv,
    categoriasInsumo,
    categoriasProduto,
    set,
    hydrate: hydrateConfig,
  } = useConfiguracaoStore();
  const { items: mps, hydrate: hydrateMps } = useMateriaPrimaStore();
  const { items: receitas, hydrate: hydrateReceitas } = useReceitaStore();
  const { items: produtos, hydrate: hydrateProdutos } = useProdutoStore();

  const [nome, setNome] = useState(nomeEstabelecimento);
  const [meta, setMeta] = useState(metaCmv.toString());
  const [localCategoriasInsumo, setLocalCategoriasInsumo] = useState<string[]>(categoriasInsumo);
  const [localCategoriasProduto, setLocalCategoriasProduto] = useState<string[]>(categoriasProduto);
  const [saved, setSaved] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreOk, setRestoreOk] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(nomeEstabelecimento);
    setMeta(metaCmv.toString());
    setLocalCategoriasInsumo(categoriasInsumo);
    setLocalCategoriasProduto(categoriasProduto);
  }, [nomeEstabelecimento, metaCmv, categoriasInsumo, categoriasProduto]);

  function handleExport() {
    const backup = createBackup(mps, receitas, produtos, { nomeEstabelecimento, metaCmv, categoriasInsumo, categoriasProduto });
    downloadBackup(backup);
  }

  function handleImportClick() {
    setRestoreError(null);
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (!validateBackup(raw)) {
          setRestoreError("Arquivo inválido ou versão incompatível.");
          return;
        }

        setRestoring(true);
        setRestoreError(null);

        await restaurarBackup(raw);

        hydrateMps(raw.data.materiasPrimas);
        hydrateReceitas(raw.data.receitas);
        hydrateProdutos(raw.data.produtos);
        hydrateConfig({
          nomeEstabelecimento: raw.data.configuracoes.nomeEstabelecimento,
          metaCmv: raw.data.configuracoes.metaCmv,
          categoriasInsumo: raw.data.configuracoes.categoriasInsumo ?? [],
          categoriasProduto: raw.data.configuracoes.categoriasProduto ?? [],
        });

        setRestoreOk(true);
        setTimeout(() => setRestoreOk(false), 3000);
      } catch {
        setRestoreError("Erro ao restaurar. Verifique o arquivo e tente novamente.");
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleSave() {
    const metaNum = parseFloat(meta);
    if (!metaNum || metaNum < CMV_META_MIN || metaNum > CMV_META_MAX) return;
    set({
      nomeEstabelecimento: nome.trim(),
      metaCmv: metaNum,
      categoriasInsumo: localCategoriasInsumo,
      categoriasProduto: localCategoriasProduto,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const metaNum = parseFloat(meta) || 0;
  const metaInvalida = metaNum < CMV_META_MIN || metaNum > CMV_META_MAX;

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Parâmetros gerais do sistema</p>
      </div>

      <div className="space-y-6">
        {/* Estabelecimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estabelecimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do estabelecimento</Label>
              <Input
                id="nome"
                placeholder="Ex: Pizzaria do João"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Aparece no cabeçalho das fichas técnicas impressas.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Meta CMV */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas de CMV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta">Meta de CMV (%)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="meta"
                  type="number"
                  min={CMV_META_MIN}
                  max={CMV_META_MAX}
                  step="0.5"
                  className="w-32"
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                />
                <div className="flex gap-2">
                  {[28, 30, 32, 35, 38].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMeta(v.toString())}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                        parseFloat(meta) === v
                          ? "bg-primary text-white border-primary"
                          : "hover:border-primary hover:text-primary"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              {metaInvalida && meta !== "" && (
                <p className="text-xs text-destructive">Meta deve ser entre 1% e 100%</p>
              )}
              <p className="text-xs text-muted-foreground">
                Produtos com CMV acima desta meta são exibidos em alerta vermelho. A faixa âmbar vai até{" "}
                <strong>{(metaNum * 1.15).toFixed(1)}%</strong> (+15%).
              </p>
            </div>

            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faixas de classificação</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm bg-green-500 shrink-0" />
                <span>Dentro da meta: até <strong>{metaNum.toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm bg-amber-400 shrink-0" />
                <span>Atenção: <strong>{metaNum.toFixed(1)}%</strong> — <strong>{(metaNum * 1.15).toFixed(1)}%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                <span>Acima da meta: acima de <strong>{(metaNum * 1.15).toFixed(1)}%</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias</CardTitle>
            <CardDescription>
              Personalize as categorias disponíveis para matérias-primas e produtos. Pode deixar vazio se preferir não categorizar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GerenciadorCategorias
              titulo="Matérias-primas"
              descricao="Usadas no cadastro de ingredientes e insumos."
              categorias={localCategoriasInsumo}
              defaults={DEFAULT_CATEGORIAS_INSUMO}
              onChange={setLocalCategoriasInsumo}
            />
            <div className="border-t" />
            <GerenciadorCategorias
              titulo="Produtos"
              descricao="Usadas no cadastro de produtos do cardápio."
              categorias={localCategoriasProduto}
              defaults={DEFAULT_CATEGORIAS_PRODUTO}
              onChange={setLocalCategoriasProduto}
            />
          </CardContent>
        </Card>

        {/* Salvar */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={metaInvalida}>
            Salvar configurações
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Salvo com sucesso
            </span>
          )}
        </div>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup & Restauração</CardTitle>
            <CardDescription>
              Exporte todos os dados para um arquivo JSON ou restaure a partir de um backup anterior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Exportar backup
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleImportClick} disabled={restoring}>
                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {restoring ? "Restaurando…" : "Restaurar backup"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {restoreError && (
              <div className="flex items-start gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {restoreError}
              </div>
            )}
            {restoreOk && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Dados restaurados com sucesso!
              </div>
            )}

            <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados atuais</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>{mps.length}</strong> matérias-primas</span>
                <span><strong>{receitas.length}</strong> receitas</span>
                <span><strong>{produtos.length}</strong> produtos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

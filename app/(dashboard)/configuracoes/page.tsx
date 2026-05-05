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

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaults)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          title="Restaurar padrão"
        >
          <RotateCcw className="w-3 h-3" />
          Padrão
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 rounded-md border bg-muted/20">
        {categorias.length === 0 ? (
          <span className="text-xs text-muted-foreground italic self-center px-1">Vazio — sem categorias</span>
        ) : (
          categorias.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 bg-background text-foreground text-xs font-medium px-2.5 py-1 rounded-full border shadow-sm"
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
      </div>
    </div>
  );
}

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
        if (!validateBackup(raw)) { setRestoreError("Arquivo inválido ou versão incompatível."); return; }
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
    set({ nomeEstabelecimento: nome.trim(), metaCmv: metaNum, categoriasInsumo: localCategoriasInsumo, categoriasProduto: localCategoriasProduto });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const metaNum = parseFloat(meta) || 0;
  const metaInvalida = metaNum < CMV_META_MIN || metaNum > CMV_META_MAX;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Parâmetros gerais do sistema</p>
      </div>

      {/* Grid principal: esquerda config, direita categorias */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* Coluna esquerda — 2/5 */}
        <div className="xl:col-span-2 space-y-6">

          {/* Estabelecimento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estabelecimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Pizzaria do João"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Aparece no cabeçalho das fichas técnicas.</p>
              </div>
            </CardContent>
          </Card>

          {/* Meta CMV */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meta de CMV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta">Percentual (%)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="meta"
                    type="number"
                    min={CMV_META_MIN}
                    max={CMV_META_MAX}
                    step="0.5"
                    className="w-24"
                    value={meta}
                    onChange={(e) => setMeta(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    {[28, 30, 32, 35, 38].map((v) => (
                      <button
                        key={v}
                        onClick={() => setMeta(v.toString())}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
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
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faixas</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                    <span>Até <strong>{metaNum.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span><strong>{metaNum.toFixed(1)}%</strong> — <strong>{(metaNum * 1.15).toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span>Acima de <strong>{(metaNum * 1.15).toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salvar */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={metaInvalida} className="w-full sm:w-auto">
              Salvar configurações
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Salvo
              </span>
            )}
          </div>

          {/* Backup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Backup & Restauração</CardTitle>
              <CardDescription>Exporte ou restaure todos os dados do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleImportClick} disabled={restoring}>
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {restoring ? "Restaurando…" : "Restaurar"}
                </Button>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
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

              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados atuais</p>
                <div className="flex flex-wrap gap-3 text-sm mt-1">
                  <span><strong>{mps.length}</strong> MP</span>
                  <span><strong>{receitas.length}</strong> receitas</span>
                  <span><strong>{produtos.length}</strong> produtos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita — 3/5 */}
        <div className="xl:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Categorias</CardTitle>
              <CardDescription>
                Personalize as categorias de matérias-primas e produtos. Pode deixar vazio se preferir não categorizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
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
        </div>

      </div>
    </div>
  );
}

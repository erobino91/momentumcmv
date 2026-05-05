"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Produto, CategoriaProduto, UnidadeRendimento,
  ReceitaIngrediente, Receita, MateriaPrima,
  calcularCustoProduto, calcularCustoReceita, custoLiquido,
} from "@/types";
import { IngredienteSelector, IngredienteSelecionado } from "@/components/receitas/ingrediente-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, AlertCircle, BookOpen, Package, Calculator } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";

const categorias: { value: CategoriaProduto; label: string }[] = [
  { value: "pizza", label: "Pizza" },
  { value: "porcao", label: "Porção" },
  { value: "a_la_carte", label: "À La Carte" },
  { value: "entrada", label: "Entrada" },
  { value: "salada", label: "Salada" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "bebida", label: "Bebida" },
];

const unidadesRendimento: { value: UnidadeRendimento; label: string }[] = [
  { value: "porcoes", label: "Porções" },
  { value: "unidades", label: "Unidades" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g (gramas)" },
  { value: "L", label: "Litros" },
  { value: "ml", label: "ml" },
];

function cmvColor(cmv: number, meta: number) {
  if (cmv <= meta) return "text-green-600";
  if (cmv <= meta * 1.15) return "text-amber-500";
  return "text-red-600";
}

function nomeIngrediente(ing: ReceitaIngrediente, mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>) {
  if (ing.tipo === "receita" && ing.receitaId) return receitaMap.get(ing.receitaId)?.nome ?? "—";
  if (ing.materiaPrimaId) return mpMap.get(ing.materiaPrimaId)?.nome ?? "—";
  return "—";
}

function unidadeIngrediente(ing: ReceitaIngrediente, mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>) {
  if (ing.tipo === "receita" && ing.receitaId) return receitaMap.get(ing.receitaId)?.unidadeRendimento ?? "—";
  if (ing.materiaPrimaId) return mpMap.get(ing.materiaPrimaId)?.unidade ?? "—";
  return "—";
}

function custoIngrediente(ing: ReceitaIngrediente, mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>, mps: MateriaPrima[], todasReceitas: Receita[]) {
  if (ing.tipo === "receita" && ing.receitaId) {
    const sub = receitaMap.get(ing.receitaId);
    if (!sub) return 0;
    return ing.quantidade * calcularCustoReceita(sub, mps, todasReceitas).custoPorcao;
  }
  if (ing.materiaPrimaId) {
    const mp = mpMap.get(ing.materiaPrimaId);
    if (!mp) return 0;
    return ing.quantidade * custoLiquido(mp);
  }
  return 0;
}

interface Props {
  materiasPrimas: MateriaPrima[];
  todasReceitas: Receita[];
  initial?: Produto;
  onSave: (data: Omit<Produto, "id" | "criadoEm" | "atualizadoEm">) => void;
}

export function ProdutoForm({ materiasPrimas, todasReceitas, initial, onSave }: Props) {
  const router = useRouter();
  const { metaCmv: CMV_META } = useConfiguracaoStore();

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [categoria, setCategoria] = useState<CategoriaProduto>(initial?.categoria ?? "a_la_carte");
  const [rendimento, setRendimento] = useState(initial?.rendimento?.toString() ?? "1");
  const [unidadeRendimento, setUnidadeRendimento] = useState<UnidadeRendimento>(initial?.unidadeRendimento ?? "porcoes");
  const [ingredientes, setIngredientes] = useState<ReceitaIngrediente[]>(
    initial?.ingredientes?.map((ing) => ({ ...ing, tipo: ing.tipo ?? "materia_prima" })) ?? []
  );
  const [precoVenda, setPrecoVenda] = useState(initial?.precoVenda?.toString() ?? "");
  const [tempoPreparo, setTempoPreparo] = useState(initial?.tempoPreparo?.toString() ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [newSel, setNewSel] = useState<IngredienteSelecionado | null>(null);
  const [newQtd, setNewQtd] = useState("");
  const [cmvAlvo, setCmvAlvo] = useState(CMV_META.toString());

  const mpMap = new Map(materiasPrimas.map((m) => [m.id, m]));
  const receitaMap = new Map(todasReceitas.map((r) => [r.id, r]));

  const produtoRascunho: Produto = {
    id: initial?.id ?? "__rascunho__",
    nome, categoria,
    rendimento: parseFloat(rendimento) || 1,
    unidadeRendimento, ingredientes,
    precoVenda: parseFloat(precoVenda) || 0,
    criadoEm: "", atualizadoEm: "",
  };

  const custos = calcularCustoProduto(produtoRascunho, materiasPrimas, todasReceitas);

  function addIngrediente() {
    if (!newSel || !newQtd || parseFloat(newQtd) <= 0) return;
    const ing: ReceitaIngrediente =
      newSel.tipo === "materia_prima"
        ? { tipo: "materia_prima", materiaPrimaId: newSel.id, quantidade: parseFloat(newQtd) }
        : { tipo: "receita", receitaId: newSel.id, quantidade: parseFloat(newQtd) };
    setIngredientes((prev) => [...prev, ing]);
    setNewSel(null);
    setNewQtd("");
  }

  function removeIngrediente(idx: number) {
    setIngredientes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateQtd(idx: number, val: string) {
    setIngredientes((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, quantidade: parseFloat(val) || 0 } : ing))
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Nome obrigatório";
    if (!rendimento || parseFloat(rendimento) <= 0) e.rendimento = "Rendimento deve ser > 0";
    if (!precoVenda || parseFloat(precoVenda) <= 0) e.precoVenda = "Preço de venda obrigatório";
    if (ingredientes.length === 0) e.ingredientes = "Adicione ao menos 1 ingrediente";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      nome: nome.trim(), categoria,
      rendimento: parseFloat(rendimento),
      unidadeRendimento, ingredientes,
      precoVenda: parseFloat(precoVenda),
      tempoPreparo: tempoPreparo ? parseInt(tempoPreparo) : undefined,
      observacao: undefined,
    });
  }

  const excludeIds = ingredientes.map((ing) => ({
    tipo: ing.tipo ?? ("materia_prima" as const),
    id: (ing.tipo === "receita" ? ing.receitaId : ing.materiaPrimaId) ?? "",
  }));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/produtos")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{initial ? "Editar Produto" : "Novo Produto"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Item do cardápio com cálculo automático de CMV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Info básica */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Produto *</Label>
                <Input placeholder="Ex: Porção de Coxinha (6 un)" value={nome} onChange={(e) => setNome(e.target.value)} />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaProduto)}>
                    <SelectTrigger><SelectValue>{categorias.find(c => c.value === categoria)?.label}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tempo de Preparo <span className="text-muted-foreground text-xs">(min, opcional)</span></Label>
                  <Input type="number" min="1" placeholder="Ex: 15" value={tempoPreparo} onChange={(e) => setTempoPreparo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rendimento *</Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="Ex: 1" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
                  {errors.rendimento && <p className="text-xs text-destructive">{errors.rendimento}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Select value={unidadeRendimento} onValueChange={(v) => setUnidadeRendimento(v as UnidadeRendimento)}>
                    <SelectTrigger><SelectValue>{unidadesRendimento.find(u => u.value === unidadeRendimento)?.label}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {unidadesRendimento.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Preço de Venda (R$) *</Label>
                <CurrencyInput prefix="R$" decimals={2} value={parseFloat(precoVenda) || 0} onChange={(v) => setPrecoVenda(v > 0 ? v.toString() : "")} />
                {errors.precoVenda && <p className="text-xs text-destructive">{errors.precoVenda}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Ingredientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composição</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adicione matérias-primas <Package className="inline w-3 h-3 text-blue-500" /> ou preparos <BookOpen className="inline w-3 h-3 text-purple-500" />
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {errors.ingredientes && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />{errors.ingredientes}
                </div>
              )}

              {ingredientes.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium w-6" />
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-right px-3 py-2 font-medium w-32">Qtd</th>
                        <th className="text-center px-3 py-2 font-medium w-12">Un</th>
                        <th className="text-right px-3 py-2 font-medium w-28">Custo</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientes.map((ing, idx) => {
                        const tipo = ing.tipo ?? "materia_prima";
                        const nome = nomeIngrediente(ing, mpMap, receitaMap);
                        const unidade = unidadeIngrediente(ing, mpMap, receitaMap);
                        const custo = custoIngrediente(ing, mpMap, receitaMap, materiasPrimas, todasReceitas);
                        return (
                          <tr key={idx} className="border-t group">
                            <td className="px-3 py-2">
                              {tipo === "receita"
                                ? <BookOpen className="w-3 h-3 text-purple-400" />
                                : <Package className="w-3 h-3 text-blue-400" />}
                            </td>
                            <td className="px-3 py-2">{nome}</td>
                            <td className="px-3 py-2">
                              <Input type="number" min="0.001" step="0.001" className="h-7 text-right w-28 ml-auto"
                                value={ing.quantidade} onChange={(e) => updateQtd(idx, e.target.value)} />
                            </td>
                            <td className="px-3 py-2 text-center text-muted-foreground">{unidade}</td>
                            <td className="px-3 py-2 text-right tabular-nums">R$ {custo.toFixed(4)}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeIngrediente(idx)}
                                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Matéria-prima ou preparo</Label>
                  <IngredienteSelector
                    materiasPrimas={materiasPrimas}
                    receitas={todasReceitas}
                    value={newSel}
                    onChange={setNewSel}
                    excludeIds={excludeIds}
                  />
                </div>
                <div className="w-28">
                  <Label className="text-xs mb-1 block">Qtd ({newSel?.unidade ?? "—"})</Label>
                  <Input type="number" min="0.001" step="0.001" placeholder="0"
                    value={newQtd} onChange={(e) => setNewQtd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addIngrediente()} />
                </div>
                <Button type="button" variant="outline" size="icon"
                  onClick={addIngrediente}
                  disabled={!newSel || !newQtd || parseFloat(newQtd) <= 0}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de custos */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader><CardTitle className="text-base">Resumo de Custos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="font-medium tabular-nums">R$ {custos.custoTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rendimento</span>
                  <span className="font-medium">{rendimento || "—"} {unidadeRendimento}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground">Custo / porção</span>
                  <span className="font-semibold tabular-nums">R$ {custos.custoPorcao.toFixed(2)}</span>
                </div>
              </div>

              {precoVenda && parseFloat(precoVenda) > 0 ? (
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">CMV</p>
                  <p className={`text-3xl font-bold tabular-nums ${cmvColor(custos.cmv, CMV_META)}`}>
                    {custos.cmv.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">meta ≤ {CMV_META}%</p>
                  {custos.cmv > CMV_META && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      Acima da meta em {(custos.cmv - CMV_META).toFixed(1)}pp
                    </p>
                  )}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Informe o preço de venda para calcular o CMV</p>
                </div>
              )}

              {/* Simulador de Preço */}
              {custos.custoPorcao > 0 && (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-primary" />
                    Simulador de Preço
                  </p>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">CMV alvo</Label>
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        type="number" min="1" max="100" step="0.5"
                        className="h-7 text-right text-xs"
                        value={cmvAlvo}
                        onChange={(e) => setCmvAlvo(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  {parseFloat(cmvAlvo) > 0 && (
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-xs text-muted-foreground">Preço sugerido</span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        R$ {(custos.custoPorcao / (parseFloat(cmvAlvo) / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {ingredientes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Composição do custo</p>
                  {ingredientes.map((ing, idx) => {
                    const nome = nomeIngrediente(ing, mpMap, receitaMap);
                    const custo = custoIngrediente(ing, mpMap, receitaMap, materiasPrimas, todasReceitas);
                    const pct = custos.custoTotal > 0 ? (custo / custos.custoTotal) * 100 : 0;
                    const isReceita = (ing.tipo ?? "materia_prima") === "receita";
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs">
                          <span className="truncate text-muted-foreground max-w-[120px] flex items-center gap-1">
                            {isReceita ? <BookOpen className="w-2.5 h-2.5 text-purple-400 shrink-0" /> : <Package className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                            {nome}
                          </span>
                          <span className="tabular-nums">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-0.5">
                          <div className={`h-full rounded-full ${isReceita ? "bg-purple-400" : "bg-primary"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSubmit}>
            {initial ? "Salvar alterações" : "Criar Produto"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/produtos")}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

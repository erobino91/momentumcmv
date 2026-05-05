"use client";

import { useEffect, useMemo, useState } from "react";
import { Oferta, OfertaItem, Produto, MateriaPrima, Receita, calcularCustoProduto, calcularCustoOferta } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";

function cmvColor(cmv: number, meta: number) {
  if (cmv <= meta) return "text-green-600";
  if (cmv <= meta * 1.15) return "text-amber-500";
  return "text-red-600";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Oferta;
  produtos: Produto[];
  mps: MateriaPrima[];
  receitas: Receita[];
  onSave: (data: Omit<Oferta, "id" | "criadoEm" | "atualizadoEm">) => void;
}

export function OfertaFormDialog({ open, onOpenChange, initial, produtos, mps, receitas, onSave }: Props) {
  const { metaCmv: CMV_META } = useConfiguracaoStore();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoVenda, setPrecoVenda] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [itens, setItens] = useState<OfertaItem[]>([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [selectedQtd, setSelectedQtd] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNome(initial?.nome ?? "");
      setDescricao(initial?.descricao ?? "");
      setPrecoVenda(initial?.precoVenda ?? 0);
      setAtivo(initial?.ativo ?? true);
      setItens(initial?.itens ?? []);
      setSelectedProdutoId("");
      setSelectedQtd("1");
      setErrors({});
    }
  }, [open, initial]);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const ofertaRascunho: Oferta = useMemo(() => ({
    id: "__rascunho__",
    nome, descricao, itens, precoVenda, ativo,
    criadoEm: "", atualizadoEm: "",
  }), [nome, descricao, itens, precoVenda, ativo]);

  const custos = useMemo(
    () => calcularCustoOferta(ofertaRascunho, produtos, mps, receitas),
    [ofertaRascunho, produtos, mps, receitas]
  );

  // produtos não ainda adicionados
  const produtosDisponiveis = useMemo(
    () => produtos.filter((p) => !itens.some((i) => i.produtoId === p.id)),
    [produtos, itens]
  );

  function addItem() {
    const qtd = parseFloat(selectedQtd);
    if (!selectedProdutoId || isNaN(qtd) || qtd <= 0) return;
    setItens((prev) => [...prev, { produtoId: selectedProdutoId, quantidade: qtd }]);
    setSelectedProdutoId("");
    setSelectedQtd("1");
  }

  function removeItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  function updateQtd(produtoId: string, val: string) {
    const qtd = parseFloat(val);
    if (isNaN(qtd) || qtd <= 0) return;
    setItens((prev) => prev.map((i) => i.produtoId === produtoId ? { ...i, quantidade: qtd } : i));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Nome obrigatório";
    if (precoVenda <= 0) e.precoVenda = "Preço de venda obrigatório";
    if (itens.length === 0) e.itens = "Adicione ao menos 1 produto";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({ nome: nome.trim(), descricao: descricao.trim() || undefined, itens, precoVenda, ativo });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Oferta" : "Nova Oferta / Combo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Combo Família" value={nome} onChange={(e) => setNome(e.target.value)} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input placeholder="Ex: 2 pizzas grandes + 2 refrigerantes" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço de Venda *</Label>
              <CurrencyInput prefix="R$" decimals={2} value={precoVenda} onChange={(v) => setPrecoVenda(v)} />
              {errors.precoVenda && <p className="text-xs text-destructive">{errors.precoVenda}</p>}
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="ativo" className="cursor-pointer">Oferta ativa</Label>
            </div>
          </div>

          {/* Produtos da oferta */}
          <div className="space-y-3">
            <Label>Produtos incluídos *</Label>
            {errors.itens && <p className="text-xs text-destructive">{errors.itens}</p>}

            {itens.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Produto</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Qtd</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Custo</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const produto = produtoMap.get(item.produtoId);
                      if (!produto) return null;
                      const { custoPorcao } = calcularCustoProduto(produto, mps, receitas);
                      const custoItem = custoPorcao * item.quantidade;
                      return (
                        <tr key={item.produtoId} className="border-t group">
                          <td className="px-3 py-2 flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                            {produto.nome}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number" min="0.5" step="0.5"
                              className="h-7 text-right w-20 ml-auto"
                              value={item.quantidade}
                              onChange={(e) => updateQtd(item.produtoId, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            R$ {custoItem.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeItem(item.produtoId)}
                              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
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

            {/* Adicionar produto */}
            {produtosDisponiveis.length > 0 && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Adicionar produto</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedProdutoId}
                    onChange={(e) => setSelectedProdutoId(e.target.value)}
                  >
                    <option value="">Selecionar produto...</option>
                    {produtosDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number" min="0.5" step="0.5" placeholder="1"
                    value={selectedQtd}
                    onChange={(e) => setSelectedQtd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={addItem}
                  disabled={!selectedProdutoId || parseFloat(selectedQtd) <= 0}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Resumo de custos */}
          {itens.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2 text-sm">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Resumo</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo total</span>
                <span className="font-medium tabular-nums">R$ {custos.custoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de contribuição</span>
                <span className={`font-medium tabular-nums ${custos.mc >= 0 ? "text-green-600" : "text-red-600"}`}>
                  R$ {custos.mc.toFixed(2)}
                </span>
              </div>
              {precoVenda > 0 && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">CMV</span>
                  <span className={`font-bold tabular-nums text-base ${cmvColor(custos.cmv, CMV_META)}`}>
                    {custos.cmv.toFixed(1)}%
                    <span className="text-xs font-normal text-muted-foreground ml-1">(meta ≤ {CMV_META}%)</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{initial ? "Salvar alterações" : "Criar Oferta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  MateriaPrima, Receita, Produto,
  calcularCustoReceita, calcularCustoProduto,
  custoUnitarioEfetivo,
} from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ShoppingBag, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  mp: MateriaPrima;
  receitas: Receita[];
  produtos: Produto[];
  mps: MateriaPrima[];
  metaCmv: number;
}

function usaMp(item: { ingredientes: Array<{ tipo?: string; materiaPrimaId?: string; receitaId?: string }> }, mpId: string, receitas: Receita[], visited = new Set<string>()): boolean {
  for (const ing of item.ingredientes) {
    const tipo = ing.tipo ?? "materia_prima";
    if (tipo === "materia_prima" && ing.materiaPrimaId === mpId) return true;
    if (tipo === "receita" && ing.receitaId && !visited.has(ing.receitaId)) {
      const sub = receitas.find((r) => r.id === ing.receitaId);
      if (sub) {
        visited.add(sub.id);
        if (usaMp(sub, mpId, receitas, visited)) return true;
      }
    }
  }
  return false;
}

function mpComNovoCusto(mp: MateriaPrima, novoCustoUnitario: number): MateriaPrima {
  // Se usa embalagem, mantém embalagem mas ajusta custo proporcional
  // Mais simples: ignora embalagem, usa custo direto
  return { ...mp, custoUnitario: novoCustoUnitario, embalagem: undefined };
}

function cmvColor(cmv: number, meta: number) {
  if (cmv <= meta) return "text-green-600";
  if (cmv <= meta * 1.15) return "text-amber-500";
  return "text-red-600";
}

export function ImpactoMpDialog({ open, onClose, mp, receitas, produtos, mps, metaCmv }: Props) {
  const custoAtual = custoUnitarioEfetivo(mp);
  const [novoCusto, setNovoCusto] = useState(custoAtual.toFixed(4));

  const novoCustoNum = parseFloat(novoCusto) || custoAtual;
  const mudou = Math.abs(novoCustoNum - custoAtual) > 0.0001;

  // Mps simulados com novo custo
  const mpsSimulados = mps.map((m) => m.id === mp.id ? mpComNovoCusto(mp, novoCustoNum) : m);

  // Receitas afetadas
  const receitasAfetadas = receitas.filter((r) => usaMp(r, mp.id, receitas));
  // Produtos afetados
  const produtosAfetados = produtos.filter((p) => usaMp(p, mp.id, receitas));

  const totalAfetados = receitasAfetadas.length + produtosAfetados.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Análise de Impacto
            <span className="text-muted-foreground font-normal text-sm">— {mp.nome}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Simulador de custo */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <p className="text-sm font-medium">Simular variação de custo</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Custo atual (R$/{mp.unidade})</Label>
              <p className="text-lg font-bold tabular-nums">R$ {custoAtual.toFixed(4)}</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Novo custo (R$/{mp.unidade})</Label>
              <Input
                type="number" min="0" step="0.0001"
                className="h-8 tabular-nums"
                value={novoCusto}
                onChange={(e) => setNovoCusto(e.target.value)}
              />
            </div>
          </div>
          {mudou && (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${novoCustoNum > custoAtual ? "text-red-600" : "text-green-600"}`}>
              {novoCustoNum > custoAtual ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {novoCustoNum > custoAtual ? "+" : ""}{(((novoCustoNum - custoAtual) / custoAtual) * 100).toFixed(1)}% no custo do ingrediente
            </div>
          )}
        </div>

        {/* Impacto */}
        {totalAfetados === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma receita ou produto usa este ingrediente ainda.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{totalAfetados}</strong> {totalAfetados === 1 ? "item afetado" : "itens afetados"}
            </p>

            {/* Receitas */}
            {receitasAfetadas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Receitas
                </p>
                {receitasAfetadas.map((r) => {
                  const atual = calcularCustoReceita(r, mps, receitas);
                  const novo = calcularCustoReceita(r, mpsSimulados, receitas);
                  const diffCmv = (novo.cmv ?? 0) - (atual.cmv ?? 0);
                  return (
                    <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Custo/porção: R$ {atual.custoPorcao.toFixed(2)} → R$ {novo.custoPorcao.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        {atual.cmv !== null ? (
                          <>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className={`text-sm font-semibold tabular-nums ${cmvColor(atual.cmv, metaCmv)}`}>
                                {atual.cmv.toFixed(1)}%
                              </span>
                              {mudou && novo.cmv !== null && (
                                <>
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <span className={`text-sm font-bold tabular-nums ${cmvColor(novo.cmv, metaCmv)}`}>
                                    {novo.cmv.toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </div>
                            {mudou && novo.cmv !== null && Math.abs(diffCmv) > 0.01 && (
                              <p className={`text-xs font-medium ${diffCmv > 0 ? "text-red-600" : "text-green-600"}`}>
                                {diffCmv > 0 ? "+" : ""}{diffCmv.toFixed(1)}pp
                              </p>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">sem preço</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Produtos */}
            {produtosAfetados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-violet-400" /> Produtos
                </p>
                {produtosAfetados.map((p) => {
                  const atual = calcularCustoProduto(p, mps, receitas);
                  const novo = calcularCustoProduto(p, mpsSimulados, receitas);
                  const diffCmv = novo.cmv - atual.cmv;
                  return (
                    <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Custo/porção: R$ {atual.custoPorcao.toFixed(2)} → R$ {novo.custoPorcao.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-sm font-semibold tabular-nums ${cmvColor(atual.cmv, metaCmv)}`}>
                            {atual.cmv.toFixed(1)}%
                          </span>
                          {mudou && (
                            <>
                              <span className="text-muted-foreground text-xs">→</span>
                              <span className={`text-sm font-bold tabular-nums ${cmvColor(novo.cmv, metaCmv)}`}>
                                {novo.cmv.toFixed(1)}%
                              </span>
                            </>
                          )}
                        </div>
                        {mudou && Math.abs(diffCmv) > 0.01 && (
                          <p className={`text-xs font-medium ${diffCmv > 0 ? "text-red-600" : "text-green-600"}`}>
                            {diffCmv > 0 ? "+" : ""}{diffCmv.toFixed(1)}pp
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

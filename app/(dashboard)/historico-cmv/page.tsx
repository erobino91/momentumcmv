"use client";

import { useSnapshotStore } from "@/store/snapshots";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useProdutoStore } from "@/store/produtos";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoProduto } from "@/types";
import { CmvLineChart } from "@/components/historico-cmv/line-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History, Plus, Trash2, TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";

function fmt(n: number, dec = 1) {
  return n.toFixed(dec).replace(".", ",");
}

function DeltaBadge({ curr, prev }: { curr: number | null; prev: number | null }) {
  if (curr === null || prev === null) return null;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" /> estável
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium">
      <TrendingDown className="w-3 h-3" /> {fmt(Math.abs(delta))}pp
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
      <TrendingUp className="w-3 h-3" /> +{fmt(delta)}pp
    </span>
  );
}

export default function HistoricoCmvPage() {
  const snapshots = useSnapshotStore((s) => s.items);
  const mutating = useSnapshotStore((s) => s.mutating);
  const add = useSnapshotStore((s) => s.add);
  const remove = useSnapshotStore((s) => s.remove);
  const mps = useMateriaPrimaStore((s) => s.items);
  const receitas = useReceitaStore((s) => s.items);
  const produtos = useProdutoStore((s) => s.items);
  const metaCmv = useConfiguracaoStore((s) => s.metaCmv);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Calcula CMV atual para o snapshot
  const produtosCalc = useMemo(
    () => produtos.map((p) => {
      const { custoPorcao, cmv } = calcularCustoProduto(p, mps, receitas);
      return { nome: p.nome, cmv, custoPorcao, precoVenda: p.precoVenda, mc: p.precoVenda - custoPorcao };
    }),
    [produtos, mps, receitas]
  );
  const cmvMedioAtual = useMemo(
    () => produtosCalc.length > 0
      ? produtosCalc.reduce((s, p) => s + p.cmv, 0) / produtosCalc.length
      : null,
    [produtosCalc]
  );
  const acimaDaMetaAtual = useMemo(
    () => produtosCalc.filter((p) => p.cmv > metaCmv).length,
    [produtosCalc, metaCmv]
  );

  function handleRegistrar() {
    add({
      cmvMedio: cmvMedioAtual,
      metaCmv,
      totalProdutos: produtos.length,
      acimaDaMeta: acimaDaMetaAtual,
      detalhes: produtosCalc,
    });
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.registradoEm).getTime() - new Date(b.registradoEm).getTime()
  );
  const ultimo = sorted[sorted.length - 1] ?? null;
  const penultimo = sorted[sorted.length - 2] ?? null;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Histórico de CMV</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {snapshots.length === 0
              ? "Nenhum snapshot registrado ainda"
              : `${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""} registrado${snapshots.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={handleRegistrar} disabled={produtos.length === 0} className="gap-2">
          <Plus className="w-4 h-4" />
          Registrar Snapshot
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg text-center">
          <History className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum snapshot registrado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Clique em <strong>Registrar Snapshot</strong> para salvar uma fotografia do CMV atual e acompanhar a evolução ao longo do tempo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs comparativos */}
          {ultimo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Último CMV Médio</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    ultimo.cmvMedio === null ? "" :
                    ultimo.cmvMedio <= metaCmv ? "text-green-700" : "text-red-700"
                  }`}>
                    {ultimo.cmvMedio !== null ? `${fmt(ultimo.cmvMedio)}%` : "—"}
                  </p>
                  <DeltaBadge curr={ultimo.cmvMedio} prev={penultimo?.cmvMedio ?? null} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Acima da Meta</p>
                  <p className={`text-2xl font-bold tabular-nums ${ultimo.acimaDaMeta > 0 ? "text-red-700" : "text-green-700"}`}>
                    {ultimo.acimaDaMeta}
                  </p>
                  <DeltaBadge curr={ultimo.acimaDaMeta} prev={penultimo?.acimaDaMeta ?? null} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Total de Snapshots</p>
                  <p className="text-2xl font-bold tabular-nums">{snapshots.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Período</p>
                  <p className="text-sm font-semibold">
                    {new Date(sorted[0].registradoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {" — "}
                    {new Date(sorted[sorted.length - 1].registradoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfico */}
          {sorted.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução do CMV</CardTitle>
              </CardHeader>
              <CardContent>
                <CmvLineChart snapshots={sorted} metaCmv={metaCmv} />
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Dentro da meta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Acima da meta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 border-t-2 border-dashed border-amber-400 inline-block" /> Meta ({metaCmv}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela de snapshots */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Todos os Snapshots</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t divide-y">
                {[...sorted].reverse().map((snap, i) => {
                  const isMutating = mutating.includes(snap.id);
                  const over = snap.cmvMedio !== null && snap.cmvMedio > snap.metaCmv;
                  return (
                    <div key={snap.id} className={`flex items-center gap-4 px-6 py-3 group ${isMutating ? "opacity-60" : ""}`}>
                      <div className="w-28 shrink-0">
                        <p className="text-sm font-medium">
                          {new Date(snap.registradoEm).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(snap.registradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex-1 flex items-center gap-3 flex-wrap">
                        <Badge
                          className={`tabular-nums text-xs ${over
                            ? "bg-red-100 text-red-700 hover:bg-red-100"
                            : "bg-green-100 text-green-700 hover:bg-green-100"}`}
                        >
                          CMV {snap.cmvMedio !== null ? `${fmt(snap.cmvMedio)}%` : "—"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {snap.totalProdutos} produto{snap.totalProdutos !== 1 ? "s" : ""}
                        </span>
                        {snap.acimaDaMeta > 0 && (
                          <span className="text-xs text-red-600">
                            {snap.acimaDaMeta} acima da meta
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Meta: {snap.metaCmv}%
                        </span>
                      </div>
                      <div className="shrink-0">
                        {isMutating ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDeleteTarget(snap.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será removido permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => { if (deleteTarget) { remove(deleteTarget); setDeleteTarget(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

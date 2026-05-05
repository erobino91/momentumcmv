"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { calcularCustoReceita, Receita } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, BookOpen, FileText, Copy, Download, Loader2 } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { exportCsv } from "@/lib/export-csv";

function CmvBadge({ cmv, meta }: { cmv: number | null; meta: number }) {
  if (cmv === null) return <span className="text-muted-foreground text-sm">—</span>;
  const cor = cmv <= meta
    ? "bg-green-100 text-green-700"
    : cmv <= meta * 1.15
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${cor}`}>
      {cmv.toFixed(1)}%
    </span>
  );
}

export default function ReceitasPage() {
  const router = useRouter();
  const metaCmv = useConfiguracaoStore((s) => s.metaCmv);
  const items = useReceitaStore((s) => s.items);
  const mutating = useReceitaStore((s) => s.mutating);
  const remove = useReceitaStore((s) => s.remove);
  const duplicate = useReceitaStore((s) => s.duplicate);
  const mps = useMateriaPrimaStore((s) => s.items);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Receita | null>(null);

  // Pré-computa custos uma vez por mudança de dados (não por keystroke de busca)
  const custosMap = useMemo(() => {
    const map = new Map<string, { custoTotal: number; custoPorcao: number; cmv: number | null }>();
    for (const r of items) map.set(r.id, calcularCustoReceita(r, mps, items));
    return map;
  }, [items, mps]);

  const filtered = useMemo(
    () => items.filter((r) =>
      r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.categoria?.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  function handleExport() {
    exportCsv("receitas.csv", items.map((r) => {
      const { custoTotal, custoPorcao, cmv } = calcularCustoReceita(r, mps, items);
      return {
        Nome: r.nome,
        Categoria: r.categoria,
        Ingredientes: r.ingredientes.length,
        "Rendimento": `${r.rendimento} ${r.unidadeRendimento}`,
        "Custo Total (R$)": custoTotal.toFixed(2),
        "Custo/Porção (R$)": custoPorcao.toFixed(2),
        "Preço Venda (R$)": r.precoVenda?.toFixed(2) ?? "",
        "CMV (%)": cmv !== null ? cmv.toFixed(1) : "",
        "Tempo Preparo (min)": r.tempoPreparo ?? "",
        Observacao: r.observacao ?? "",
      };
    }));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Receitas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "receita cadastrada" : "receitas cadastradas"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={items.length === 0}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button onClick={() => router.push("/receitas/nova")} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Receita
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">
            {search ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente outro termo" : "Clique em \"Nova Receita\" para começar"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Receita</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold text-center">Ingredientes</TableHead>
                <TableHead className="font-semibold text-right">Custo Total</TableHead>
                <TableHead className="font-semibold text-right">Custo/Porção</TableHead>
                <TableHead className="font-semibold text-right">Preço Venda</TableHead>
                <TableHead className="font-semibold text-center">CMV</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const { custoTotal, custoPorcao, cmv } = custosMap.get(r.id) ?? { custoTotal: 0, custoPorcao: 0, cmv: null };
                const isMutating = mutating.includes(r.id);
                return (
                  <TableRow key={r.id} className={`group ${isMutating ? "opacity-60" : ""}`}>
                    <TableCell>
                      <div className="font-medium">{r.nome}</div>
                      {r.tempoPreparo && (
                        <div className="text-xs text-muted-foreground">{r.tempoPreparo} min</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{r.categoria}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{r.ingredientes.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">R$ {custoTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      R$ {custoPorcao.toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">/ {r.unidadeRendimento}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.precoVenda ? `R$ ${r.precoVenda.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <CmvBadge cmv={cmv} meta={metaCmv} />
                    </TableCell>
                    <TableCell>
                      {isMutating ? (
                        <div className="flex h-8 items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                            onClick={() => router.push(`/receitas/${r.id}/ficha`)}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                            onClick={() => duplicate(r.id)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => router.push(`/receitas/${r.id}/editar`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(r)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.nome}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => { if (deleteTarget) { remove(deleteTarget.id); setDeleteTarget(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

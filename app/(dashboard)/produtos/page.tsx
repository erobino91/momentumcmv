"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { calcularCustoProduto, Produto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, ShoppingBag, FileText, Copy, Download, Loader2 } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { exportCsv } from "@/lib/export-csv";

const categoriaLabel: Record<string, string> = {
  pizza: "Pizza", porcao: "Porção", a_la_carte: "À La Carte",
  entrada: "Entrada", salada: "Salada", sobremesa: "Sobremesa", bebida: "Bebida",
};

function CmvBadge({ cmv, meta }: { cmv: number; meta: number }) {
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

export default function ProdutosPage() {
  const router = useRouter();
  const metaCmv = useConfiguracaoStore((s) => s.metaCmv);
  const items = useProdutoStore((s) => s.items);
  const mutating = useProdutoStore((s) => s.mutating);
  const remove = useProdutoStore((s) => s.remove);
  const duplicate = useProdutoStore((s) => s.duplicate);
  const mps = useMateriaPrimaStore((s) => s.items);
  const receitas = useReceitaStore((s) => s.items);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);

  // Pré-computa custos uma vez por mudança de dados (não por keystroke de busca)
  const custosMap = useMemo(() => {
    const map = new Map<string, { custoTotal: number; custoPorcao: number; cmv: number }>();
    for (const p of items) map.set(p.id, calcularCustoProduto(p, mps, receitas));
    return map;
  }, [items, mps, receitas]);

  const filtered = useMemo(
    () => items.filter((p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      categoriaLabel[p.categoria]?.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  function handleExport() {
    exportCsv("produtos.csv", items.map((p) => {
      const { custoPorcao, cmv } = calcularCustoProduto(p, mps, receitas);
      return {
        Nome: p.nome,
        Categoria: categoriaLabel[p.categoria] ?? p.categoria,
        "Custo/Porção (R$)": custoPorcao.toFixed(2),
        "Preço Venda (R$)": p.precoVenda.toFixed(2),
        "CMV (%)": cmv.toFixed(1),
        "Margem Bruta (R$)": (p.precoVenda - custoPorcao).toFixed(2),
        "Rendimento": `${p.rendimento} ${p.unidadeRendimento}`,
        "Tempo Preparo (min)": p.tempoPreparo ?? "",
        Observacao: p.observacao ?? "",
      };
    }));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "produto cadastrado" : "produtos cadastrados"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={items.length === 0}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <Button onClick={() => router.push("/produtos/novo")} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria…" className="pl-9"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">
            {search ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente outro termo" : "Clique em \"Novo Produto\" para começar"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Produto</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold text-right">Custo/Porção</TableHead>
                <TableHead className="font-semibold text-right">Preço Venda</TableHead>
                <TableHead className="font-semibold text-center">CMV</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const { custoPorcao, cmv } = custosMap.get(p.id) ?? { custoPorcao: 0, cmv: 0 };
                const isMutating = mutating.includes(p.id);
                return (
                  <TableRow key={p.id} className={`group ${isMutating ? "opacity-60" : ""}`}>
                    <TableCell>
                      <div className="font-medium">{p.nome}</div>
                      {p.tempoPreparo && (
                        <div className="text-xs text-muted-foreground">{p.tempoPreparo} min</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{categoriaLabel[p.categoria]}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      R$ {custoPorcao.toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">/ {p.unidadeRendimento}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      R$ {p.precoVenda.toFixed(2)}
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
                            onClick={() => router.push(`/produtos/${p.id}/ficha`)}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                            onClick={() => duplicate(p.id)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => router.push(`/produtos/${p.id}/editar`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}>
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
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.nome}</strong> será removido permanentemente.
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

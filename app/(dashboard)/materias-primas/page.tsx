"use client";

import { useState, useMemo } from "react";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useProdutoStore } from "@/store/produtos";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { MateriaPrima, custoLiquido, custoUnitarioEfetivo } from "@/types";
import { MateriaPrimaFormDialog } from "@/components/materias-primas/form-dialog";
import { HistoricoPrecoDialog } from "@/components/materias-primas/historico-preco-dialog";
import { ImpactoMpDialog } from "@/components/materias-primas/impacto-mp-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Search, Package, Download, History, BarChart2, Loader2 } from "lucide-react";
import { exportCsv } from "@/lib/export-csv";
import { ImportCsvButton } from "@/components/materias-primas/import-csv-dialog";

const BADGE_CORES = [
  "bg-red-100 text-red-700", "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700", "bg-yellow-100 text-yellow-700",
  "bg-green-100 text-green-700", "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700", "bg-gray-100 text-gray-700",
  "bg-purple-100 text-purple-700", "bg-slate-100 text-slate-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
];

function categoriaCor(categoria: string, todas: string[]) {
  const idx = todas.indexOf(categoria);
  return BADGE_CORES[(idx >= 0 ? idx : 0) % BADGE_CORES.length];
}

export default function MateriasPrimasPage() {
  const items = useMateriaPrimaStore((s) => s.items);
  const mutating = useMateriaPrimaStore((s) => s.mutating);
  const add = useMateriaPrimaStore((s) => s.add);
  const update = useMateriaPrimaStore((s) => s.update);
  const remove = useMateriaPrimaStore((s) => s.remove);
  const receitas = useReceitaStore((s) => s.items);
  const produtos = useProdutoStore((s) => s.items);
  const metaCmv = useConfiguracaoStore((s) => s.metaCmv);
  const categoriasInsumo = useConfiguracaoStore((s) => s.categoriasInsumo);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MateriaPrima | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MateriaPrima | null>(null);
  const [historicoTarget, setHistoricoTarget] = useState<MateriaPrima | null>(null);
  const [impactoTarget, setImpactoTarget] = useState<MateriaPrima | null>(null);

  const filtered = useMemo(
    () => items.filter((mp) =>
      mp.nome.toLowerCase().includes(search.toLowerCase()) ||
      mp.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      mp.categoria?.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  function handleSave(values: Omit<MateriaPrima, "id" | "criadoEm" | "atualizadoEm">) {
    if (editing) {
      update(editing.id, values);
    } else {
      add(values);
    }
  }

  function handleEdit(mp: MateriaPrima) {
    setEditing(mp);
    setFormOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleDelete() {
    if (deleteTarget) {
      remove(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function handleExport() {
    exportCsv("materias-primas.csv", items.map((mp) => ({
      Nome: mp.nome,
      Categoria: mp.categoria,
      Unidade: mp.unidade,
      "Custo Unitário (R$)": custoUnitarioEfetivo(mp).toFixed(4),
      "Custo Líquido (R$)": custoLiquido(mp).toFixed(4),
      "Fator de Correção": mp.fatorCorrecao,
      Fornecedor: mp.fornecedor ?? "",
      Observação: mp.observacao ?? "",
    })));
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Matérias-Primas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "ingrediente cadastrado" : "ingredientes cadastrados"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={items.length === 0}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          <ImportCsvButton />
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova MP
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, categoria ou fornecedor…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <Package className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">
            {search ? "Nenhum resultado encontrado" : "Nenhuma matéria-prima cadastrada"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente outro termo de busca" : "Clique em \"Nova Matéria-Prima\" para começar"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Unidade</TableHead>
                <TableHead className="font-semibold">Embalagem</TableHead>
                <TableHead className="font-semibold text-right">Custo/un</TableHead>
                <TableHead className="font-semibold text-center">FC</TableHead>
                <TableHead className="font-semibold text-right">Custo Líquido</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mp) => {
                const isMutating = mutating.includes(mp.id);
                return (
                <TableRow key={mp.id} className={`group ${isMutating ? "opacity-60" : ""}`}>
                  <TableCell className="font-medium">{mp.nome}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoriaCor(mp.categoria, categoriasInsumo)}`}>
                      {mp.categoria}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{mp.unidade}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {mp.embalagem ? (
                      <span title={`R$ ${mp.embalagem.custo.toFixed(2)} ÷ ${mp.embalagem.qtd}${mp.unidade}`}>
                        {mp.embalagem.descricao}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    R$ {custoUnitarioEfetivo(mp).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {mp.fatorCorrecao < 1 ? (
                      <span className="text-amber-600 font-medium">{mp.fatorCorrecao.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">{mp.fatorCorrecao.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    R$ {custoLiquido(mp).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {mp.fornecedor ?? "—"}
                  </TableCell>
                  <TableCell>
                    {isMutating ? (
                      <div className="flex h-8 items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setImpactoTarget(mp)}
                          title="Ver impacto no cardápio"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setHistoricoTarget(mp)}
                          title="Ver histórico de preço"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEdit(mp)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(mp)}
                        >
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

      {/* Form Dialog */}
      <MateriaPrimaFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editing}
      />

      {/* Impacto no Cardápio */}
      {impactoTarget && (
        <ImpactoMpDialog
          open={!!impactoTarget}
          onClose={() => setImpactoTarget(null)}
          mp={impactoTarget}
          receitas={receitas}
          produtos={produtos}
          mps={items}
          metaCmv={metaCmv}
        />
      )}

      {/* Histórico de Preço */}
      {historicoTarget && (
        <HistoricoPrecoDialog
          open={!!historicoTarget}
          onClose={() => setHistoricoTarget(null)}
          mp={historicoTarget}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir matéria-prima?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.nome}</strong> será removida permanentemente. Receitas que usam este ingrediente podem ser afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

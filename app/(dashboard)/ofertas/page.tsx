"use client";

import { useMemo, useState } from "react";
import { useOfertaStore } from "@/store/ofertas";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoOferta, Oferta } from "@/types";
import { OfertaFormDialog } from "@/components/ofertas/oferta-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

function cmvBadge(cmv: number, meta: number) {
  if (cmv <= meta) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{cmv.toFixed(1)}%</Badge>;
  if (cmv <= meta * 1.15) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{cmv.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{cmv.toFixed(1)}%</Badge>;
}

export default function OfertasPage() {
  const ofertas = useOfertaStore((s) => s.items);
  const mutating = useOfertaStore((s) => s.mutating);
  const addOferta = useOfertaStore((s) => s.add);
  const updateOferta = useOfertaStore((s) => s.update);
  const removeOferta = useOfertaStore((s) => s.remove);

  const produtos = useProdutoStore((s) => s.items);
  const mps = useMateriaPrimaStore((s) => s.items);
  const receitas = useReceitaStore((s) => s.items);
  const { metaCmv } = useConfiguracaoStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Oferta | undefined>(undefined);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const custosMap = useMemo(() => {
    const map = new Map<string, { custoTotal: number; cmv: number; mc: number }>();
    for (const oferta of ofertas) {
      map.set(oferta.id, calcularCustoOferta(oferta, produtos, mps, receitas));
    }
    return map;
  }, [ofertas, produtos, mps, receitas]);

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(oferta: Oferta) {
    setEditing(oferta);
    setDialogOpen(true);
  }

  function handleRemove(id: string) {
    if (confirmRemove === id) {
      removeOferta(id);
      setConfirmRemove(null);
      toast.success("Oferta removida.");
    } else {
      setConfirmRemove(id);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  }

  const ativas = ofertas.filter((o) => o.ativo);
  const inativas = ofertas.filter((o) => !o.ativo);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ofertas & Combos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Agrupe produtos com preço promocional e acompanhe o CMV do combo
          </p>
        </div>
        <Button onClick={openNew} disabled={produtos.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Oferta
        </Button>
      </div>

      {produtos.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm mt-1">Cadastre produtos antes de criar ofertas.</p>
        </div>
      )}

      {produtos.length > 0 && ofertas.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma oferta cadastrada</p>
          <p className="text-sm mt-1">Crie combos e promoções com cálculo automático de CMV.</p>
          <Button variant="outline" className="mt-4" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira oferta
          </Button>
        </div>
      )}

      {/* Tabela */}
      {ofertas.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Itens</th>
                <th className="text-right px-4 py-3 font-medium">Custo</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">MC</th>
                <th className="text-center px-4 py-3 font-medium">CMV</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {[...ativas, ...inativas].map((oferta) => {
                const custos = custosMap.get(oferta.id) ?? { custoTotal: 0, cmv: 0, mc: 0 };
                const isMutating = mutating.includes(oferta.id);
                return (
                  <tr key={oferta.id} className={`border-t transition-opacity ${isMutating ? "opacity-50" : ""} ${!oferta.ativo ? "bg-muted/20" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{oferta.nome}</p>
                      {oferta.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5">{oferta.descricao}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {oferta.itens.length} produto{oferta.itens.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      R$ {custos.custoTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      R$ {oferta.precoVenda.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${custos.mc >= 0 ? "text-green-600" : "text-red-600"}`}>
                      R$ {custos.mc.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cmvBadge(custos.cmv, metaCmv)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {oferta.ativo
                        ? <Badge variant="outline" className="text-green-600 border-green-300">Ativa</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(oferta)}
                          disabled={isMutating}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(oferta.id)}
                          disabled={isMutating}
                          className={`p-1.5 rounded transition-colors ${
                            confirmRemove === oferta.id
                              ? "bg-red-100 text-red-600"
                              : "text-muted-foreground hover:text-destructive hover:bg-muted"
                          }`}
                          title={confirmRemove === oferta.id ? "Clique novamente para confirmar" : "Remover"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {ofertas.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{ativas.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ofertas ativas</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">
              {ativas.length > 0
                ? (ativas.reduce((acc, o) => acc + (custosMap.get(o.id)?.cmv ?? 0), 0) / ativas.length).toFixed(1)
                : "—"}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">CMV médio (ativas)</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">
              R$ {ativas.reduce((acc, o) => acc + (custosMap.get(o.id)?.mc ?? 0), 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MC total (ativas)</p>
          </div>
        </div>
      )}

      <OfertaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        produtos={produtos}
        mps={mps}
        receitas={receitas}
        onSave={(data) => {
          if (editing) {
            updateOferta(editing.id, data);
            toast.success("Oferta atualizada.");
          } else {
            addOferta(data);
            toast.success("Oferta criada.");
          }
        }}
      />
    </div>
  );
}

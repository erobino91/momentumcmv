"use client";

import { MateriaPrima, HistoricoPrecoEntry, custoUnitarioEfetivo } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  mp: MateriaPrima;
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function HistoricoPrecoDialog({ open, onClose, mp }: Props) {
  const historico = mp.historicoPreco ?? [];

  // Monta linha da tabela: histórico (do mais antigo) + preço atual
  const custoEfetivo = (entry: HistoricoPrecoEntry) =>
    entry.embalagem
      ? entry.embalagem.custo / entry.embalagem.qtd
      : entry.custoUnitario;

  const linhas: Array<HistoricoPrecoEntry & { label: string; isCurrent: boolean }> = [
    ...historico.map((h) => ({ ...h, label: formatData(h.data), isCurrent: false })),
    {
      data: mp.atualizadoEm,
      custoUnitario: mp.custoUnitario,
      embalagem: mp.embalagem,
      label: formatData(mp.atualizadoEm),
      isCurrent: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Histórico de Preço
            <span className="text-muted-foreground font-normal text-sm">— {mp.nome}</span>
          </DialogTitle>
        </DialogHeader>

        {linhas.length === 1 && !historico.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma alteração de preço registrada ainda.
            <br />
            O histórico é criado automaticamente ao editar o custo.
          </div>
        ) : (
          <div className="divide-y">
            {linhas.map((linha, i) => {
              const custo = custoEfetivo(linha);
              const anterior = i > 0 ? custoEfetivo(linhas[i - 1]) : null;
              const diff = anterior !== null ? custo - anterior : 0;
              const pct = anterior && anterior > 0 ? (diff / anterior) * 100 : 0;

              return (
                <div key={i} className={`flex items-center justify-between py-3 px-1 ${linha.isCurrent ? "bg-muted/40 rounded" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{linha.label}</p>
                      {linha.embalagem ? (
                        <p className="text-xs text-muted-foreground">
                          {linha.embalagem.descricao} · R$ {linha.embalagem.custo.toFixed(2)} ÷ {linha.embalagem.qtd}{mp.unidade}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">custo unitário manual</p>
                      )}
                    </div>
                    {linha.isCurrent && (
                      <Badge variant="outline" className="text-xs">atual</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    {anterior !== null && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {diff !== 0 ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : "sem mudança"}
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      R$ {custo.toFixed(4)}/{mp.unidade}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { MateriaPrima, custoUnitarioEfetivo } from "@/types";
import {
  criarMateriaPrima,
  atualizarMateriaPrima,
  removerMateriaPrima,
} from "@/lib/actions/materias-primas";

interface MateriaPrimaStore {
  items: MateriaPrima[];
  mutating: string[]; // IDs com sync pendente
  hydrate: (items: MateriaPrima[]) => void;
  add: (mp: Omit<MateriaPrima, "id" | "criadoEm" | "atualizadoEm">) => void;
  update: (id: string, mp: Partial<Omit<MateriaPrima, "id" | "criadoEm">>) => void;
  remove: (id: string) => void;
}

export const useMateriaPrimaStore = create<MateriaPrimaStore>()((set, get) => ({
  items: [],
  mutating: [],

  hydrate: (items) => set({ items }),

  add: (mp) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: MateriaPrima = { ...mp, id: tempId, criadoEm: now, atualizadoEm: now };

    set((state) => ({
      items: [...state.items, optimistic],
      mutating: [...state.mutating, tempId],
    }));

    criarMateriaPrima(mp)
      .then((saved) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === tempId ? saved : i)),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      })
      .catch(() => {
        toast.error("Erro ao salvar matéria-prima. Tente novamente.");
        set((state) => ({
          items: state.items.filter((i) => i.id !== tempId),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      });
  },

  update: (id, mp) => {
    const prev = get().items.find((i) => i.id === id);

    // Detecta mudança de preço para histórico
    let novoHistorico = prev?.historicoPreco ?? [];
    if (prev) {
      const custoAtual = custoUnitarioEfetivo(prev);
      const custoNovo = mp.embalagem
        ? mp.embalagem.custo / mp.embalagem.qtd
        : mp.custoUnitario !== undefined
        ? mp.custoUnitario
        : custoAtual;
      if (Math.abs(custoNovo - custoAtual) > 0.0001) {
        novoHistorico = [
          ...novoHistorico,
          { data: new Date().toISOString(), custoUnitario: prev.custoUnitario, embalagem: prev.embalagem },
        ];
      }
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, ...mp, historicoPreco: novoHistorico, atualizadoEm: new Date().toISOString() }
          : item
      ),
    }));

    atualizarMateriaPrima(id, { ...mp, historicoPreco: novoHistorico }).catch(() => {
      toast.error("Erro ao salvar. Alterações revertidas.");
      if (prev) {
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? prev : i)),
        }));
      }
    });
  },

  remove: (id) => {
    const prev = get().items.find((i) => i.id === id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    removerMateriaPrima(id).catch(() => {
      toast.error("Erro ao remover. Item restaurado.");
      if (prev) set((state) => ({ items: [...state.items, prev] }));
    });
  },
}));

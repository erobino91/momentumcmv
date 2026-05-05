"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { Produto } from "@/types";
import {
  criarProduto,
  atualizarProduto,
  removerProduto,
  duplicarProduto,
} from "@/lib/actions/produtos";

interface ProdutoStore {
  items: Produto[];
  mutating: string[];
  hydrate: (items: Produto[]) => void;
  add: (p: Omit<Produto, "id" | "criadoEm" | "atualizadoEm">) => void;
  update: (id: string, p: Partial<Omit<Produto, "id" | "criadoEm">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

export const useProdutoStore = create<ProdutoStore>()((set, get) => ({
  items: [],
  mutating: [],

  hydrate: (items) => set({ items }),

  add: (p) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: Produto = { ...p, id: tempId, criadoEm: now, atualizadoEm: now };

    set((state) => ({
      items: [...state.items, optimistic],
      mutating: [...state.mutating, tempId],
    }));

    criarProduto(p)
      .then((saved) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === tempId ? saved : i)),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      })
      .catch(() => {
        toast.error("Erro ao salvar produto. Tente novamente.");
        set((state) => ({
          items: state.items.filter((i) => i.id !== tempId),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      });
  },

  update: (id, p) => {
    const prev = get().items.find((i) => i.id === id);

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, ...p, atualizadoEm: new Date().toISOString() }
          : item
      ),
    }));

    atualizarProduto(id, p).catch(() => {
      toast.error("Erro ao salvar. Alterações revertidas.");
      if (prev) set((state) => ({ items: state.items.map((i) => (i.id === id ? prev : i)) }));
    });
  },

  remove: (id) => {
    const prev = get().items.find((i) => i.id === id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    removerProduto(id).catch(() => {
      toast.error("Erro ao remover. Item restaurado.");
      if (prev) set((state) => ({ items: [...state.items, prev] }));
    });
  },

  duplicate: (id) => {
    const orig = get().items.find((i) => i.id === id);
    if (!orig) return;

    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const copy: Produto = { ...orig, id: tempId, nome: `Cópia de ${orig.nome}`, criadoEm: now, atualizadoEm: now };

    set((state) => ({
      items: [...state.items, copy],
      mutating: [...state.mutating, tempId],
    }));

    duplicarProduto(id)
      .then((saved) => {
        toast.success("Produto duplicado.");
        set((state) => ({
          items: state.items.map((i) => (i.id === tempId ? saved : i)),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      })
      .catch(() => {
        toast.error("Erro ao duplicar. Tente novamente.");
        set((state) => ({
          items: state.items.filter((i) => i.id !== tempId),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      });
  },
}));

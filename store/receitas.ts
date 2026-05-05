"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { Receita } from "@/types";
import {
  criarReceita,
  atualizarReceita,
  removerReceita,
  duplicarReceita,
} from "@/lib/actions/receitas";

interface ReceitaStore {
  items: Receita[];
  mutating: string[];
  hydrate: (items: Receita[]) => void;
  add: (r: Omit<Receita, "id" | "criadoEm" | "atualizadoEm">) => void;
  update: (id: string, r: Partial<Omit<Receita, "id" | "criadoEm">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

export const useReceitaStore = create<ReceitaStore>()((set, get) => ({
  items: [],
  mutating: [],

  hydrate: (items) => set({ items }),

  add: (r) => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: Receita = { ...r, id: tempId, criadoEm: now, atualizadoEm: now };

    set((state) => ({
      items: [...state.items, optimistic],
      mutating: [...state.mutating, tempId],
    }));

    criarReceita(r)
      .then((saved) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === tempId ? saved : i)),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      })
      .catch(() => {
        toast.error("Erro ao salvar receita. Tente novamente.");
        set((state) => ({
          items: state.items.filter((i) => i.id !== tempId),
          mutating: state.mutating.filter((m) => m !== tempId),
        }));
      });
  },

  update: (id, r) => {
    const prev = get().items.find((i) => i.id === id);

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, ...r, atualizadoEm: new Date().toISOString() }
          : item
      ),
    }));

    atualizarReceita(id, r).catch(() => {
      toast.error("Erro ao salvar. Alterações revertidas.");
      if (prev) set((state) => ({ items: state.items.map((i) => (i.id === id ? prev : i)) }));
    });
  },

  remove: (id) => {
    const prev = get().items.find((i) => i.id === id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    removerReceita(id).catch(() => {
      toast.error("Erro ao remover. Item restaurado.");
      if (prev) set((state) => ({ items: [...state.items, prev] }));
    });
  },

  duplicate: (id) => {
    const orig = get().items.find((i) => i.id === id);
    if (!orig) return;

    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const copy: Receita = { ...orig, id: tempId, nome: `Cópia de ${orig.nome}`, criadoEm: now, atualizadoEm: now };

    set((state) => ({
      items: [...state.items, copy],
      mutating: [...state.mutating, tempId],
    }));

    duplicarReceita(id)
      .then((saved) => {
        toast.success("Receita duplicada.");
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

"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { Oferta } from "@/types";
import { criarOferta, atualizarOferta, removerOferta } from "@/lib/actions/ofertas";

interface OfertaStore {
  items: Oferta[];
  mutating: string[];
  hydrate: (items: Oferta[]) => void;
  add: (data: Omit<Oferta, "id" | "criadoEm" | "atualizadoEm">) => void;
  update: (id: string, data: Partial<Omit<Oferta, "id" | "criadoEm">>) => void;
  remove: (id: string) => void;
}

export const useOfertaStore = create<OfertaStore>()((set, get) => ({
  items: [],
  mutating: [],

  hydrate: (items) => set({ items }),

  add: (data) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Oferta = { ...data, id: tempId, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    set((s) => ({ items: [...s.items, optimistic], mutating: [...s.mutating, tempId] }));
    criarOferta(data)
      .then((saved) => set((s) => ({ items: s.items.map((i) => (i.id === tempId ? saved : i)), mutating: s.mutating.filter((id) => id !== tempId) })))
      .catch(() => {
        set((s) => ({ items: s.items.filter((i) => i.id !== tempId), mutating: s.mutating.filter((id) => id !== tempId) }));
        toast.error("Erro ao salvar oferta.");
      });
  },

  update: (id, data) => {
    const prev = get().items;
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)), mutating: [...s.mutating, id] }));
    atualizarOferta(id, data)
      .then((saved) => set((s) => ({ items: s.items.map((i) => (i.id === id ? saved : i)), mutating: s.mutating.filter((m) => m !== id) })))
      .catch(() => {
        set({ items: prev });
        toast.error("Erro ao salvar. Alterações revertidas.");
      });
  },

  remove: (id) => {
    const prev = get().items;
    set((s) => ({ items: s.items.filter((i) => i.id !== id), mutating: [...s.mutating, id] }));
    removerOferta(id)
      .then(() => set((s) => ({ mutating: s.mutating.filter((m) => m !== id) })))
      .catch(() => {
        set({ items: prev });
        toast.error("Erro ao remover. Item restaurado.");
      });
  },
}));

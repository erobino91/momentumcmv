"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { SnapshotCmv } from "@/types";
import { criarSnapshot, removerSnapshot } from "@/lib/actions/snapshots";

interface SnapshotStore {
  items: SnapshotCmv[];
  mutating: string[];
  hydrate: (items: SnapshotCmv[]) => void;
  add: (data: Omit<SnapshotCmv, "id" | "registradoEm">) => Promise<void>;
  remove: (id: string) => void;
}

export const useSnapshotStore = create<SnapshotStore>()((set, get) => ({
  items: [],
  mutating: [],

  hydrate: (items) => set({ items }),

  add: async (data) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: SnapshotCmv = {
      ...data,
      id: tempId,
      registradoEm: new Date().toISOString(),
    };
    set((s) => ({
      items: [...s.items, optimistic],
      mutating: [...s.mutating, tempId],
    }));
    try {
      const saved = await criarSnapshot(data);
      set((s) => ({
        items: s.items.map((i) => (i.id === tempId ? saved : i)),
        mutating: s.mutating.filter((id) => id !== tempId),
      }));
      toast.success("Snapshot registrado com sucesso.");
    } catch {
      set((s) => ({
        items: s.items.filter((i) => i.id !== tempId),
        mutating: s.mutating.filter((id) => id !== tempId),
      }));
      toast.error("Erro ao registrar snapshot.");
    }
  },

  remove: (id) => {
    const prev = get().items;
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      mutating: [...s.mutating, id],
    }));
    removerSnapshot(id)
      .then(() => {
        set((s) => ({ mutating: s.mutating.filter((m) => m !== id) }));
      })
      .catch(() => {
        set({ items: prev });
        toast.error("Erro ao remover snapshot.");
      });
  },
}));

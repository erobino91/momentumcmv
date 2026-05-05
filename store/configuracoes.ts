"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { salvarConfiguracao } from "@/lib/actions/configuracoes";

interface Configuracoes {
  nomeEstabelecimento: string;
  metaCmv: number;
}

interface ConfiguracaoStore extends Configuracoes {
  /** Hidrata o store com dados vindos do servidor — NÃO persiste no DB */
  hydrate: (values: Configuracoes) => void;
  /** Atualiza configurações e persiste no DB */
  set: (values: Partial<Configuracoes>) => void;
}

export const useConfiguracaoStore = create<ConfiguracaoStore>()((set) => ({
  nomeEstabelecimento: "",
  metaCmv: 35,

  hydrate: (values) => set({ ...values }),

  set: (values) => {
    set((state) => ({ ...state, ...values }));
    salvarConfiguracao(values).catch(() => {
      toast.error("Erro ao salvar configurações. Tente novamente.");
    });
  },
}));

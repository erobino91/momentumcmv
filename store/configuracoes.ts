"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { salvarConfiguracao } from "@/lib/actions/configuracoes";

export const DEFAULT_CATEGORIAS_INSUMO = [
  "Carnes", "Aves", "Peixes e Frutos do Mar", "Laticínios", "Hortifruti",
  "Grãos e Cereais", "Bebidas", "Embalagens", "Temperos", "Outros",
];

export const DEFAULT_CATEGORIAS_PRODUTO = [
  "Pizza", "Porção", "À La Carte", "Entrada", "Salada", "Sobremesa", "Bebida",
];

interface Configuracoes {
  nomeEstabelecimento: string;
  metaCmv: number;
  categoriasInsumo: string[];
  categoriasProduto: string[];
}

interface ConfiguracaoStore extends Configuracoes {
  hydrate: (values: Configuracoes) => void;
  set: (values: Partial<Configuracoes>) => void;
}

export const useConfiguracaoStore = create<ConfiguracaoStore>()((set) => ({
  nomeEstabelecimento: "",
  metaCmv: 35,
  categoriasInsumo: DEFAULT_CATEGORIAS_INSUMO,
  categoriasProduto: DEFAULT_CATEGORIAS_PRODUTO,

  hydrate: (values) => set({
    ...values,
    // se o usuário ainda não salvou categorias, usa os defaults
    categoriasInsumo: values.categoriasInsumo.length > 0 ? values.categoriasInsumo : DEFAULT_CATEGORIAS_INSUMO,
    categoriasProduto: values.categoriasProduto.length > 0 ? values.categoriasProduto : DEFAULT_CATEGORIAS_PRODUTO,
  }),

  set: (values) => {
    set((state) => ({ ...state, ...values }));
    salvarConfiguracao(values).catch(() => {
      toast.error("Erro ao salvar configurações. Tente novamente.");
    });
  },
}));

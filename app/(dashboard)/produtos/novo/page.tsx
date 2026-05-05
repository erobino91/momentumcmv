"use client";

import { useRouter } from "next/navigation";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { Produto } from "@/types";

export default function NovoProdutoPage() {
  const router = useRouter();
  const { add } = useProdutoStore();
  const { items: mps } = useMateriaPrimaStore();
  const { items: receitas } = useReceitaStore();

  function handleSave(data: Omit<Produto, "id" | "criadoEm" | "atualizadoEm">) {
    add(data);
    router.push("/produtos");
  }

  return <ProdutoForm materiasPrimas={mps} todasReceitas={receitas} onSave={handleSave} />;
}

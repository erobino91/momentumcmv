"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { Produto } from "@/types";

export default function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items, update } = useProdutoStore();
  const { items: mps } = useMateriaPrimaStore();
  const { items: receitas } = useReceitaStore();

  const produto = items.find((p) => p.id === id);

  if (!produto) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Produto não encontrado.{" "}
        <button className="underline" onClick={() => router.push("/produtos")}>Voltar</button>
      </div>
    );
  }

  function handleSave(data: Omit<Produto, "id" | "criadoEm" | "atualizadoEm">) {
    update(id, data);
    router.push("/produtos");
  }

  return <ProdutoForm materiasPrimas={mps} todasReceitas={receitas} initial={produto} onSave={handleSave} />;
}

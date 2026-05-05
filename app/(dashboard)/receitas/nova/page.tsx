"use client";

import { useRouter } from "next/navigation";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { ReceitaForm } from "@/components/receitas/receita-form";
import { Receita } from "@/types";

export default function NovaReceitaPage() {
  const router = useRouter();
  const { items: receitas, add } = useReceitaStore();
  const { items: mps } = useMateriaPrimaStore();

  function handleSave(data: Omit<Receita, "id" | "criadoEm" | "atualizadoEm">) {
    add(data);
    router.push("/receitas");
  }

  return <ReceitaForm materiasPrimas={mps} todasReceitas={receitas} onSave={handleSave} />;
}

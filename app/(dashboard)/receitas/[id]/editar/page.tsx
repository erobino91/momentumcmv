"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { ReceitaForm } from "@/components/receitas/receita-form";
import { Receita } from "@/types";

export default function EditarReceitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items: receitas, update } = useReceitaStore();
  const { items: mps } = useMateriaPrimaStore();

  const receita = receitas.find((r) => r.id === id);

  if (!receita) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Receita não encontrada.{" "}
        <button className="underline" onClick={() => router.push("/receitas")}>Voltar</button>
      </div>
    );
  }

  function handleSave(data: Omit<Receita, "id" | "criadoEm" | "atualizadoEm">) {
    update(id, data);
    router.push("/receitas");
  }

  return (
    <ReceitaForm
      materiasPrimas={mps}
      todasReceitas={receitas}
      initial={receita}
      onSave={handleSave}
    />
  );
}

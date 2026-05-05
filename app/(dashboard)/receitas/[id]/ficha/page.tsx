"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { FichaTecnica } from "@/components/receitas/ficha-tecnica";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FichaTecnicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items: receitas } = useReceitaStore();
  const { items: mps } = useMateriaPrimaStore();

  const receita = receitas.find((r) => r.id === id);

  if (!receita) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Receita não encontrada.</p>
        <Button variant="outline" onClick={() => router.push("/receitas")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return <FichaTecnica receita={receita} mps={mps} todasReceitas={receitas} onBack={() => router.back()} />;
}

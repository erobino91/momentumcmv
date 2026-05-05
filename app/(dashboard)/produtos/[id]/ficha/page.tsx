"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { FichaProduto } from "@/components/produtos/ficha-produto";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FichaProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { items: produtos } = useProdutoStore();
  const { items: mps } = useMateriaPrimaStore();
  const { items: receitas } = useReceitaStore();

  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/produtos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return <FichaProduto produto={produto} mps={mps} receitas={receitas} onBack={() => router.back()} />;
}

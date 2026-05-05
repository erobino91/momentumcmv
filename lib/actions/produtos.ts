"use server";

import { auth } from "@clerk/nextjs/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { Produto, ReceitaIngrediente } from "@/types";

type DbProduto = Awaited<ReturnType<typeof db.produto.findFirst>>;

function toType(row: NonNullable<DbProduto>): Produto {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria as Produto["categoria"],
    rendimento: row.rendimento,
    unidadeRendimento: row.unidadeRendimento as Produto["unidadeRendimento"],
    ingredientes: (row.ingredientes as unknown as ReceitaIngrediente[]) ?? [],
    precoVenda: row.precoVenda,
    tempoPreparo: row.tempoPreparo ?? undefined,
    observacao: row.observacao ?? undefined,
    criadoEm: row.criadoEm.toISOString(),
    atualizadoEm: row.atualizadoEm.toISOString(),
  };
}

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

const _getProdutos = unstable_cache(
  async (userId: string) => {
    const rows = await db.produto.findMany({
      where: { userId },
      orderBy: { criadoEm: "asc" },
    });
    return rows.map(toType);
  },
  ["produtos"],
  { tags: ["produtos"], revalidate: 30 }
);

export async function getProdutos(): Promise<Produto[]> {
  const userId = await getUserId();
  return _getProdutos(userId);
}

export async function criarProduto(
  data: Omit<Produto, "id" | "criadoEm" | "atualizadoEm">
): Promise<Produto> {
  const userId = await getUserId();
  const row = await db.produto.create({
    data: {
      userId,
      nome: data.nome,
      categoria: data.categoria,
      rendimento: data.rendimento,
      unidadeRendimento: data.unidadeRendimento,
      ingredientes: (data.ingredientes ?? []) as unknown as object[],
      precoVenda: data.precoVenda,
      tempoPreparo: data.tempoPreparo,
      observacao: data.observacao,
    },
  });
  revalidateTag("produtos", "max");
  return toType(row);
}

export async function atualizarProduto(
  id: string,
  data: Partial<Omit<Produto, "id" | "criadoEm">>
): Promise<Produto> {
  const userId = await getUserId();
  const row = await db.produto.update({
    where: { id, userId },
    data: {
      nome: data.nome,
      categoria: data.categoria,
      rendimento: data.rendimento,
      unidadeRendimento: data.unidadeRendimento,
      ingredientes: (data.ingredientes ?? undefined) as unknown as object[],
      precoVenda: data.precoVenda,
      tempoPreparo: data.tempoPreparo,
      observacao: data.observacao,
    },
  });
  revalidateTag("produtos", "max");
  return toType(row);
}

export async function removerProduto(id: string): Promise<void> {
  const userId = await getUserId();
  await db.produto.delete({ where: { id, userId } });
  revalidateTag("produtos", "max");
}

export async function duplicarProduto(id: string): Promise<Produto> {
  const userId = await getUserId();
  const orig = await db.produto.findFirst({ where: { id, userId } });
  if (!orig) throw new Error("Produto não encontrado");
  const row = await db.produto.create({
    data: {
      userId,
      nome: `Cópia de ${orig.nome}`,
      categoria: orig.categoria,
      rendimento: orig.rendimento,
      unidadeRendimento: orig.unidadeRendimento,
      ingredientes: orig.ingredientes as unknown as object[],
      precoVenda: orig.precoVenda,
      tempoPreparo: orig.tempoPreparo,
      observacao: orig.observacao,
    },
  });
  revalidateTag("produtos", "max");
  return toType(row);
}

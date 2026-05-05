"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { Receita, ReceitaIngrediente } from "@/types";

type DbReceita = Awaited<ReturnType<typeof db.receita.findFirst>>;

function toType(row: NonNullable<DbReceita>): Receita {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria as Receita["categoria"],
    rendimento: row.rendimento,
    unidadeRendimento: row.unidadeRendimento as Receita["unidadeRendimento"],
    ingredientes: (row.ingredientes as ReceitaIngrediente[]) ?? [],
    modoPreparo: row.modoPreparo ?? undefined,
    tempoPreparo: row.tempoPreparo ?? undefined,
    precoVenda: row.precoVenda ?? undefined,
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

export async function getReceitas(): Promise<Receita[]> {
  const userId = await getUserId();
  const rows = await db.receita.findMany({
    where: { userId },
    orderBy: { criadoEm: "asc" },
  });
  return rows.map(toType);
}

export async function criarReceita(
  data: Omit<Receita, "id" | "criadoEm" | "atualizadoEm">
): Promise<Receita> {
  const userId = await getUserId();
  const row = await db.receita.create({
    data: {
      userId,
      nome: data.nome,
      categoria: data.categoria,
      rendimento: data.rendimento,
      unidadeRendimento: data.unidadeRendimento,
      ingredientes: data.ingredientes ?? [],
      modoPreparo: data.modoPreparo,
      tempoPreparo: data.tempoPreparo,
      precoVenda: data.precoVenda,
      observacao: data.observacao,
    },
  });
  return toType(row);
}

export async function atualizarReceita(
  id: string,
  data: Partial<Omit<Receita, "id" | "criadoEm">>
): Promise<Receita> {
  const userId = await getUserId();
  const row = await db.receita.update({
    where: { id, userId },
    data: {
      nome: data.nome,
      categoria: data.categoria,
      rendimento: data.rendimento,
      unidadeRendimento: data.unidadeRendimento,
      ingredientes: data.ingredientes ?? undefined,
      modoPreparo: data.modoPreparo,
      tempoPreparo: data.tempoPreparo,
      precoVenda: data.precoVenda,
      observacao: data.observacao,
    },
  });
  return toType(row);
}

export async function removerReceita(id: string): Promise<void> {
  const userId = await getUserId();
  await db.receita.delete({ where: { id, userId } });
}

export async function duplicarReceita(id: string): Promise<Receita> {
  const userId = await getUserId();
  const orig = await db.receita.findFirst({ where: { id, userId } });
  if (!orig) throw new Error("Receita não encontrada");
  const row = await db.receita.create({
    data: {
      userId,
      nome: `Cópia de ${orig.nome}`,
      categoria: orig.categoria,
      rendimento: orig.rendimento,
      unidadeRendimento: orig.unidadeRendimento,
      ingredientes: orig.ingredientes,
      modoPreparo: orig.modoPreparo,
      tempoPreparo: orig.tempoPreparo,
      precoVenda: orig.precoVenda,
      observacao: orig.observacao,
    },
  });
  return toType(row);
}

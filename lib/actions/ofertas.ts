"use server";

import { auth } from "@clerk/nextjs/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { Oferta, OfertaItem } from "@/types";

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

type DbOferta = Awaited<ReturnType<typeof db.oferta.findFirst>>;

function toType(row: NonNullable<DbOferta>): Oferta {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? undefined,
    itens: (row.itens as unknown as OfertaItem[]) ?? [],
    precoVenda: row.precoVenda,
    ativo: row.ativo,
    criadoEm: row.criadoEm.toISOString(),
    atualizadoEm: row.atualizadoEm.toISOString(),
  };
}

const _getOfertas = unstable_cache(
  async (userId: string) => {
    const rows = await db.oferta.findMany({ where: { userId }, orderBy: { criadoEm: "asc" } });
    return rows.map(toType);
  },
  ["ofertas"],
  { tags: ["ofertas"], revalidate: 30 }
);

export async function getOfertas(): Promise<Oferta[]> {
  const userId = await getUserId();
  return _getOfertas(userId);
}

export async function criarOferta(data: Omit<Oferta, "id" | "criadoEm" | "atualizadoEm">): Promise<Oferta> {
  const userId = await getUserId();
  const row = await db.oferta.create({
    data: { userId, nome: data.nome, descricao: data.descricao, itens: data.itens as unknown as object[], precoVenda: data.precoVenda, ativo: data.ativo },
  });
  revalidateTag("ofertas", "max");
  return toType(row);
}

export async function atualizarOferta(id: string, data: Partial<Omit<Oferta, "id" | "criadoEm">>): Promise<Oferta> {
  const userId = await getUserId();
  const row = await db.oferta.update({
    where: { id, userId },
    data: { nome: data.nome, descricao: data.descricao, itens: data.itens as unknown as object[] | undefined, precoVenda: data.precoVenda, ativo: data.ativo },
  });
  revalidateTag("ofertas", "max");
  return toType(row);
}

export async function removerOferta(id: string): Promise<void> {
  const userId = await getUserId();
  await db.oferta.delete({ where: { id, userId } });
  revalidateTag("ofertas", "max");
}

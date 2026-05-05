"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export interface ConfiguracaoData {
  nomeEstabelecimento: string;
  metaCmv: number;
  categoriasInsumo: string[];
  categoriasProduto: string[];
}

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

export async function getConfiguracao(): Promise<ConfiguracaoData> {
  const userId = await getUserId();
  const row = await db.configuracao.findUnique({ where: { userId } });
  return {
    nomeEstabelecimento: row?.nomeEstabelecimento ?? "",
    metaCmv: row?.metaCmv ?? 35,
    categoriasInsumo: (row?.categoriasInsumo as unknown as string[]) ?? [],
    categoriasProduto: (row?.categoriasProduto as unknown as string[]) ?? [],
  };
}

export async function salvarConfiguracao(data: Partial<ConfiguracaoData>): Promise<ConfiguracaoData> {
  const userId = await getUserId();
  const row = await db.configuracao.upsert({
    where: { userId },
    update: {
      nomeEstabelecimento: data.nomeEstabelecimento,
      metaCmv: data.metaCmv,
      ...(data.categoriasInsumo !== undefined && { categoriasInsumo: data.categoriasInsumo as unknown as object[] }),
      ...(data.categoriasProduto !== undefined && { categoriasProduto: data.categoriasProduto as unknown as object[] }),
    },
    create: {
      userId,
      nomeEstabelecimento: data.nomeEstabelecimento ?? "",
      metaCmv: data.metaCmv ?? 35,
      categoriasInsumo: (data.categoriasInsumo ?? []) as unknown as object[],
      categoriasProduto: (data.categoriasProduto ?? []) as unknown as object[],
    },
  });
  return {
    nomeEstabelecimento: row.nomeEstabelecimento,
    metaCmv: row.metaCmv,
    categoriasInsumo: (row.categoriasInsumo as unknown as string[]) ?? [],
    categoriasProduto: (row.categoriasProduto as unknown as string[]) ?? [],
  };
}

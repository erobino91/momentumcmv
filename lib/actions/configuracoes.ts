"use server";

import { auth } from "@clerk/nextjs/server";
import { unstable_cache, revalidateTag } from "next/cache";
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

const _getConfiguracao = unstable_cache(
  async (userId: string): Promise<ConfiguracaoData> => {
    const row = await db.configuracao.findUnique({ where: { userId } });
    return {
      nomeEstabelecimento: row?.nomeEstabelecimento ?? "",
      metaCmv: row?.metaCmv ?? 35,
      categoriasInsumo: (row?.categoriasInsumo as unknown as string[]) ?? [],
      categoriasProduto: (row?.categoriasProduto as unknown as string[]) ?? [],
    };
  },
  ["config"],
  { tags: ["config"], revalidate: 30 }
);

export async function getConfiguracao(): Promise<ConfiguracaoData> {
  const userId = await getUserId();
  return _getConfiguracao(userId);
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
  revalidateTag("config", "max");
  return {
    nomeEstabelecimento: row.nomeEstabelecimento,
    metaCmv: row.metaCmv,
    categoriasInsumo: (row.categoriasInsumo as unknown as string[]) ?? [],
    categoriasProduto: (row.categoriasProduto as unknown as string[]) ?? [],
  };
}

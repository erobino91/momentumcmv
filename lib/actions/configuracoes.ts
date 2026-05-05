"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export interface ConfiguracaoData {
  nomeEstabelecimento: string;
  metaCmv: number;
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
  };
}

export async function salvarConfiguracao(data: Partial<ConfiguracaoData>): Promise<ConfiguracaoData> {
  const userId = await getUserId();
  const row = await db.configuracao.upsert({
    where: { userId },
    update: {
      nomeEstabelecimento: data.nomeEstabelecimento,
      metaCmv: data.metaCmv,
    },
    create: {
      userId,
      nomeEstabelecimento: data.nomeEstabelecimento ?? "",
      metaCmv: data.metaCmv ?? 35,
    },
  });
  return {
    nomeEstabelecimento: row.nomeEstabelecimento,
    metaCmv: row.metaCmv,
  };
}

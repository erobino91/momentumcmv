"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { MateriaPrima, HistoricoPrecoEntry } from "@/types";

type DbMateriaPrima = Awaited<ReturnType<typeof db.materiaPrima.findFirst>>;

function toType(row: NonNullable<DbMateriaPrima>): MateriaPrima {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria as MateriaPrima["categoria"],
    unidade: row.unidade as MateriaPrima["unidade"],
    custoUnitario: row.custoUnitario,
    fatorCorrecao: row.fatorCorrecao,
    embalagem: row.embalagem as MateriaPrima["embalagem"] ?? undefined,
    fornecedor: row.fornecedor ?? undefined,
    observacao: row.observacao ?? undefined,
    historicoPreco: (row.historicoPreco as unknown as HistoricoPrecoEntry[]) ?? [],
    criadoEm: row.criadoEm.toISOString(),
    atualizadoEm: row.atualizadoEm.toISOString(),
  };
}

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

export async function getMateriasPrimas(): Promise<MateriaPrima[]> {
  const userId = await getUserId();
  const rows = await db.materiaPrima.findMany({
    where: { userId },
    orderBy: { criadoEm: "asc" },
  });
  return rows.map(toType);
}

export async function criarMateriaPrima(
  data: Omit<MateriaPrima, "id" | "criadoEm" | "atualizadoEm">
): Promise<MateriaPrima> {
  const userId = await getUserId();
  const row = await db.materiaPrima.create({
    data: {
      userId,
      nome: data.nome,
      categoria: data.categoria,
      unidade: data.unidade,
      custoUnitario: data.custoUnitario,
      fatorCorrecao: data.fatorCorrecao,
      embalagem: (data.embalagem ?? undefined) as unknown as object,
      fornecedor: data.fornecedor,
      observacao: data.observacao,
      historicoPreco: (data.historicoPreco ?? []) as unknown as object[],
    },
  });
  return toType(row);
}

export async function atualizarMateriaPrima(
  id: string,
  data: Partial<Omit<MateriaPrima, "id" | "criadoEm">>
): Promise<MateriaPrima> {
  const userId = await getUserId();
  const row = await db.materiaPrima.update({
    where: { id, userId },
    data: {
      nome: data.nome,
      categoria: data.categoria,
      unidade: data.unidade,
      custoUnitario: data.custoUnitario,
      fatorCorrecao: data.fatorCorrecao,
      embalagem: (data.embalagem ?? undefined) as unknown as object,
      fornecedor: data.fornecedor,
      observacao: data.observacao,
      historicoPreco: (data.historicoPreco ?? undefined) as unknown as object[],
    },
  });
  return toType(row);
}

export async function removerMateriaPrima(id: string): Promise<void> {
  const userId = await getUserId();
  await db.materiaPrima.delete({ where: { id, userId } });
}

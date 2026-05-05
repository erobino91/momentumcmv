"use server";

import { auth } from "@clerk/nextjs/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { SnapshotCmv, SnapshotProduto } from "@/types";

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

type DbSnapshot = Awaited<ReturnType<typeof db.snapshotCmv.findFirst>>;

function toType(row: NonNullable<DbSnapshot>): SnapshotCmv {
  return {
    id: row.id,
    cmvMedio: row.cmvMedio,
    metaCmv: row.metaCmv,
    totalProdutos: row.totalProdutos,
    acimaDaMeta: row.acimaDaMeta,
    detalhes: (row.detalhes as unknown as SnapshotProduto[]) ?? [],
    registradoEm: row.registradoEm.toISOString(),
  };
}

const _getSnapshots = unstable_cache(
  async (userId: string) => {
    const rows = await db.snapshotCmv.findMany({
      where: { userId },
      orderBy: { registradoEm: "asc" },
    });
    return rows.map(toType);
  },
  ["snapshots"],
  { tags: ["snapshots"], revalidate: 30 }
);

export async function getSnapshots(): Promise<SnapshotCmv[]> {
  const userId = await getUserId();
  return _getSnapshots(userId);
}

export async function criarSnapshot(
  data: Omit<SnapshotCmv, "id" | "registradoEm">
): Promise<SnapshotCmv> {
  const userId = await getUserId();
  const row = await db.snapshotCmv.create({
    data: {
      userId,
      cmvMedio: data.cmvMedio,
      metaCmv: data.metaCmv,
      totalProdutos: data.totalProdutos,
      acimaDaMeta: data.acimaDaMeta,
      detalhes: data.detalhes as unknown as object[],
    },
  });
  revalidateTag("snapshots", "max");
  return toType(row);
}

export async function removerSnapshot(id: string): Promise<void> {
  const userId = await getUserId();
  await db.snapshotCmv.delete({ where: { id, userId } });
  revalidateTag("snapshots", "max");
}

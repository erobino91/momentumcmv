"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { MateriaPrima, Receita, Produto } from "@/types";
import { BackupData } from "@/lib/backup";

async function getUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

export async function restaurarBackup(backup: BackupData): Promise<void> {
  const userId = await getUserId();
  const { materiasPrimas, receitas, produtos, configuracoes } = backup.data;

  await db.$transaction(async (tx) => {
    // ── Matérias-Primas ──────────────────────────────────────────────
    await tx.materiaPrima.deleteMany({ where: { userId } });
    if (materiasPrimas.length > 0) {
      await tx.materiaPrima.createMany({
        data: materiasPrimas.map((mp: MateriaPrima) => ({
          id: mp.id,
          userId,
          nome: mp.nome,
          categoria: mp.categoria,
          unidade: mp.unidade,
          custoUnitario: mp.custoUnitario,
          fatorCorrecao: mp.fatorCorrecao,
          embalagem: (mp.embalagem ?? undefined) as unknown as object,
          fornecedor: mp.fornecedor,
          observacao: mp.observacao,
          historicoPreco: (mp.historicoPreco ?? []) as unknown as object[],
          criadoEm: new Date(mp.criadoEm),
        })),
      });
    }

    // ── Receitas ─────────────────────────────────────────────────────
    await tx.receita.deleteMany({ where: { userId } });
    if (receitas.length > 0) {
      await tx.receita.createMany({
        data: receitas.map((r: Receita) => ({
          id: r.id,
          userId,
          nome: r.nome,
          categoria: r.categoria,
          rendimento: r.rendimento,
          unidadeRendimento: r.unidadeRendimento,
          ingredientes: (r.ingredientes ?? []) as unknown as object[],
          modoPreparo: r.modoPreparo,
          tempoPreparo: r.tempoPreparo,
          precoVenda: r.precoVenda,
          observacao: r.observacao,
          criadoEm: new Date(r.criadoEm),
        })),
      });
    }

    // ── Produtos ─────────────────────────────────────────────────────
    await tx.produto.deleteMany({ where: { userId } });
    if (produtos.length > 0) {
      await tx.produto.createMany({
        data: produtos.map((p: Produto) => ({
          id: p.id,
          userId,
          nome: p.nome,
          categoria: p.categoria,
          rendimento: p.rendimento,
          unidadeRendimento: p.unidadeRendimento,
          ingredientes: (p.ingredientes ?? []) as unknown as object[],
          precoVenda: p.precoVenda,
          tempoPreparo: p.tempoPreparo,
          observacao: p.observacao,
          criadoEm: new Date(p.criadoEm),
        })),
      });
    }

    // ── Configurações ────────────────────────────────────────────────
    await tx.configuracao.upsert({
      where: { userId },
      update: {
        nomeEstabelecimento: configuracoes.nomeEstabelecimento,
        metaCmv: configuracoes.metaCmv,
      },
      create: {
        userId,
        nomeEstabelecimento: configuracoes.nomeEstabelecimento,
        metaCmv: configuracoes.metaCmv,
      },
    });
  });
}

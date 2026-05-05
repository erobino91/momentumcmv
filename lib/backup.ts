import { MateriaPrima, Receita, Produto } from "@/types";

export const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    materiasPrimas: MateriaPrima[];
    receitas: Receita[];
    produtos: Produto[];
    configuracoes: {
      nomeEstabelecimento: string;
      metaCmv: number;
      categoriasInsumo?: string[];
      categoriasProduto?: string[];
    };
  };
}

export function createBackup(
  materiasPrimas: MateriaPrima[],
  receitas: Receita[],
  produtos: Produto[],
  configuracoes: { nomeEstabelecimento: string; metaCmv: number; categoriasInsumo?: string[]; categoriasProduto?: string[] }
): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { materiasPrimas, receitas, produtos, configuracoes },
  };
}

export function downloadBackup(backup: BackupData) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `momentum-cmv-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateBackup(raw: unknown): raw is BackupData {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;
  if (b.version !== BACKUP_VERSION) return false;
  if (!b.data || typeof b.data !== "object") return false;
  const d = b.data as Record<string, unknown>;
  return (
    Array.isArray(d.materiasPrimas) &&
    Array.isArray(d.receitas) &&
    Array.isArray(d.produtos) &&
    typeof d.configuracoes === "object"
  );
}

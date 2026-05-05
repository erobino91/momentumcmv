"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { CategoriaInsumo, UnidadeMedida } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Mapeamento label → chave (aceita ambos)
const CATEGORIAS: Record<string, CategoriaInsumo> = {
  carnes: "carnes", "Carnes": "carnes",
  aves: "aves", "Aves": "aves",
  peixes: "peixes", "Peixes": "peixes",
  laticinios: "laticinios", "Laticínios": "laticinios", "Laticinios": "laticinios",
  hortifruti: "hortifruti", "Hortifruti": "hortifruti",
  graos: "graos", "Grãos": "graos", "Graos": "graos",
  bebidas: "bebidas", "Bebidas": "bebidas",
  embalagens: "embalagens", "Embalagens": "embalagens",
  temperos: "temperos", "Temperos": "temperos",
  outros: "outros", "Outros": "outros",
};

const UNIDADES: Record<string, UnidadeMedida> = {
  kg: "kg", g: "g", L: "L", l: "L", ml: "ml",
  un: "un", cx: "cx", dz: "dz", pct: "pct",
};

interface LinhaImport {
  linha: number;
  nome: string;
  categoria: CategoriaInsumo | null;
  unidade: UnidadeMedida | null;
  custoUnitario: number | null;
  fatorCorrecao: number;
  fornecedor: string;
  observacao: string;
  erros: string[];
}

function parseCsv(text: string): LinhaImport[] {
  // Remove BOM se presente
  const clean = text.replace(/^\uFEFF/, "");
  const linhas = clean.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];

  // Detecta separador (ponto e vírgula ou vírgula)
  const sep = linhas[0].includes(";") ? ";" : ",";

  // Pula header
  const rows = linhas.slice(1);

  return rows.map((row, i) => {
    const cols = row.split(sep).map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    const [nomeRaw, catRaw, unRaw, custoRaw, , fcRaw, fornRaw, obsRaw] = cols;
    // cols[4] = Custo Líquido — ignorado (derivado)

    const erros: string[] = [];
    const nome = (nomeRaw ?? "").trim();
    if (!nome) erros.push("Nome obrigatório");

    const categoria = CATEGORIAS[catRaw?.trim() ?? ""] ?? null;
    if (!categoria) erros.push(`Categoria inválida: "${catRaw}"`);

    const unidade = UNIDADES[unRaw?.trim() ?? ""] ?? null;
    if (!unidade) erros.push(`Unidade inválida: "${unRaw}"`);

    const custoUnitario = parseFloat((custoRaw ?? "").replace(",", "."));
    if (isNaN(custoUnitario) || custoUnitario < 0) erros.push("Custo inválido");

    const fatorCorrecao = parseFloat((fcRaw ?? "1").replace(",", "."));
    const fc = isNaN(fatorCorrecao) || fatorCorrecao <= 0 ? 1 : fatorCorrecao;

    return {
      linha: i + 2,
      nome,
      categoria,
      unidade,
      custoUnitario: isNaN(custoUnitario) ? null : custoUnitario,
      fatorCorrecao: fc,
      fornecedor: (fornRaw ?? "").trim(),
      observacao: (obsRaw ?? "").trim(),
      erros,
    };
  });
}

function downloadTemplate() {
  const header = "Nome;Categoria;Unidade;Custo Unitário (R$);Fator de Correção;Fornecedor;Observação";
  const exemplo = "Farinha de Trigo;graos;kg;4.50;1.00;Fornecedor X;";
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + "\n" + exemplo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-materias-primas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportCsvButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { add } = useMateriaPrimaStore();
  const [linhas, setLinhas] = useState<LinhaImport[]>([]);
  const [open, setOpen] = useState(false);
  const [importando, setImportando] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("Arquivo vazio ou inválido.");
        return;
      }
      setLinhas(parsed);
      setOpen(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  const validas = linhas.filter((l) => l.erros.length === 0);
  const invalidas = linhas.filter((l) => l.erros.length > 0);

  async function handleImport() {
    setImportando(true);
    for (const l of validas) {
      add({
        nome: l.nome,
        categoria: l.categoria!,
        unidade: l.unidade!,
        custoUnitario: l.custoUnitario!,
        fatorCorrecao: l.fatorCorrecao,
        fornecedor: l.fornecedor || undefined,
        observacao: l.observacao || undefined,
        historicoPreco: [],
      });
      // Pequeno delay pra não sobrecarregar server actions em paralelo
      await new Promise((r) => setTimeout(r, 50));
    }
    toast.success(`${validas.length} matéria${validas.length !== 1 ? "s-primas" : "-prima"} importada${validas.length !== 1 ? "s" : ""}.`);
    setOpen(false);
    setImportando(false);
    setLinhas([]);
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={downloadTemplate}>
          <Download className="w-3.5 h-3.5" />
          Template
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" />
          Importar CSV
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!importando) { setOpen(v); if (!v) setLinhas([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Matérias-Primas</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 text-sm mb-2 shrink-0">
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-4 h-4" /> {validas.length} válidas
            </span>
            {invalidas.length > 0 && (
              <span className="flex items-center gap-1.5 text-destructive">
                <XCircle className="w-4 h-4" /> {invalidas.length} com erro
              </span>
            )}
          </div>

          <div className="overflow-auto flex-1 border rounded-lg text-sm">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium text-xs">Linha</th>
                  <th className="text-left p-2 font-medium text-xs">Nome</th>
                  <th className="text-left p-2 font-medium text-xs">Cat.</th>
                  <th className="text-left p-2 font-medium text-xs">Un.</th>
                  <th className="text-right p-2 font-medium text-xs">Custo</th>
                  <th className="text-left p-2 font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.linha} className={l.erros.length > 0 ? "bg-destructive/5" : ""}>
                    <td className="p-2 text-muted-foreground">{l.linha}</td>
                    <td className="p-2 max-w-[120px] truncate">{l.nome || "—"}</td>
                    <td className="p-2 text-muted-foreground">{l.categoria ?? <span className="text-destructive">{l.erros.find(e => e.includes("Categoria"))?.split('"')[1]}</span>}</td>
                    <td className="p-2 text-muted-foreground">{l.unidade ?? "—"}</td>
                    <td className="p-2 text-right tabular-nums">
                      {l.custoUnitario !== null ? `R$ ${l.custoUnitario.toFixed(4)}` : "—"}
                    </td>
                    <td className="p-2">
                      {l.erros.length === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-destructive">{l.erros.join(", ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importando}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={validas.length === 0 || importando}>
              {importando ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando…</>
              ) : (
                `Importar ${validas.length} item${validas.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

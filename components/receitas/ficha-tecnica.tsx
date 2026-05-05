"use client";

import { Receita, MateriaPrima, calcularCustoReceita, custoLiquido } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";

const categoriaLabel: Record<string, string> = {
  entrada: "Entrada", prato_principal: "Prato Principal", lanche: "Lanche",
  pizza: "Pizza", massa: "Massas", porcao: "Porção", ingrediente: "Ingrediente / Preparo Base",
  sobremesa: "Sobremesa", bebida: "Bebida", outro: "Outro",
};

const unidadeLabel: Record<string, string> = {
  porcoes: "porções", unidades: "unidades", kg: "kg", g: "g", L: "L", ml: "ml",
};

function nomeIngrediente(ing: Receita["ingredientes"][0], mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>) {
  if (ing.tipo === "receita" && ing.receitaId) return receitaMap.get(ing.receitaId)?.nome ?? "—";
  if (ing.materiaPrimaId) return mpMap.get(ing.materiaPrimaId)?.nome ?? "—";
  return "—";
}

function unidadeIngrediente(ing: Receita["ingredientes"][0], mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>) {
  if (ing.tipo === "receita" && ing.receitaId) return receitaMap.get(ing.receitaId)?.unidadeRendimento ?? "—";
  if (ing.materiaPrimaId) return mpMap.get(ing.materiaPrimaId)?.unidade ?? "—";
  return "—";
}

function custoUnitarioIngrediente(ing: Receita["ingredientes"][0], mpMap: Map<string, MateriaPrima>, receitaMap: Map<string, Receita>, mps: MateriaPrima[], todasReceitas: Receita[]) {
  if (ing.tipo === "receita" && ing.receitaId) {
    const sub = receitaMap.get(ing.receitaId);
    if (!sub) return 0;
    return calcularCustoReceita(sub, mps, todasReceitas).custoPorcao;
  }
  if (ing.materiaPrimaId) {
    const mp = mpMap.get(ing.materiaPrimaId);
    if (!mp) return 0;
    return custoLiquido(mp);
  }
  return 0;
}

interface Props {
  receita: Receita;
  mps: MateriaPrima[];
  todasReceitas: Receita[];
  onBack: () => void;
}

export function FichaTecnica({ receita, mps, todasReceitas, onBack }: Props) {
  const { metaCmv: CMV_META, nomeEstabelecimento } = useConfiguracaoStore();
  const mpMap = new Map(mps.map((m) => [m.id, m]));
  const receitaMap = new Map(todasReceitas.map((r) => [r.id, r]));
  const { custoTotal, custoPorcao, cmv } = calcularCustoReceita(receita, mps, todasReceitas);

  const cmvColor = cmv === null ? "" : cmv <= CMV_META ? "#16a34a" : cmv <= CMV_META * 1.15 ? "#d97706" : "#dc2626";
  const cmvBg = cmv === null ? "" : cmv <= CMV_META ? "#f0fdf4" : cmv <= CMV_META * 1.15 ? "#fffbeb" : "#fef2f2";

  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center gap-3 px-8 py-4 bg-white border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground flex-1">Ficha Técnica — {receita.nome}</span>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Ficha */}
      <div className="max-w-3xl mx-auto my-8 print:my-0 bg-white shadow-md print:shadow-none print:max-w-none">

        {/* Header vermelho */}
        <div style={{ backgroundColor: "#D1222A" }} className="px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">{nomeEstabelecimento || "Momentum CMV"}</p>
            <h1 className="text-white text-2xl font-bold mt-0.5">{receita.nome}</h1>
          </div>
          <div className="text-right">
            <p className="text-white text-xs opacity-70">Ficha Técnica</p>
            <p className="text-white text-sm font-medium">{dataHoje}</p>
          </div>
        </div>

        {/* Info rápida */}
        <div className="grid grid-cols-4 divide-x border-b text-center text-sm">
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Categoria</p>
            <p className="font-semibold mt-0.5">{categoriaLabel[receita.categoria] ?? receita.categoria}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Rendimento</p>
            <p className="font-semibold mt-0.5">{receita.rendimento} {unidadeLabel[receita.unidadeRendimento] ?? receita.unidadeRendimento}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tempo de preparo</p>
            <p className="font-semibold mt-0.5">{receita.tempoPreparo ? `${receita.tempoPreparo} min` : "—"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Preço de venda</p>
            <p className="font-semibold mt-0.5">{receita.precoVenda ? `R$ ${receita.precoVenda.toFixed(2)}` : "—"}</p>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* Tabela de ingredientes */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Ingredientes</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#1a1a1a", color: "white" }}>
                  <th className="text-left px-3 py-2 font-medium rounded-tl">Ingrediente</th>
                  <th className="text-right px-3 py-2 font-medium">Qtd</th>
                  <th className="text-center px-3 py-2 font-medium">Un</th>
                  <th className="text-right px-3 py-2 font-medium">Custo/Un</th>
                  <th className="text-right px-3 py-2 font-medium rounded-tr">Total</th>
                </tr>
              </thead>
              <tbody>
                {receita.ingredientes.map((ing, idx) => {
                  const nome = nomeIngrediente(ing, mpMap, receitaMap);
                  const unidade = unidadeIngrediente(ing, mpMap, receitaMap);
                  const custoUn = custoUnitarioIngrediente(ing, mpMap, receitaMap, mps, todasReceitas);
                  const total = ing.quantidade * custoUn;
                  const isReceita = (ing.tipo ?? "materia_prima") === "receita";
                  return (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#f9fafb" : "white" }}>
                      <td className="px-3 py-2 border-b border-gray-100">
                        <span className="flex items-center gap-1.5">
                          {isReceita && <span className="text-purple-500 text-xs">↳</span>}
                          {nome}
                          {isReceita && <span className="text-xs text-gray-400">(preparo)</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right tabular-nums">{ing.quantidade.toFixed(3)}</td>
                      <td className="px-3 py-2 border-b border-gray-100 text-center text-gray-500">{unidade}</td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right tabular-nums">R$ {custoUn.toFixed(4)}</td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right tabular-nums font-medium">R$ {total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#1a1a1a", color: "white" }}>
                  <td colSpan={4} className="px-3 py-2 font-semibold text-right rounded-bl">Custo Total da Receita</td>
                  <td className="px-3 py-2 font-bold tabular-nums text-right rounded-br">R$ {custoTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Resumo de custos + CMV */}
          <section className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2 text-sm">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Resumo de Custos</h2>
              <div className="flex justify-between">
                <span className="text-gray-500">Custo total</span>
                <span className="font-medium tabular-nums">R$ {custoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rendimento</span>
                <span className="font-medium">{receita.rendimento} {unidadeLabel[receita.unidadeRendimento]}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="text-gray-500">Custo / {unidadeLabel[receita.unidadeRendimento] === "porções" ? "porção" : unidadeLabel[receita.unidadeRendimento]}</span>
                <span className="font-bold tabular-nums">R$ {custoPorcao.toFixed(2)}</span>
              </div>
              {receita.precoVenda && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Preço de venda</span>
                  <span className="font-medium tabular-nums">R$ {receita.precoVenda.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 flex flex-col items-center justify-center text-center"
              style={{ backgroundColor: cmv !== null ? cmvBg : undefined }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">CMV</p>
              {cmv !== null ? (
                <>
                  <p className="text-4xl font-bold tabular-nums" style={{ color: cmvColor }}>{cmv.toFixed(1)}%</p>
                  <p className="text-xs mt-1" style={{ color: cmvColor }}>
                    {cmv <= CMV_META ? "✓ Dentro da meta" : `↑ ${(cmv - CMV_META).toFixed(1)}pp acima da meta`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">meta ≤ {CMV_META}%</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Informe o preço de venda</p>
              )}
            </div>
          </section>

          {/* Modo de preparo */}
          {receita.modoPreparo && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Modo de Preparo</h2>
              <div className="border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                {receita.modoPreparo}
              </div>
            </section>
          )}

          {/* Observação */}
          {receita.observacao && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Observações</h2>
              <p className="text-sm text-gray-600 border-l-4 border-gray-200 pl-3">{receita.observacao}</p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t flex items-center justify-between text-xs text-gray-400">
          <span>Gerado por <strong className="text-gray-600">Momentum CMV</strong></span>
          <span>{dataHoje}</span>
        </div>
      </div>
    </div>
  );
}

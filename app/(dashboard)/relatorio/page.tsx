"use client";

import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useProdutoStore } from "@/store/produtos";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoProduto, calcularCustoReceita, custoLiquido } from "@/types";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";

function fmt(n: number, dec = 2) {
  return n.toFixed(dec).replace(".", ",");
}

function CmvBadge({ cmv, meta }: { cmv: number; meta: number }) {
  const cor =
    cmv <= meta ? "bg-green-100 text-green-800 border-green-300"
    : cmv <= meta * 1.15 ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold tabular-nums ${cor}`}>
      {fmt(cmv, 1)}%
    </span>
  );
}

export default function RelatorioPage() {
  const { items: mps } = useMateriaPrimaStore();
  const { items: receitas } = useReceitaStore();
  const { items: produtos } = useProdutoStore();
  const { metaCmv, nomeEstabelecimento } = useConfiguracaoStore();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Produtos com CMV calculado
  const produtosCalc = produtos
    .map((p) => {
      const { custoPorcao, cmv } = calcularCustoProduto(p, mps, receitas);
      const mc = p.precoVenda - custoPorcao;
      return { produto: p, custoPorcao, cmv, mc };
    })
    .sort((a, b) => b.cmv - a.cmv);

  const cmvMedio = produtosCalc.length > 0
    ? produtosCalc.reduce((s, p) => s + p.cmv, 0) / produtosCalc.length
    : null;
  const acimaDaMeta = produtosCalc.filter((p) => p.cmv > metaCmv);
  const dentroDaMeta = produtosCalc.filter((p) => p.cmv <= metaCmv);
  const mcMedia = produtosCalc.length > 0
    ? produtosCalc.reduce((s, p) => s + p.mc, 0) / produtosCalc.length
    : null;

  // Receitas com custo
  const receitasCalc = receitas
    .map((r) => {
      const { custoPorcao } = calcularCustoReceita(r, mps, receitas);
      return { receita: r, custoPorcao };
    })
    .sort((a, b) => b.custoPorcao - a.custoPorcao);

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar — oculta na impressão */}
      <div className="no-print sticky top-0 z-10 bg-background border-b px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          Pré-visualização do relatório
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Relatório */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 print:px-0 print:py-0 print:max-w-none space-y-8">

        {/* Capa / Header */}
        <div className="border-b-2 border-foreground pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Relatório Gerencial</p>
              <h1 className="text-3xl font-bold leading-tight">
                {nomeEstabelecimento || "Meu Estabelecimento"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{hoje}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Meta CMV</p>
              <p className="text-3xl font-bold text-primary">{metaCmv}%</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Resumo Executivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Matérias-Primas", value: mps.length, suffix: "" },
              { label: "Receitas", value: receitas.length, suffix: "" },
              { label: "Produtos", value: produtos.length, suffix: "" },
              {
                label: "CMV Médio",
                value: cmvMedio !== null ? fmt(cmvMedio, 1) : "—",
                suffix: cmvMedio !== null ? "%" : "",
                highlight: cmvMedio !== null
                  ? cmvMedio <= metaCmv ? "text-green-700" : "text-red-700"
                  : "",
              },
            ].map((k) => (
              <div key={k.label} className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${(k as any).highlight ?? ""}`}>
                  {k.value}{k.suffix}
                </p>
              </div>
            ))}
          </div>
          {cmvMedio !== null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Dentro da Meta</p>
                <p className="text-2xl font-bold text-green-700 tabular-nums">{dentroDaMeta.length}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Acima da Meta</p>
                <p className={`text-2xl font-bold tabular-nums ${acimaDaMeta.length > 0 ? "text-red-700" : "text-green-700"}`}>
                  {acimaDaMeta.length}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">MC Média / porção</p>
                <p className="text-2xl font-bold tabular-nums">
                  R$ {mcMedia !== null ? fmt(mcMedia) : "—"}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Percentual OK</p>
                <p className="text-2xl font-bold tabular-nums">
                  {produtosCalc.length > 0
                    ? fmt((dentroDaMeta.length / produtosCalc.length) * 100, 0)
                    : "—"}%
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Ranking por CMV */}
        {produtosCalc.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Ranking de Produtos por CMV
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Produto</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Categoria</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Preço Venda</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Custo/porção</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">MC</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-xs">CMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {produtosCalc.map(({ produto, custoPorcao, cmv, mc }, i) => (
                    <tr key={produto.id} className={cmv > metaCmv ? "bg-red-50/50" : ""}>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{produto.nome}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {produto.categoria}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">R$ {fmt(produto.precoVenda)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">R$ {fmt(custoPorcao, 4)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${mc >= 0 ? "text-green-700" : "text-red-700"}`}>
                        R$ {fmt(mc)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <CmvBadge cmv={cmv} meta={metaCmv} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Alertas — acima da meta */}
        {acimaDaMeta.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Alertas — Produtos Acima da Meta ({metaCmv}%)
            </h2>
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Produto</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">CMV Atual</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Excedente</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Preço Sugerido (meta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {acimaDaMeta.map(({ produto, custoPorcao, cmv }) => {
                    const excedente = cmv - metaCmv;
                    const precoSugerido = metaCmv > 0 ? custoPorcao / (metaCmv / 100) : 0;
                    return (
                      <tr key={produto.id}>
                        <td className="px-4 py-2.5 font-medium">{produto.nome}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-700 font-semibold">{fmt(cmv, 1)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-600">+{fmt(excedente, 1)}pp</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">R$ {fmt(precoSugerido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top 10 Margens */}
        {produtosCalc.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Top 10 — Maior Margem de Contribuição
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Produto</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Preço Venda</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Custo/porção</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">MC</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-xs">CMV</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...produtosCalc]
                    .sort((a, b) => b.mc - a.mc)
                    .slice(0, 10)
                    .map(({ produto, custoPorcao, cmv, mc }, i) => (
                      <tr key={produto.id}>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{produto.nome}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">R$ {fmt(produto.precoVenda)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">R$ {fmt(custoPorcao, 4)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-green-700">
                          R$ {fmt(mc)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <CmvBadge cmv={cmv} meta={metaCmv} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Receitas */}
        {receitasCalc.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Receitas — Custo por Porção
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Receita</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Categoria</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Rendimento</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Custo/porção</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Ingredientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receitasCalc.map(({ receita, custoPorcao }) => (
                    <tr key={receita.id}>
                      <td className="px-4 py-2.5 font-medium">{receita.nome}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {receita.categoria}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {receita.rendimento} {receita.unidadeRendimento}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        R$ {fmt(custoPorcao, 4)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {receita.ingredientes.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Matérias-Primas */}
        {mps.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Matérias-Primas — Base de Custos
            </h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Nome</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Unidade</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Custo Unit.</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-xs">FC</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-xs">Custo Líquido</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs">Fornecedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...mps].sort((a, b) => a.nome.localeCompare(b.nome)).map((mp) => (
                    <tr key={mp.id}>
                      <td className="px-4 py-2.5 font-medium">{mp.nome}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{mp.unidade}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">R$ {fmt(mp.custoUnitario, 4)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                        {mp.fatorCorrecao.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        R$ {fmt(custoLiquido(mp), 4)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{mp.fornecedor ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Rodapé */}
        <footer className="border-t pt-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>Gerado por Momentum CMV</span>
          <span>{hoje}</span>
        </footer>

      </div>
    </div>
  );
}

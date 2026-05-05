"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoProduto } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, ShoppingBag, ChevronRight, AlertTriangle } from "lucide-react";

function CmvBar({ cmv, meta }: { cmv: number; meta: number }) {
  const pct = Math.min((cmv / (meta * 2)) * 100, 100);
  const color = cmv <= meta ? "bg-green-500" : cmv <= meta * 1.15 ? "bg-amber-400" : "bg-red-500";
  const textColor = cmv <= meta ? "text-green-600" : cmv <= meta * 1.15 ? "text-amber-500" : "text-red-600";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums w-14 text-right ${textColor}`}>
        {cmv.toFixed(1)}%
      </span>
    </div>
  );
}

function CmvPill({ cmv, meta }: { cmv: number; meta: number }) {
  const [bg, text] = cmv <= meta
    ? ["bg-green-100", "text-green-700"]
    : cmv <= meta * 1.15
    ? ["bg-amber-100", "text-amber-700"]
    : ["bg-red-100", "text-red-700"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${bg} ${text}`}>
      {cmv.toFixed(1)}%
    </span>
  );
}

export default function CmvPage() {
  const router = useRouter();
  const META = useConfiguracaoStore((s) => s.metaCmv);
  const produtos = useProdutoStore((s) => s.items);
  const mps = useMateriaPrimaStore((s) => s.items);
  const receitas = useReceitaStore((s) => s.items);

  // calcula CMV de todos os produtos
  const dados = useMemo(
    () => produtos.map((p) => ({ produto: p, ...calcularCustoProduto(p, mps, receitas) }))
      .sort((a, b) => b.cmv - a.cmv),
    [produtos, mps, receitas]
  );

  if (dados.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Análise de CMV</h1>
          <p className="text-muted-foreground text-sm mt-1">Custo de Mercadoria Vendida por produto</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-lg">
          <TrendingDown className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre produtos para ver a análise de CMV</p>
          <Button className="mt-4" onClick={() => router.push("/produtos/novo")}>
            Criar primeiro produto
          </Button>
        </div>
      </div>
    );
  }

  const cmvMedio = useMemo(
    () => dados.reduce((acc, d) => acc + d.cmv, 0) / dados.length,
    [dados]
  );
  const acimaMeta = useMemo(() => dados.filter((d) => d.cmv > META), [dados, META]);
  const dentroMeta = useMemo(() => dados.filter((d) => d.cmv <= META), [dados, META]);

  // agrupa por categoria
  const porCategoria = useMemo(() =>
    Object.entries(
      dados.reduce<Record<string, typeof dados>>((acc, d) => {
        const cat = d.produto.categoria;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(d);
        return acc;
      }, {})
    ).map(([cat, items]) => ({
      categoria: cat,
      label: cat,
      items,
      cmvMedio: items.reduce((s, i) => s + i.cmv, 0) / items.length,
    })).sort((a, b) => b.cmvMedio - a.cmvMedio),
    [dados]
  );

  const cmvMetaColor = cmvMedio <= META ? "text-green-600" : cmvMedio <= META * 1.15 ? "text-amber-500" : "text-red-600";

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold">Análise de CMV</h1>
        <p className="text-muted-foreground text-sm mt-1">Custo de Mercadoria Vendida — meta ≤ {META}%</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">CMV Médio</p>
            <p className={`text-3xl font-bold tabular-nums mt-1 ${cmvMetaColor}`}>{cmvMedio.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">meta ≤ {META}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Produtos</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{dados.length}</p>
            <p className="text-xs text-muted-foreground mt-1">no cardápio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Acima da Meta</p>
            <p className={`text-3xl font-bold tabular-nums mt-1 ${acimaMeta.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {acimaMeta.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {acimaMeta.length > 0 ? `${((acimaMeta.length / dados.length) * 100).toFixed(0)}% dos produtos` : "tudo dentro da meta"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Dentro da Meta</p>
            <p className="text-3xl font-bold tabular-nums mt-1 text-green-600">{dentroMeta.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {((dentroMeta.length / dados.length) * 100).toFixed(0)}% dos produtos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Ranking completo */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ranking — do maior ao menor CMV</h2>
          <div className="border rounded-lg overflow-hidden">
            {dados.map((d, idx) => (
              <div key={d.produto.id}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors group">
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{d.produto.nome}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{d.produto.categoria}</span>
                  </div>
                  <CmvBar cmv={d.cmv} meta={META} />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">R$ {d.custoPorcao.toFixed(2)} / R$ {d.produto.precoVenda.toFixed(2)}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => router.push(`/produtos/${d.produto.id}/editar`)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">

          {/* Por categoria */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {porCategoria.map(({ categoria, label, items, cmvMedio: catCmv }) => (
                <div key={categoria}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{items.length} prod.</span>
                      <CmvPill cmv={catCmv} meta={META} />
                    </div>
                  </div>
                  <CmvBar cmv={catCmv} meta={META} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alertas */}
          {acimaMeta.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Ação necessária
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {acimaMeta.map((d) => (
                  <button key={d.produto.id}
                    onClick={() => router.push(`/produtos/${d.produto.id}/editar`)}
                    className="w-full flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 transition-colors group">
                    <span className="truncate text-left">{d.produto.nome}</span>
                    <CmvPill cmv={d.cmv} meta={META} />
                  </button>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  Clique para revisar composição ou preço de venda.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Destaques positivos */}
          {dentroMeta.length > 0 && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-green-500" />
                  Melhores CMVs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dentroMeta.slice(-3).reverse().map((d) => (
                  <div key={d.produto.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{d.produto.nome}</span>
                    <CmvPill cmv={d.cmv} meta={META} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

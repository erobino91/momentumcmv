"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useProdutoStore } from "@/store/produtos";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoReceita, calcularCustoProduto } from "@/types";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, BookOpen, TrendingDown, AlertTriangle,
  ChevronRight, CheckCircle2, XCircle, Plus, ShoppingBag, TrendingUp,
  Sparkles, Lightbulb, Loader2, RefreshCw,
} from "lucide-react";

interface Insight {
  titulo: string;
  descricao: string;
  acao: string;
}

function CmvBar({ cmv, meta }: { cmv: number; meta: number }) {
  const color = cmv <= meta ? "bg-green-500" : cmv <= meta * 1.15 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(cmv / 60 * 100, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-12 text-right ${cmv <= meta ? "text-green-600" : cmv <= meta * 1.15 ? "text-amber-500" : "text-red-600"}`}>
        {cmv.toFixed(1)}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const CMV_META = useConfiguracaoStore((s) => s.metaCmv);
  const nomeEstabelecimento = useConfiguracaoStore((s) => s.nomeEstabelecimento);
  const receitas = useReceitaStore((s) => s.items);
  const mps = useMateriaPrimaStore((s) => s.items);
  const produtos = useProdutoStore((s) => s.items);

  const temDados = produtos.length > 0 || receitas.length > 0 || mps.length > 0;

  // CMV calculado sobre Produtos (itens do cardápio com preço)
  const produtosComCmv = useMemo(
    () => produtos.map((p) => ({ ...calcularCustoProduto(p, mps, receitas), produto: p })),
    [produtos, mps, receitas]
  );

  const cmvMedio = useMemo(
    () => produtosComCmv.length > 0
      ? produtosComCmv.reduce((acc, p) => acc + p.cmv, 0) / produtosComCmv.length
      : null,
    [produtosComCmv]
  );

  const acimaDaMeta = useMemo(
    () => produtosComCmv.filter((p) => p.cmv > CMV_META),
    [produtosComCmv, CMV_META]
  );

  const dentroDaMeta = useMemo(
    () => produtosComCmv.filter((p) => p.cmv <= CMV_META),
    [produtosComCmv, CMV_META]
  );

  // Margem de Contribuição = preço venda - custo/porção
  const produtosComMc = useMemo(
    () => produtosComCmv.map(({ produto, custoPorcao, cmv }) => ({
      produto, custoPorcao, cmv, mc: produto.precoVenda - custoPorcao,
    })),
    [produtosComCmv]
  );

  const mcMedia = useMemo(
    () => produtosComMc.length > 0
      ? produtosComMc.reduce((acc, p) => acc + p.mc, 0) / produtosComMc.length
      : null,
    [produtosComMc]
  );

  const mcTotal = useMemo(
    () => produtosComMc.reduce((acc, p) => acc + p.mc, 0),
    [produtosComMc]
  );

  async function handleAnalisar() {
    setAnalisando(true);
    try {
      const res = await fetch("/api/analisar-cmv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: CMV_META,
          cmvMedio,
          totalProdutos: produtos.length,
          acimaDaMeta: acimaDaMeta.map(({ produto, cmv, custoPorcao }) => ({
            nome: produto.nome,
            cmv,
            precoVenda: produto.precoVenda,
            custoPorcao,
            mc: produto.precoVenda - custoPorcao,
          })),
          dentroDaMeta: dentroDaMeta.map(({ produto, cmv, custoPorcao }) => ({
            nome: produto.nome,
            cmv,
            precoVenda: produto.precoVenda,
            custoPorcao,
            mc: produto.precoVenda - custoPorcao,
          })),
          maioresMc: produtosComMc.map(({ produto, cmv, custoPorcao, mc }) => ({
            nome: produto.nome,
            cmv,
            precoVenda: produto.precoVenda,
            custoPorcao,
            mc,
          })),
        }),
      });
      if (!res.ok) throw new Error("Erro na análise");
      const data = await res.json();
      setInsights(data.insights);
    } catch {
      toast.error("Erro ao analisar CMV. Verifique a API key e tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  const kpis = [
    {
      title: "Matérias-Primas",
      value: mps.length.toString(),
      description: mps.length === 1 ? "ingrediente cadastrado" : "ingredientes cadastrados",
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-50",
      href: "/materias-primas",
    },
    {
      title: "Produtos",
      value: produtos.length.toString(),
      description: produtos.length === 1 ? "produto no cardápio" : "produtos no cardápio",
      icon: ShoppingBag,
      color: "text-violet-500",
      bg: "bg-violet-50",
      href: "/produtos",
    },
    {
      title: "CMV Médio",
      value: cmvMedio !== null ? `${cmvMedio.toFixed(1)}%` : "—",
      description: cmvMedio !== null
        ? cmvMedio <= CMV_META ? "✓ dentro da meta" : `↑ ${(cmvMedio - CMV_META).toFixed(1)}pp acima da meta`
        : "informe preços de venda",
      icon: TrendingDown,
      color: cmvMedio === null ? "text-muted-foreground" : cmvMedio <= CMV_META ? "text-green-500" : "text-red-500",
      bg: cmvMedio === null ? "bg-muted" : cmvMedio <= CMV_META ? "bg-green-50" : "bg-red-50",
      href: null,
    },
    {
      title: "Acima da Meta",
      value: acimaDaMeta.length.toString(),
      description: acimaDaMeta.length === 0
        ? "todas dentro do limite"
        : acimaDaMeta.length === 1 ? "receita em alerta" : "receitas em alerta",
      icon: AlertTriangle,
      color: acimaDaMeta.length === 0 ? "text-green-500" : "text-amber-500",
      bg: acimaDaMeta.length === 0 ? "bg-green-50" : "bg-amber-50",
      href: null,
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu food service</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={`border shadow-sm ${kpi.href ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
            onClick={kpi.href ? () => router.push(kpi.href!) : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!temDados ? (
        /* Onboarding */
        <OnboardingChecklist
          temMps={mps.length > 0}
          temReceitas={receitas.length > 0}
          temProdutos={produtos.length > 0}
          temMeta={!!nomeEstabelecimento}
          onNavigate={router.push}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Produtos acima da meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Acima da Meta
                {acimaDaMeta.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">{acimaDaMeta.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {acimaDaMeta.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  {produtos.length === 0 ? "Nenhum produto cadastrado ainda." : "Todos os produtos dentro da meta!"}
                </div>
              ) : (
                <div className="space-y-3">
                  {acimaDaMeta
                    .sort((a, b) => b.cmv - a.cmv)
                    .slice(0, 5)
                    .map(({ produto, cmv }) => (
                      <div key={produto.id} className="flex items-center gap-3 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{produto.nome}</p>
                          <CmvBar cmv={cmv} meta={CMV_META} />
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => router.push(`/produtos/${produto.id}/editar`)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  {acimaDaMeta.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{acimaDaMeta.length - 5} produtos</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margem de Contribuição */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Margem de Contribuição
              </CardTitle>
            </CardHeader>
            <CardContent>
              {produtosComMc.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Cadastre produtos com preço de venda.</p>
              ) : (
                <div className="flex gap-6">
                  {/* Totalizadores */}
                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <div>
                      <p className="text-xs text-muted-foreground">MC Média / porção</p>
                      <p className={`text-2xl font-bold tabular-nums ${mcMedia !== null && mcMedia >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        R$ {mcMedia !== null ? mcMedia.toFixed(2) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Soma das MC</p>
                      <p className="text-lg font-semibold tabular-nums text-muted-foreground">
                        R$ {mcTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {/* Ranking top 5 MC */}
                  <div className="flex-1 space-y-2 border-l pl-6">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Maiores margens</p>
                    {produtosComMc
                      .sort((a, b) => b.mc - a.mc)
                      .slice(0, 5)
                      .map(({ produto, mc, custoPorcao }) => (
                        <div key={produto.id} className="flex items-center justify-between gap-3 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{produto.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {produto.precoVenda.toFixed(2)} − R$ {custoPorcao.toFixed(2)} custo
                            </p>
                          </div>
                          <span className={`text-sm font-bold tabular-nums shrink-0 ${mc >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            R$ {mc.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise de IA */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Análise com IA
                </CardTitle>
                <Button
                  size="sm"
                  variant={insights ? "outline" : "default"}
                  className="gap-2"
                  onClick={handleAnalisar}
                  disabled={analisando || produtos.length === 0}
                >
                  {analisando ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…</>
                  ) : insights ? (
                    <><RefreshCw className="w-3.5 h-3.5" /> Reanalisar</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Analisar CMV</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analisando ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : insights ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {insights.map((insight, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2 bg-muted/20">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold leading-tight">{insight.titulo}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{insight.descricao}</p>
                      <div className="border-t pt-2">
                        <p className="text-xs font-medium text-foreground">→ {insight.acao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Clique em <strong>Analisar CMV</strong> para receber 3 insights acionáveis sobre seu cardápio.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos dentro da meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Dentro da Meta
                {dentroDaMeta.length > 0 && (
                  <Badge className="ml-auto text-xs bg-green-100 text-green-700 hover:bg-green-100">{dentroDaMeta.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dentroDaMeta.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {produtos.length === 0 ? "Cadastre produtos para ver o CMV." : "Nenhum produto dentro da meta ainda."}
                </p>
              ) : (
                <div className="space-y-3">
                  {dentroDaMeta
                    .sort((a, b) => a.cmv - b.cmv)
                    .slice(0, 5)
                    .map(({ produto, cmv }) => (
                      <div key={produto.id} className="flex items-center gap-3 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{produto.nome}</p>
                          <CmvBar cmv={cmv} meta={CMV_META} />
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => router.push(`/produtos/${produto.id}/editar`)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  {dentroDaMeta.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{dentroDaMeta.length - 5} produtos</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

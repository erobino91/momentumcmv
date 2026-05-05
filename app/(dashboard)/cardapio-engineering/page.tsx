"use client";

import { useState, useMemo } from "react";
import { useProdutoStore } from "@/store/produtos";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { calcularCustoProduto } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid2X2, Star, Zap, HelpCircle, Frown } from "lucide-react";

interface ProdutoPlot {
  id: string;
  nome: string;
  cmv: number;
  mc: number;
  precoVenda: number;
  custoPorcao: number;
  quadrante: "estrela" | "cavalo" | "enigma" | "abacaxi";
}

const QUADRANTES = {
  estrela: {
    label: "Estrela",
    desc: "CMV baixo + MC alta",
    cor: "bg-green-500",
    textCor: "text-green-700",
    bgCor: "bg-green-50 border-green-200",
    icon: Star,
    dica: "Promova e destaque no cardápio.",
  },
  cavalo: {
    label: "Cavalo de Batalha",
    desc: "CMV alto + MC alta",
    cor: "bg-amber-400",
    textCor: "text-amber-700",
    bgCor: "bg-amber-50 border-amber-200",
    icon: Zap,
    dica: "Boa margem mas custo elevado. Renegocie insumos ou ajuste receita.",
  },
  enigma: {
    label: "Enigma",
    desc: "CMV baixo + MC baixa",
    cor: "bg-blue-400",
    textCor: "text-blue-700",
    bgCor: "bg-blue-50 border-blue-200",
    icon: HelpCircle,
    dica: "Custo controlado mas preço baixo. Considere reposicionar o preço.",
  },
  abacaxi: {
    label: "Abacaxi",
    desc: "CMV alto + MC baixa",
    cor: "bg-red-500",
    textCor: "text-red-700",
    bgCor: "bg-red-50 border-red-200",
    icon: Frown,
    dica: "Pior cenário. Reformule a receita, aumente o preço ou retire do cardápio.",
  },
};

export default function CardapioEngineeringPage() {
  const metaCmv = useConfiguracaoStore((s) => s.metaCmv);
  const produtos = useProdutoStore((s) => s.items);
  const mps = useMateriaPrimaStore((s) => s.items);
  const receitas = useReceitaStore((s) => s.items);
  const [hover, setHover] = useState<string | null>(null);

  const dados = useMemo(
    () => produtos
      .map((p) => {
        const { cmv, custoPorcao } = calcularCustoProduto(p, mps, receitas);
        const mc = p.precoVenda - custoPorcao;
        return { id: p.id, nome: p.nome, cmv, mc, precoVenda: p.precoVenda, custoPorcao };
      })
      .filter((p) => p.precoVenda > 0),
    [produtos, mps, receitas]
  );

  if (dados.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Engenharia de Cardápio</h1>
        <p className="text-muted-foreground text-sm mb-8">Quadrante estratégico por CMV e margem</p>
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg">
          <Grid2X2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum produto com preço de venda</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre produtos com preço para ver o quadrante.</p>
        </div>
      </div>
    );
  }

  const mcMedia = useMemo(() => dados.reduce((s, p) => s + p.mc, 0) / dados.length, [dados]);
  const maxCmv = useMemo(() => Math.max(...dados.map((p) => p.cmv), metaCmv * 2), [dados, metaCmv]);
  const maxMc = useMemo(() => Math.max(...dados.map((p) => p.mc)), [dados]);
  const minMc = useMemo(() => Math.min(...dados.map((p) => p.mc), 0), [dados]);
  const mcRange = maxMc - minMc;

  const plotados: ProdutoPlot[] = useMemo(() => dados.map((p) => ({
    ...p,
    quadrante:
      p.cmv <= metaCmv && p.mc >= mcMedia ? "estrela"
      : p.cmv > metaCmv && p.mc >= mcMedia ? "cavalo"
      : p.cmv <= metaCmv && p.mc < mcMedia ? "enigma"
      : "abacaxi",
  })), [dados, metaCmv, mcMedia]);

  // Posição no chart (em %): X = CMV (esquerda=baixo), Y = MC (cima=alto)
  function posX(cmv: number) {
    return Math.min(Math.max((cmv / maxCmv) * 100, 2), 98);
  }
  function posY(mc: number) {
    if (mcRange === 0) return 50;
    return Math.min(Math.max(100 - ((mc - minMc) / mcRange) * 100, 2), 98);
  }

  const midX = posX(metaCmv);
  const midY = posY(mcMedia);

  const contagem = {
    estrela: plotados.filter((p) => p.quadrante === "estrela").length,
    cavalo: plotados.filter((p) => p.quadrante === "cavalo").length,
    enigma: plotados.filter((p) => p.quadrante === "enigma").length,
    abacaxi: plotados.filter((p) => p.quadrante === "abacaxi").length,
  };

  const hoverProd = plotados.find((p) => p.id === hover);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Engenharia de Cardápio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quadrante estratégico — eixo X: CMV (meta {metaCmv}%) · eixo Y: Margem de Contribuição (média R${mcMedia.toFixed(2)})
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div
                className="relative w-full border rounded-lg overflow-hidden bg-muted/10"
                style={{ paddingBottom: "65%" }}
              >
                {/* Quadrant labels */}
                <div className="absolute inset-0">
                  {/* Top-left: Estrela */}
                  <div className="absolute top-2 left-2 text-xs font-semibold text-green-600 opacity-60">⭐ Estrela</div>
                  {/* Top-right: Cavalo */}
                  <div className="absolute top-2 right-2 text-xs font-semibold text-amber-600 opacity-60">⚡ Cavalo</div>
                  {/* Bottom-left: Enigma */}
                  <div className="absolute bottom-2 left-2 text-xs font-semibold text-blue-600 opacity-60">❓ Enigma</div>
                  {/* Bottom-right: Abacaxi */}
                  <div className="absolute bottom-2 right-2 text-xs font-semibold text-red-600 opacity-60">🍍 Abacaxi</div>

                  {/* Dividing lines */}
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-muted-foreground/30"
                    style={{ left: `${midX}%` }}
                  />
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-muted-foreground/30"
                    style={{ top: `${midY}%` }}
                  />

                  {/* Axis labels */}
                  <div
                    className="absolute text-[10px] text-muted-foreground -translate-x-1/2 px-1 bg-background/80 rounded"
                    style={{ left: `${midX}%`, top: "50%", transform: "translateX(-50%) translateY(-50%)" }}
                  >
                    CMV {metaCmv}%
                  </div>

                  {/* Dots */}
                  {plotados.map((p) => {
                    const x = posX(p.cmv);
                    const y = posY(p.mc);
                    const q = QUADRANTES[p.quadrante];
                    const isHover = hover === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all`}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onMouseEnter={() => setHover(p.id)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <div
                          className={`rounded-full border-2 border-white shadow transition-all ${q.cor} ${isHover ? "w-5 h-5" : "w-3.5 h-3.5"}`}
                        />
                        {isHover && (
                          <div className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border rounded-md shadow-lg p-2 w-44 text-xs pointer-events-none">
                            <p className="font-semibold truncate">{p.nome}</p>
                            <p className="text-muted-foreground">CMV: {p.cmv.toFixed(1)}%</p>
                            <p className="text-muted-foreground">MC: R$ {p.mc.toFixed(2)}</p>
                            <p className="text-muted-foreground">Preço: R$ {p.precoVenda.toFixed(2)}</p>
                            <p className={`font-medium mt-1 ${q.textCor}`}>{q.label}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Axis labels below */}
              <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                <span>← CMV baixo</span>
                <span>CMV alto →</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend + Lists */}
        <div className="space-y-3">
          {(["estrela", "cavalo", "enigma", "abacaxi"] as const).map((q) => {
            const info = QUADRANTES[q];
            const lista = plotados.filter((p) => p.quadrante === q);
            const Icon = info.icon;
            return (
              <Card key={q} className={`border ${info.bgCor}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${info.textCor}`} />
                    <span className={`text-sm font-semibold ${info.textCor}`}>{info.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{contagem[q]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{info.dica}</p>
                  {lista.length > 0 && (
                    <div className="space-y-1">
                      {lista.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[120px] text-foreground">{p.nome}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0 ml-1">
                            {p.cmv.toFixed(1)}% / R${p.mc.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {lista.length > 4 && (
                        <p className="text-xs text-muted-foreground">+{lista.length - 4} mais</p>
                      )}
                    </div>
                  )}
                  {lista.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum produto</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

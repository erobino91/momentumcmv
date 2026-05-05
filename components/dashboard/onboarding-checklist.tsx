"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Package, BookOpen, ShoppingBag, Settings2 } from "lucide-react";

interface Props {
  temMps: boolean;
  temReceitas: boolean;
  temProdutos: boolean;
  temMeta: boolean;
  onNavigate: (href: string) => void;
}

const steps = [
  {
    id: "mps",
    label: "Cadastrar matérias-primas",
    desc: "Adicione seus ingredientes com custo unitário.",
    href: "/materias-primas",
    icon: Package,
    key: "temMps" as const,
  },
  {
    id: "receitas",
    label: "Criar uma receita",
    desc: "Monte fichas técnicas com as matérias-primas.",
    href: "/receitas",
    icon: BookOpen,
    key: "temReceitas" as const,
  },
  {
    id: "produtos",
    label: "Adicionar produto ao cardápio",
    desc: "Vincule receitas a produtos e informe o preço de venda.",
    href: "/produtos",
    icon: ShoppingBag,
    key: "temProdutos" as const,
  },
  {
    id: "meta",
    label: "Definir meta de CMV",
    desc: "Configure o percentual máximo aceitável de custo.",
    href: "/configuracoes",
    icon: Settings2,
    key: "temMeta" as const,
  },
];

export function OnboardingChecklist({ temMps, temReceitas, temProdutos, temMeta, onNavigate }: Props) {
  const flags: Record<string, boolean> = { temMps, temReceitas, temProdutos, temMeta };
  const done = steps.filter((s) => flags[s.key]).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);

  const nextStep = steps.find((s) => !flags[s.key]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <span className="text-2xl font-bold text-primary">{pct}%</span>
        </div>
        <h2 className="text-xl font-bold">Bem-vindo ao Momentum CMV</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete os passos abaixo para começar a monitorar o CMV do seu negócio.
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const completed = flags[step.key];
          const isNext = step === nextStep;
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors
                ${completed ? "bg-green-50 border-green-200" : isNext ? "bg-muted/40 border-primary/30" : "border-border opacity-60"}`}
            >
              {/* Step number / check */}
              <div className="shrink-0 mt-0.5">
                {completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/50" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon className={`w-4 h-4 shrink-0 ${completed ? "text-green-600" : "text-foreground"}`} />
                  <p className={`text-sm font-semibold ${completed ? "text-green-700 line-through decoration-green-400" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  {isNext && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      Próximo
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>

              {/* CTA */}
              {!completed && (
                <Button
                  size="sm"
                  variant={isNext ? "default" : "outline"}
                  className="shrink-0 gap-1.5"
                  onClick={() => onNavigate(step.href)}
                >
                  {i === 0 ? "Adicionar" : i === 1 ? "Criar" : i === 2 ? "Adicionar" : "Configurar"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {done === total && (
        <div className="mt-6 text-center">
          <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Configuração concluída! Seus dados já aparecem no dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

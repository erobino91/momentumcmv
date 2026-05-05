"use client";

import { useRouter } from "next/navigation";
import { useReceitaStore } from "@/store/receitas";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useProdutoStore } from "@/store/produtos";
import { calcularCustoReceita, calcularCustoProduto } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ClipboardList, Search, FileText, BookOpen, ShoppingBag } from "lucide-react";
import { useConfiguracaoStore } from "@/store/configuracoes";

function CmvBadge({ cmv, meta }: { cmv: number | null; meta: number }) {
  if (cmv === null) return <span className="text-muted-foreground text-sm">—</span>;
  const cor = cmv <= meta
    ? "bg-green-100 text-green-700"
    : cmv <= meta * 1.15
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${cor}`}>
      {cmv.toFixed(1)}%
    </span>
  );
}

type Aba = "receitas" | "produtos";

export default function FichasTecnicasPage() {
  const router = useRouter();
  const { metaCmv } = useConfiguracaoStore();
  const { items: receitas } = useReceitaStore();
  const { items: produtos } = useProdutoStore();
  const { items: mps } = useMateriaPrimaStore();
  const [aba, setAba] = useState<Aba>("receitas");
  const [search, setSearch] = useState("");

  const filteredReceitas = receitas.filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase()) ||
    r.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const total = aba === "receitas" ? filteredReceitas.length : filteredProdutos.length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fichas Técnicas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {receitas.length} receitas · {produtos.length} produtos
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b mb-4">
        {([
          { key: "receitas", label: "Receitas", icon: BookOpen, count: receitas.length },
          { key: "produtos", label: "Produtos", icon: ShoppingBag, count: produtos.length },
        ] as const).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => { setAba(key); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              aba === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${aba === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou categoria…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <ClipboardList className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium">
            {search ? "Nenhuma ficha encontrada" : aba === "receitas" ? "Nenhuma receita cadastrada" : "Nenhum produto cadastrado"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente outro termo" : aba === "receitas" ? "Cadastre receitas para gerar fichas técnicas" : "Cadastre produtos para gerar fichas técnicas"}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => router.push(aba === "receitas" ? "/receitas/nova" : "/produtos/novo")}>
              {aba === "receitas" ? "Criar primeira receita" : "Criar primeiro produto"}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aba === "receitas"
            ? filteredReceitas.map((r) => {
                const { custoPorcao, cmv } = calcularCustoReceita(r, mps, receitas);
                return (
                  <button key={r.id} onClick={() => router.push(`/receitas/${r.id}/ficha`)}
                    className="text-left border rounded-lg bg-card hover:border-primary hover:shadow-sm transition-all group p-0 overflow-hidden">
                    <div style={{ backgroundColor: "#D1222A" }} className="h-1.5 w-full" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.categoria}</p>
                        </div>
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo/porção</p>
                          <p className="font-medium tabular-nums">R$ {custoPorcao.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-0.5">CMV</p>
                          <CmvBadge cmv={cmv} meta={metaCmv} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{r.ingredientes.length} ingrediente{r.ingredientes.length !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                );
              })
            : filteredProdutos.map((p) => {
                const { custoPorcao, cmv } = calcularCustoProduto(p, mps, receitas);
                return (
                  <button key={p.id} onClick={() => router.push(`/produtos/${p.id}/ficha`)}
                    className="text-left border rounded-lg bg-card hover:border-primary hover:shadow-sm transition-all group p-0 overflow-hidden">
                    <div style={{ backgroundColor: "#D1222A" }} className="h-1.5 w-full" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{p.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.categoria}</p>
                        </div>
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo/porção</p>
                          <p className="font-medium tabular-nums">R$ {custoPorcao.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-0.5">CMV</p>
                          <CmvBadge cmv={cmv} meta={metaCmv} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">R$ {p.precoVenda.toFixed(2)} · {p.ingredientes.length} item{p.ingredientes.length !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

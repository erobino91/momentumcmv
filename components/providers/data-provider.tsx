"use client";

import { useRef } from "react";
import { useMateriaPrimaStore } from "@/store/materias-primas";
import { useReceitaStore } from "@/store/receitas";
import { useProdutoStore } from "@/store/produtos";
import { useConfiguracaoStore } from "@/store/configuracoes";
import { useSnapshotStore } from "@/store/snapshots";
import { useOfertaStore } from "@/store/ofertas";
import { MateriaPrima, Receita, Produto, SnapshotCmv, Oferta } from "@/types";

interface Props {
  mps: MateriaPrima[];
  receitas: Receita[];
  produtos: Produto[];
  config: { nomeEstabelecimento: string; metaCmv: number; categoriasInsumo: string[]; categoriasProduto: string[] };
  snapshots: SnapshotCmv[];
  ofertas: Oferta[];
  children: React.ReactNode;
}

/**
 * Hidrata os stores Zustand com dados vindos do servidor (layout.tsx).
 * Executa sincronamente no primeiro render para evitar flash de estado vazio.
 */
export function DataProvider({ mps, receitas, produtos, config, snapshots, ofertas, children }: Props) {
  const hydrateMps = useMateriaPrimaStore((s) => s.hydrate);
  const hydrateReceitas = useReceitaStore((s) => s.hydrate);
  const hydrateProdutos = useProdutoStore((s) => s.hydrate);
  const setConfig = useConfiguracaoStore((s) => s.hydrate);
  const hydrateSnapshots = useSnapshotStore((s) => s.hydrate);
  const hydrateOfertas = useOfertaStore((s) => s.hydrate);

  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    hydrateMps(mps);
    hydrateReceitas(receitas);
    hydrateProdutos(produtos);
    setConfig(config);
    hydrateSnapshots(snapshots);
    hydrateOfertas(ofertas);
  }

  return <>{children}</>;
}

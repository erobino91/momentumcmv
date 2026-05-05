export type UnidadeMedida = "kg" | "g" | "L" | "ml" | "un" | "cx" | "dz" | "pct";

export type CategoriaInsumo =
  | "carnes" | "aves" | "peixes" | "laticinios" | "hortifruti"
  | "graos" | "bebidas" | "embalagens" | "temperos" | "outros";

export interface HistoricoPrecoEntry {
  data: string; // ISO date
  custoUnitario: number;
  embalagem?: {
    descricao: string;
    qtd: number;
    custo: number;
  };
}

export interface MateriaPrima {
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeMedida;
  custoUnitario: number;
  fatorCorrecao: number;
  embalagem?: {
    descricao: string;
    qtd: number;
    custo: number;
  };
  fornecedor?: string;
  observacao?: string;
  historicoPreco?: HistoricoPrecoEntry[];
  criadoEm: string;
  atualizadoEm: string;
}

export function custoUnitarioEfetivo(mp: MateriaPrima): number {
  if (mp.embalagem) return mp.embalagem.custo / mp.embalagem.qtd;
  return mp.custoUnitario;
}

export function custoLiquido(mp: MateriaPrima): number {
  return custoUnitarioEfetivo(mp) / mp.fatorCorrecao;
}

// ─── Produtos ────────────────────────────────────────────────────────────────

export type CategoriaProduto =
  | "pizza" | "porcao" | "a_la_carte" | "entrada" | "salada" | "sobremesa" | "bebida";

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  ingredientes: ReceitaIngrediente[];
  precoVenda: number;
  tempoPreparo?: number;
  observacao?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export function calcularCustoProduto(
  produto: Produto,
  mps: MateriaPrima[],
  todasReceitas: Receita[]
): { custoTotal: number; custoPorcao: number; cmv: number } {
  const receitaLike: Receita = {
    ...produto,
    categoria: "outro",
    modoPreparo: undefined,
    precoVenda: produto.precoVenda,
  };
  const { custoTotal, custoPorcao } = calcularCustoReceita(receitaLike, mps, todasReceitas);
  const cmv = produto.precoVenda > 0 ? (custoPorcao / produto.precoVenda) * 100 : 0;
  return { custoTotal, custoPorcao, cmv };
}

// ─── Receitas ────────────────────────────────────────────────────────────────

export type CategoriaReceita =
  | "entrada" | "prato_principal" | "sobremesa" | "bebida"
  | "lanche" | "massa" | "pizza" | "porcao" | "ingrediente" | "outro";

// g e ml adicionados para sub-receitas pesadas/volumétricas
export type UnidadeRendimento = "porcoes" | "unidades" | "kg" | "g" | "L" | "ml";

export interface ReceitaIngrediente {
  tipo: "materia_prima" | "receita";
  materiaPrimaId?: string;
  receitaId?: string;
  quantidade: number;
}

export interface Receita {
  id: string;
  nome: string;
  categoria: CategoriaReceita;
  rendimento: number;
  unidadeRendimento: UnidadeRendimento;
  ingredientes: ReceitaIngrediente[];
  modoPreparo?: string;
  tempoPreparo?: number;
  precoVenda?: number;
  observacao?: string;
  criadoEm: string;
  atualizadoEm: string;
}

// Detecta se adicionar `candidataId` como ingrediente de `receitaAtualId` criaria ciclo
export function criarCiclo(
  receitaAtualId: string,
  candidataId: string,
  todasReceitas: Receita[]
): boolean {
  const visited = new Set<string>();

  function podeChegar(fromId: string): boolean {
    if (fromId === receitaAtualId) return true;
    if (visited.has(fromId)) return false;
    visited.add(fromId);
    const r = todasReceitas.find((rec) => rec.id === fromId);
    if (!r) return false;
    return r.ingredientes.some(
      (ing) => ing.tipo === "receita" && ing.receitaId && podeChegar(ing.receitaId)
    );
  }

  return podeChegar(candidataId);
}

export function calcularCustoReceita(
  receita: Receita,
  mps: MateriaPrima[],
  todasReceitas: Receita[] = [],
  _visited: Set<string> = new Set()
): { custoTotal: number; custoPorcao: number; cmv: number | null } {
  if (_visited.has(receita.id)) return { custoTotal: 0, custoPorcao: 0, cmv: null };

  const visited = new Set(_visited);
  visited.add(receita.id);

  const mpMap = new Map(mps.map((m) => [m.id, m]));
  const receitaMap = new Map(todasReceitas.map((r) => [r.id, r]));

  const custoTotal = receita.ingredientes.reduce((acc, ing) => {
    // compat com dados antigos sem campo `tipo`
    const tipo = ing.tipo ?? "materia_prima";

    if (tipo === "materia_prima" && ing.materiaPrimaId) {
      const mp = mpMap.get(ing.materiaPrimaId);
      if (!mp) return acc;
      return acc + ing.quantidade * custoLiquido(mp);
    }

    if (tipo === "receita" && ing.receitaId) {
      const sub = receitaMap.get(ing.receitaId);
      if (!sub || visited.has(sub.id)) return acc;
      const { custoPorcao } = calcularCustoReceita(sub, mps, todasReceitas, visited);
      return acc + ing.quantidade * custoPorcao;
    }

    return acc;
  }, 0);

  const custoPorcao = receita.rendimento > 0 ? custoTotal / receita.rendimento : 0;
  const cmv =
    receita.precoVenda && receita.precoVenda > 0
      ? (custoPorcao / receita.precoVenda) * 100
      : null;

  return { custoTotal, custoPorcao, cmv };
}

// ─── Ofertas / Combos ────────────────────────────────────────────────────────

export interface OfertaItem {
  produtoId: string;
  quantidade: number;
}

export interface Oferta {
  id: string;
  nome: string;
  descricao?: string;
  itens: OfertaItem[];
  precoVenda: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export function calcularCustoOferta(
  oferta: Oferta,
  produtos: Produto[],
  mps: MateriaPrima[],
  receitas: Receita[]
): { custoTotal: number; cmv: number; mc: number } {
  const produtoMap = new Map(produtos.map((p) => [p.id, p]));
  const custoTotal = oferta.itens.reduce((acc, item) => {
    const produto = produtoMap.get(item.produtoId);
    if (!produto) return acc;
    const { custoPorcao } = calcularCustoProduto(produto, mps, receitas);
    return acc + custoPorcao * item.quantidade;
  }, 0);
  const cmv = oferta.precoVenda > 0 ? (custoTotal / oferta.precoVenda) * 100 : 0;
  const mc = oferta.precoVenda - custoTotal;
  return { custoTotal, cmv, mc };
}

// ─── Snapshot CMV ─────────────────────────────────────────────────────────────

export interface SnapshotProduto {
  nome: string;
  cmv: number;
  custoPorcao: number;
  precoVenda: number;
  mc: number;
}

export interface SnapshotCmv {
  id: string;
  cmvMedio: number | null;
  metaCmv: number;
  totalProdutos: number;
  acimaDaMeta: number;
  detalhes: SnapshotProduto[];
  registradoEm: string; // ISO
}

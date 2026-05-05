import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

interface ProdutoResumo {
  nome: string;
  cmv: number;
  precoVenda: number;
  custoPorcao: number;
  mc: number;
}

interface AnalisarCmvBody {
  meta: number;
  cmvMedio: number | null;
  totalProdutos: number;
  acimaDaMeta: ProdutoResumo[];
  dentroDaMeta: ProdutoResumo[];
  maioresMc: ProdutoResumo[];
}

export async function POST(req: NextRequest) {
  const body: AnalisarCmvBody = await req.json();

  const piores = body.acimaDaMeta
    .sort((a, b) => b.cmv - a.cmv)
    .slice(0, 5)
    .map((p) => `${p.nome}: ${p.cmv.toFixed(1)}%`)
    .join("; ");

  const melhoresMc = body.maioresMc
    .sort((a, b) => b.mc - a.mc)
    .slice(0, 5)
    .map((p) => `${p.nome}: R$${p.mc.toFixed(2)}`)
    .join("; ");

  const situacao =
    body.cmvMedio === null
      ? "CMV médio não calculado (produtos sem preço de venda)"
      : body.cmvMedio <= body.meta
      ? `CMV médio ${body.cmvMedio.toFixed(1)}% — DENTRO da meta de ${body.meta}%`
      : `CMV médio ${body.cmvMedio.toFixed(1)}% — ACIMA da meta de ${body.meta}% (+${(body.cmvMedio - body.meta).toFixed(1)}pp)`;

  const prompt = `Você é um consultor especializado em gestão de custos para food service. Analise os dados de CMV abaixo e retorne EXATAMENTE 3 insights acionáveis.

SITUAÇÃO ATUAL:
- ${situacao}
- Meta de CMV: ${body.meta}%
- Total de produtos: ${body.totalProdutos}
- Produtos acima da meta: ${body.acimaDaMeta.length}
- Produtos dentro da meta: ${body.dentroDaMeta.length}
${piores ? `- Produtos com pior CMV: ${piores}` : ""}
${melhoresMc ? `- Produtos com maior margem de contribuição: ${melhoresMc}` : ""}

Retorne APENAS JSON válido (sem markdown, sem texto fora do JSON):
[
  {"titulo": "...", "descricao": "...", "acao": "..."},
  {"titulo": "...", "descricao": "...", "acao": "..."},
  {"titulo": "...", "descricao": "...", "acao": "..."}
]

Regras:
- titulo: resumo do insight (máximo 50 caracteres)
- descricao: o que os dados revelam (máximo 110 caracteres)
- acao: o que fazer concretamente, com número quando possível (máximo 130 caracteres)
- Português brasileiro, direto e prático
- Cada insight deve ser diferente (custo, precificação, mix de cardápio)`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "Erro na API Gemini" }, { status: 500 });
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const insights = JSON.parse(cleaned);
    return NextResponse.json({ insights });
  } catch {
    console.error("Parse error:", text);
    return NextResponse.json({ error: "Erro ao processar resposta" }, { status: 500 });
  }
}

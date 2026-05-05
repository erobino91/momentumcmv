import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { texto } = await req.json();

  if (!texto || typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Você é um assistente especializado em fichas técnicas de cozinha profissional.

Reescreva o modo de preparo abaixo de forma clara, organizada e com português correto. Mantenha todas as informações originais. Use linguagem simples e objetiva, com passos numerados quando houver sequência. Não adicione ingredientes ou etapas que não existam no texto original. Retorne apenas o texto reescrito, sem explicações adicionais.

Texto original:
${texto.trim()}`,
      },
    ],
  });

  const result = message.content[0];
  if (result.type !== "text") {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }

  return NextResponse.json({ texto: result.text });
}

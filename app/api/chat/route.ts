import { NextRequest, NextResponse } from "next/server";
import { buildOpoCompiInput, OPOCOMPI_SYSTEM_PROMPT } from "@/lib/opocompi-brain";

const fallbackReply =
  "Ahora mismo la IA real no está configurada. Cuando añadas OPENAI_API_KEY en Vercel, OpoCompi responderá con su personalidad propia, generará tests y acompañará el estudio desde el servidor.";

export async function POST(request: NextRequest) {
  const { message, mode } = (await request.json()) as { message?: string; mode?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "El mensaje esta vacio." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: fallbackReply });
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: OPOCOMPI_SYSTEM_PROMPT,
      input: buildOpoCompiInput(message, mode),
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "La IA no pudo responder ahora." }, { status: 502 });
  }

  const data = await response.json();
  const reply =
    data.output_text ??
    data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
      ?.map((item: { text?: string }) => item.text)
      ?.filter(Boolean)
      ?.join("\n") ??
    fallbackReply;

  return NextResponse.json({ reply });
}

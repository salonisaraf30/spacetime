import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { godName, miracleType, territoryName, civName } = await req.json();

    const prompt = `You are an ancient historian writing a chronicle of a fantasy world.
Write ONE sentence (maximum 25 words) chronicling this divine event:
The god "${godName}" cast "${miracleType}" upon ${territoryName ?? "the land"}${civName ? `, controlled by ${civName}` : ""}.

Write in the style of an illuminated manuscript. Be dramatic but concise.
Use archaic language. Do not use modern words.
Return ONLY the sentence, no quotes, no explanation.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }],
    });

    const narration =
      message.content[0].type === "text"
        ? message.content[0].text.trim()
        : `The god ${godName} cast ${miracleType} upon the world.`;

    return NextResponse.json({ narration });
  } catch (err) {
    console.error("[narrate-miracle]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

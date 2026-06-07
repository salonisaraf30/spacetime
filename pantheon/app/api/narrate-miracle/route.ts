import { NextRequest, NextResponse } from "next/server";
import { mergeCreate, extractText, logTokens } from "../../lib/merge-gateway";

const MIRACLE_FLAVOR: Record<string, string> = {
  bless:   "stability +2 and piety +1 — the civilization grows more stable and their faith surges",
  curse:   "plague erupts — population drops by 15, stability falls by 1, the territory is marked by pestilence",
  portent: "a divine vision rewrites the leader's next decision — their course is now fated by divine will",
  inspire: "scholarly advancement +1 — the civilization's scholars make an immediate breakthrough",
  strike:  "a comet strikes — population falls by 25, stability drops by 2, the territory is scorched and burning",
  reveal:  "the civilization's plans and current thoughts are exposed to divine sight — all secrets laid bare",
};

export async function POST(req: NextRequest) {
  try {
    const { godName, miracleType, territoryName, civName, mechEffect, targetCivPop, targetCivStability } = await req.json();

    const target = civName ?? territoryName ?? "the land";
    const effect = mechEffect ?? MIRACLE_FLAVOR[miracleType] ?? miracleType;
    const stateContext = (targetCivPop != null || targetCivStability != null)
      ? `Current state of ${target}: population ${targetCivPop ?? "unknown"}, stability ${targetCivStability ?? "unknown"}.`
      : "";

    const prompt = `You are the voice recording events in the living chronicle of a god-simulation world.

A god just acted. Write 2 sentences for the chronicle.

GOD: ${godName}
MIRACLE: ${miracleType}
TARGET: ${target}
EFFECT: ${effect}
${stateContext}

Rules:
- Sentence 1: What happened — name ${godName} and ${target} explicitly, describe the physical effect in concrete terms
- Sentence 2: The immediate strategic consequence — what does this mean for ${target} or their rivals
- Use present-tense ("crashes down", "spreads through", not "crashed down")
- Be specific and vivid — no vague phrases like "divine favor shines" or "the heavens speak"
- Write as if reporting a real event with real consequences
- Max 50 words

Return ONLY the 2 sentences, nothing else.`;

    const response = await mergeCreate({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
    });

    logTokens("narrate-miracle", response);

    const narration =
      extractText(response) ??
      `${godName}'s ${miracleType} falls upon ${target} — the world shifts in its wake.`;

    return NextResponse.json({ narration });
  } catch (err) {
    console.error("[narrate-miracle]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

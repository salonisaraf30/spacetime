import { NextRequest, NextResponse } from "next/server";
import { mergeCreate, extractText, logTokens } from "../../lib/merge-gateway";
import { DIRECTIVES, DIRECTIVE_TITLES } from "../../constants/directives";

export async function POST(req: NextRequest) {
  try {
    const {
      directiveIndex,
      miracleType,
      targetName,
      mechEffect,
      civWorld,
      directivePassing,
      directiveDetail,
    } = await req.json();

    const directiveTitle = DIRECTIVE_TITLES[directiveIndex] ?? "Unknown";
    const directiveText  = DIRECTIVES[directiveIndex] ?? "Unknown directive.";

    const civLines = (civWorld ?? [])
      .filter((c: any) => c.isAlive)
      .map((c: any) => `  ${c.name}: ${c.territories} territories · tech ${c.techLevel} · piety ${c.piety} · aggression ${c.aggression} · stability ${c.stability}`)
      .join("\n");

    const prompt = `You are a divine advisor speaking directly to a god who just intervened in a mortal world.
Give a 2-sentence strategic briefing — no flattery, no poetry, just the tactical truth.

GOD'S OBJECTIVE: "${directiveTitle}"
Objective text: ${directiveText}

MIRACLE JUST CAST: ${miracleType} on ${targetName}
WHAT IT DID: ${mechEffect}

LIVE WORLD STATE:
${civLines}

DIRECTIVE STATUS: ${directivePassing ? "CURRENTLY PASSING" : "CURRENTLY FAILING"} — ${directiveDetail}

Rules:
- Sentence 1: What this miracle concretely changed for ${targetName} — reference the actual mechanic (stability, pop, territory, piety, etc.)
- Sentence 2: What this means for "${directiveTitle}" right now — be precise about what still needs to happen or what just improved
- Speak directly to the god as "your" intervention
- Never say "well done", "your power grows", or vague phrases
- If the directive is currently passing, say what needs to be protected
- Reference the specific civs by name when relevant
- Max 55 words total

Return ONLY the 2 sentences.`;

    const response = await mergeCreate({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 130,
    });

    logTokens("divine-echo", response);

    const echo = extractText(response) ?? null;

    return NextResponse.json({ echo });
  } catch (err) {
    console.error("[divine-echo]", err);
    return NextResponse.json({ echo: null }, { status: 200 });
  }
}

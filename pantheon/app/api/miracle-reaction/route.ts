import { NextRequest, NextResponse } from "next/server";
import { mergeCreate, extractToolCall, logTokens } from "../../lib/merge-gateway";
import {
  TERRITORY_ADJACENCY,
  EVENT_REACTIONS,
  FEW_SHOT_EXAMPLES,
  MIRACLE_EFFECTS,
  REACTION_TOOL,
} from "../../lib/civ-constants";

const FALLBACK_REACTIONS: Record<string, { action: string; target: string; narration: string; thought: string }> = {
  bless:   { action: "build",        target: "stability",  narration: "Divine favor washes over us. We build in its honor.",              thought: "Blessed. Respond with strength." },
  curse:   { action: "consolidate",  target: "stability",  narration: "We endure the affliction and hold our ground.",                    thought: "Cursed. Hold firm. Recover." },
  strike:  { action: "consolidate",  target: "stability",  narration: "The comet's devastation is total. We rally the survivors.",        thought: "Comet strike. Survive. Rebuild." },
  inspire: { action: "develop_tech", target: "none",       narration: "A divine spark ignites our scholars. We advance immediately.",     thought: "Inspired. Channel it into progress." },
  portent: { action: "build",        target: "stability",  narration: "The omen is read. We prepare for what it foretells.",              thought: "A portent. Prepare." },
  reveal:  { action: "consolidate",  target: "stability",  narration: "The divine gaze finds us. We project only strength.",             thought: "A god watches. Show nothing." },
};

export async function POST(req: NextRequest) {
  let civ: any = null;
  let miracle: any = null;
  try {
    const body = await req.json();
    ({ civ, miracle } = body);
    const { territories, alliances, worldMeta, godName } = body;

    if (!civ || !miracle?.type) {
      return NextResponse.json({ error: "missing civ or miracle" }, { status: 400 });
    }

    const myTerritories = (territories ?? []).filter((t: any) => t.ownerCivId === civ.id);
    const myTerritoryIds = new Set<number>(myTerritories.map((t: any) => t.id));
    const civAlliances = (alliances ?? []).filter((a: any) => a.civAId === civ.id || a.civBId === civ.id);
    const warEnemyIds: number[] = civAlliances
      .filter((a: any) => a.status === "war")
      .map((a: any) => (a.civAId === civ.id ? a.civBId : a.civAId));

    const unclaimed = (territories ?? []).filter((t: any) => t.ownerCivId === -1);
    const adjacentUnclaimed = unclaimed.filter((t: any) =>
      (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
    );
    const adjacentEnemyTerritories = (territories ?? []).filter((t: any) =>
      warEnemyIds.includes(t.ownerCivId) &&
      (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
    );

    const otherCivNames: string[] = [...new Set<string>(
      (territories ?? [])
        .filter((t: any) => t.ownerCivId !== -1 && t.ownerCivId !== civ.id)
        .map((t: any) => {
          const found = (territories ?? []).find((x: any) => x.id === t.ownerCivId);
          return found?.name ?? String(t.ownerCivId);
        })
    )];

    const eligibleActions: string[] = ["build", "consolidate"];
    if (adjacentUnclaimed.length > 0) eligibleActions.push("expand");
    if (civ.aggression >= 6 && adjacentEnemyTerritories.length > 0) eligibleActions.push("conquer");
    if (civ.aggression >= 5 && otherCivNames.length > 0) eligibleActions.push("declare_war");
    if (civ.mercantile >= 4 && otherCivNames.length > 0) eligibleActions.push("form_alliance");
    if (civ.scholarly >= 4) eligibleActions.push("develop_tech");
    if (civ.mercantile >= 5 && otherCivNames.length > 0) eligibleActions.push("send_envoy");
    if (civ.piety >= 7 && otherCivNames.length > 0) eligibleActions.push("convert");

    const civReactions = EVENT_REACTIONS[civ.name] ?? {};
    const reactionGuidance = civReactions[miracle.type] ?? "React in character to this divine intervention.";
    const effect = MIRACLE_EFFECTS[miracle.type] ?? miracle.type;
    const targetTerr = (territories ?? []).find((t: any) => t.id === miracle.targetId);
    const location = targetTerr ? ` on ${targetTerr.name}` : "";
    const fewShots = FEW_SHOT_EXAMPLES[civ.name] ?? "";

    const actionList = eligibleActions.map((a: string) => {
      switch (a) {
        case "expand":        return `expand [target: ${adjacentUnclaimed.map((t: any) => t.name).join(" / ")}]`;
        case "conquer":       return `conquer [target: ${adjacentEnemyTerritories.map((t: any) => t.name).join(" / ")}]`;
        case "build":         return `build [target: aggression|piety|mercantile|scholarly|stability]`;
        case "declare_war":   return `declare_war [target: ${otherCivNames.join(" / ")}]`;
        case "form_alliance": return `form_alliance [target: ${otherCivNames.join(" / ")}]`;
        case "develop_tech":  return `develop_tech [target: none]`;
        case "send_envoy":    return `send_envoy [target: ${otherCivNames.join(" / ")}]`;
        case "convert":       return `convert [target: ${otherCivNames.join(" / ")}]`;
        case "consolidate":   return `consolidate [target: stability]`;
        default:              return a;
      }
    }).join("\n    ");

    const prompt = `You govern ${civ.name} in a fantasy world simulation. A god just intervened — you must react NOW.

CIVILIZATION: ${civ.name}
PERSONA: ${civ.leaderPersona}
STATE: Pop ${civ.population} | Tech ${civ.techLevel} | Year ${worldMeta?.currentYear ?? "unknown"}
TRAITS: Agg ${civ.aggression} Pie ${civ.piety} Mer ${civ.mercantile} Sch ${civ.scholarly} Sta ${civ.stability}
TERRITORIES (${myTerritories.length}): ${myTerritories.map((t: any) => t.name).join(", ") || "none"}
ADJACENT UNCLAIMED: ${adjacentUnclaimed.map((t: any) => t.name).join(", ") || "none"}
${adjacentEnemyTerritories.length > 0 ? `ADJACENT ENEMY TERRITORIES: ${adjacentEnemyTerritories.map((t: any) => t.name).join(", ")}` : ""}
${civ.currentThought ? `LAST THOUGHT: "${civ.currentThought}"` : ""}

⚡ DIVINE INTERVENTION — THIS JUST HAPPENED:
God "${godName}" cast ${miracle.type}${location}
Effect: ${effect}
How ${civ.name} reacts to ${miracle.type}: ${reactionGuidance}

ELIGIBLE ACTIONS:
    ${actionList}

IN-CHARACTER EXAMPLES:
${fewShots}

Make ONE decision that directly responds to this divine intervention. Stay entirely in character. Call submit_reaction now.

NARRATION RULES:
- Sentence 1: name what the miracle physically did (the territory, the specific effect — population drop, stat change, plague)
- Sentence 2: what you are doing in response and the concrete strategic reason
- Name specific territories, enemies, and stats — never write vague phrases like "the gods test us" or "divine will guides our path"
- Write as the leader speaking in the moment, not as a poet reflecting later`;

    const response = await mergeCreate({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      tools: [REACTION_TOOL],
      tool_choice: "any",
    });

    logTokens("miracle-reaction", response);

    const toolCall = extractToolCall(response);
    if (toolCall) {
      const { action, target, narration, thought } = toolCall.input as any;
      console.log(`[miracle-reaction] ${civ.name} reacts to ${miracle.type} from ${godName}: ${action} → ${target}`);
      return NextResponse.json({ civId: civ.id, action, target, narration, thought });
    }

    throw new Error("No tool call in response");
  } catch (err) {
    console.error("[miracle-reaction]", err);
    const fb = FALLBACK_REACTIONS[miracle?.type ?? "bless"] ?? FALLBACK_REACTIONS.bless;
    return NextResponse.json({ civId: civ?.id ?? 0, ...fb });
  }
}

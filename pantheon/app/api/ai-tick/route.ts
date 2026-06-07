import { NextRequest, NextResponse } from "next/server";
import { mergeCreate, extractToolCall, logTokens } from "../../lib/merge-gateway";
import {
  TERRITORY_ADJACENCY,
  EVENT_REACTIONS,
  FEW_SHOT_EXAMPLES,
  MIRACLE_EFFECTS,
  ruleBasedDecision,
  DECISION_TOOL,
} from "../../lib/civ-constants";

function needsAIDecision(civ: any, civMiracles: any[], warEnemyIds: number[]): boolean {
  if (civMiracles.length > 0) return true;
  if (warEnemyIds.length > 0) return true;
  if (civ.stability <= 3) return true;
  if (civ.population <= 20) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { civs, territories, alliances, worldMeta, recentMiracles, gods } = await req.json();

    if (!worldMeta || !civs?.length) {
      return NextResponse.json({ error: "no world state" }, { status: 400 });
    }

    const aliveCivs = civs.filter((c: any) => c.isAlive);
    const unclaimed = territories.filter((t: any) => t.ownerCivId === -1);
    const godMap: Record<number, { name: string; color: string }> = {};
    for (const g of (gods ?? [])) godMap[g.id] = g;

    const civContexts = aliveCivs.map((civ: any) => {
      const myTerritories = territories.filter((t: any) => t.ownerCivId === civ.id);
      const myTerritoryIds = new Set<number>(myTerritories.map((t: any) => t.id));
      const civAlliances = (alliances ?? []).filter((a: any) => a.civAId === civ.id || a.civBId === civ.id);
      const warEnemyIds: number[] = civAlliances
        .filter((a: any) => a.status === "war")
        .map((a: any) => (a.civAId === civ.id ? a.civBId : a.civAId));

      const adjacentUnclaimed = unclaimed.filter((t: any) =>
        (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
      );
      const adjacentEnemyTerritories = territories.filter((t: any) =>
        warEnemyIds.includes(t.ownerCivId) &&
        (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
      );

      const civMiracles = (recentMiracles ?? []).filter((m: any) => {
        if (m.targetId === civ.id) return true;
        const terr = territories.find((t: any) => t.id === m.targetId);
        return terr && terr.ownerCivId === civ.id;
      });

      const eligibleActions: string[] = ["build", "consolidate"];
      if (adjacentUnclaimed.length > 0) eligibleActions.push("expand");
      if (civ.aggression >= 6 && adjacentEnemyTerritories.length > 0) eligibleActions.push("conquer");
      if (civ.aggression >= 5 && aliveCivs.length > 1) eligibleActions.push("declare_war");
      if (civ.mercantile >= 4 && aliveCivs.length > 1) eligibleActions.push("form_alliance");
      if (civ.scholarly >= 4) eligibleActions.push("develop_tech");
      if (civ.mercantile >= 5 && aliveCivs.length > 1) eligibleActions.push("send_envoy");
      if (civ.piety >= 7 && aliveCivs.length > 1) eligibleActions.push("convert");

      const otherCivNames = aliveCivs.filter((c: any) => c.id !== civ.id).map((c: any) => c.name);

      return { civ, myTerritories, adjacentUnclaimed, adjacentEnemyTerritories, warEnemyIds, civMiracles, eligibleActions, otherCivNames, civAlliances };
    });

    const needAI = civContexts.filter((ctx: any) => needsAIDecision(ctx.civ, ctx.civMiracles, ctx.warEnemyIds));
    const useRules = civContexts.filter((ctx: any) => !needsAIDecision(ctx.civ, ctx.civMiracles, ctx.warEnemyIds));

    const ruleDecisions = useRules.map((ctx: any) => ({
      civId: ctx.civ.id,
      decision: ruleBasedDecision(ctx.civ, ctx.adjacentUnclaimed, ctx.eligibleActions),
    }));

    let aiDecisions: { civId: number; decision: any }[] = [];

    if (needAI.length > 0) {
      const civBlocks = needAI.map((ctx: any) => {
        const { civ, myTerritories, adjacentUnclaimed, adjacentEnemyTerritories, civMiracles, eligibleActions, otherCivNames, civAlliances } = ctx;
        const civReactions = EVENT_REACTIONS[civ.name] ?? {};

        const miracleLines = civMiracles.map((m: any) => {
          const god = godMap[m.godId];
          const effect = MIRACLE_EFFECTS[m.miracleType] ?? m.miracleType;
          const targetTerr = territories.find((t: any) => t.id === m.targetId);
          const location = targetTerr ? ` on ${targetTerr.name}` : "";
          const reaction = civReactions[m.miracleType] ?? "";
          return `  DIVINE: ${god?.name ?? "Unknown god"} cast ${m.miracleType}${location} (${effect})\n  → How you react: ${reaction}`;
        }).join("\n");

        const relationshipLines = civAlliances.map((a: any) => {
          const otherId = a.civAId === civ.id ? a.civBId : a.civAId;
          const other = aliveCivs.find((c: any) => c.id === otherId);
          return `${other?.name ?? otherId}: ${a.status}`;
        }).join(", ") || "none";

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

        const fewShots = FEW_SHOT_EXAMPLES[civ.name] ?? "";

        return `
--- CIV ID ${civ.id}: ${civ.name} ---
PERSONA: ${civ.leaderPersona}
STATE: Pop ${civ.population} | Tech ${civ.techLevel} | Yr ${worldMeta.currentYear}
TRAITS: Agg ${civ.aggression} Pie ${civ.piety} Mer ${civ.mercantile} Sch ${civ.scholarly} Sta ${civ.stability}
TERRITORIES (${myTerritories.length}): ${myTerritories.map((t: any) => t.name).join(", ") || "none"}
ADJACENT UNCLAIMED: ${adjacentUnclaimed.map((t: any) => t.name).join(", ") || "none"}
ADJACENT ENEMY TERRITORIES: ${adjacentEnemyTerritories.map((t: any) => t.name).join(", ") || "none"}
RELATIONSHIPS: ${relationshipLines}
${civ.currentThought ? `CURRENT THOUGHT: "${civ.currentThought}"` : ""}
${civMiracles.length > 0 ? `\n${miracleLines}\n⚠ DIVINE EVENT OCCURRED — your decision MUST respond to it in character.` : ""}
ELIGIBLE ACTIONS:
    ${actionList}
EXAMPLES OF IN-CHARACTER DECISIONS:
${fewShots}`;
      }).join("\n\n");

      const batchPrompt = `You are the AI governing ${needAI.length} civilizations in a fantasy world simulation.
For each civilization below, make ONE decision this tick. Each civ has its own persona, world state, and eligible actions.

${civBlocks}

NARRATION RULES (apply to every decision):
- Name the specific territory or target in the narration — never write "we expand our borders" when you can write "we took Crimson Pass"
- Show a concrete outcome: what changed, what was seized, what alliance was struck
- Write as the leader speaking or as a chronicle recorder — no vague omen-speak
- Never use "divine favor", "the gods will it", "the people rejoice", or similar empty phrases
- Narrations should read like real historical chronicle entries, not fortune cookies

Call the submit_decisions tool with all ${needAI.length} decisions. Each civId must appear exactly once.`;

      try {
        const response = await mergeCreate({
          messages: [{ role: "user", content: batchPrompt }],
          max_tokens: 1024,
          tools: [DECISION_TOOL],
          tool_choice: "any",
        });

        logTokens("ai-tick", response);

        const toolCall = extractToolCall(response);
        if (toolCall) {
          const { decisions } = toolCall.input as { decisions: any[] };
          aiDecisions = decisions.map((d: any) => ({ civId: d.civId, decision: d }));
        }
      } catch (err) {
        console.error("[ai-tick] batch call failed:", err);
        aiDecisions = needAI.map((ctx: any) => ({
          civId: ctx.civ.id,
          decision: ruleBasedDecision(ctx.civ, ctx.adjacentUnclaimed, ctx.eligibleActions),
        }));
      }
    }

    const allDecisions = [...ruleDecisions, ...aiDecisions];

    console.log(`[ai-tick] tick ${worldMeta.tickCount}: ${useRules.length} rule-based, ${needAI.length} AI-reasoned (${needAI.map((c: any) => c.civ.name).join(", ")})`);

    return NextResponse.json({ tick: worldMeta.tickCount, decisions: allDecisions });
  } catch (err) {
    console.error("[ai-tick]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

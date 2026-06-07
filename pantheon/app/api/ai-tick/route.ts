import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ACTIONS = ["expand", "build", "declare_war", "form_alliance", "develop_tech", "send_envoy", "convert", "conquer"];

const MIRACLE_EFFECTS: Record<string, string> = {
  bless:   "+2 stability granted to your civilization",
  curse:   "-15 population and plague afflicted upon one of your territories",
  portent: "a divine omen planted in your leaders's mind — your next decision is influenced",
  inspire: "+1 scholarly granted to your civilization",
  strike:  "-25 population, -2 stability, comet strike on one of your territories",
  reveal:  "a god peered into your civilization's secrets",
};

export async function POST(req: NextRequest) {
  try {
    const { civs, territories, alliances, worldMeta, recentMiracles, gods } = await req.json();

    if (!worldMeta || !civs?.length) {
      return NextResponse.json({ error: "no world state" }, { status: 400 });
    }

    const aliveCivs = civs.filter((c: any) => c.isAlive);
    const unclaimed = territories.filter((t: any) => t.ownerCivId === -1);
    const godMap: Record<number, string> = {};
    for (const g of (gods ?? [])) godMap[g.id] = g.name;

    const results = await Promise.allSettled(
      aliveCivs.map(async (civ: any) => {
        const myTerritories = territories.filter((t: any) => t.ownerCivId === civ.id);
        const civAlliances = (alliances ?? []).filter(
          (a: any) => a.civAId === civ.id || a.civBId === civ.id
        );

        // Miracles targeting this civ directly OR targeting a territory it owns
        const civMiracles = (recentMiracles ?? []).filter((m: any) => {
          if (m.targetId === civ.id) return true;
          const targetTerritory = territories.find((t: any) => t.id === m.targetId);
          return targetTerritory && targetTerritory.ownerCivId === civ.id;
        });

        const relationshipLines = civAlliances.map((a: any) => {
          const otherId = a.civAId === civ.id ? a.civBId : a.civAId;
          const other = aliveCivs.find((c: any) => c.id === otherId);
          return `- ${other?.name ?? otherId}: ${a.status}`;
        });

        const warEnemyIds = civAlliances
          .filter((a: any) => a.status === "war")
          .map((a: any) => (a.civAId === civ.id ? a.civBId : a.civAId));
        const enemyTerritories = territories.filter((t: any) => warEnemyIds.includes(t.ownerCivId));

        // Rich miracle lines: name the god, name the effect, name the territory if applicable
        const miracleLines = civMiracles.map((m: any) => {
          const godName = godMap[m.godId] ?? "An unknown god";
          const effect = MIRACLE_EFFECTS[m.miracleType] ?? m.miracleType;
          const targetTerritory = territories.find((t: any) => t.id === m.targetId);
          const location = targetTerritory ? ` on ${targetTerritory.name}` : "";
          return `- ${godName} cast ${m.miracleType}${location}: ${effect} (tick ${m.tickNumber})`;
        });

        const hasMiracles = miracleLines.length > 0;

        const prompt = `You are the leader of the ${civ.name} civilization.

${civ.leaderPersona}

Your traits (0–10):
- Aggression: ${civ.aggression}  Piety: ${civ.piety}  Mercantile: ${civ.mercantile}
- Scholarly: ${civ.scholarly}  Stability: ${civ.stability}

Population: ${civ.population} | Tech: ${civ.techLevel} | Year: ${worldMeta.currentYear}
Your territories: ${myTerritories.map((t: any) => t.name).join(", ") || "none"}
Unclaimed territories: ${unclaimed.map((t: any) => t.name).join(", ") || "none"}
Enemy territories you can conquer (at war): ${enemyTerritories.map((t: any) => t.name).join(", ") || "none"}
${civ.currentThought ? `\nYour current thought: "${civ.currentThought}"` : ""}
Relationships:
${relationshipLines.join("\n") || "- None"}

DIVINE INTERVENTIONS THIS ERA:
${miracleLines.join("\n") || "- None"}
${hasMiracles ? `\nIMPORTANT: Gods have acted upon your civilization. Your narration MUST acknowledge the divine intervention — react to it in character. Let it drive your decision.` : ""}

AVAILABLE ACTIONS (pick one):
- expand: claim an unclaimed territory — target must be an unclaimed territory name
- conquer: seize an enemy territory you are at war with — target must be an enemy territory name (need aggression >= 6, must be at war with owner)
- build: raise one stat — target must be exactly one of: aggression/piety/mercantile/scholarly/stability (need pop >= 2)
- declare_war: start war with a named civ — target must be a civ name (need aggression >= 5)
- form_alliance: ally with a named civ — target must be a civ name (need mercantile >= 4)
- develop_tech: advance technology — target must be "none" (need scholarly >= 4)
- send_envoy: raise target civ's mercantile — target must be a civ name (need mercantile >= 5)
- convert: raise target civ's piety — target must be a civ name (need piety >= 7)

Respond in EXACTLY this JSON (nothing else):
{
  "action": "<action name>",
  "target": "<territory or civ name, or none>",
  "narration": "<one sentence in your voice, max 30 words — if gods intervened, reference it>",
  "thought": "<private reasoning, max 20 words>"
}`;

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        let decision: { action: string; target: string; narration: string; thought: string };

        try {
          const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          decision = JSON.parse(cleaned);
          if (!ACTIONS.includes(decision.action)) throw new Error("invalid action");
        } catch {
          decision = {
            action: "build",
            target: "stability",
            narration: `${civ.name} consolidates its position.`,
            thought: "Caution is wisdom.",
          };
        }

        return { civId: civ.id, decision };
      })
    );

    const decisions = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return NextResponse.json({ tick: worldMeta.tickCount, decisions });
  } catch (err) {
    console.error("[ai-tick]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

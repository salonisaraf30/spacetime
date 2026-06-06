import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HOST = process.env.NEXT_PUBLIC_SPACETIMEDB_HOST?.replace("wss://", "https://").replace("ws://", "http://") ?? "https://maincloud.spacetimedb.com";
const DB = process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME ?? "pantheon";
const TOKEN = process.env.SPACETIMEDB_TOKEN;

async function stdbSql(query: string) {
  const res = await fetch(`${HOST}/v1/database/by-name/${DB}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify([query]),
  });
  if (!res.ok) throw new Error(`SQL failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function callReducer(name: string, args: unknown[]) {
  const res = await fetch(`${HOST}/v1/database/by-name/${DB}/call/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Reducer ${name} failed: ${res.status} ${await res.text()}`);
}

function rowsFrom(result: any[]): Record<string, unknown>[] {
  if (!result?.[0]) return [];
  const { columns, rows } = result[0];
  return rows.map((row: unknown[]) =>
    Object.fromEntries(columns.map((col: { name: string }, i: number) => [col.name, row[i]]))
  );
}

const ACTIONS = [
  "expand", "build", "declare_war", "form_alliance",
  "develop_tech", "send_envoy", "convert",
];

export async function POST() {
  try {
    const [civResult, terrResult, allianceResult, metaResult, miracleResult] = await Promise.all([
      stdbSql("SELECT * FROM civilization"),
      stdbSql("SELECT * FROM territory"),
      stdbSql("SELECT * FROM alliance"),
      stdbSql("SELECT * FROM world_meta"),
      stdbSql("SELECT * FROM miracle_cast ORDER BY tick_number DESC LIMIT 20"),
    ]);

    const civs = rowsFrom(civResult).filter((c) => c.is_alive);
    const territories = rowsFrom(terrResult);
    const alliances = rowsFrom(allianceResult);
    const meta = rowsFrom(metaResult)[0];
    const recentMiracles = rowsFrom(miracleResult);

    if (!meta) return NextResponse.json({ error: "no world meta" }, { status: 400 });

    const results = await Promise.allSettled(
      civs.map(async (civ) => {
        const myTerritories = territories.filter((t) => t.owner_civ_id === civ.id);
        const unclaimed = territories.filter((t) => t.owner_civ_id === -1);
        const civAlliances = alliances.filter(
          (a) => a.civ_a_id === civ.id || a.civ_b_id === civ.id
        );
        const civMiracles = recentMiracles.filter((m) => m.target_id === civ.id);

        const relationshipLines = civAlliances.map((a) => {
          const otherId = a.civ_a_id === civ.id ? a.civ_b_id : a.civ_a_id;
          const other = civs.find((c) => c.id === otherId);
          return `- ${other?.name ?? otherId}: ${a.status}`;
        });

        const prompt = `You are the leader of the ${civ.name} civilization.

${civ.leader_persona}

Your traits (0–10):
- Aggression: ${civ.aggression}  Piety: ${civ.piety}  Mercantile: ${civ.mercantile}
- Scholarly: ${civ.scholarly}  Stability: ${civ.stability}

Population: ${civ.population} | Tech: ${civ.tech_level} | Year: ${meta.current_year}
Your territories: ${myTerritories.map((t) => t.name).join(", ") || "none"}
Unclaimed nearby: ${unclaimed.map((t) => t.name).join(", ") || "none"}

Recent divine interventions:
${civMiracles.map((m) => `- A god cast ${m.miracle_type} on you (tick ${m.tick_number})`).join("\n") || "- None"}

Relationships:
${relationshipLines.join("\n") || "- None"}

AVAILABLE ACTIONS (pick one):
- expand: claim an unclaimed territory (need pop >= 3)
- build: raise one stat — aggression/piety/mercantile/scholarly/stability (need pop >= 2)
- declare_war: start war with a named civ (need aggression >= 5)
- form_alliance: ally with a named civ (need mercantile >= 4)
- develop_tech: +1 tech level (need scholarly >= 4)
- send_envoy: raise target civ's mercantile (need mercantile >= 5)
- convert: raise target civ's piety (need piety >= 7)

Respond in EXACTLY this JSON (nothing else):
{
  "action": "<action name>",
  "target": "<territory or civ name>",
  "narration": "<one sentence in your voice, max 30 words>",
  "thought": "<private reasoning, max 20 words>"
}`;

        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5",
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

        await callReducer("apply_civ_decision", [
          civ.id,
          decision.action,
          decision.target,
          decision.narration,
          decision.thought,
        ]);

        return { civ: civ.name, decision };
      })
    );

    const decisions = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    return NextResponse.json({ tick: meta.tick_count, decisions });
  } catch (err) {
    console.error("[ai-tick]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

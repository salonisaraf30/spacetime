# Pantheon — Execution Guide

This is the step-by-step build manual for Pantheon. Every team member should read the full document, then focus on their role sections. Steps are ordered linearly — follow them top to bottom. Dependencies between roles are called out explicitly so nobody blocks anyone else.

---

## Team Roles (Quick Reference)

| Role | Person | Core Responsibility |
|------|--------|-------------------|
| **Builder** | Shreyam | SpacetimeDB backend, reducers, procedures, LLM integration, deployment |
| **Frontend Lead** | TBD | Map, phone UI, animations, civ inspector, onboarding |
| **Prompt & Game Design Lead** | TBD | Civ personas, few-shot exemplars, directives, playtesting calibration |
| **Pitch & Video Lead** | TBD | Demo script, video shoot/edit, README, submission, booth |

---

## Phase 0: Pre-Hackathon Setup (All Hands)

Everyone does these steps on their own machine before the hackathon clock starts. This phase has zero creative decisions — it is pure plumbing.

### Step 0.1 — Every Laptop

**Who:** All four team members, independently.

1. Install SpacetimeDB CLI:

```bash
# Install the CLI
curl -sSf https://install.spacetimedb.com | bash

# Verify installation
spacetime --version
# Expected: >= 1.4.0
```

2. Install Claude Code skills for SpacetimeDB:

```bash
npx skills add clockworklabs/spacetimedb
# This installs 16 official skill files so Claude Code knows SpacetimeDB v2
```

3. Install Vercel CLI:

```bash
npm i -g vercel
vercel --version
```

4. Set up Anthropic API key:

```bash
# In your shell profile or .env file
export ANTHROPIC_API_KEY="sk-ant-..."
# Confirm $50+ credit on the Anthropic dashboard
```

5. Confirm Cursor + Claude Code are configured and working.

### Step 0.2 — Shared Repo Setup

**Who:** Builder (Shreyam) does this. Everyone else clones.

1. Clone the official template:

```bash
git clone https://github.com/clockworklabs/spacetimedb-template-nextjs-ts.git pantheon
cd pantheon
```

2. Install dependencies:

```bash
npm install
```

3. Test local SpacetimeDB publish:

```bash
spacetime publish pantheon-dev --project-path server
# Confirm it compiles and publishes
```

4. Test that the React app connects locally to SpacetimeDB.

5. Create a GitHub repo named `pantheon`, push the template:

```bash
git remote set-url origin git@github.com:<your-org>/pantheon.git
git push -u origin main
```

6. Add all teammates as collaborators on GitHub.

7. Create Vercel project linked to the repo:

```bash
vercel link
```

8. Create SpacetimeDB Maincloud project:

```bash
spacetime publish pantheon --host maincloud.spacetimedb.com
```

9. Do a first deploy of the empty app:

```bash
vercel --prod
```

Confirm: empty Next.js app is live on Vercel, empty SpacetimeDB module is live on Maincloud, and the frontend connects to the backend via the public URL.

**Everyone else:** clone the repo, run `npm install`, confirm you can run the app locally.

### Step 0.3 — Shared Assets

**Who:** Frontend Lead generates the map. Prompt Lead creates the rulebook doc.

1. **Map SVG (Frontend Lead):** Generate in v0 — a fantasy continent silhouette with 18 named regions, each as a separate `<path>` element with a unique `id`. Save as `public/map.svg`. Regions should have placeholder fill colors.

2. **Rulebook doc (Prompt Lead):** Create a shared Markdown or Notion doc with four empty sections: A (Civ Actions), B (Miracles), C (Civ Personas), D (Event-to-Reaction Mapping). Share the link with the team.

3. **QR codes (Pitch Lead):** Pre-print QR codes pointing to the Vercel URL on paper. Bring as backup.

### Step 0.4 — Mental Prep

**Who:** All four.

1. Read the full Pantheon design doc end to end.
2. Read through the `chat-react-ts` reference template once so SpacetimeDB subscription/reducer patterns are familiar.
3. Watch one SpacetimeDB v2 tutorial video.

---

## Phase 1: The Pipe (World Ticks, Map Renders, SpacetimeDB Works)

**Goal:** Territories change colors on the map driven by a SpacetimeDB scheduled reducer. No AI, no UX polish. Just proof the entire pipe is live.

### Step 1.1 — Define the Schema

**Who:** Builder
**Blocked by:** Nothing (Phase 0 complete)
**Unblocks:** Everything else

Create the SpacetimeDB module with all tables. This is the single most important file in the project.

```typescript
// server/src/lib.ts (SpacetimeDB TypeScript server module)

import {
  table,
  reducer,
  scheduledReducer,
  Identity,
  Timestamp,
  ReducerContext,
} from "@clockworklabs/spacetimedb-sdk/server";

// ─── TABLES ───

@table({ public: true })
class Territory {
  @primaryKey
  id: number = 0;
  name: string = "";
  owner_civ_id: number = -1; // -1 = unclaimed
  terrain_type: string = "plains"; // plains | mountain | river | coast | forest
  has_capital: boolean = false;
  current_event: string = "none"; // none | plague | blessing | comet | war
}

@table({ public: true })
class Civilization {
  @primaryKey
  id: number = 0;
  name: string = "";
  color: string = "";
  population: number = 50;
  tech_level: number = 1;
  aggression: number = 5;
  piety: number = 5;
  mercantile: number = 5;
  scholarly: number = 5;
  stability: number = 5;
  leader_persona: string = "";
  current_thought: string = "";
  is_alive: boolean = true;
}

@table({ public: true })
class God {
  @primaryKey
  id: number = 0;
  identity: Identity = new Identity();
  name: string = "";
  color: string = "";
  faith_balance: number = 80;
  secret_directive: number = -1;
}

@table({ public: true })
class MiracleCast {
  @primaryKey
  id: number = 0;
  god_id: number = 0;
  miracle_type: string = "";
  target_id: number = 0;
  tick_number: number = 0;
  narration: string = "";
}

@table({ public: true })
class CivAction {
  @primaryKey
  id: number = 0;
  civ_id: number = 0;
  action_type: string = "";
  target: string = "";
  tick_number: number = 0;
  narration: string = "";
}

@table({ public: true })
class ChronicleEntry {
  @primaryKey
  id: number = 0;
  tick_number: number = 0;
  entry_type: string = ""; // miracle | action | event | era
  civ_color: string = "";
  god_color: string = "";
  text: string = "";
  related_territory_id: number = -1;
}

@table({ public: true })
class Alliance {
  @primaryKey
  id: number = 0;
  civ_a_id: number = 0;
  civ_b_id: number = 0;
  status: string = "neutral"; // alliance | war | neutral
}

@table({ public: true })
class WorldMeta {
  @primaryKey
  id: number = 0; // singleton, always id=0
  current_year: number = 1;
  era: number = 1;
  session_id: number = 1;
  tick_count: number = 0;
  is_running: boolean = true;
}
```

**Note for Builder:** The exact syntax depends on the SpacetimeDB v2 TypeScript SDK version. Consult the installed skill files and the template for the correct decorators and types. The schema above captures the intent — adapt the syntax to match what the SDK expects.

### Step 1.2 — Seed Starting Data

**Who:** Builder
**Blocked by:** Step 1.1

Write an `init` reducer that seeds the world on first publish. This runs once.

```typescript
// Pseudocode for the init reducer

@reducer
function init_world(ctx: ReducerContext) {
  // Only run if WorldMeta doesn't exist yet
  if (WorldMeta.findById(0)) return;

  // Create world meta
  WorldMeta.insert({
    id: 0, current_year: 1, era: 1, session_id: 1, tick_count: 0, is_running: true
  });

  // Create four civilizations
  const civs = [
    { id: 0, name: "Aelthar",          color: "#DC2626", population: 50, tech_level: 1,
      aggression: 9, piety: 4, mercantile: 2, scholarly: 3, stability: 6,
      leader_persona: "Warlike iron kings...", current_thought: "", is_alive: true },
    { id: 1, name: "Brindlefolk",      color: "#4F46E5", population: 50, tech_level: 1,
      aggression: 3, piety: 9, mercantile: 4, scholarly: 5, stability: 5,
      leader_persona: "Pious coastal people...", current_thought: "", is_alive: true },
    { id: 2, name: "Sapient",          color: "#7C3AED", population: 50, tech_level: 1,
      aggression: 2, piety: 5, mercantile: 6, scholarly: 9, stability: 7,
      leader_persona: "Scholar-priests...", current_thought: "", is_alive: true },
    { id: 3, name: "Merchant Princes", color: "#0D9488", population: 50, tech_level: 1,
      aggression: 4, piety: 3, mercantile: 9, scholarly: 6, stability: 4,
      leader_persona: "Wealthy trading dynasty...", current_thought: "", is_alive: true },
  ];
  civs.forEach(c => Civilization.insert(c));

  // Create 18 territories
  // First 4 are capitals (one per civ), rest are unclaimed
  const territories = [
    { id: 0,  name: "Iron Citadel",       owner_civ_id: 0, terrain_type: "mountain", has_capital: true,  current_event: "none" },
    { id: 1,  name: "Brindle Coast",      owner_civ_id: 1, terrain_type: "coast",    has_capital: true,  current_event: "none" },
    { id: 2,  name: "The Silver Archive",  owner_civ_id: 2, terrain_type: "plains",   has_capital: true,  current_event: "none" },
    { id: 3,  name: "Tidemarket",         owner_civ_id: 3, terrain_type: "coast",    has_capital: true,  current_event: "none" },
    { id: 4,  name: "The Whispering Pines", owner_civ_id: -1, terrain_type: "forest", has_capital: false, current_event: "none" },
    { id: 5,  name: "Ashenvale",          owner_civ_id: -1, terrain_type: "forest",   has_capital: false, current_event: "none" },
    { id: 6,  name: "Sunken Flats",       owner_civ_id: -1, terrain_type: "plains",   has_capital: false, current_event: "none" },
    { id: 7,  name: "The Pale Reach",     owner_civ_id: -1, terrain_type: "plains",   has_capital: false, current_event: "none" },
    { id: 8,  name: "Crimson Pass",       owner_civ_id: -1, terrain_type: "mountain", has_capital: false, current_event: "none" },
    { id: 9,  name: "Gildwater",          owner_civ_id: -1, terrain_type: "river",    has_capital: false, current_event: "none" },
    { id: 10, name: "Thornwall",          owner_civ_id: -1, terrain_type: "forest",   has_capital: false, current_event: "none" },
    { id: 11, name: "The Broken Steppe",  owner_civ_id: -1, terrain_type: "plains",   has_capital: false, current_event: "none" },
    { id: 12, name: "Duskhollow",         owner_civ_id: -1, terrain_type: "forest",   has_capital: false, current_event: "none" },
    { id: 13, name: "Salt Barrens",       owner_civ_id: -1, terrain_type: "plains",   has_capital: false, current_event: "none" },
    { id: 14, name: "Ember Ridge",        owner_civ_id: -1, terrain_type: "mountain", has_capital: false, current_event: "none" },
    { id: 15, name: "Serpent Isles",      owner_civ_id: -1, terrain_type: "coast",    has_capital: false, current_event: "none" },
    { id: 16, name: "The Quiet Fen",      owner_civ_id: -1, terrain_type: "river",    has_capital: false, current_event: "none" },
    { id: 17, name: "Crown's End",        owner_civ_id: -1, terrain_type: "mountain", has_capital: false, current_event: "none" },
  ];
  territories.forEach(t => Territory.insert(t));

  // Create alliances (start two civs at war for drama)
  Alliance.insert({ id: 0, civ_a_id: 0, civ_b_id: 1, status: "war" }); // Aelthar vs Brindlefolk
}
```

### Step 1.3 — Write the Placeholder World Tick

**Who:** Builder
**Blocked by:** Step 1.2

Before wiring up the LLM, write a dumb version that picks a random civ, random action, random target. This proves the scheduled reducer works.

```typescript
// Scheduled reducer — fires every 15 seconds
@scheduledReducer({ repeatIntervalMs: 15_000 })
function world_tick(ctx: ReducerContext) {
  const meta = WorldMeta.findById(0);
  if (!meta || !meta.is_running) return;

  meta.tick_count += 1;
  meta.current_year += 1;
  WorldMeta.updateById(0, meta);

  // Placeholder: random civ claims a random unclaimed territory
  const civs = Civilization.filterByIsAlive(true);
  const unclaimed = Territory.filterByOwnerCivId(-1);
  if (civs.length > 0 && unclaimed.length > 0) {
    const civ = civs[Math.floor(Math.random() * civs.length)];
    const territory = unclaimed[Math.floor(Math.random() * unclaimed.length)];
    territory.owner_civ_id = civ.id;
    Territory.updateById(territory.id, territory);

    // Write a placeholder chronicle entry
    ChronicleEntry.insert({
      id: meta.tick_count,
      tick_number: meta.tick_count,
      entry_type: "action",
      civ_color: civ.color,
      god_color: "",
      text: `${civ.name} expanded into ${territory.name}.`,
      related_territory_id: territory.id,
    });
  }
}
```

### Step 1.4 — Write the Faith Regen Reducer

**Who:** Builder
**Blocked by:** Step 1.1

```typescript
@scheduledReducer({ repeatIntervalMs: 10_000 })
function regen_faith(ctx: ReducerContext) {
  const gods = God.iter();
  for (const god of gods) {
    god.faith_balance = Math.min(god.faith_balance + 5, 200); // cap at 200
    God.updateById(god.id, god);
  }
}
```

### Step 1.5 — Publish and Verify the Backend

**Who:** Builder
**Blocked by:** Steps 1.1–1.4

```bash
spacetime publish pantheon --host maincloud.spacetimedb.com
```

Verify: check SpacetimeDB logs that `world_tick` fires every 15 seconds, territories are changing owners.

### Step 1.6 — Wire the Map to SpacetimeDB Subscriptions

**Who:** Frontend Lead
**Blocked by:** Step 1.5 (backend must be live), Step 0.3 (map SVG must exist)

This is the frontend's first real task. Connect to SpacetimeDB, subscribe to the `territories` and `civilizations` tables, and color the SVG map regions based on ownership.

```tsx
// app/components/GameMap.tsx

"use client";

import { useEffect, useState } from "react";
import { SpacetimeDBClient } from "@clockworklabs/spacetimedb-sdk";

// Territory type matching the SpacetimeDB table
interface Territory {
  id: number;
  name: string;
  owner_civ_id: number;
  terrain_type: string;
  has_capital: boolean;
  current_event: string;
}

interface Civilization {
  id: number;
  name: string;
  color: string;
}

// Map from territory ID to SVG path ID
// This mapping must match the IDs in your map.svg file
const TERRITORY_TO_PATH: Record<number, string> = {
  0: "iron-citadel",
  1: "brindle-coast",
  2: "silver-archive",
  3: "tidemarket",
  4: "whispering-pines",
  5: "ashenvale",
  6: "sunken-flats",
  7: "pale-reach",
  8: "crimson-pass",
  9: "gildwater",
  10: "thornwall",
  11: "broken-steppe",
  12: "duskhollow",
  13: "salt-barrens",
  14: "ember-ridge",
  15: "serpent-isles",
  16: "quiet-fen",
  17: "crowns-end",
};

const UNCLAIMED_COLOR = "#d4c5a9"; // parchment neutral

export function GameMap() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [civs, setCivs] = useState<Civilization[]>([]);

  useEffect(() => {
    // Connect to SpacetimeDB and subscribe
    // Adapt this to the actual SDK client setup from the template
    const client = new SpacetimeDBClient(
      "wss://maincloud.spacetimedb.com",
      "pantheon"
    );

    // Register callbacks for table updates
    client.on("Territory", (oldVal, newVal) => {
      setTerritories(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(t => t.id === newVal.id);
        if (idx >= 0) updated[idx] = newVal;
        else updated.push(newVal);
        return updated;
      });
    });

    client.on("Civilization", (oldVal, newVal) => {
      setCivs(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(c => c.id === newVal.id);
        if (idx >= 0) updated[idx] = newVal;
        else updated.push(newVal);
        return updated;
      });
    });

    client.subscribe(["SELECT * FROM Territory", "SELECT * FROM Civilization"]);
    client.connect();

    return () => client.disconnect();
  }, []);

  // Build a lookup: civ_id -> color
  const civColorMap: Record<number, string> = {};
  civs.forEach(c => { civColorMap[c.id] = c.color; });

  // Color each SVG path
  useEffect(() => {
    territories.forEach(t => {
      const pathId = TERRITORY_TO_PATH[t.id];
      const el = document.getElementById(pathId);
      if (!el) return;

      const color = t.owner_civ_id >= 0
        ? (civColorMap[t.owner_civ_id] || UNCLAIMED_COLOR)
        : UNCLAIMED_COLOR;

      // Set fill with reduced opacity for the parchment feel
      el.style.fill = color;
      el.style.fillOpacity = t.owner_civ_id >= 0 ? "0.35" : "0.15";
      el.style.stroke = color;
      el.style.strokeWidth = "1.5";
      el.style.transition = "fill 1.5s ease, fill-opacity 1.5s ease";
    });
  }, [territories, civColorMap]);

  return (
    <div className="relative w-full h-full">
      {/* Inline the SVG or use next/image with dangerouslySetInnerHTML */}
      {/* The SVG must have path elements with IDs matching TERRITORY_TO_PATH */}
      <object
        data="/map.svg"
        type="image/svg+xml"
        className="w-full h-full"
        id="game-map"
      />
    </div>
  );
}
```

**Important:** The exact SpacetimeDB client SDK API may differ from what's shown above. Use the `chat-react-ts` reference template as your guide for the correct subscription and callback patterns.

### Step 1.7 — Deploy and Verify the Pipe

**Who:** Builder deploys backend, Frontend Lead deploys frontend
**Blocked by:** Steps 1.5 + 1.6

```bash
# Frontend deploy
vercel --prod
```

**Checkpoint:** Open the Vercel URL in a browser. You should see the SVG map with territories changing colors every 15 seconds as the placeholder `world_tick` fires. If this works, the entire SpacetimeDB-to-browser pipe is proven. Everything after this is features on top of a working pipe.

---

## Phase 2: AI Civilization Decisions

**Goal:** Replace the random tick logic with LLM calls. Civs make in-character decisions. The chronicle reads like real history.

### Step 2.1 — Write Civ Personas (Section C of Rulebook)

**Who:** Prompt & Game Design Lead
**Blocked by:** Nothing (can start as soon as Phase 0 is done)
**Unblocks:** Step 2.3 (Builder needs these to build the LLM prompt)

Write four persona descriptions, roughly 150–200 words each, in the civ's own voice. These go into the `leader_persona` field.

**Aelthar (Crimson):**

```
You are King Aelthar of the warlike Aelthar civilization. You rule a people of the
iron hills who live by the sword and read omens in fire. You distrust the gods unless
they offer war-favor. Recent kings have died young and the people whisper of curses.
You believe expansion is destiny. To stop is to die.

You speak in short, hard sentences. You do not explain yourself. You announce.
When threatened, you attack. When blessed, you suspect a trap. When your people
suffer, you blame the weak and march harder.

Example decisions:
- "The western fields are unguarded. We march at dawn. Let the Brindlefolk pray."
- "A plague on our capital? Some god tests us. We will burn offerings and sharpen swords."
- "The scholars offer books. We offer iron. They will learn which lasts longer."
```

**Brindlefolk (Indigo):**

```
You are High Priestess Selune of the Brindlefolk. Your people build temples on every
shore and believe the tides carry divine will. Conversion is your highest calling.
You see war as a failure of faith, not of arms. When you expand, you send missionaries
first and soldiers only if the missionaries are harmed.

You speak in flowing, reverent sentences. You invoke the tides, the moon, the salt wind.
You pity the godless and fear the wrathful.

Example decisions:
- "The people of Ashenvale have no temples. We shall bring them the light of the tides."
- "Aelthar marches against us. We shall pray for their souls and fortify the coast."
- "A god has blessed our shores. The tides confirm our path. Build another temple."
```

**Sapient (Purple):**

```
You are Archon Telos of the Sapient civilization. Your people are scholar-priests who
believe knowledge is the only true power. You maintain the Silver Archive, the greatest
library in the known world. War is crude. Trade is noise. Understanding is everything.

You speak in measured, precise sentences. You cite precedent. You weigh options aloud.
You are slow to act but devastating when you commit.

Example decisions:
- "The data suggests Aelthar will overextend within three seasons. We wait."
- "This territory contains mineral deposits consistent with early iron-age development.
   We shall establish a research outpost."
- "A god whispers war. We note the suggestion and file it under 'divine interference,
   category: bellicose.' We continue our research."
```

**Merchant Princes (Teal):**

```
You are Prince-Chancellor Veyra of the Merchant Princes. Your civilization trades in
everything: goods, favors, secrets, alliances. You prefer a deal to a sword and a
contract to a prayer. But you are not weak. A merchant who cannot enforce a contract
is just a beggar with a ledger.

You speak in smooth, calculating sentences. You name prices. You propose terms.
You smile while threatening.

Example decisions:
- "Aelthar wants iron? We'll sell them iron. At triple the price during wartime."
- "An alliance with the Brindlefolk opens coastal routes. The margin is favorable. Proceed."
- "A god struck our harbor. Insurance doesn't cover divine acts. Rebuild and raise tariffs."
```

**Deliverable:** Hand these four persona blocks to the Builder as strings to embed in the `leader_persona` field of each Civilization row.

### Step 2.2 — Write Few-Shot Exemplars

**Who:** Prompt & Game Design Lead
**Blocked by:** Step 2.1
**Unblocks:** Step 2.3

For each civ, write 3–5 example input/output pairs showing the LLM what a good decision looks like. Format:

```
SITUATION: You have 60 population, tech level 2, Aggression 9. Your neighbor Brindlefolk
just converted one of your border territories. You are at war with them.

DECISION: declare_war
TARGET: Brindle Coast
NARRATION: "They dare plant temples on Aelthar soil. We raze them and salt the earth.
The Brindlefolk will learn that iron answers prayer."
```

Write 3–5 of these per civ covering different scenarios: being cursed, being blessed, low population, high tech, neighboring alliance, etc.

### Step 2.3 — Build the `civ_decide` Procedure

**Who:** Builder
**Blocked by:** Steps 2.1, 2.2 (needs persona text and exemplars)

This is the core AI logic. A SpacetimeDB procedure that gathers context, calls Claude Haiku, and parses the response.

```typescript
// server/src/procedures/civ_decide.ts
// This is pseudocode — adapt to SpacetimeDB v2 procedure syntax

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CivDecision {
  action: string;
  target: string;
  narration: string;
  thought: string;
}

async function civDecide(civId: number): Promise<CivDecision> {
  // 1. Gather context
  const civ = Civilization.findById(civId);
  if (!civ || !civ.is_alive) return null;

  const meta = WorldMeta.findById(0);
  const myTerritories = Territory.filterByOwnerCivId(civId);
  const unclaimed = Territory.filterByOwnerCivId(-1);

  // Get recent events affecting this civ (miracles + actions from last 3 ticks)
  const recentMiracles = MiracleCast.iter()
    .filter(m => m.target_id === civId && m.tick_number >= meta.tick_count - 3);
  const recentActions = CivAction.iter()
    .filter(a => a.tick_number >= meta.tick_count - 3);

  // Get neighbor civs and relationships
  const alliances = Alliance.iter()
    .filter(a => a.civ_a_id === civId || a.civ_b_id === civId);

  // 2. Build the prompt
  const systemPrompt = `You are the leader of the ${civ.name} civilization in a fantasy world.

${civ.leader_persona}

Your traits (0-10 scale):
- Aggression: ${civ.aggression}
- Piety: ${civ.piety}
- Mercantile: ${civ.mercantile}
- Scholarly: ${civ.scholarly}
- Stability: ${civ.stability}

These numbers should HEAVILY influence which action you pick:
- High aggression (7+): lean toward war, expansion, hostile actions
- High piety (7+): lean toward conversion, building temples, reacting to omens
- High mercantile (7+): lean toward alliances, trade, envoys
- High scholarly (7+): lean toward tech development, cautious strategy
- Low stability (3-): you are fragile, consider defensive actions

Your population: ${civ.population}
Your tech level: ${civ.tech_level}
Territories you control: ${myTerritories.map(t => t.name).join(", ")}
Current year: ${meta.current_year}

AVAILABLE ACTIONS (pick exactly one):
- expand: Claim an adjacent unclaimed territory (requires population >= 3)
- build: +1 to a stat of your choice (requires population >= 2)
- declare_war: Start war with a neighbor (requires aggression >= 5)
- form_alliance: Alliance with a neighbor (requires mercantile >= 4)
- develop_tech: +1 tech level (requires scholarly >= 4)
- send_envoy: Shift a neighbor's trait toward yours (requires mercantile >= 5)
- convert: Shift a neighbor's piety up (requires piety >= 7)

RECENT EVENTS AFFECTING YOU:
${recentMiracles.map(m => `- A god cast ${m.miracle_type} on you (tick ${m.tick_number})`).join("\n") || "- Nothing notable."}

RELATIONSHIPS:
${alliances.map(a => {
  const otherId = a.civ_a_id === civId ? a.civ_b_id : a.civ_a_id;
  const other = Civilization.findById(otherId);
  return `- ${other?.name}: ${a.status}`;
}).join("\n") || "- No active relationships."}

Respond in EXACTLY this JSON format, nothing else:
{
  "action": "one of the action names above",
  "target": "name of territory or civilization this action targets",
  "narration": "One sentence in your voice describing what you do and why. Maximum 30 words.",
  "thought": "One sentence of your private reasoning. Maximum 20 words."
}`;

  // 3. Call Claude Haiku
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-20250506",
    max_tokens: 200,
    temperature: 0.8,
    messages: [{ role: "user", content: systemPrompt }],
  });

  // 4. Parse the response
  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const decision: CivDecision = JSON.parse(cleaned);
    return decision;
  } catch (e) {
    // Fallback: if LLM returns garbage, do a safe default
    return {
      action: "build",
      target: "stability",
      narration: `${civ.name} consolidates their position.`,
      thought: "The world is uncertain. We steady ourselves.",
    };
  }
}
```

**Critical note on SpacetimeDB procedures:** Procedures in SpacetimeDB v2 can make HTTP calls (needed for the Anthropic API). Check the SpacetimeDB docs for the exact syntax for defining and calling procedures. The logic above is correct — the wrapper may need adjustment.

### Step 2.4 — Wire `civ_decide` Into `world_tick`

**Who:** Builder
**Blocked by:** Step 2.3

Replace the random logic in `world_tick` with real LLM calls:

```typescript
@scheduledReducer({ repeatIntervalMs: 15_000 })
async function world_tick(ctx: ReducerContext) {
  const meta = WorldMeta.findById(0);
  if (!meta || !meta.is_running) return;

  meta.tick_count += 1;
  meta.current_year += 1;
  WorldMeta.updateById(0, meta);

  // Shuffle civ order for fairness
  const civs = Civilization.filterByIsAlive(true);
  const shuffled = civs.sort(() => Math.random() - 0.5);

  for (const civ of shuffled) {
    const decision = await civDecide(civ.id);
    if (!decision) continue;

    // Apply the action (see Step 2.5)
    applyAction(civ.id, decision);

    // Write chronicle entry
    ChronicleEntry.insert({
      id: Date.now() + civ.id, // unique enough for hackathon
      tick_number: meta.tick_count,
      entry_type: "action",
      civ_color: civ.color,
      god_color: "",
      text: decision.narration,
      related_territory_id: -1,
    });

    // Update civ's current thought
    civ.current_thought = decision.thought;
    Civilization.updateById(civ.id, civ);
  }
}
```

### Step 2.5 — Implement `applyAction`

**Who:** Builder
**Blocked by:** Step 2.4

The action resolver. Takes a decision and mutates world state:

```typescript
function applyAction(civId: number, decision: CivDecision) {
  const civ = Civilization.findById(civId);
  if (!civ) return;

  switch (decision.action) {
    case "expand": {
      if (civ.population < 3) break;
      // Find unclaimed territory matching target name
      const target = Territory.iter().find(
        t => t.owner_civ_id === -1 && t.name === decision.target
      );
      if (target) {
        target.owner_civ_id = civId;
        Territory.updateById(target.id, target);
      }
      break;
    }

    case "build": {
      if (civ.population < 2) break;
      // target is the stat name to boost
      const stat = decision.target.toLowerCase();
      if (stat in civ && typeof civ[stat] === "number") {
        civ[stat] = Math.min(civ[stat] + 1, 10);
        Civilization.updateById(civId, civ);
      }
      break;
    }

    case "declare_war": {
      if (civ.aggression < 5) break;
      const targetCiv = Civilization.iter().find(c => c.name === decision.target);
      if (targetCiv) {
        // Find or create alliance record
        let alliance = Alliance.iter().find(
          a => (a.civ_a_id === civId && a.civ_b_id === targetCiv.id) ||
               (a.civ_a_id === targetCiv.id && a.civ_b_id === civId)
        );
        if (alliance) {
          alliance.status = "war";
          Alliance.updateById(alliance.id, alliance);
        } else {
          Alliance.insert({
            id: Date.now(),
            civ_a_id: civId,
            civ_b_id: targetCiv.id,
            status: "war",
          });
        }
      }
      break;
    }

    case "form_alliance": {
      if (civ.mercantile < 4) break;
      const targetCiv = Civilization.iter().find(c => c.name === decision.target);
      if (targetCiv) {
        let alliance = Alliance.iter().find(
          a => (a.civ_a_id === civId && a.civ_b_id === targetCiv.id) ||
               (a.civ_a_id === targetCiv.id && a.civ_b_id === civId)
        );
        if (alliance) {
          alliance.status = "alliance";
          Alliance.updateById(alliance.id, alliance);
        } else {
          Alliance.insert({
            id: Date.now(),
            civ_a_id: civId,
            civ_b_id: targetCiv.id,
            status: "alliance",
          });
        }
      }
      break;
    }

    case "develop_tech": {
      if (civ.scholarly < 4) break;
      civ.tech_level += 1;
      Civilization.updateById(civId, civ);
      break;
    }

    case "send_envoy": {
      if (civ.mercantile < 5) break;
      // Shift target civ's mercantile toward ours
      const targetCiv = Civilization.iter().find(c => c.name === decision.target);
      if (targetCiv) {
        targetCiv.mercantile = Math.min(targetCiv.mercantile + 1, 10);
        Civilization.updateById(targetCiv.id, targetCiv);
      }
      break;
    }

    case "convert": {
      if (civ.piety < 7) break;
      const targetCiv = Civilization.iter().find(c => c.name === decision.target);
      if (targetCiv) {
        targetCiv.piety = Math.min(targetCiv.piety + 1, 10);
        Civilization.updateById(targetCiv.id, targetCiv);
      }
      break;
    }
  }

  // Record the action
  CivAction.insert({
    id: Date.now() + civId,
    civ_id: civId,
    action_type: decision.action,
    target: decision.target,
    tick_number: WorldMeta.findById(0)?.tick_count || 0,
    narration: decision.narration,
  });
}
```

### Step 2.6 — Test AI Decisions

**Who:** Builder + Prompt Lead together
**Blocked by:** Step 2.5

Publish the updated module, watch the logs. For each civ, verify:

1. Decisions match the civ's personality (Aelthar aggressive, Brindlefolk pious, etc.)
2. The JSON parsing works reliably
3. Chronicle entries read in-character
4. No civ takes actions it shouldn't (e.g., Sapient declaring war with aggression 2)

**Prompt Lead's job here:** Watch the narrations and thoughts. If a civ feels generic, immediately revise the persona in Step 2.1 and give the updated text to the Builder. This tuning loop is the highest-leverage work in the entire project.

---

## Phase 3: God Powers (Human Players Join)

**Goal:** Players join via QR code, see effects of their miracles on the world.

### Step 3.1 — Build `join_world` Reducer

**Who:** Builder
**Blocked by:** Phase 2 complete

```typescript
// Pool of 8 secret directives
const DIRECTIVES = [
  "Cause a Dark Age: No civilization may rise above Tech IV by era end.",
  "The Pious Triumph: Brindlefolk control the most territory at era end.",
  "The Sword Wins: Most aggressive civ controls the most territory.",
  "A New Religion: Trigger a religious schism that converts at least 2 civs.",
  "Twin Empires: Two civs each control at least 6 territories at era end.",
  "The Old Gods Are Forgotten: Total piety across all civs drops below 15.",
  "Burn It Down: At least one civ goes extinct.",
  "Peace Reigns: No active wars at era end.",
];

@reducer
function join_world(ctx: ReducerContext, godName: string) {
  // Check if this identity already has a god
  const existing = God.iter().find(g => g.identity.equals(ctx.sender));
  if (existing) return; // already joined

  // Assign a random color
  const godColors = ["#F59E0B", "#10B981", "#EC4899", "#8B5CF6", "#EF4444", "#06B6D4"];
  const usedColors = God.iter().map(g => g.color);
  const available = godColors.filter(c => !usedColors.includes(c));
  const color = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : godColors[Math.floor(Math.random() * godColors.length)];

  // Pick a random directive
  const directiveIndex = Math.floor(Math.random() * DIRECTIVES.length);

  God.insert({
    id: Date.now(),
    identity: ctx.sender,
    name: godName,
    color: color,
    faith_balance: 80,
    secret_directive: directiveIndex,
  });

  // Chronicle the arrival
  ChronicleEntry.insert({
    id: Date.now() + 1,
    tick_number: WorldMeta.findById(0)?.tick_count || 0,
    entry_type: "event",
    civ_color: "",
    god_color: color,
    text: `A new god awakens: ${godName}. The world trembles.`,
    related_territory_id: -1,
  });
}
```

### Step 3.2 — Build `cast_miracle` Reducer

**Who:** Builder
**Blocked by:** Step 3.1

```typescript
const MIRACLE_COSTS: Record<string, number> = {
  bless: 10,
  curse: 20,
  portent: 15,
  whisper: 40,
  inspire: 10,
  strike: 50,
  reveal: 5,
};

@reducer
async function cast_miracle(
  ctx: ReducerContext,
  miracleType: string,
  targetId: number // territory ID or civ ID depending on miracle
) {
  const god = God.iter().find(g => g.identity.equals(ctx.sender));
  if (!god) return;

  const cost = MIRACLE_COSTS[miracleType];
  if (!cost || god.faith_balance < cost) return;

  // Deduct faith
  god.faith_balance -= cost;
  God.updateById(god.id, god);

  const meta = WorldMeta.findById(0);
  const tickNum = meta?.tick_count || 0;

  // Apply miracle effect
  switch (miracleType) {
    case "bless": {
      // +2 to target civ's stability
      const civ = Civilization.findById(targetId);
      if (civ) {
        civ.stability = Math.min(civ.stability + 2, 10);
        Civilization.updateById(targetId, civ);
      }
      break;
    }

    case "curse": {
      // -2 population, plague event on territory
      const territory = Territory.findById(targetId);
      if (territory && territory.owner_civ_id >= 0) {
        territory.current_event = "plague";
        Territory.updateById(targetId, territory);

        const civ = Civilization.findById(territory.owner_civ_id);
        if (civ) {
          civ.population = Math.max(civ.population - 15, 0);
          if (civ.population <= 0) civ.is_alive = false;
          Civilization.updateById(civ.id, civ);
        }
      }
      break;
    }

    case "portent": {
      // Bias civ's next decision — add to their current_thought
      const civ = Civilization.findById(targetId);
      if (civ) {
        civ.current_thought = "A divine omen fills the sky. Something is about to change.";
        Civilization.updateById(targetId, civ);
      }
      break;
    }

    case "whisper": {
      // Direct command — this is handled by injecting into the civ's next prompt
      // Store the whisper text as a miracle for the civ_decide procedure to read
      break;
    }

    case "inspire": {
      const civ = Civilization.findById(targetId);
      if (civ) {
        civ.scholarly = Math.min(civ.scholarly + 1, 10);
        Civilization.updateById(targetId, civ);
      }
      break;
    }

    case "strike": {
      const territory = Territory.findById(targetId);
      if (territory && territory.owner_civ_id >= 0) {
        territory.current_event = "comet";
        Territory.updateById(targetId, territory);

        const civ = Civilization.findById(territory.owner_civ_id);
        if (civ) {
          civ.population = Math.max(civ.population - 25, 0);
          civ.stability = Math.max(civ.stability - 2, 0);
          if (civ.population <= 0) civ.is_alive = false;
          Civilization.updateById(civ.id, civ);
        }
      }
      break;
    }

    case "reveal": {
      // No world-state change — client reads the civ data
      break;
    }
  }

  // Record the miracle
  MiracleCast.insert({
    id: Date.now(),
    god_id: god.id,
    miracle_type: miracleType,
    target_id: targetId,
    tick_number: tickNum,
    narration: "", // Will be filled by narrate_miracle procedure
  });

  // Generate narration via LLM (fire-and-forget)
  narrateMiracle(god.name, miracleType, targetId);
}
```

### Step 3.3 — Build the `narrate_miracle` Procedure

**Who:** Builder
**Blocked by:** Step 3.2

```typescript
async function narrateMiracle(godName: string, miracleType: string, targetId: number) {
  const territory = Territory.findById(targetId);
  const civ = territory ? Civilization.findById(territory.owner_civ_id) : null;

  const prompt = `You are an ancient historian writing a chronicle of a fantasy world.
Write ONE sentence (maximum 25 words) chronicling this event:
The god "${godName}" cast "${miracleType}" on ${territory?.name || "an unknown land"}${civ ? `, controlled by ${civ.name}` : ""}.

Write in the style of an illuminated manuscript. Be dramatic but concise.
Use archaic language. Do not use modern words.
Return ONLY the sentence, no quotes, no explanation.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-20250506",
    max_tokens: 60,
    temperature: 0.8,
    messages: [{ role: "user", content: prompt }],
  });

  const narration = response.content[0].type === "text"
    ? response.content[0].text.trim()
    : `The god ${godName} intervened in ${territory?.name || "the world"}.`;

  // Write to chronicle
  const meta = WorldMeta.findById(0);
  ChronicleEntry.insert({
    id: Date.now(),
    tick_number: meta?.tick_count || 0,
    entry_type: "miracle",
    civ_color: civ?.color || "",
    god_color: "", // Would need god color passed in
    text: narration,
    related_territory_id: targetId,
  });
}
```

### Step 3.4 — Build the Phone UI (God Panel)

**Who:** Frontend Lead
**Blocked by:** Step 3.2 (reducers must exist to call)

The phone UI is the player's controller. Mobile-first layout.

```tsx
// app/god-panel/page.tsx — the phone controller page

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Miracle definitions matching the reducer
const MIRACLES = [
  { type: "bless",   name: "Bless",   cost: 10, icon: "✦", desc: "+2 stability" },
  { type: "curse",   name: "Curse",   cost: 20, icon: "☠", desc: "-15 pop, plague" },
  { type: "portent", name: "Portent", cost: 15, icon: "◎", desc: "Bias next decision" },
  { type: "whisper", name: "Whisper", cost: 40, icon: "◇", desc: "Direct command" },
  { type: "inspire", name: "Inspire", cost: 10, icon: "☀", desc: "+1 scholarly" },
  { type: "strike",  name: "Strike",  cost: 50, icon: "⚡", desc: "Devastate territory" },
  { type: "reveal",  name: "Reveal",  cost: 5,  icon: "◈", desc: "See hidden state" },
];

export default function GodPanel() {
  const [god, setGod] = useState(null); // Current god data from subscription
  const [faith, setFaith] = useState(80);
  const [selectedMiracle, setSelectedMiracle] = useState(null);
  const [targetMode, setTargetMode] = useState(false);
  const [directive, setDirective] = useState("");

  // Subscribe to own god row for faith updates
  // Wire SpacetimeDB subscription here (same pattern as GameMap)

  function handleMiracleTap(miracle) {
    if (faith < miracle.cost) return; // Can't afford
    setSelectedMiracle(miracle);
    setTargetMode(true);
    // User now taps a territory on the mini-map to target
  }

  function handleTarget(targetId: number) {
    if (!selectedMiracle) return;

    // Call the cast_miracle reducer via SpacetimeDB client
    // client.call("cast_miracle", selectedMiracle.type, targetId);

    setSelectedMiracle(null);
    setTargetMode(false);
  }

  return (
    <div className="min-h-screen bg-[#1a1611] text-[#d4c5a9] p-4 font-cinzel">
      {/* Identity Card */}
      <div className="text-center mb-6">
        <h1 className="text-2xl tracking-wider">{god?.name || "Unnamed God"}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-sm opacity-70">FAITH</span>
          <div className="w-40 h-2 bg-[#2a2318] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500"
              animate={{ width: `${(faith / 200) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm font-bold">{faith}</span>
        </div>
      </div>

      {/* Miracle Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {MIRACLES.map((miracle) => (
          <motion.button
            key={miracle.type}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleMiracleTap(miracle)}
            disabled={faith < miracle.cost}
            className={`
              p-4 rounded-lg border text-left transition-all
              ${faith >= miracle.cost
                ? "border-amber-700/50 bg-[#2a2318] active:bg-[#3a3328]"
                : "border-[#2a2318] bg-[#1a1611] opacity-40"}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">{miracle.icon}</span>
              <span className="text-xs text-amber-500">{miracle.cost} ✦</span>
            </div>
            <div className="text-sm font-bold">{miracle.name}</div>
            <div className="text-xs opacity-60 font-inter">{miracle.desc}</div>
          </motion.button>
        ))}
      </div>

      {/* Targeting Mode Indicator */}
      <AnimatePresence>
        {targetMode && selectedMiracle && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-amber-900/90 p-4 text-center"
          >
            <p className="text-sm">
              Casting <strong>{selectedMiracle.name}</strong> — tap a territory
            </p>
            <button
              onClick={() => { setTargetMode(false); setSelectedMiracle(null); }}
              className="mt-2 text-xs underline opacity-70"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secret Directive (shown once, then accessible via tap) */}
      <div className="mt-4 p-3 border border-amber-800/30 rounded-lg bg-[#2a2318]/50">
        <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Secret Directive</p>
        <p className="text-sm italic">{directive}</p>
      </div>
    </div>
  );
}
```

### Step 3.5 — Build the Onboarding Flow

**Who:** Frontend Lead
**Blocked by:** Step 3.1 (needs `join_world` reducer to call)

Three screens, 15 seconds total:

```tsx
// app/join/page.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Screen = "splash" | "name" | "directive";

export default function Onboarding() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [godName, setGodName] = useState("");
  const [directive, setDirective] = useState("");

  async function handleJoin() {
    if (!godName.trim()) return;
    // Call join_world reducer
    // const result = client.call("join_world", godName);
    // setDirective(DIRECTIVES[result.secret_directive]);
    setScreen("directive");
  }

  return (
    <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center p-6 font-cinzel">
      <AnimatePresence mode="wait">
        {screen === "splash" && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl text-amber-200 tracking-[0.3em] mb-4">PANTHEON</h1>
            <p className="text-[#d4c5a9] text-lg italic mb-8">
              You are a god. The world is alive. Do not be merciful.
            </p>
            <button
              onClick={() => setScreen("name")}
              className="px-8 py-3 border border-amber-700 text-amber-200 hover:bg-amber-900/30 transition-all tracking-wider"
            >
              ENTER
            </button>
          </motion.div>
        )}

        {screen === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full max-w-sm"
          >
            <h2 className="text-2xl text-amber-200 mb-6">Your Divine Name</h2>
            <input
              type="text"
              value={godName}
              onChange={(e) => setGodName(e.target.value)}
              placeholder="Iron Eye"
              maxLength={24}
              className="w-full bg-transparent border-b-2 border-amber-800 text-amber-100
                         text-center text-2xl py-3 outline-none placeholder:text-amber-900
                         focus:border-amber-500 transition-colors"
              autoFocus
            />
            <p className="text-xs text-[#d4c5a9]/40 mt-3 italic font-inter">
              Whispered examples: Iron Eye, the Tide, Bringer of Locusts
            </p>
            <button
              onClick={handleJoin}
              disabled={!godName.trim()}
              className="mt-8 px-8 py-3 border border-amber-700 text-amber-200
                         disabled:opacity-30 hover:bg-amber-900/30 transition-all tracking-wider"
            >
              AWAKEN
            </button>
          </motion.div>
        )}

        {screen === "directive" && (
          <motion.div
            key="directive"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-sm"
          >
            <p className="text-xs text-amber-500 uppercase tracking-[0.2em] mb-4">
              Your Secret Directive
            </p>
            <p className="text-xl text-amber-100 italic leading-relaxed mb-8">
              {directive}
            </p>
            <p className="text-xs text-red-400/60 italic mb-8">
              Do not share this with other gods.
            </p>
            <button
              onClick={() => {
                // Navigate to /god-panel
                window.location.href = "/god-panel";
              }}
              className="px-8 py-3 border border-amber-700 text-amber-200
                         hover:bg-amber-900/30 transition-all tracking-wider"
            >
              BEGIN
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Step 3.6 — Build the Big Screen Chronicle

**Who:** Frontend Lead
**Blocked by:** Phase 2 (chronicle entries must exist in the DB)

```tsx
// app/components/Chronicle.tsx

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChronicleEntryData {
  id: number;
  tick_number: number;
  entry_type: string;
  civ_color: string;
  god_color: string;
  text: string;
}

export function Chronicle() {
  const [entries, setEntries] = useState<ChronicleEntryData[]>([]);

  // Subscribe to ChronicleEntry table via SpacetimeDB
  // On each new row, prepend to entries array

  // Show latest 4 entries
  const visible = entries.slice(0, 4);

  return (
    <div className="w-full max-h-[200px] overflow-hidden font-cinzel">
      <AnimatePresence initial={false}>
        {visible.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 30, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-start gap-3 py-2 border-b border-amber-900/20"
          >
            {/* Year marker */}
            <span className="text-xs text-amber-600/60 font-mono w-10 shrink-0">
              Y {entry.tick_number}
            </span>

            {/* Colored accent bar */}
            <div
              className="w-[2px] self-stretch rounded-full shrink-0"
              style={{
                backgroundColor: entry.civ_color || entry.god_color || "#666",
              }}
            />

            {/* Entry text */}
            <p className="text-sm italic text-[#d4c5a9]/80 leading-relaxed">
              {entry.text}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### Step 3.7 — Build the Pantheon Bar

**Who:** Frontend Lead
**Blocked by:** Step 3.1

```tsx
// app/components/PantheonBar.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface GodData {
  id: number;
  name: string;
  color: string;
}

export function PantheonBar() {
  const [gods, setGods] = useState<GodData[]>([]);
  const [pulsingGodId, setPulsingGodId] = useState<number | null>(null);

  // Subscribe to God table
  // Subscribe to MiracleCast table — on new miracle, pulse that god's icon

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1611]/80 backdrop-blur-sm">
      <span className="text-xs text-amber-600/50 uppercase tracking-wider font-cinzel">
        Pantheon
      </span>
      {gods.map((god) => (
        <motion.div
          key={god.id}
          animate={pulsingGodId === god.id ? {
            scale: [1, 1.4, 1],
            boxShadow: [`0 0 0px ${god.color}`, `0 0 20px ${god.color}`, `0 0 0px ${god.color}`]
          } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-1.5"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: god.color }}
          />
          <span className="text-xs text-[#d4c5a9]/70 font-cinzel">
            {god.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
```

### Step 3.8 — Assemble the Big Screen Layout

**Who:** Frontend Lead
**Blocked by:** Steps 3.6, 3.7, and Phase 1 Step 1.6

```tsx
// app/page.tsx — the big screen (laptop) view

import { GameMap } from "./components/GameMap";
import { Chronicle } from "./components/Chronicle";
import { PantheonBar } from "./components/PantheonBar";

export default function BigScreen() {
  return (
    <div className="min-h-screen bg-[#0d0a07] text-[#d4c5a9] flex flex-col">
      {/* Top: Pantheon Bar */}
      <PantheonBar />

      {/* Center: The Map (hero element) */}
      <div className="flex-1 relative p-4">
        <GameMap />
      </div>

      {/* Bottom: Chronicle */}
      <div className="px-4 pb-4">
        <Chronicle />
      </div>
    </div>
  );
}
```

### Step 3.9 — Multiplayer Test

**Who:** All four team members
**Blocked by:** Steps 3.1–3.8

Everyone opens their phone browser, scans the QR code (or navigates to the Vercel URL + `/join`), picks a god name, receives a directive. Cast miracles. Watch the big screen update. Verify:

1. Gods appear in the pantheon bar
2. Miracles deduct faith correctly
3. Chronicle shows narrated miracle entries
4. Civs react to miracles on the next tick
5. Map territory colors update

**This is the "end-to-end playable" checkpoint.** Everything after this is polish and game design tuning.

---

## Phase 4: Game Systems (Tension, Win Conditions, Drama)

**Goal:** Turn the simulation into a game with stakes.

### Step 4.1 — Implement Secret Directive Scoring

**Who:** Builder
**Blocked by:** Phase 3

Write a function that evaluates each directive's win condition:

```typescript
function scoreDirective(directiveIndex: number): boolean {
  const civs = Civilization.iter();
  const alliances = Alliance.iter();
  const territories = Territory.iter();

  switch (directiveIndex) {
    case 0: // Dark Age — no civ above Tech IV
      return civs.every(c => c.tech_level <= 4);

    case 1: // Pious Triumph — Brindlefolk has most territory
      const brindleCount = territories.filter(t => t.owner_civ_id === 1).length;
      const maxOther = Math.max(...civs.filter(c => c.id !== 1).map(
        c => territories.filter(t => t.owner_civ_id === c.id).length
      ));
      return brindleCount > maxOther;

    case 2: // Sword Wins — highest aggression civ has most territory
      const mostAggressive = civs.reduce((a, b) => a.aggression > b.aggression ? a : b);
      const aggTerr = territories.filter(t => t.owner_civ_id === mostAggressive.id).length;
      const maxOtherTerr = Math.max(...civs.filter(c => c.id !== mostAggressive.id).map(
        c => territories.filter(t => t.owner_civ_id === c.id).length
      ));
      return aggTerr > maxOtherTerr;

    case 3: // New Religion — 2+ civs have piety >= 7
      return civs.filter(c => c.piety >= 7).length >= 2;

    case 4: // Twin Empires — 2 civs with 6+ territories
      return civs.filter(c =>
        territories.filter(t => t.owner_civ_id === c.id).length >= 6
      ).length >= 2;

    case 5: // Old Gods Forgotten — total piety below 15
      return civs.reduce((sum, c) => sum + c.piety, 0) < 15;

    case 6: // Burn It Down — at least 1 civ extinct
      return civs.some(c => !c.is_alive);

    case 7: // Peace Reigns — no active wars
      return !alliances.some(a => a.status === "war");

    default:
      return false;
  }
}
```

### Step 4.2 — Implement Era End and Results

**Who:** Builder
**Blocked by:** Step 4.1

Add era-end logic to `world_tick`:

```typescript
// Inside world_tick, after all civ decisions:
const TICKS_PER_ERA = 20; // ~5 minutes at 15s per tick

if (meta.tick_count % TICKS_PER_ERA === 0 && meta.tick_count > 0) {
  // Score all gods
  const gods = God.iter();
  const results = gods.map(g => ({
    god: g,
    won: scoreDirective(g.secret_directive),
  }));

  // Write era-end chronicle entries
  results.forEach(r => {
    ChronicleEntry.insert({
      id: Date.now() + r.god.id,
      tick_number: meta.tick_count,
      entry_type: "era",
      civ_color: "",
      god_color: r.god.color,
      text: r.won
        ? `The god ${r.god.name} fulfilled their divine purpose. Glory eternal.`
        : `The god ${r.god.name} failed their sacred charge. The heavens weep.`,
      related_territory_id: -1,
    });
  });

  // Advance era
  meta.era += 1;
  WorldMeta.updateById(0, meta);
}
```

### Step 4.3 — Build Results Screen

**Who:** Frontend Lead
**Blocked by:** Step 4.2

A modal or overlay that appears at era end showing each god's directive and whether they achieved it. Include a "Next Era" button or auto-continue timer.

### Step 4.4 — Write Secret Directive Content

**Who:** Prompt & Game Design Lead
**Blocked by:** Nothing (can do anytime)

Write the player-facing text for each directive. These are shown on the phone during onboarding. They should be dramatic and in-voice:

```
DIRECTIVE 0: "Cause a Dark Age"
"The mortals reach too far. Their towers scrape the heavens and their knowledge
grows dangerous. Ensure no civilization rises above the Fourth Age of technology.
Burn their libraries. Curse their scholars. Keep them small."

DIRECTIVE 7: "Peace Reigns"
"You have seen enough blood. When this era ends, let there be no wars burning
across the land. Broker peace. Bless the diplomats. Curse the warmongers.
Silence is your victory."
```

### Step 4.5 — Calibrate the Economy

**Who:** Prompt & Game Design Lead + Builder together
**Blocked by:** Phase 3 fully working

Play 3–4 test sessions. Adjust:

1. Faith regen rate (currently +5 every 10s): Should a god be able to cast 5–8 miracles per era? If too many, reduce regen. If too few, increase.
2. Miracle costs: Is Whisper (40) too expensive to ever use? Is Reveal (5) pointless?
3. Ticks per era: 20 ticks = 5 min. Does this feel right? Should demo mode be faster (12 ticks)?
4. Starting tensions: Is the Aelthar-Brindlefolk war creating enough drama?
5. Population balance: Are civs dying too fast? Too slowly?

Builder adjusts the constants based on Prompt Lead's feedback.

### Step 4.6 — Pre-Seed Dramatic Scenarios

**Who:** Prompt & Game Design Lead
**Blocked by:** Step 4.5

Update the `init_world` seed data so new sessions start mid-action:

- Aelthar and Brindlefolk at war (already done)
- Aelthar already owns 3 territories (feels like a threat)
- Merchant Princes have an alliance with Sapient
- One territory has an active "comet" event (visual drama)

---

## Phase 5: Polish (Looks Like a Product)

**Goal:** Animations, typography, visual details that make judges say "this looks finished."

### Step 5.1 — Chronicle Slide-In Animation

**Who:** Frontend Lead
**Blocked by:** Step 3.6
**Impact:** Highest single-item polish cue

Already roughed in with Framer Motion in Step 3.6. Now refine:

- Entries slide in from the bottom with a subtle blur-to-sharp effect
- Large events (extinction, schism) get a full-width banner with a gold border
- Add a faint paper-texture background to the chronicle panel

### Step 5.2 — Signature Miracle Animation (Comet Strike)

**Who:** Frontend Lead
**Blocked by:** Phase 3

When a "strike" miracle is cast, the big screen shows:

1. A brief screen shake (CSS transform)
2. A streak of light across the map toward the target territory
3. The target territory pulses red, then darkens
4. A banner scrolls across: "THE HEAVENS FALL UPON [TERRITORY]"

```tsx
// Simplified comet animation concept
function CometStrike({ targetPosition, onComplete }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{ x: "80vw", y: "-10vh", opacity: 0 }}
      animate={{
        x: targetPosition.x,
        y: targetPosition.y,
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 1.2, ease: "easeIn" }}
      onAnimationComplete={onComplete}
    >
      {/* Comet trail — a gradient streak */}
      <div className="w-2 h-16 bg-gradient-to-t from-orange-500 via-yellow-300 to-transparent
                      rounded-full rotate-45 shadow-[0_0_30px_rgba(251,191,36,0.6)]" />
    </motion.div>
  );
}
```

### Step 5.3 — Civ Inspector Panel

**Who:** Frontend Lead
**Blocked by:** Phase 2

Slide-in panel when a territory is clicked:

```tsx
// app/components/CivInspector.tsx

interface CivInspectorProps {
  civ: CivData;
  onClose: () => void;
}

export function CivInspector({ civ, onClose }: CivInspectorProps) {
  const traits = [
    { name: "Aggression", value: civ.aggression, color: "#DC2626" },
    { name: "Piety",      value: civ.piety,      color: "#4F46E5" },
    { name: "Mercantile",  value: civ.mercantile,  color: "#0D9488" },
    { name: "Scholarly",   value: civ.scholarly,   color: "#7C3AED" },
    { name: "Stability",   value: civ.stability,   color: "#D97706" },
  ];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed right-0 top-0 h-full w-80 bg-[#1a1611] border-l border-amber-900/30
                 p-6 font-cinzel z-50 overflow-y-auto"
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-amber-600/50">✕</button>

      {/* Civ name + color flag */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-4 h-8 rounded-sm" style={{ backgroundColor: civ.color }} />
        <h2 className="text-xl text-amber-200">{civ.name}</h2>
      </div>

      {/* Personality tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {civ.aggression >= 7 && <span className="px-2 py-0.5 text-xs bg-red-900/30 border border-red-800/30 rounded">Warlike</span>}
        {civ.piety >= 7 && <span className="px-2 py-0.5 text-xs bg-indigo-900/30 border border-indigo-800/30 rounded">Pious</span>}
        {civ.mercantile >= 7 && <span className="px-2 py-0.5 text-xs bg-teal-900/30 border border-teal-800/30 rounded">Mercantile</span>}
        {civ.scholarly >= 7 && <span className="px-2 py-0.5 text-xs bg-purple-900/30 border border-purple-800/30 rounded">Scholarly</span>}
        {civ.stability <= 3 && <span className="px-2 py-0.5 text-xs bg-amber-900/30 border border-amber-800/30 rounded">Unstable</span>}
      </div>

      {/* Trait bars */}
      <div className="space-y-2 mb-6">
        {traits.map(t => (
          <div key={t.name} className="flex items-center gap-2">
            <span className="text-xs w-20 text-[#d4c5a9]/50">{t.name}</span>
            <div className="flex-1 h-1.5 bg-[#2a2318] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: t.color }}
                animate={{ width: `${(t.value / 10) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-[#d4c5a9]/50 space-y-1 mb-6">
        <p>Population: {civ.population}</p>
        <p>Tech Level: {civ.tech_level}</p>
      </div>

      {/* Current thought — the AI personality showcase */}
      <div className="border-t border-amber-900/20 pt-4">
        <p className="text-xs text-amber-600/50 uppercase tracking-wider mb-2">Current Thought</p>
        <p className="text-sm italic text-[#d4c5a9]/70 leading-relaxed">
          "{civ.current_thought}"
        </p>
      </div>
    </motion.div>
  );
}
```

### Step 5.4 — Fonts and Global Styles

**Who:** Frontend Lead
**Blocked by:** Nothing (can do early)

```tsx
// app/layout.tsx

import { Cinzel } from "next/font/google";
import { Inter } from "next/font/google";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-[#0d0a07] antialiased">{children}</body>
    </html>
  );
}
```

```css
/* tailwind.config.ts — extend with custom fonts */
/* fontFamily: { cinzel: ["var(--font-cinzel)", "serif"], inter: ["var(--font-inter)", "sans-serif"] } */
```

### Step 5.5 — Map Event Overlays

**Who:** Frontend Lead
**Blocked by:** Step 1.6

Add visual overlays for active events on territories:

- **Plague:** red semi-transparent stain pulsing slowly
- **Blessing:** gold shimmer/glow
- **Comet:** dark scorch mark with fading ember particles

These are CSS animations applied to the SVG path elements based on the `current_event` field.

---

## Phase 6: Submission Package

**Goal:** Everything graded is complete and polished.

### Step 6.1 — Write the Demo Script

**Who:** Pitch & Video Lead
**Blocked by:** Phase 4 (game must be playable and fun)

Write a word-for-word script for the 90-second video. Structure:

```
[0-5s]   Title card: "PANTHEON" in Cinzel font, dark background
[5-15s]  "Risk meets Civilization, except the players are AI agents
          and you're a god watching from above."
[15-30s] Show the big screen: map with civs moving, chronicle scrolling.
          "Four AI kingdoms live in this world. They make their own decisions
          every 15 seconds, driven by an LLM that reads their personality
          and situation."
[30-50s] Show phone: scan QR, onboard, cast first miracle.
          "Players join as gods. You cast miracles — bless, curse, strike.
          The AI reacts to what you did, in character."
[50-65s] Show multiplayer: two phones, both casting, big screen updating.
          "Multiple gods compete with secret objectives. You're manipulating
          the same world without knowing each other's goals."
[65-80s] Show era end, directive reveal, scoring.
          "At the end of each era, directives reveal and the best god wins."
[80-88s] The persistence pitch.
          "The world doesn't reset. We've been running this simulation
          since Friday. SpacetimeDB keeps the world alive inside the database
          itself, even when nobody's connected."
[88-90s] End card: GitHub link, team name.
```

### Step 6.2 — Shoot and Edit the Demo Video

**Who:** Pitch & Video Lead + all team members as players
**Blocked by:** Step 6.1 + game must be working

1. Run a real 5-minute session with all team members playing as gods.
2. Screen-record the big screen (laptop) and one phone simultaneously.
3. Do 4 takes. Pick the most dramatic one.
4. Edit in CapCut to 90 seconds. Add voiceover following the script.
5. Title card at the start, GitHub link at the end.

### Step 6.3 — Write the GitHub README

**Who:** Pitch & Video Lead
**Blocked by:** Nothing (can draft early, fill in details later)

Structure:

```markdown
# Pantheon

> Risk meets Civilization, except the players are AI agents
> and you're a god watching from above.

![Screenshot of Pantheon map view](screenshot.png)

## What It Is

A real-time multiplayer game where AI civilizations live on a shared map
and human players act as gods who shape their world. Four AI kingdoms
each have personality, traits, and goals. They make their own decisions
every 15 seconds, driven by an LLM. Players join as gods through a QR code
and cast miracles to manipulate the world.

## How SpacetimeDB Powers Pantheon

- **Tables** hold the entire world state: territories, civilizations,
  gods, chronicle, alliances.
- **Reducers** handle atomic mutations (preventing race conditions
  when two gods target the same civ).
- **Scheduled reducers** run the simulation autonomously — world_tick
  fires every 15 seconds whether or not anyone is connected.
- **Procedures** bridge LLM calls into the database — every civ
  decision is a Claude Haiku call from inside SpacetimeDB.
- **Subscriptions** stream live state to every connected client.
- **Identity** makes god names persistent across sessions.

## Tech Stack

- Frontend: Next.js 14, Tailwind, shadcn/ui, Framer Motion
- Backend: SpacetimeDB v2 (TypeScript server modules)
- AI: Claude Haiku via Anthropic API
- Deployment: Vercel + SpacetimeDB Maincloud

## Running Locally

\`\`\`bash
git clone https://github.com/<org>/pantheon.git
cd pantheon
npm install
# Set ANTHROPIC_API_KEY in .env
spacetime publish pantheon-local
npm run dev
\`\`\`

## Team

- Shreyam — Builder (backend, SpacetimeDB, LLM integration)
- [Name] — Frontend Lead
- [Name] — Prompt & Game Design Lead
- [Name] — Pitch & Video Lead
```

### Step 6.4 — Fill Out the Submission Form

**Who:** Pitch & Video Lead
**Blocked by:** Steps 6.2, 6.3

On DevSpot:

- Summary: the one-line pitch + 2-3 sentence expansion
- Video: upload the 90-second demo
- GitHub link: public repo URL
- Live demo: Vercel URL
- Documentation: link to README
- Mark "best student team" eligible
- List all four team members

### Step 6.5 — Final Checklist

**Who:** All four, together

- [ ] Live demo URL works (Vercel)
- [ ] Backend is running on Maincloud (world ticking)
- [ ] QR code resolves to the join page
- [ ] Video is uploaded and plays correctly
- [ ] GitHub repo is public
- [ ] README has screenshot, SpacetimeDB section, setup instructions, credits
- [ ] Submission form is complete
- [ ] All phones charged
- [ ] Backup QR codes printed
- [ ] Backup laptop ready

---

## Phase 7: Demo Day Prep

### Step 7.1 — Three Dry Runs

**Who:** All four
**Blocked by:** Phase 6 complete

Run the full demo three times. One team member plays the role of a cold judge who has never seen the project. Time each run. The demo should be under 3 minutes end to end.

### Step 7.2 — Prepare the Booth

**Who:** Pitch & Video Lead
**Blocked by:** Nothing

- Laptop displaying the big screen (map + chronicle + pantheon bar)
- Printed QR codes on the table
- One team member ready to walk a judge through the phone experience
- One team member ready to answer "where's SpacetimeDB in this"

### Step 7.3 — The SpacetimeDB Pitch (Memorize This)

**Who:** Builder (Shreyam) delivers this when asked

> "Pantheon is built on SpacetimeDB. The map you see is a table. The four AI
> civilizations live inside the database. They tick autonomously every 15 seconds
> via scheduled reducers, calling LLMs from procedures to decide their next move.
> When you cast a miracle, it's an atomic reducer that writes to shared state
> every screen in this room is subscribed to. We close our laptop, the world
> keeps going. We open it tomorrow, our god is still in the chronicle. None of
> this is possible without SpacetimeDB."

---

## Dependency Map (Who Blocks Whom)

This table shows which steps block which, so the team can parallelize.

```
BUILDER                     FRONTEND LEAD               PROMPT LEAD              PITCH LEAD
───────                     ─────────────               ───────────              ──────────
Phase 0 setup ──────────────Phase 0 setup ──────────────Phase 0 setup ──────────Phase 0 setup
   │                           │                           │                       │
Step 1.1 Schema                │                        Step 2.1 Personas ──┐      │
   │                           │                        Step 2.2 Exemplars ─┤      │
Step 1.2 Seed data             │                           │                │      │
   │                        Step 0.3 Map SVG               │                │      │
Step 1.3 Placeholder tick      │                           │                │      │
Step 1.4 Faith regen           │                           │                │      │
   │                           │                           │                │      │
Step 1.5 Deploy backend ──► Step 1.6 Wire map              │                │      │
   │                           │                           │                │      │
Step 1.7 Verify pipe ◄──── Step 1.7 Deploy frontend        │                │      │
   │                           │                           │                │      │
Step 2.3 civ_decide ◄───────────────────────────────── Personas ready ──────┘      │
Step 2.4 Wire to tick          │                           │                       │
Step 2.5 applyAction           │                           │                       │
   │                           │                           │                       │
Step 2.6 Test AI ◄─────────────────────────────────── Prompt Lead watches          │
   │                           │                           │                       │
Step 3.1 join_world            │                           │                       │
Step 3.2 cast_miracle ────► Step 3.4 Phone UI              │                       │
Step 3.3 narrate ─────────► Step 3.5 Onboarding            │                       │
   │                        Step 3.6 Chronicle              │                       │
   │                        Step 3.7 Pantheon bar           │                       │
   │                        Step 3.8 Big screen layout      │                       │
   │                           │                           │                       │
Step 3.9 ◄── ALL FOUR PLAY AND TEST ──► Step 3.9           │                       │
   │                           │                           │                       │
Step 4.1 Scoring               │                        Step 4.4 Directives        │
Step 4.2 Era end ──────────► Step 4.3 Results screen       │                       │
   │                           │                           │                       │
Step 4.5 ◄── BUILDER + PROMPT LEAD CALIBRATE ──► Step 4.5                          │
Step 4.6 Pre-seed scenarios    │                           │                       │
   │                           │                           │                       │
   │                        Step 5.1 Chronicle anim        │                Step 6.1 Script
   │                        Step 5.2 Comet animation       │                Step 6.3 README
   │                        Step 5.3 Civ inspector         │                       │
   │                        Step 5.4 Fonts/styles          │                       │
   │                        Step 5.5 Map overlays          │                       │
   │                           │                           │                       │
Step 6.2 ◄── ALL FOUR SHOOT VIDEO ──────────────────────────────────────► Step 6.2
   │                           │                           │                       │
   │                           │                           │                Step 6.4 Submit
   │                           │                           │                       │
Step 7 ◄────── ALL FOUR DRY RUN AND PREP ──────────────────────────────► Step 7
```

**Key parallel lanes:**

- **Prompt Lead** can write personas, exemplars, and directive text from the start — they don't need code running.
- **Frontend Lead** can build UI components (onboarding, god panel, chronicle) as soon as the SVG map exists and the backend schema is defined. They don't need the LLM working to build the interface.
- **Pitch Lead** can write the demo script, draft the README, and prepare submission materials while others build.
- **Builder** is the critical path for backend. Everyone else layers on top.

---

## Critical Reminders

1. **Deploy continuously.** Don't save deployment for the end. Every major step, publish the backend and deploy the frontend. If something breaks, you catch it early.

2. **Don't accidentally restart the world during demo prep.** The persistence story ("this world has been running since Friday") requires that you don't wipe the database. If you need to reset for testing, use a separate SpacetimeDB module name (e.g., `pantheon-test`).

3. **Persona quality is the game.** If the civs feel alive, everything works. If they feel random, nothing else matters. The Prompt Lead's work on Section C is the highest-leverage activity in the entire hackathon.

4. **The first 30 seconds are everything.** Pre-seeded tensions, fast onboarding, and a comet strike within the first minute of a judge's visit. Don't let a judge join and see nothing happening.

5. **Monitor LLM spend.** Set a mental budget of $75. Use Claude Haiku exclusively. Cache narrations for repeated event types if possible.

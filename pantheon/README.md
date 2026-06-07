# Pantheon

> *A real-time multiplayer god game where AI civilizations respond to divine intervention*

Pantheon is a browser-based multiplayer game built for the SpacetimeDB Hackathon. Players join as gods with hidden win conditions (secret directives), cast miracles onto a living world, and watch as four AI-driven civilizations react, adapt, and make strategic decisions every 15 seconds — all powered by Claude claude-sonnet-4-6 and SpacetimeDB.

---

## Table of Contents

- [Concept](#concept)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Game World](#game-world)
  - [Civilizations](#civilizations)
  - [Territory Map](#territory-map)
  - [World Tick](#world-tick)
- [Player Experience](#player-experience)
  - [Three Surfaces](#three-surfaces)
  - [Miracles](#miracles)
  - [Secret Directives](#secret-directives)
  - [Faith System](#faith-system)
- [AI Architecture](#ai-architecture)
  - [Civ Decision Pipeline](#civ-decision-pipeline)
  - [Miracle Reaction Pipeline](#miracle-reaction-pipeline)
  - [Narration Pipeline](#narration-pipeline)
  - [Divine Echo Pipeline](#divine-echo-pipeline)
  - [Rule-Based Fast Path](#rule-based-fast-path)
  - [Structured Output via Tool Use](#structured-output-via-tool-use)
- [SpacetimeDB Backend](#spacetimedb-backend)
  - [Database Schema](#database-schema)
  - [Reducers](#reducers)
  - [Scheduled Timers](#scheduled-timers)
  - [Real-Time Subscriptions](#real-time-subscriptions)
- [Frontend Architecture](#frontend-architecture)
  - [Big Screen (Spectator View)](#big-screen-spectator-view)
  - [God Panel (Player Interface)](#god-panel-player-interface)
  - [Join Flow (Onboarding)](#join-flow-onboarding)
- [API Routes](#api-routes)
- [Animations & Visual Effects](#animations--visual-effects)
- [Chronicle System](#chronicle-system)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [SpacetimeDB Module](#spacetimedb-module)
- [Design Decisions](#design-decisions)

---

## Concept

Pantheon is played across three simultaneous browser windows:

- **Big Screen** — A projected spectator view showing the territory map, god activity, and event chronicle. Designed to be visible to everyone in the room.
- **God Panel** — Each player's personal interface. Cast miracles, track faith, read divine feedback, and monitor your secret directive's progress.
- **Join Flow** — The onboarding experience where a player names their god and receives a secret directive sealed in wax.

The world runs autonomously. Every 15 seconds, the four AI civilizations — Aelthar (warmongers), Brindlefolk (the pious), Sapient (scholars), and the Merchant Princes (traders) — each assess the world state and decide what to do next: expand, build, forge alliances, declare war, or consolidate.

Gods cast miracles that directly alter civilization stats and territory states. The AI civs perceive these interventions and respond strategically. At the end of each era, gods are scored against their hidden directives (e.g., *"Cause a Dark Age"*, *"Peace Reigns"*, *"The Sword Wins"*).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENTS                          │
│                                                                 │
│   Big Screen (/)         God Panel (/god-panel)    Join (/join) │
│   SVG map, chronicle,    Miracle cards, faith,     God creation │
│   god bar, inspector     directives, feedback      flow         │
│         │                       │                      │        │
│         └───────────────────────┴──────────────────────┘        │
│                                 │                               │
│                    SpacetimeDB WebSocket Client                 │
│                    (real-time table subscriptions)              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   SpacetimeDB Maincloud     │
                    │                            │
                    │  Tables (public):           │
                    │  territory, civilization,   │
                    │  god, miracle_cast,         │
                    │  civ_action, alliance,      │
                    │  chronicle_entry,           │
                    │  world_meta                 │
                    │                            │
                    │  Reducers:                  │
                    │  joinWorld, castMiracle,    │
                    │  worldTick (scheduled),     │
                    │  regenFaith (scheduled)     │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Next.js API Routes        │
                    │   (AI inference layer)      │
                    │                            │
                    │  /api/ai-tick              │
                    │  /api/divine-echo          │
                    │  /api/miracle-reaction     │
                    │  /api/narrate-miracle      │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Claude claude-sonnet-4-6  │
                    │   (Anthropic API via        │
                    │   Merge Gateway)            │
                    └─────────────────────────────┘
```

The key architectural insight: **SpacetimeDB is the single source of truth**. All game state lives in its tables. The Next.js server handles only AI inference — it reads the world state from SpacetimeDB, calls Claude, and writes decisions back via reducers. Clients never poll; they receive real-time updates via WebSocket subscriptions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend Database | SpacetimeDB Maincloud (TypeScript module → WASM) |
| Frontend | Next.js 15 (App Router), React 19 |
| Real-Time Client | `@clockworklabs/spacetimedb-sdk` + `spacetimedb/react` |
| AI Inference | Claude claude-sonnet-4-6 (Anthropic) via Merge Gateway |
| Animations | Framer Motion |
| Styling | CSS-in-JS (inline styles) + globals.css |
| Language | TypeScript throughout |
| Deployment | Vercel (frontend) + SpacetimeDB Maincloud (backend) |

---

## Game World

### Civilizations

Four AI civilizations inhabit the world, each with a distinct personality encoded in their `leaderPersona` and statistical profile:

| Civilization | Color | Personality | Strengths |
|---|---|---|---|
| **Aelthar** | Red `#DC2626` | Warlike, expansionist | High aggression (9), low piety (4) |
| **Brindlefolk** | Blue `#3B82F6` | Devout, communal | High piety (9), low aggression (3) |
| **Sapient** | Amber `#F59E0B` | Scholarly, analytical | High tech, scholarly trait |
| **Merchant Princes** | Teal `#0D9488` | Trade-focused, pragmatic | High mercantile, stability |

Each civilization tracks: `population`, `tech_level`, `aggression`, `piety`, `mercantile`, `scholarly`, `stability`, `is_alive`, and `current_thought` (a quote from the most recent AI decision).

### Territory Map

The world contains 18 territories arranged in an adjacency graph. Each territory has:

- `owner_civ_id` (null if unclaimed)
- `terrain_type` (plains, mountains, forest, coast, desert)
- `has_capital` (boolean)
- `current_event` (plague, comet, or null)

The adjacency graph drives both AI expansion decisions and territory-targeting for miracles.

### World Tick

Every **15 seconds**, a scheduled reducer (`worldTick`) fires on SpacetimeDB. It:

1. Advances `current_year` and `tick_count`
2. Resolves pending territory contests and alliance updates
3. Triggers era advancement checks
4. Writes chronicle entries for significant events

The `GameMap` component on the frontend detects tick count changes and calls `/api/ai-tick` to generate AI civ decisions for that tick.

---

## Player Experience

### Three Surfaces

**Big Screen (`/`)** — Designed for projection in a room. Shows:
- Full SVG territory map with civ color fills
- Top bar with all connected gods (orbs + names + miracle pulse)
- Bottom chronicle log (expandable, 40 entries, color-coded by type)
- Click any territory to open the CivInspector sidebar
- Toast notifications for divine consequences (AI reactions)
- Era Results overlay at era end (directive scores for all gods)
- Miracle animations overlaid on map (comet strike, bless radiance, curse bleed, portent flash, inspire shimmer, reveal scan)

**God Panel (`/god-panel`)** — Each player's private interface. Shows:
- God identity card (name, color orb, subtitle)
- Faith balance bar (animated, depletes on miracle cast)
- Six miracle cards arranged in a parchment grid
- Targeting mode (select a civ or territory)
- Divine Feedback panel (AI echo + mechanic badges after each miracle)
- Secret directive progress (pass/fail indicators)
- Era Notice modal when an era ends

**Join Flow (`/join`)** — Four-screen onboarding:
1. Splash screen with "Enter the Pantheon" call to action
2. Returning god detection (continue or start fresh)
3. God naming input (up to 24 characters)
4. Directive reveal with wax seal and animated text reveal

### Miracles

Gods have six miracle types, each costing faith and applying direct stat effects:

| Miracle | Effect | Cost |
|---|---|---|
| **Bless** | +5 population, +1 piety | 20 faith |
| **Curse** | -8 population, -1 stability | 20 faith |
| **Portent** | Trigger current_event on territory | 15 faith |
| **Inspire** | +2 tech, +1 scholarly | 25 faith |
| **Strike** | -12 population, set comet event | 30 faith |
| **Reveal** | +2 piety, visible revelation | 10 faith |

After casting, three AI calls fire in parallel:
1. `miracle-reaction` — The targeted civ makes an immediate strategic response
2. `narrate-miracle` — A chronicle entry is generated describing the miracle's impact
3. `divine-echo` — The god receives a private 2-sentence briefing on whether the miracle helps their directive

### Secret Directives

Each god is randomly assigned one of eight hidden directives at join time. These are evaluated at the end of each era:

| # | Directive | Win Condition |
|---|---|---|
| 1 | Cause a Dark Age | All civs have tech level ≤ 4 |
| 2 | The Pious Triumph | Brindlefolk controls the most territory |
| 3 | The Sword Wins | Most aggressive civ leads in territories |
| 4 | A New Religion | Two or more civs have piety ≥ 7 |
| 5 | Twin Empires | Two civs each hold 6+ territories |
| 6 | The Old Gods Are Forgotten | Total world piety < 15 |
| 7 | Burn It Down | At least one civilization is extinct |
| 8 | Peace Reigns | No wars active at era end |

Directives are stored as an index in localStorage (`pantheon-god`) and encoded in the god's color assignment — gods with the same directive share a color.

### Faith System

Faith is a god's primary resource. It:
- Starts at 100
- Is consumed when casting miracles (costs vary by type)
- Regenerates automatically via the `regenFaith` scheduled reducer (every 10 seconds)
- Is displayed as an animated bar in the god panel

---

## AI Architecture

The AI layer consists of four distinct inference pipelines, all calling Claude claude-sonnet-4-6 through structured tool use.

### Civ Decision Pipeline

**Trigger:** `GameMap` detects a new tick → calls `POST /api/ai-tick`

**Input:** Full world state — all civilizations, territories, alliances, recent miracle casts

**Routing logic:**
```
For each civ:
  If civ has received miracles this tick
  OR civ is at war
  OR civ stability ≤ 3
  OR civ population ≤ 20:
    → AI decision (Claude)
  Else:
    → Rule-based decision (instant)
```

**AI prompt structure (per civ in a single batched request):**
- **Section A:** Civ identity and leader persona
- **Section B:** Full stat block (pop, tech, territories, traits)
- **Section C:** Map context (adjacent unclaimed territories, adjacent enemy territories, current alliances/wars)
- **Section D:** Miracle awareness — recent divine interventions with their mechanical effects and reaction guidance specific to this civ's personality
- **Section E:** Few-shot examples — 2 pre-written decisions showing how this civ reasons and writes

All civs needing AI decisions are batched into a **single API call** using the `submit_decisions` tool, which returns an array of decisions. This avoids N separate Claude calls per tick.

**Output:** Array of `{ civId, action, target, narration, thought }` objects written back to SpacetimeDB via `submitCivAction` reducer.

### Miracle Reaction Pipeline

**Trigger:** God casts a miracle → god panel calls `POST /api/miracle-reaction`

**Input:** The targeted civ's full state + the miracle type + world context (territories, alliances, world meta, god name)

**Logic:**
1. Assembles eligible actions for the civ based on current world state
2. Looks up `EVENT_REACTIONS[civName][miracleType]` for personality-specific guidance
3. Loads `FEW_SHOT_EXAMPLES[civName]` for this civ's voice
4. Calls Claude with the `submit_reaction` tool
5. Returns `{ action, target, narration, thought }` immediately

This creates the *Divine Consequence Toast* on the big screen — a real-time visible consequence within seconds of casting.

### Narration Pipeline

**Trigger:** God casts a miracle → god panel calls `POST /api/narrate-miracle` (fire-and-forget)

**Input:** God name, miracle type, territory name, civ name, mechanical effect, civ population, civ stability

**Output:** A 2-sentence chronicle entry in present-tense prose, naming the god and target explicitly. Max 50 words. Written to the `chronicle_entry` table.

### Divine Echo Pipeline

**Trigger:** God casts a miracle → god panel calls `POST /api/divine-echo`

**Input:** God's directive index, miracle type and target, mechanical effect, full world state, whether directive is currently passing

**Output:** A private 2-sentence briefing (max 55 words) addressing the god directly, assessing whether the miracle helped or hurt their path to victory.

### Rule-Based Fast Path

For civilizations that are calm (no miracles, no war, stable), the `ruleBasedDecision` function in `civ-constants.ts` returns an instant decision without any API call:

```
stability > 5 and territories > 3  →  consolidate
tech < 5                            →  build
adjacent unclaimed territories      →  expand
else                                →  consolidate
```

This keeps the system fast and cost-efficient — Claude is invoked only when the situation is genuinely interesting.

### Structured Output via Tool Use

All Claude calls use the Anthropic tool use API to enforce structured JSON output. Two tools are defined:

**`submit_decisions`** — Used by the ai-tick pipeline:
```json
{
  "decisions": [
    {
      "civId": 1,
      "action": "expand",
      "target": "Northern Reaches",
      "narration": "Aelthar's legions march forth...",
      "thought": "The northern territories are weak."
    }
  ]
}
```

**`submit_reaction`** — Used by the miracle-reaction pipeline:
```json
{
  "action": "build",
  "target": "capital",
  "narration": "The Brindlefolk pray to their ancestors...",
  "thought": "We must rebuild what the gods destroyed."
}
```

`tool_choice` is set to `"any"` (mapped to `"required"` in the Responses API format), guaranteeing parseable output on every call.

---

## SpacetimeDB Backend

The backend is a TypeScript module compiled to WebAssembly and published to SpacetimeDB Maincloud. All game state persists in SpacetimeDB tables. The frontend never writes to a REST API for game state — it calls reducers directly via the SpacetimeDB client.

### Database Schema

#### `territory` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u32, PK | Territory identifier (1–18) |
| `name` | string | Display name |
| `owner_civ_id` | option(u32) | Controlling civilization, null if unclaimed |
| `terrain_type` | string | plains, mountains, forest, coast, desert |
| `has_capital` | bool | Whether this is a civ's capital |
| `current_event` | option(string) | "plague" or "comet" or null |

#### `civilization` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u32, PK | Civ identifier |
| `name` | string | Civ name |
| `color` | string | Hex color for UI |
| `population` | i32 | Current population |
| `tech_level` | i32 | Technology advancement |
| `aggression` | i32 | 1–10 aggression trait |
| `piety` | i32 | 1–10 piety trait |
| `mercantile` | i32 | 1–10 mercantile trait |
| `scholarly` | i32 | 1–10 scholarly trait |
| `stability` | i32 | 1–10 stability (below 3 = crisis) |
| `leader_persona` | string | AI personality prompt |
| `current_thought` | option(string) | Latest AI decision quote |
| `is_alive` | bool | False if extinct |

#### `god` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u64, PK, autoInc | God identifier |
| `identity` | Identity, unique | SpacetimeDB caller identity |
| `name` | string | God's chosen name |
| `color` | string | Hex color (derived from directive index) |
| `faith_balance` | i32 | Current faith resource |
| `secret_directive` | u32 | Index into DIRECTIVES array |

#### `miracle_cast` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u64, PK, autoInc | Log entry ID |
| `god_id` | u64 | Casting god |
| `miracle_type` | string | bless, curse, portent, inspire, strike, reveal |
| `target_id` | u32 | Territory or civ ID |
| `tick_number` | u32 | World tick when cast |
| `narration` | string | AI-generated flavor text |

#### `civ_action` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u64, PK, autoInc | Log entry ID |
| `civ_id` | u32 | Acting civilization |
| `action_type` | string | expand, build, war, alliance, consolidate |
| `target` | string | Territory name or civ name |
| `tick_number` | u32 | World tick |
| `narration` | string | AI-generated description |

#### `chronicle_entry` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u64, PK, autoInc | Entry ID |
| `tick_number` | u32 | World tick |
| `entry_type` | string | miracle, action, event, era |
| `civ_color` | option(string) | Color for civ attribution |
| `god_color` | option(string) | Color for god attribution |
| `text` | string | Narrated text |
| `related_territory_id` | option(u32) | For map targeting |

#### `alliance` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u64, PK, autoInc | Relationship ID |
| `civ_a_id` | u32 | First party |
| `civ_b_id` | u32 | Second party |
| `status` | string | "alliance", "war", or "neutral" |

#### `world_meta` (public)
| Column | Type | Description |
|---|---|---|
| `id` | u32, PK | Always 1 (singleton) |
| `current_year` | u32 | In-world year |
| `era` | u32 | Current era number |
| `session_id` | string | Unique session UUID |
| `tick_count` | u32 | Total ticks elapsed |
| `is_running` | bool | Whether the world is active |

### Reducers

| Reducer | Called By | Description |
|---|---|---|
| `joinWorld` | Join flow | Creates a god record for the caller |
| `castMiracle` | God panel | Applies miracle effects to target, logs cast, charges faith |
| `submitCivAction` | `/api/ai-tick` | Records an AI civ decision and applies stat effects |
| `addChronicleEntry` | API routes | Writes a narrated entry to the chronicle |
| `worldTick` | Scheduled (15s) | Advances world state, resolves contests, checks era end |
| `regenFaith` | Scheduled (10s) | Increments faith for all gods up to maximum |

### Scheduled Timers

SpacetimeDB's scheduled table system fires reducers at fixed intervals without any external cron:

```typescript
// 15-second world tick
const worldTickTimer = table({
  name: 'world_tick_timer',
  scheduled: (): any => worldTick,
}, {
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
});

// 10-second faith regeneration
const regenFaithTimer = table({
  name: 'regen_faith_timer',
  scheduled: (): any => regenFaith,
}, {
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
});
```

### Real-Time Subscriptions

Clients subscribe to all public tables on connect:

```typescript
conn.subscriptionBuilder()
  .subscribe([
    tables.territory,
    tables.civilization,
    tables.god,
    tables.miracleCast,
    tables.civAction,
    tables.chronicleEntry,
    tables.alliance,
    tables.worldMeta,
  ]);
```

Every table change is pushed to all subscribed clients within milliseconds. Components use `useTable()` hooks from `spacetimedb/react` for reactive rendering.

---

## Frontend Architecture

### Big Screen (Spectator View)

**File:** `app/page.tsx` (~570 lines)

The root page is a full-viewport spectator display. It:

- Subscribes to all SpacetimeDB tables via `useTable()`
- Renders `<GameMap>` (SVG territory visualization)
- Renders `<PantheonBar>` (top god status bar)
- Renders `<Chronicle>` (bottom event log)
- Renders `<CivInspector>` (right sidebar, triggered by territory click)
- Manages animation state for 6 miracle types (tracked by miracle cast ID to prevent re-triggering on subscribe)
- Scores directives in real-time and displays an Era Results overlay at era end
- Shows a Divine Consequence Toast for AI reactions to miracles

Animation tracking pattern (prevents re-fire on re-subscribe):
```typescript
const seenMiracleIds = useRef<Set<bigint>>(new Set());

// In onInsert callback:
if (!seenMiracleIds.current.has(cast.id)) {
  seenMiracleIds.current.add(cast.id);
  triggerAnimation(cast);
}
```

### God Panel (Player Interface)

**File:** `app/god-panel/page.tsx` (~700 lines)

The player's private interface. Reads god state from localStorage (`pantheon-god`) and connects to SpacetimeDB as the same identity. Features:

- **God Identity Card:** Name, color orb (wax seal style), role subtitle
- **Faith Bar:** Animated width with real-time faith balance
- **Miracle Grid:** Six cards in a 3×2 parchment layout, each with slight random rotation (`CARD_ROTATIONS = [-5, 3, -2, 4, -3, 5]`)
- **Targeting Mode:** AnimatePresence overlay showing selectable civs or territories
- **Divine Feedback Panel:** Miracle type, target name, mechanic badges (e.g., "+5 pop"), AI echo text
- **Directive Status:** Pass/fail badges for each criterion of the secret directive
- **Secret Directive Modal:** Revealed on `?new=1` query param (shown once after joining)
- **Era Notice Modal:** Shown at era end with directive results

### Join Flow (Onboarding)

**File:** `app/join/page.tsx` (~400 lines)

A four-screen stacked flow with opacity transitions:

1. **Splash** — Logo title, "Enter the Pantheon" button
2. **Choice** — If god exists in localStorage, offer Continue or New God
3. **Name** — Text input, 24-character max, Enter to confirm
4. **Directive** — Wax seal reveal animation, directive text, decorative corner accents

God data stored in localStorage:
```json
{
  "name": "Velathos",
  "directiveIndex": 3,
  "color": "#8B5CF6"
}
```

---

## API Routes

### `POST /api/ai-tick`

Called by `GameMap` on each tick. Generates strategic decisions for all civs.

**Request body:**
```json
{
  "civs": [...],
  "territories": [...],
  "alliances": [...],
  "miracleCasts": [...],
  "currentTick": 42
}
```

**Response:**
```json
{
  "decisions": [
    {
      "civId": 1,
      "action": "expand",
      "target": "Northern Reaches",
      "narration": "Aelthar's legions march forth...",
      "thought": "The northern territories are weak."
    }
  ]
}
```

### `POST /api/miracle-reaction`

Called by god panel immediately after casting. Returns civ's immediate response.

**Request body:**
```json
{
  "civ": {...},
  "miracle": { "type": "strike", "targetId": 5 },
  "territories": [...],
  "alliances": [...],
  "worldMeta": {...},
  "godName": "Velathos"
}
```

**Response:**
```json
{
  "action": "build",
  "target": "capital",
  "narration": "The Brindlefolk pray to their ancestors...",
  "thought": "We must rebuild what the gods destroyed."
}
```

### `POST /api/narrate-miracle`

Called by god panel after casting (fire-and-forget). Returns chronicle text.

**Request body:**
```json
{
  "godName": "Velathos",
  "miracleType": "bless",
  "territoryName": "Ashford Vale",
  "civName": "Brindlefolk",
  "mechEffect": "+5 population, +1 piety",
  "targetCivPop": 45,
  "targetCivStability": 7
}
```

**Response:**
```json
{
  "narration": "Velathos breathes life into Ashford Vale..."
}
```

### `POST /api/divine-echo`

Called by god panel after casting. Returns private god briefing.

**Request body:**
```json
{
  "directiveIndex": 3,
  "miracleType": "inspire",
  "targetName": "Sapient",
  "mechEffect": "+2 tech",
  "civWorld": [...],
  "directivePassing": false,
  "directiveDetail": "Requires all civs tech ≤ 4. Currently Sapient at 5."
}
```

**Response:**
```json
{
  "echo": "Your inspiration lifts Sapient's scholars further from the darkness you seek. The Dark Age grows more distant."
}
```

---

## Animations & Visual Effects

All miracle animations are SVG-based overlays rendered at territory coordinates (`TERRITORY_SVG_CENTERS` maps territory IDs to pixel positions on the 1000×600 SVG viewport).

| Miracle | Animation | Duration | Effect |
|---|---|---|---|
| **Strike** | `strikeBlast` + `strikeRing1/2` | 2000ms | Orange radial blast, 2 expanding rings, screen shake |
| **Curse** | `curseBleed` + `curseRing1/2` | 2500ms | Dark red seeping effect, 2 rings |
| **Bless** | `blessRadiance` + `blessRing1/2` | 2000ms | Golden glow, 2 expanding rings |
| **Portent** | `portentFlash` + `portentRipple1/2/3` | 2500ms | Purple flash, 3 ripple rings |
| **Inspire** | `inspireFlash` + `inspireRing1/2` | 2000ms | Amber shimmer, 2 rings |
| **Reveal** | `revealScan` | 1800ms | Teal scanning beam |

Screen shake on comet strike is a CSS keyframe applied to the entire map SVG element (`comet-screen-shake`, ±6px for 0.3s).

Civ pulse effect (on targeting) renders animated SVG circles over all territories owned by a civ, with a 1.4-second `civPulse` keyframe.

The `PantheonBar` shows a 1800ms god orb pulse whenever that god casts a miracle.

---

## Chronicle System

**File:** `app/components/Chronicle.tsx` (~350 lines)

The Chronicle is a fixed bottom bar showing a scrollable event log. It:

- Subscribes to `chronicleEntry` table (up to 40 entries shown)
- Collapses/expands with chevron toggle
- Shows a preview of the latest entry when collapsed
- Uses Framer Motion for entry animation (slide-in from left)

Entry types and rendering:
- **`era`** — Centered, decorative glyph, flanking rules, era number
- **`miracle`** — God color dot + god name + miracle badge (uppercase) + territory/civ name + narration
- **`action`** — Civ color dot + civ name + action badge + target + narration
- **`event`** — Neutral styling, event description

---

## Project Structure

```
pantheon/
├── app/
│   ├── page.tsx                    # Big screen / spectator view
│   ├── globals.css                 # Global styles, animations, CSS variables
│   ├── layout.tsx                  # Root layout
│   ├── god-panel/
│   │   └── page.tsx                # Player god interface
│   ├── join/
│   │   └── page.tsx                # Onboarding flow
│   ├── api/
│   │   ├── ai-tick/
│   │   │   └── route.ts            # Civ decision batch (Claude)
│   │   ├── divine-echo/
│   │   │   └── route.ts            # God directive briefing (Claude)
│   │   ├── miracle-reaction/
│   │   │   └── route.ts            # Civ immediate reaction (Claude)
│   │   └── narrate-miracle/
│   │       └── route.ts            # Chronicle flavor text (Claude)
│   ├── components/
│   │   ├── GameMap.tsx             # SVG territory map + miracle animations
│   │   ├── Chronicle.tsx           # Event log bar
│   │   ├── PantheonBar.tsx         # Top god status strip
│   │   ├── CivInspector.tsx        # Territory click → civ detail sidebar
│   │   └── animations/             # Animation helper components
│   ├── lib/
│   │   ├── civ-constants.ts        # AI prompts, adjacency graph, tools
│   │   └── merge-gateway.ts        # Anthropic API client wrapper
│   └── constants/
│       └── directives.ts           # 8 god directives + titles
├── spacetimedb/
│   └── src/
│       └── index.ts                # SpacetimeDB TypeScript module (→ WASM)
├── module_bindings/                # Auto-generated by `spacetime generate`
│   ├── index.ts
│   └── ...
├── next.config.ts
├── package.json
├── tsconfig.json
└── spacetime.json                  # SpacetimeDB project config
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- SpacetimeDB CLI: `curl -sSf https://install.spacetimedb.com | sh`
- An Anthropic API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)
```

### 3. Publish the SpacetimeDB module

```bash
# Login to SpacetimeDB Maincloud
spacetime login

# Build and publish the backend module
cd spacetimedb
spacetime publish pantheon-world --yes
cd ..
```

### 4. Generate client bindings

```bash
spacetime generate --lang typescript --out-dir ./module_bindings --module-path ./spacetimedb
```

### 5. Run the dev server

```bash
npm run dev
```

Open:
- `http://localhost:3000` — Big screen
- `http://localhost:3000/join` — Join as a god
- `http://localhost:3000/god-panel` — Your god panel

### Local Development (without Maincloud)

```bash
# Start local SpacetimeDB instance
spacetime start

# Publish to local server
cd spacetimedb
spacetime publish pantheon-world --server local --yes
cd ..
```

Update `spacetime.json` to point at `http://localhost:3000` for local development.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude access |
| `NEXT_PUBLIC_SPACETIMEDB_URI` | Yes | WebSocket URI for SpacetimeDB (e.g., `wss://maincloud.spacetimedb.com`) |
| `NEXT_PUBLIC_MODULE_NAME` | Yes | Your published module name (e.g., `pantheon-world`) |

---

## SpacetimeDB Module

The backend module lives in `spacetimedb/src/index.ts` and is compiled to WebAssembly.

To rebuild and republish after changes:

```bash
cd spacetimedb
spacetime publish pantheon-world --yes
```

For rapid iteration without restarting clients (hot-swap):

```bash
spacetime publish pantheon-world --yes
# Clients stay connected; new module takes effect immediately
```

To view live server logs:

```bash
spacetime logs pantheon-world -f
```

To query the database directly:

```bash
# Check all civilizations
spacetime sql pantheon-world "SELECT * FROM civilization"

# Check world tick
spacetime sql pantheon-world "SELECT * FROM world_meta"

# View recent chronicle entries
spacetime sql pantheon-world "SELECT * FROM chronicle_entry ORDER BY id DESC LIMIT 10"
```

---

## Design Decisions

**SpacetimeDB as sole source of truth.** All game state — territory ownership, civ stats, miracle history, god identities — lives in SpacetimeDB tables. The Next.js server is stateless; it only handles AI inference. This means the game is multiplayer by default with no additional state management.

**Reducers over REST for game state.** Clients call SpacetimeDB reducers directly (not Next.js API routes) for game actions. REST endpoints exist only for AI calls that require server-side secrets (the Anthropic API key).

**Batched AI calls.** All civs needing AI decisions in a given tick are batched into a single Claude call using an array-typed tool schema. This reduces latency and API costs compared to one call per civ.

**Rule-based fast path.** Most ticks, most civs are stable and take rule-based decisions instantly. Claude is invoked only for dramatic situations — miracles, wars, crises. This keeps the 15-second tick responsive even if the API is slow.

**Tool use for structured output.** All Claude calls use tool use with `tool_choice: required`, guaranteeing parseable JSON on every response. No prompt engineering for JSON formatting; schema enforcement handles it.

**Animation tracking by ID.** Miracle animations are keyed by their database `id` (a bigint). A `useRef<Set<bigint>>` tracks which IDs have fired. Re-subscribing on reconnect doesn't re-trigger animations for past events.

**Parchment aesthetic.** The entire visual system — big screen, god panel, join flow — uses a consistent aged parchment palette with warm browns, ink rules, wax seal orbs, and SVG texture overlays. No external UI component library; all styling is hand-written CSS-in-JS.

**Three surfaces, one world.** The big screen, god panel, and join flow are three separate Next.js pages that all connect to the same SpacetimeDB module. The projected big screen is designed to be shared in a room while players use their phones or laptops as god panels.

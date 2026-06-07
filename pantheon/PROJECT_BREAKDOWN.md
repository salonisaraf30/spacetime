# PANTHEON — Project Breakdown

## What Is This?

Pantheon is a **multiplayer god simulation game**. Multiple players each take the role of a god watching over a fantasy world populated by four AI-driven civilizations. Each god has a secret directive — a hidden win condition — and must spend "faith" to cast miracles that influence the civilizations toward fulfilling it. The world runs on its own: civilizations expand, declare wars, build alliances, and develop technology autonomously every 15 seconds. Gods intervene from their phone or second screen while watching the shared map on a main display.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database / server | SpacetimeDB (maincloud, TypeScript module) |
| Frontend framework | Next.js 15 (App Router) |
| Real-time sync | SpacetimeDB React SDK (`useTable`, `useSpacetimeDB`) |
| AI | Anthropic Claude Haiku 4.5 via Merge Gateway |
| Animations | Framer Motion v12 |
| Deployment target | Local dev (`npm run dev`) |

**Key architectural point**: SpacetimeDB is the entire backend. There is no separate API server for game state. All game logic runs inside the database as WebAssembly reducers. The Next.js frontend subscribes to tables and calls reducers directly. The only "server" code outside SpacetimeDB is the Next.js API routes, which exist solely to call the AI.

---

## File Structure

```
pantheon/
├── spacetimedb/src/index.ts         ← entire game backend (SpacetimeDB module)
├── app/
│   ├── page.tsx                     ← main spectator map page (/)
│   ├── join/page.tsx                ← god registration page (/join)
│   ├── god-panel/page.tsx           ← player god panel (/god-panel)
│   ├── components/
│   │   ├── GameMap.tsx              ← SVG territory map
│   │   ├── Chronicle.tsx            ← collapsible event log
│   │   ├── PantheonBar.tsx          ← top header bar
│   │   ├── CivInspector.tsx         ← territory click popup
│   │   └── animations/              ← per-miracle visual effects
│   ├── api/
│   │   ├── ai-tick/route.ts         ← AI civ decisions every tick
│   │   ├── miracle-reaction/route.ts ← AI civ response to a miracle
│   │   ├── narrate-miracle/route.ts  ← AI chronicle text for miracles
│   │   └── divine-echo/route.ts     ← AI strategic briefing for gods
│   ├── constants/
│   │   ├── territory-paths.ts       ← SVG path data for 18 territories
│   │   ├── directives.ts            ← 8 god directive definitions
│   │   └── civ-constants.ts         ← AI prompts, tool schemas, adjacency
│   └── lib/
│       └── merge-gateway.ts         ← shared AI API helper
```

---

## Database Schema (SpacetimeDB Tables)

All tables are public (readable by all clients via subscription).

### `territory` (18 rows, static topology)
```
id            u32   — 0–17, matches SVG path IDs
name          string — e.g. "Iron Citadel", "Tidemarket"
owner_civ_id  i32   — -1 = unclaimed, 0–3 = civilization ID
terrain_type  string — mountain / coast / plains / forest / river
has_capital   bool
current_event string — "none" | "plague" | "comet"
```
Territories never move. Ownership changes as civs expand or conquer.

### `civilization` (4 rows, seeded once)
```
id             u32
name           string — Aelthar | Brindlefolk | Sapient | Merchant Princes
color          string — hex color (#DC2626, #3B82F6, #F59E0B, #0D9488)
population     i32    — grows each tick, death at 0
tech_level     i32    — 1–10
aggression     i32    — 1–10, gates war/conquer actions
piety          i32    — 1–10, gates convert/build-piety actions
mercantile     i32    — 1–10, gates trade/envoy actions
scholarly      i32    — 1–10, gates develop_tech
stability      i32    — 1–10, affects population growth
leader_persona string — full character backstory fed to AI
current_thought string — AI's last internal monologue, updates each decision
is_alive       bool
```

### `god` (one row per player)
```
id               u32
identity         Identity — SpacetimeDB auth identity
name             string   — chosen by player
color            string   — auto-assigned from pool of 8
faith_balance    i32      — starts at 100, max 200, regenerates +6 every 10s
secret_directive i32      — 0–7, index into DIRECTIVES array
```

### `miracle_cast` (append-only log)
```
id           u32
god_id       u32
miracle_type string — bless | curse | portent | inspire | strike | reveal
target_id    u32    — civ ID or territory ID depending on miracle
tick_number  u32
narration    string — filled later by AI narration route (async)
```

### `civ_action` (append-only log)
```
id          u32
civ_id      u32
action_type string — expand | conquer | build | consolidate | declare_war | form_alliance | develop_tech | send_envoy | convert
target      string
tick_number u32
narration   string — AI-generated flavor text
```

### `chronicle_entry` (append-only log — the event feed)
```
id                   u32
tick_number          u32
entry_type           string — "miracle" | "action" | "event" | "era"
civ_color            string — hex (empty if god entry)
god_color            string — hex (empty if civ entry)
text                 string — display narration
related_territory_id i32    — -1 if not territory-specific
```

### `alliance`
```
id        u32
civ_a_id  u32
civ_b_id  u32
status    string — "alliance" | "war" | "neutral"
```
Seeded with Aelthar vs Brindlefolk at war, Sapient + Merchant Princes in alliance.

### `world_meta` (1 row)
```
id           u32
current_year u32  — advances +1 every 4 ticks
era          u32  — advances every 15 ticks (~3.75 min)
session_id   u32
tick_count   u32
is_running   bool
```

### Scheduler tables (internal)
- `world_tick_timer` — fires `worldTick` every 15 seconds
- `regen_faith_timer` — fires `regenFaith` every 10 seconds

---

## Backend Logic (SpacetimeDB Reducers)

### `worldTick` — the heartbeat (every 15s)
1. Increments `tick_count`. Every 4 ticks → `current_year + 1`.
2. **Era check**: every 15 ticks, evaluates each god's directive, writes an "era" chronicle entry (fulfilled or failed), increments era.
3. **Population growth**: every alive civ gains 2–5 pop + tech bonus + stability bonus per tick.
4. **Random expansion**: picks a random alive civ, finds an unclaimed territory adjacent to their existing land, assigns it. Writes a civ-specific expansion chronicle entry.

### `regenFaith` — every 10s
Adds +6 faith to every god (capped at 200). This is the passive income that lets gods keep casting.

### `applyCivDecision` — called by Next.js AI routes
Receives `{ civ_id, action, target, narration, thought }` and executes the decision:
- **expand** — claims adjacent unclaimed territory
- **consolidate** — +2 stability, +5 pop
- **conquer** — takes enemy territory if at war and adjacent
- **build** — +1 to specified stat (aggression/piety/mercantile/scholarly/stability)
- **declare_war / form_alliance** — creates or updates an alliance row
- **develop_tech** — +1 tech_level (requires scholarly ≥ 4)
- **send_envoy** — +1 mercantile to target civ (requires mercantile ≥ 5)
- **convert** — +1 piety to target civ (requires civ piety ≥ 7)

Updates `current_thought`, inserts into `civ_action` and `chronicle_entry`.

### `castMiracle` — called by player
Validates faith cost, deducts it, applies the mechanical effect, inserts `miracle_cast`, writes an instant chronicle entry. Effects:

| Miracle | Cost | Target | Mechanical effect |
|---|---|---|---|
| bless | 12 | civ | +2 stability, +1 piety, plants positive thought |
| inspire | 12 | civ | +1 scholarly, plants scholarly thought |
| portent | 18 | civ | Plants a directive vision (one of 6 randomized thoughts) |
| reveal | 5 | civ | -1 stability, plants "exposed" thought |
| curse | 25 | territory | plague event, -15 pop, -1 stability |
| strike | 55 | territory | comet event, -25 pop, -2 stability |

### `joinWorld` — called once per player
Creates a god row with random color + random directive (0–7), writes a "new god awakens" chronicle entry.

### `recordMiracleNarration` — called by browser after AI responds
Writes an additional AI-generated miracle chronicle entry. Best-effort stamp on the miracle_cast row.

### `scoreDirective` — internal helper (not callable externally)
Evaluates a god's directive against current world state. Called during era-end in `worldTick`.

---

## AI Routes (Next.js API)

All routes use Merge Gateway (`https://api-gateway.merge.dev/v1/responses`) with Claude Haiku 4.5. Shared helper at `app/lib/merge-gateway.ts`.

### `POST /api/ai-tick` — batch civ decisions
Called by `GameMap.tsx` every time `world.tickCount` changes.

**What it does**: Sends all 4 civs their full state (territories, alliances, traits, recent miracles, current thought) and asks each for one decision. Uses a tool call (`submit_decision`) to get structured `{ action, target, narration, thought }`. Calls `applyCivDecision` reducer for each via SpacetimeDB client.

**Prompt strategy**: Per-civ character prompts from `DECISION_TOOL`, few-shot examples from `FEW_SHOT_EXAMPLES`, narration rules enforcing specificity (named territories, concrete stats, no vague phrasing).

### `POST /api/miracle-reaction` — immediate civ response to a miracle
Called by `god-panel/page.tsx` right after a miracle is cast on a civ.

**What it does**: The targeted civ immediately reacts to the miracle — decides what action to take in response. Computes eligible actions based on current state, adjacency, alliance status. Returns `{ action, target, narration, thought }` which is applied via `applyCivDecision`.

**Why this exists separately**: This reaction happens immediately and in direct response to the player's action, making miracles feel impactful. The regular ai-tick decisions happen on a schedule and don't specifically reference the miracle.

### `POST /api/narrate-miracle` — AI chronicle flavor text for miracles
Called fire-and-forget from `god-panel/page.tsx` after casting.

**What it does**: Generates 1–2 specific, concrete sentences describing what the miracle physically did (population numbers, territory names, stat changes). Calls `recordMiracleNarration` reducer to write it to the chronicle.

### `POST /api/divine-echo` — strategic briefing for the god
Called from `god-panel/page.tsx` after casting.

**What it does**: Generates a 2-sentence strategic briefing connecting the miracle to the god's current directive. "You did X — this helps/hurts directive Y because Z." Shown in the DivineFeedback panel.

---

## Civilizations — Personality Summary

| Civ | Color | Play style | Key stats |
|---|---|---|---|
| **Aelthar** | Red `#DC2626` | Warmonger, expand-first, short brutal sentences | Aggression 9 |
| **Brindlefolk** | Blue `#3B82F6` | Pious missionaries, convert neighbors, never starts wars | Piety 9 |
| **Sapient** | Amber `#F59E0B` | Scholar-analysts, tech-first, calculated, observes before acting | Scholarly 9 |
| **Merchant Princes** | Teal `#0D9488` | Trade network builders, form alliances, profit from conflict | Mercantile 9 |

Aelthar vs Brindlefolk start at war. Sapient and Merchant Princes start allied.

---

## Directives — God Win Conditions (8 total)

| Index | Name | Condition |
|---|---|---|
| 0 | Dark Age | No civilization reaches Tech Level 5+ |
| 1 | Pious Triumph | Brindlefolk controls more territory than any other civ |
| 2 | Sword Wins | The most aggressive civ holds the most territory |
| 3 | New Religion | 2+ civilizations reach piety ≥ 7 |
| 4 | Twin Empires | 2+ civilizations each hold 6+ territories |
| 5 | Old Gods Forgotten | Total piety across all civs drops below 15 |
| 6 | Burn It Down | At least one civilization goes extinct |
| 7 | Peace Reigns | No active wars between any civs |

Evaluated every era (~3.75 min). Each god has one secret directive; other gods don't know which.

---

## Frontend Pages

### `/` — Spectator Map
The shared display. Shows the fantasy map with SVG territory overlays colored by owner. Miracle animations play here when gods cast. The Chronicle sits at the bottom.

**What it renders**:
- `GameMap` — territory SVG overlaid on map PNG, civ colors, event flashes (plague/comet glow), miracle animations
- `PantheonBar` — top bar: Pantheon title, god orbs with names, tick/year/status
- `Chronicle` — collapsible event feed at the bottom (fixed, overlays map when open)
- `CivInspector` — popup when a territory is clicked showing civ stats
- Toast notifications — "Divine Consequence" when a miracle triggers a civ reaction

**Also drives**: The `ai-tick` API call on every tick change. Handles miracle animation positioning (converts SVG coordinates to screen pixels).

### `/join` — God Registration
Parchment-themed multi-screen flow:

1. **Splash** — "PANTHEON, A God Game" with enter button
2. **Choice** (returning players) — "Continue as [name]" or "New God"
3. **Name** — text input for god name, calls `joinWorld` reducer on submit
4. **Directive reveal** — animated reveal of the secret directive text

On submit, stores `{ name, directiveIndex, color }` in `localStorage` as fallback in case the SpacetimeDB identity isn't resolved yet. Redirects to `/god-panel?new=1`.

### `/god-panel` — Player God Interface
Each player's personal screen (phone / second tab). Parchment-themed.

**What it shows**:
- God orb + name + "Pantheon Ascendant" subtitle
- Faith bar (animated, god-colored fill)
- Miracle cards (6 cards, slightly rotated like a hand, tier badge, rarity line)
- Targeting list (when a miracle is selected)
- DivineFeedback panel (after casting — instant badges + AI briefing)
- DirectiveStatus (current directive text + live pass/fail with detail)
- Era modal (appears when an era ends — fulfilled or failed)
- Directive reveal modal (appears on first join via `?new=1`)

---

## The Game Loop

```
Every 10 seconds:
  regenFaith fires → all gods +6 faith (max 200)

Every 15 seconds:
  worldTick fires →
    tick_count++
    Every 4 ticks: year++
    Every 15 ticks: era ends, directives scored, era++
    Population grows for all civs
    One random civ expands into adjacent unclaimed territory

  GameMap detects tick change →
    Calls /api/ai-tick →
      Claude generates one decision per civ
      Each decision applied via applyCivDecision reducer
      → Stats change, territories claimed, wars declared, alliances formed
      → chronicle_entry written for each decision

When a god casts a miracle:
  1. castMiracle reducer runs (instant):
     - Faith deducted
     - Mechanical effect applied (stat change / event placed)
     - miracle_cast row written
     - Instant chronicle entry written

  2. Three async AI calls fire in parallel from god-panel:
     a. /api/narrate-miracle → generates poetic chronicle text → recordMiracleNarration reducer
     b. /api/miracle-reaction → targeted civ reacts → applyCivDecision reducer
     c. /api/divine-echo → god gets strategic briefing → shown in DivineFeedback panel

  3. GameMap plays miracle animation (territory flash / screen shake)
  4. Toast appears on spectator map showing the civ's reaction
```

---

## The Chronicle

The Chronicle is the event feed — every significant thing that happens gets written here. It's the game's narrative spine.

**Entry types and sources**:
| Type | Color source | Written by |
|---|---|---|
| `miracle` | god_color | `castMiracle` reducer (instant) + `recordMiracleNarration` (AI) |
| `action` | civ_color | `applyCivDecision` reducer (every decision) |
| `event` | god_color | `joinWorld` reducer (god joins) |
| `era` | god_color | `worldTick` at era boundaries |

Displayed as a collapsible bar fixed to the bottom of the spectator map. Collapsed: shows latest entry preview. Expanded: scrollable list of 40 most recent entries, newest first, with entity name, type badge, and 2-line narration.

---

## Territory Map

18 territories arranged as a fantasy continent. The map PNG is a hand-drawn fantasy map. The SVG overlay sits on top with transparent path shapes that:
- Fill with the owning civ's color (35% opacity)
- Flash with miracle-specific animations on cast (gold glow for bless, red pulse for curse, orange blast for strike, etc.)
- Show plague/comet event overlays when active
- Pulse with a civ color ring when that civ is affected by a miracle

Territory adjacency is hardcoded as a graph of 18 nodes — determines which territories can be expanded into or conquered from existing land.

---

## What Has Been Built

### Completed
- Full SpacetimeDB backend: all tables, all reducers, timed game loop
- 4 civilizations with deep personas and seeded starting state
- 8 god directives with live scoring
- 6 miracles with mechanical effects + instant chronicle entries
- Spectator map page with SVG territory coloring and miracle animations
- Chronicle collapsible event feed with type badges and entity names
- PantheonBar with god orbs and pulsing on miracle cast
- CivInspector territory popup
- /join flow (splash → name → directive reveal → god panel)
- /god-panel with miracle cards, targeting, faith bar, directive status
- Divine feedback loop: instant mechanic badges + AI strategic briefing
- All 4 AI routes migrated to Merge Gateway (Claude Haiku 4.5)
- Narrative quality overhaul: specific, named, concrete AI narrations across all routes
- Per-civ expand templates in backend for variety
- Map fills full viewport width (no side letterboxing), no pan/zoom
- Chronicle fixed-position overlay (doesn't squish map when expanded)
- Parchment visual theme consistent across join page and god panel

### Architecture Decisions Made
- **No separate game server**: SpacetimeDB handles all authoritative game state. Next.js is purely UI + AI proxy.
- **AI is advisory, not authoritative**: Claude generates decisions but the actual state changes go through SpacetimeDB reducers, which enforce all game rules. Claude can't cheat.
- **Two-phase miracle narration**: Instant generic text written synchronously in the reducer, better AI text written async and added as a second chronicle entry. Players never wait.
- **Merge Gateway**: All AI calls go through a single gateway (not directly to Anthropic), using the OpenAI Responses API format.
- **Client-side directive scoring**: Both the frontend and backend independently score directives. Backend does it at era-end for official record; frontend does it live for the god panel status display.

---

## Key Constants

| Constant | Value | Meaning |
|---|---|---|
| World tick interval | 15,000,000 µs = 15s | How often the world advances |
| Faith regen interval | 10,000,000 µs = 10s | How often gods gain faith |
| Faith regen amount | +6 per tick | Passive faith income |
| Faith max | 200 | Cap on stored faith |
| Starting faith | 100 | Each god begins here |
| Ticks per era | 15 | ~3.75 minutes per era |
| Ticks per year | 4 | 1 in-game year per 4 ticks (60s) |
| Territory count | 18 | Total territories (4 capitals + 14 unclaimed) |
| Civilizations | 4 | Fixed — Aelthar, Brindlefolk, Sapient, Merchant Princes |
| Directives | 8 | One assigned randomly per god |
| Chronicle max display | 40 entries | Newest 40 shown in feed |

---

## How to Run

```bash
# 1. Start the SpacetimeDB module (already published to maincloud)
#    If you need to republish after backend changes:
cd spacetimedb
spacetime publish pantheon --yes

# 2. Start the Next.js dev server
cd pantheon
npm run dev

# 3. Open the spectator map
#    http://localhost:3000

# 4. Join as a god (on another tab or device)
#    http://localhost:3000/join

# 5. Your god panel
#    http://localhost:3000/god-panel
```

Environment variables required in `.env.local`:
```
MERGE_GATEWAY_API_KEY=mg_...
NEXT_PUBLIC_SPACETIMEDB_HOST=wss://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIMEDB_DB_NAME=pantheon
```

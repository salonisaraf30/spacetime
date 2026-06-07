# Pantheon — Project Status
_Last updated: 2026-06-07_

---

## What This Game Is

A multiplayer god simulation. Players join as gods through `app/join`, claim a civilization, and cast miracles via `app/god-panel`. A big-screen display (`app/page.tsx`) shows the world map, live chronicle log, and real-time civ stats. Each game tick, AI agents (one per civilization) decide what their kingdom does — expand, declare war, develop tech, etc. — reacting to both world state and divine interventions from players.

---

## App Architecture

| Route | File | Status |
|---|---|---|
| Big screen (TV display) | `app/page.tsx` | ✅ Working |
| God panel (player view) | `app/god-panel/page.tsx` | ✅ Working |
| Join / god creation | `app/join/page.tsx` | ✅ Working |
| AI tick endpoint | `app/api/ai-tick/route.ts` | ✅ Working — batched + tool use |
| Miracle narration | `app/api/narrate-miracle/route.ts` | ✅ Working |

---

## Backend (SpacetimeDB — `spacetimedb/src/index.ts`)

Published to maincloud as `pantheon`.

### Tables
| Table | Public | Purpose |
|---|---|---|
| `world_meta` | ✅ | Global tick count, year, era |
| `god` | ✅ | Player gods — name, color, faith, directive |
| `civilization` | ✅ | 4 AI kingdoms — traits, population, tech, current thought |
| `territory` | ✅ | 18 territories — owner, resources, current event |
| `alliance` | ✅ | War / peace / alliance status between civs |
| `miracle_cast` | ✅ | Every miracle ever cast — type, target, tick, narration |
| `civ_action` | ✅ | Every AI decision ever made — action, target, narration, thought |
| `chronicle_entry` | ✅ | Human-readable event log |

### Key Backend Mechanics
- **Territory adjacency**: 18-territory map with explicit adjacency graph. Civs can only expand/conquer into adjacent territories.
- **One capital per civ at start**: Each civ begins with exactly 1 territory. `seedWorld` and `forceSeed` both enforce this.
- **Population growth**: Each tick — base 2–5 + tech bonus + stability bonus (capped at 999).
- **Miracle effects**: `bless` (+2 stability, +1 piety), `curse` (-15 pop, -1 stability), `strike` (-25 pop, -2 stability), `inspire` (+1 scholarly), `portent` (sets current_thought), `reveal` (no stat effect).
- **Era system**: Every N ticks, era advances. On advancement, god directives are scored and an overlay fires on the big screen.
- **`consolidate` action**: +2 stability, +5 population. Used as fallback.

---

## AI Agent System (`app/api/ai-tick/route.ts`)

Called every tick by `GameMap.tsx` after the SpacetimeDB tick fires.

### Architecture
1. **Rule-based fallback** — civs that are calm (no miracles, not at war, stable, not near extinction) get instant decisions with zero API calls.
2. **Conditional gating** (`needsAIDecision`) — only routes to Claude when: divine event just occurred, at war, stability ≤ 3, or population ≤ 20.
3. **Single batched call** — all civs needing AI go in one `claude-haiku-4-5-20251001` request with tool use (`submit_decisions` tool).
4. **Tool use schema** (`DECISION_TOOL`) — enforces valid `action` enum. Eliminates JSON parse failures entirely.
5. **Graceful degradation** — if API call fails, all AI civs fall back to rule-based.

### Per-Civ Prompt Context
Each civ block in the batch prompt includes:
- Full leader persona (from Section C of rulebook)
- Current traits, population, tech, territories, adjacencies
- Recent divine interventions with god name + effect
- **Section D reaction guidance**: how this specific civ reacts to each miracle type
- **Section E few-shot examples**: 2 real decision examples per civ in exact JSON format
- Relationship status (allies, enemies, at war)

### Console output per tick
```
[ai-tick] tick 42: 2 rule-based, 2 AI-reasoned (Aelthar, Brindlefolk)
```

---

## UI Components

### Big Screen (`app/page.tsx`)
- `PantheonBar` — top bar: connection status, tick counter, year
- `GameMap` — interactive SVG map, territory click → CivInspector
- `Chronicle` — scrolling event log, right side
- `CivInspector` — slide-in panel on territory click
- `CometStrike` — canvas animation overlay on strike miracle
- Era overlay — full-screen "The Reckoning" modal on era end, scores all directives

### CivInspector (`app/components/CivInspector.tsx`)
Shows when a territory is clicked. Displays:
- Territory info (resources, current event)
- Owner civ traits (aggression, piety, mercantile, scholarly, stability)
- Population + tech level
- **Divine Interventions** — last 4 miracles affecting this civ's territories, with god orb (colored circle + initial), miracle type badge, target territory, narration
- **Recent Decrees** — last 3 AI decisions made by this civ (action, target, narration). Older entries faded.
- Civ's current thought

### Chronicle (`app/components/Chronicle.tsx`)
- Animated scrolling log with Framer Motion enter/exit
- Styled differently per entry type: era breaks, miracles (by type), civ actions, chronicle lore

### GameMap (`app/components/GameMap.tsx`)
- SVG territory paths loaded from `app/constants/territory-paths.ts`
- Territory fill = owner civ color (or neutral gray)
- Flash animations on miracle cast — per miracle type (bless=gold, curse=purple, strike=orange-red, etc.)
- Screen shake on strike
- Miracle icon overlays persist for 8 ticks
- Triggers AI tick call on each world tick

---

## Animations

| Animation | File | Wired Up? | Notes |
|---|---|---|---|
| **CometStrike** | `CometStrike.tsx` | ✅ `page.tsx` | Canvas-based meteor. Fires on new strike casts (ID-tracked). Coords account for PantheonBar offset. |
| **StrikeAnimation** | `StrikeAnimation.tsx` | ❌ Dead code | Old SVG approach. Safe to delete. |
| **BlessAnimation** | `BlessAnimation.tsx` | ❌ Built, not wired | — |
| **CurseAnimation** | `CurseAnimation.tsx` | ❌ Built, not wired | — |
| **PortentAnimation** | `PortentAnimation.tsx` | ❌ Built, not wired | — |
| **WhisperAnimation** | `WhisperAnimation.tsx` | ❌ Built, not wired | — |
| **InspireAnimation** | `InspireAnimation.tsx` | ❌ Built, not wired | — |
| **RevealAnimation** | `RevealAnimation.tsx` | ❌ Built, not wired | — |

---

## God Panel (`app/god-panel/page.tsx`)

Player-facing view. Features:
- God stats display (faith, directive progress)
- Miracle casting buttons (bless, curse, portent, inspire, strike, reveal)
- Target selection (territory or civ)
- Faith cost gating per miracle type
- AI-generated narration per miracle via `/api/narrate-miracle`

---

## Constants

| File | Contents |
|---|---|
| `app/constants/territory-paths.ts` | SVG path strings for all 18 territories |
| `app/constants/directives.ts` | `DIRECTIVES` (full text) and `DIRECTIVE_TITLES` (short labels) for 8 god directives |

---

## Known Issues

| # | Issue | Severity |
|---|---|---|
| 1 | **6 animations unconnected** — Bless, Curse, Portent, Whisper, Inspire, Reveal are built but never render on the big screen | High |
| 2 | **`StrikeAnimation.tsx`** — dead code alongside `CometStrike.tsx` | Low |
| 3 | **`app/WorldMap.tsx`** — appears unused, leftover from earlier iteration | Low |
| 4 | **`CometStrike.tsx` TypeScript errors** — canvas `ctx` null checks (pre-existing, runtime-safe) | Low |
| 5 | **Rapid-fire strikes** — multiple strikes in quick succession queue as sequential CometStrikes | Medium |
| 6 | **No audio** — all animations are silent | Medium |

---

## What's Left To Do

### High Priority
- Wire the 6 unwired animations (`BlessAnimation`, `CurseAnimation`, `PortentAnimation`, `WhisperAnimation`, `InspireAnimation`, `RevealAnimation`) to fire on big screen when those miracles land — same pattern as CometStrike

### Medium Priority
- Add sound effects to CometStrike (and future animations when wired)
- Handle rapid-fire strike queueing gracefully (cooldown or merge)

### Low Priority
- Delete `StrikeAnimation.tsx` (replaced by CometStrike)
- Audit / delete `app/WorldMap.tsx` if unused
- Fix CometStrike canvas TypeScript null-check errors (runtime-safe but noisy)

---

## How To Run

```bash
# Start Next.js dev server
npm run dev

# SpacetimeDB (if running locally)
spacetime start
spacetime publish pantheon --server local --yes

# Force a fresh world seed (maincloud)
spacetime call pantheon force_seed

# Watch logs
spacetime logs pantheon -f
```

Database is currently published to **maincloud** at `pantheon`.

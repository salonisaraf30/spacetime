# Pantheon — Project Status

**Last updated:** 2026-06-06 ~12:00 IST  
**Current world state:** Tick ~1626 · Year ~406 · Running continuously on SpacetimeDB Maincloud

---

## Architecture Overview

```
Browser (Next.js)
  └─ SpacetimeDB WebSocket ──► Maincloud DB "pantheon"
       ├─ territory (18 rows, all claimed)
       ├─ civilization (4 rows)
       ├─ world_meta (1 row — tick/year counter)
       ├─ alliance (1 row — Aelthar vs Brindlefolk at war)
       ├─ chronicle_entry (~1600+ rows)
       ├─ civ_action (~240+ rows)
       ├─ miracle_cast (empty — no gods yet)
       └─ god (empty — no gods yet)

On every worldTick (every 15 seconds, server-side):
  worldTick reducer fires →
    Browser receives tickCount update →
      Browser POSTs world state to /api/ai-tick →
        Claude Haiku generates decision for each civ →
          Browser calls apply_civ_decision reducer for each →
            SpacetimeDB writes to civ_action + chronicle_entry
```

---

## What Is Working

### Backend (SpacetimeDB — Maincloud)
- **Schema:** All 8 tables defined and live (`territory`, `civilization`, `god`, `miracle_cast`, `civ_action`, `chronicle_entry`, `alliance`, `world_meta`)
- **World seeding:** `init` reducer seeds 4 civs, 18 territories, 1 alliance (Aelthar vs Brindlefolk at war) on fresh database
- **Scheduled ticking:** `worldTick` fires every 15 seconds via `world_tick_timer` scheduled table — tick count and year update continuously even when no client is connected
- **Faith regen:** `regenFaith` fires every 10 seconds via `regen_faith_timer` (no gods yet, so no visible effect)
- **`apply_civ_decision` reducer:** Handles all 7 civ actions — expand, build, declare_war, form_alliance, develop_tech, send_envoy, convert — writes to `civ_action` and `chronicle_entry`, updates `current_thought`

### Frontend (Next.js — localhost:3000)
- **SpacetimeDB connection:** Browser connects via WebSocket and subscribes to `territory`, `civilization`, `world_meta`, `alliance`, `miracle_cast`
- **Map rendering:** Fantasy map image (`public/map.png` — 1380×752) displayed with pan + zoom (drag to pan, scroll to zoom, `0` to reset)
- **Territory color overlay:** SVG polygon paths overlaid on the map — civ ownership colors (35% opacity) tint each territory region
- **HUD:** Status (Connected/Connecting), Tick count, Year — all live-updating from SpacetimeDB
- **AI tick trigger:** On every `tickCount` change, browser sends world state to `/api/ai-tick`

### AI (Claude Haiku via Anthropic API)
- **`/api/ai-tick` route:** Receives world state from browser, calls `claude-haiku-4-5` in parallel for all 4 civs, returns decisions
- **In-character decisions confirmed:** Sapient always picks `develop_tech`, Brindlefolk attempts `convert Aelthar`, narrations are in-voice and literary
- **`current_thought` updating:** Each civ's private reasoning is stored and visible in the DB
- **Chronicle:** 1600+ entries with colored narrations in civ voice, timestamped to tick

---

## What Is NOT Working / Not Yet Built

### Broken / Needs Fix
- **Territory expansion stalled:** All 18 territories were claimed by tick 14 (early random worldTick expansion). Civs now only do `build`/`develop_tech` since `expand` requires unclaimed territory. Fix: reset the DB with `--delete-data always` closer to demo time to get a fresh world, OR reduce territory count so expansion is competitive longer
- **SVG path alignment:** The territory polygon paths in `app/constants/territory-paths.ts` are manually traced approximations. Some tints sit slightly off the actual territory regions. Needs visual fine-tuning using the coordinate display tool (hover to see x,y in yellow)
- **Civ personas truncated:** `leader_persona` in the DB is set to short placeholders (`"Warlike iron kings..."` etc.). The full 150–200 word personas from the rulebook (Step 2.1) need to be written and seeded for richer AI decisions
- **`develop_tech` target garbage:** Claude sometimes returns `"Sapient civilization"`, `"N/A"`, `"internal"` as the target for `develop_tech`. Harmless (reducer ignores target for this action) but the prompt should clarify that `develop_tech` has no target

### Not Yet Built (Remaining Steps)
| Step | Description | Who |
|------|-------------|-----|
| 2.1 | Write full civ personas (150–200 words each) and seed into DB | Prompt Lead |
| 2.2 | Write few-shot exemplars for each civ | Prompt Lead |
| 3.1 | `join_world` reducer — players join as gods with random directive | Builder |
| 3.2 | `cast_miracle` reducer — bless, curse, portent, whisper, inspire, strike, reveal | Builder |
| 3.3 | `narrate_miracle` procedure — LLM narrates miracle events | Builder |
| 3.4 | Phone UI `/god-panel` — faith bar, miracle grid, targeting | Frontend Lead |
| 3.5 | Onboarding `/join` — splash → name entry → directive reveal | Frontend Lead |
| 3.6 | Chronicle component — scrolling live history panel | Frontend Lead |
| 3.7 | Pantheon bar — show all connected gods | Frontend Lead |
| 3.8 | Big screen layout assembly | Frontend Lead |
| 4.1 | Secret directive scoring | Builder |
| 4.2 | Era end + results | Builder |
| 1.7 | Vercel deployment | Builder |

---

## Key Files

```
pantheon/
├── spacetimedb/src/index.ts          # SpacetimeDB module — all tables, reducers, lifecycle hooks
├── app/
│   ├── components/GameMap.tsx         # Main map component — subscription, SVG overlay, AI tick trigger
│   ├── constants/territory-paths.ts   # SVG polygon coordinates for 18 territories (viewBox 0 0 1380 752)
│   ├── api/ai-tick/route.ts           # Next.js API route — calls Claude Haiku, returns decisions
│   ├── providers.tsx                  # SpacetimeDB connection setup
│   └── page.tsx                       # Entry point → renders GameMap
├── src/module_bindings/               # Auto-generated SpacetimeDB client bindings
├── public/map.png                     # Fantasy map image (1380×752)
├── .env.local                         # ANTHROPIC_API_KEY, SPACETIMEDB_TOKEN, host/db config
└── next.config.ts                     # reactStrictMode: false (required for SpacetimeDB subscription)
```

---

## Deployment

| Service | Status | URL/Name |
|---------|--------|----------|
| SpacetimeDB (backend) | Live, ticking | Maincloud — database: `pantheon` |
| Next.js frontend | Local only | `http://localhost:3000` |
| Vercel | Not yet deployed | — |

---

## Known Quirks

1. **World never pauses.** `worldTick` runs on Maincloud 24/7. Tick count is ~1626 and climbing. This is a feature for the demo pitch ("the world has been running since we started") but means the initial territory grab is already done.
2. **React StrictMode must be off.** `next.config.ts` has `reactStrictMode: false` — required because StrictMode runs effects twice and breaks the SpacetimeDB subscription setup.
3. **Timers must be seeded in `init`.** `ensureTimers` called from `onConnect` was unreliable. Timers are now inserted directly in the `init` lifecycle hook.
4. **Subscription uses raw SQL strings.** `conn.subscriptionBuilder().subscribe([...])` uses `'SELECT * FROM table_name'` strings — typed table accessors (`tables.worldMeta`) did not trigger `onApplied`.
5. **AI decisions come from the browser.** `/api/ai-tick` receives world state from the client (not from SpacetimeDB's HTTP API, which uses an unsupported URL format for this SDK version).
6. **403 on CLI reducer calls.** `spacetime call pantheon ...` returns 403. Reducers must be called from the browser client via `conn.reducers.*`.

---

## Immediate Next Priorities (Demo Day Order)

1. **Write full personas** (Prompt Lead) → seed into DB → AI decisions get dramatically better
2. **Build `/join` + `/god-panel`** (Frontend Lead) → players can join
3. **Build `join_world` + `cast_miracle`** (Builder) → god powers work
4. **Deploy to Vercel** (Builder) → QR codes work
5. **Visual path alignment** (Frontend Lead) → territory tints sit correctly on map
6. **Reset DB** day-of-demo with pre-seeded drama (active war, one comet event, Aelthar already aggressive)

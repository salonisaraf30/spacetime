# Pantheon — Hackathon Benchmark
_Generated: 2026-06-07_

---

## What We Set Out to Build

One-line pitch: **Risk meets Civilization, except the players are AI agents and you're a god watching from above.**

A real-time multiplayer god game where:
- 4 AI civilizations make LLM-driven decisions every 15 seconds
- Human players join as gods via QR code, spend faith to cast miracles
- Each god has a secret directive (hidden win condition)
- The world runs inside SpacetimeDB autonomously — no one needs to be connected
- A persistent chronicle records every event with the god who caused it

Target prize categories: Grand Prize, Best Web App, Best Use of LLMs, Best Game, Best Student Team.

---

## Side-by-Side: Planned vs. Built

### Backend (SpacetimeDB)

| Feature | Planned | Status |
|---|---|---|
| `world_meta` table | ✅ | ✅ Built |
| `civilization` table (4 civs) | ✅ | ✅ Built |
| `territory` table (18 territories) | ✅ | ✅ Built |
| `god` table | ✅ | ✅ Built |
| `miracle_cast` table | ✅ | ✅ Built |
| `civ_action` table | ✅ | ✅ Built |
| `chronicle_entry` table | ✅ | ✅ Built |
| `alliance` table | ✅ | ✅ Built |
| `world_tick` scheduled reducer (15s) | ✅ | ✅ Built |
| `regen_faith` scheduled reducer (10s) | ✅ | ✅ Built |
| `join_world` reducer | ✅ | ✅ Built |
| `cast_miracle` reducer (all 7 types) | ✅ | ⚠️ 6/7 — Whisper missing |
| `chronicle_pruner` scheduler | Planned | ❌ Not built |
| Adjacency graph (territory topology) | Needed | ✅ Built |
| Published to Maincloud as `pantheon` | Needed | ✅ Live |

---

### AI System

| Feature | Planned | Status |
|---|---|---|
| LLM-driven civ decisions every tick | ✅ | ✅ Built (Next.js API route, Claude Haiku) |
| Civ personality personas in prompts | ✅ | ✅ Full personas for all 4 civs |
| Few-shot exemplars per civ | ✅ | ✅ 5 examples per civ |
| Trait vector influences decisions | ✅ | ✅ Aggression/Piety/etc. weighted in prompt |
| Rule-based fallback (calm civs skip AI) | Not planned | ✅ Added (smart optimization) |
| Batched single API call per tick | Not planned | ✅ Added (tool use schema) |
| Miracle narration via LLM | ✅ | ✅ `/api/narrate-miracle` |
| Civ reaction to miracle via LLM | ✅ | ✅ `/api/miracle-reaction` |
| Divine echo (briefing for gods) | Not in original plan | ✅ Added |
| AI calls from inside SpacetimeDB | Original plan | ❌ Moved to Next.js API routes (SpacetimeDB procedures couldn't make HTTP calls in practice) |

---

### Civilization Actions

| Action | Planned | Status |
|---|---|---|
| expand | ✅ | ✅ |
| build | ✅ | ✅ |
| declare_war | ✅ | ✅ |
| form_alliance | ✅ | ✅ |
| develop_tech | ✅ | ✅ |
| send_envoy | ✅ | ✅ |
| convert | ✅ | ✅ |
| consolidate | ✅ (as fallback) | ✅ |
| schism (civ splits into two) | ✅ Planned | ❌ Not implemented |

---

### Miracles

| Miracle | Planned | Status |
|---|---|---|
| Bless (+2 stability, +1 piety) | ✅ | ✅ |
| Curse (−15 pop, plague) | ✅ | ✅ |
| Portent (bias next decision) | ✅ | ✅ |
| Whisper (direct command, 40 faith) | ✅ | ❌ Missing from god panel |
| Inspire (+1 scholarly) | ✅ | ✅ |
| Strike (−25 pop, −2 stability, comet) | ✅ | ✅ |
| Reveal (see hidden civ state) | ✅ | ✅ |

---

### Secret Directives

| Directive | Planned | Status |
|---|---|---|
| Dark Age (no civ above Tech IV) | ✅ | ✅ |
| Pious Triumph (Brindlefolk dominates) | ✅ | ✅ |
| The Sword Wins (most aggressive civ leads) | ✅ | ✅ |
| A New Religion (schism + 2 convert) | ✅ | ✅ |
| Twin Empires (2 civs 6+ territories) | ✅ | ✅ |
| The Old Gods Are Forgotten (piety < 15) | ✅ | ✅ |
| Burn It Down (1 civ extinct) | ✅ | ✅ |
| Peace Reigns (no wars at era end) | ✅ | ✅ |
| Scoring evaluated at era end | ✅ | ✅ Era overlay fires |

---

### UI Surfaces

| Surface | Planned | Status |
|---|---|---|
| Big screen (/) — map + chronicle + pantheon bar | ✅ | ✅ Working |
| Phone — god panel (/god-panel) | ✅ | ✅ Working |
| Onboarding — 3 screens (/join) | ✅ | ✅ Working |
| Civ inspector (click territory) | ✅ | ✅ Working |
| Era end / results overlay | ✅ | ✅ Built (fires on era) |
| Leaderboard / directive reveal | ✅ | ⚠️ Era overlay exists, but quality/completeness unknown |

---

### Animations

| Animation | Planned Priority | Status |
|---|---|---|
| Chronicle slide-in (Framer Motion) | ⭐ Highest | ✅ Fully done |
| Comet Strike (canvas, screen shake) | ⭐ Signature | ✅ Wired and firing |
| Pantheon bar pulse (god casts miracle) | High | ✅ Working |
| Bless animation | High | ⚠️ Built but NOT wired to big screen |
| Curse animation | High | ⚠️ Built but NOT wired |
| Portent animation | Medium | ⚠️ Built but NOT wired |
| Whisper animation | Medium | ⚠️ Built but NOT wired |
| Inspire animation | Medium | ⚠️ Built but NOT wired |
| Reveal animation | Medium | ⚠️ Built but NOT wired |
| Map ink-bleed on civ expansion | Planned | ❌ Not built |
| Territory event overlays (plague/blessing) | Planned | ❌ Not built (event flashes in GameMap exist, but not distinct per-type visuals) |
| Civ inspector current-thought typography | High | ✅ Current thought displays |

---

### Visual Design

| Feature | Planned | Status |
|---|---|---|
| Illuminated manuscript / parchment aesthetic | ✅ | ✅ Applied to all 3 pages |
| Cinzel display font | Planned | ⚠️ Using Georgia/serif instead (inline styles, not Next.js font pipeline) |
| Inter for UI chrome | Planned | ⚠️ Using Georgia/serif throughout |
| Dark sepia background | Planned | ⚠️ Warm parchment browns (#d4c4a0) — shifted lighter |
| Tailwind + shadcn/ui | Planned | ❌ Not used — all inline styles |
| Two-screen design (laptop theater + phone) | ✅ Core design | ✅ Preserved |
| QR code join flow | ✅ | ✅ (any phone navigating to /join works) |

---

### Deployment and Submission

| Item | Planned | Status |
|---|---|---|
| Vercel deployment (live URL) | ✅ Required | ❌ Only local dev confirmed |
| SpacetimeDB Maincloud | ✅ | ✅ Published as `pantheon` |
| GitHub public repo | Required | ❓ Unknown |
| GitHub README | Required (graded) | ❌ Not written |
| Demo video (90 seconds) | Required | ❌ Not shot |
| DevSpot submission | Required | ❌ Not done |
| QR codes printed | Planned | ❌ Not confirmed |

---

## What's Done vs. What's Left — Summary

### DONE ✅ (~75% of the project)

- Full SpacetimeDB backend with all tables and reducers
- World ticking autonomously every 15 seconds on Maincloud
- AI civilization decision-making with full personas, few-shot examples, trait weighting
- All 4 civ personalities (Aelthar, Brindlefolk, Sapient, Merchant Princes) alive and distinct
- 6 of 7 miracles working end-to-end (bless, curse, portent, inspire, strike, reveal)
- All 8 secret directives defined, scored at era end
- God join flow with directive assignment
- Chronicle log (collapsible, animated, styled)
- Pantheon bar (god icons pulse on miracle cast)
- CivInspector (traits, divine interventions, recent decrees, current thought)
- Comet Strike animation (signature miracle — the judges' "wow" moment)
- Chronicle slide-in animation (the #1 polish item)
- Full parchment visual theme across all three pages
- Card rotation design on god panel miracle cards

---

### LEFT TO DO ❌ / ⚠️ (Ordered by impact on demo)

#### Submission-Blockers (must do before 11 AM Sunday)

1. **Vercel deployment** — without a live URL you cannot submit. Deploy and test on venue wifi.
2. **GitHub README** — explicitly graded. Needs: pitch, screenshot, "How SpacetimeDB powers Pantheon" section, setup instructions.
3. **Demo video** — 90 seconds, voiceover, GitHub link in end card.
4. **DevSpot submission form** — summary, video, GitHub link, live demo URL.

#### High-Impact Game Gaps

5. **Wire 6 unwired animations** — Bless, Curse, Portent, Whisper, Inspire, Reveal are built but never show on the big screen. Every miracle a judge casts except Strike is visually silent. This significantly reduces the "wow" effect of the multiplayer moment.

6. **Whisper miracle** — the most powerful, most expensive, most memorable miracle is missing from the god panel. It was the mechanic that made gods feel like they were *talking* to civilizations.

#### Medium-Impact Gaps

7. **Map event overlays** — plague territories look the same as healthy ones. Comet-hit territories don't show a scorch mark. These are visual details but judges look at the map.

8. **Schism action** — planned as a civ action but not implemented. Directive #4 ("A New Religion") references it indirectly.

9. **Audio** — silent. Even one sound effect on comet strike would dramatically increase perceived polish.

10. **Era results screen polish** — the overlay fires but its quality (how clear are the directive reveals? is there confetti?) is untested.

#### Low Priority

11. `StrikeAnimation.tsx` — dead code, safe to delete.
12. `WorldMap.tsx` — appears unused, safe to delete.
13. Cinzel font pipeline — currently using Georgia serif, not the planned Cinzel through Next.js font API.

---

## Honest Assessment: Where the Project Stands

### Strengths (things that genuinely win)

- **The AI civs work and feel alive.** This is the hardest part of the whole project and it's done. The LLM calls Claude, the personas are distinct, the chronicle reads like history. This is what wins "Best Use of LLMs."
- **The core loop is complete.** Someone can scan a QR code, join as a god, cast a miracle, and watch the chronicle respond. The multiplayer moment works.
- **SpacetimeDB is deeply integrated.** The world ticks autonomously on Maincloud. Tables, reducers, scheduled reducers, subscriptions — all genuinely used. This wins the SpacetimeDB-specific praise from judges.
- **Visual design is distinctive.** The parchment aesthetic is cohesive and intentional. It reads as "a real game" not a hackathon prototype.
- **CometStrike is beautiful.** The signature miracle animation lands. Judges will see it.

### Weaknesses (things that cost prizes)

- **No live deployment.** Without a Vercel URL you cannot technically submit. This is the single largest risk.
- **5 of 7 miracles are visually silent on the big screen.** You cast a Curse and... nothing happens on the map. The multiplayer feel drops hard when only one miracle has visible drama.
- **No submission materials.** Video, README, and the form don't exist yet. These are ~30% of the scoring if judges weight "completeness/functionality" on what they can actually access.
- **Whisper is missing.** The most expensive, most powerful miracle — the one that most strongly demonstrates "god influencing AI" — doesn't exist in the current god panel.

---

## Recommended Build Order for Remaining Time

If time is limited, do these in order:

1. `vercel --prod` — deploy. Everything else is secondary to having a live URL.
2. Wire the 6 animations to the big screen — same pattern as CometStrike, already have the components.
3. Add Whisper miracle back to god panel.
4. Write GitHub README (30 minutes, copy-paste the pitch text from the hackathon doc).
5. Shoot and edit demo video (4 takes, pick best, CapCut to 90s).
6. Fill DevSpot submission form.
7. Map event overlays if time allows.
8. Audio if time allows.

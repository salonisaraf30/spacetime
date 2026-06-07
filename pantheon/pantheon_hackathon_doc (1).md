# Pantheon: SpacetimeDB Launchpad Hackathon

A complete reference for the team. Read this end to end before doors open.

---

## 1. The hackathon

### Event

- **Name:** SpacetimeDB Launchpad Hackathon (NYC Tech Week)
- **Venue:** The Yard, Herald Square. 106 W 32nd St, NYC
- **Format:** In-person, single host (SpacetimeDB / Clockwork Labs)
- **Prize pool:** $8,000 total

### Schedule

| When | What |
|---|---|
| Fri 6 Jun, 11:00 PM | Meet & Greet, doors open |
| Fri 6 Jun, 11:30 PM | Tyler C. SpacetimeDB Talk |
| Sat 7 Jun, 2:30 AM | Team formation |
| Sat 7 Jun, 3:00 AM | **Hackathon Day 1 begins** |
| Sat 7 Jun, 3:05 AM | Brainstorm with mentors |
| Sat 7 Jun, 1:45 PM | Mentors visit teams |
| Sat 7 Jun, 5:00 PM | Scrabble Tournament (side challenge) |
| Sat 7 Jun, 10:00 PM | "Building Time" block |
| Sun 8 Jun, 3:00 AM | Winners ceremony block begins |
| **Sun 8 Jun, 11:00 AM** | **Final submissions due** |
| Sun 8 Jun, 12:30 PM | Winners ceremony |

Our team is starting at **8 PM Friday**, before doors. Real build window: ~30 hours including sleep and meals.

### Prizes

| Prize | Amount |
|---|---|
| Grand Prize | $3,000 |
| Best Web App | $1,000 |
| Best Use of LLMs | $1,000 |
| Best Game | $1,000 |
| Winner of Scrabble Tournament | $1,000 |
| Best Student Team | $750 |

Pantheon credibly competes for: **Grand Prize, Best Web App, Best Use of LLMs, Best Game, Best Student Team**. That's five prizes from one build.

### Judging criteria (each weighted equally at 25%)

1. **Innovation / Creativity.** Original, novel, imaginative.
2. **User Experience.** Intuitive, accessible, visually polished. Quick to grasp.
3. **Completeness / Functionality.** Finished and working, not a prototype with broken parts.
4. **Use of Sponsor Tech (SpacetimeDB).** How deeply and well it's integrated.

### Prize requirements (must hit all three)

1. SpacetimeDB is the primary backend technology.
2. The submitted app is hosted and working.
3. Source code is clean and intelligible.

### Bonus criteria

1. App is heavily real-time.
2. App is beautiful.
3. Clever or novel use of SpacetimeDB.
4. SpacetimeDB used in combination with LLMs / agents.

**Pantheon natively hits all four bonus criteria.** Not bolted on. This is the strongest possible alignment.

### Submission requirements

- Summary
- Video (recorded demo, ~90 seconds)
- GitHub link
- Live demo
- Documentation

---

## 2. The idea: Pantheon

A real-time multiplayer game where AI civilizations live on a shared map and human players act as gods who shape their world.

Four AI kingdoms each have personality, traits, and goals. They make their own decisions every 15 seconds, driven by an LLM that reads their current situation and responds in character. Players join as gods through a QR code, see all four civilizations on a shared big screen, and cast miracles from their phones: bless a kingdom, curse it, drop a comet, whisper directives into a king's ear. The world keeps moving forward whether you act or not.

Each god draws a secret directive at the start of a session. One wants to cause a Dark Age, another wants to make the religious civ win, a third wants peace, a fourth wants chaos. Gods don't know each other's goals. They compete by manipulating the same world. At session end, directives reveal and the highest-scoring god wins that round.

The world persists. Civilizations rise and fall across sessions. The chronicle records every event with the god who caused it. Walk away, come back tomorrow, your god name is still in the history. The simulation runs inside SpacetimeDB itself, ticking forward whether or not anyone is connected.

### One-line pitch

> Risk meets Civilization, except the players are AI agents and you're a god watching from above.

### Why this idea wins this hackathon

- **Heavily real-time** by design. Map syncs, chronicle syncs, faith syncs, every miracle effect lands instantly on every screen.
- **Beautiful** through aesthetic discipline (illuminated manuscript / parchment).
- **Novel use of SpacetimeDB.** Scheduled reducers running autonomous AI civs. Procedures calling LLMs. Persistent multi-agent world state. This is the deepest possible use of the platform.
- **LLM + agent combination is the core mechanic.** Every civ decision is an LLM call. Every chronicle entry is generated. Not a feature, the foundation.
- **Hits every prize category accessible to the team.** Web app, game, LLM use, student, grand prize all in play.

---

## 3. Game design

### The map

A stylized fantasy continent with ~16 to 20 named territories. Risk-style regions (SVG paths), not hexes. Each territory has:

- A name (e.g. "Brindle Coast", "Iron Hills", "The Whispering Pines")
- Terrain type (plains, mountain, river, coast, forest)
- Current owner (one of four civs, or unclaimed)
- Active events (plague, blessing, comet strike)

The map is generated once in v0 the night before the hackathon. Hand-drawn fantasy continent silhouette, 18 regions, each as a separate clickable `<path>` element with civ-color fill. We rename territories to fit our world.

### The four starting civilizations

Each civ has:
- A name and color
- A leader persona (name, voice, beliefs)
- Five trait scores (0–10): Aggression, Piety, Mercantile, Scholarly, Stability
- A starting territory and capital

| Civ | Color | Persona | Starting traits (A/P/M/S/St) |
|---|---|---|---|
| Aelthar | Crimson | Warlike iron kings, hard and superstitious | 9 / 4 / 2 / 3 / 6 |
| Brindlefolk | Indigo | Pious coastal people, build temples and convert | 3 / 9 / 4 / 5 / 5 |
| Sapient | Purple | Scholar-priests, value knowledge over power | 2 / 5 / 6 / 9 / 7 |
| Merchant Princes | Teal | Wealthy trading dynasty, prefer deals to swords | 4 / 3 / 9 / 6 / 4 |

Traits drift over time based on what happens. Win a war, aggression rises. Population drops hard, stability falls. A god whispers them toward piety repeatedly, their piety score climbs. Civilizations evolve.

### What civilizations can do (the action menu)

Constrained to seven actions. The LLM must pick from this list.

| Action | Effect | Requirement |
|---|---|---|
| Expand | Claim adjacent unclaimed territory | Population ≥ 3 |
| Build | +1 to a chosen stat (next decision) | Population ≥ 2 |
| Declare war | Sets war state with neighbor | Aggression ≥ 5 |
| Form alliance | Sets alliance state with neighbor | Mercantile ≥ 4 |
| Schism | Civ splits into two | Stability ≤ 3 |
| Develop tech | +1 tech level | Scholarly ≥ 4 |
| Send envoy | Shifts neighbor's trait toward sender | Mercantile ≥ 5 |
| Convert | Shifts neighbor's piety up | Piety ≥ 7 |

### The gods (human players)

Players join via QR code, pick a divine name, and receive:
- A starting Faith balance of 80
- Faith regenerates +5 every 10 seconds
- A secret directive drawn from a pool of 8 to 10

### Miracle list

| Miracle | Effect | Faith cost |
|---|---|---|
| Bless | +2 to chosen stat for one civ | 10 |
| Curse | -2 population, plague event on territory | 20 |
| Portent | Civ's next decision biased toward "react to omen" | 15 |
| Whisper | Direct command shaping civ's next action | 40 |
| Inspire | +1 tech roll for civ | 10 |
| Strike | Destroy army or damage capital | 50 |
| Reveal | See civ's hidden state | 5 |

Whisper is the most powerful and the most expensive. Reveal is cheap intel. The economy is tuned so a god can cast 5 to 8 miracles per session if active.

### Secret directives (pool of 8)

Each god draws one at start of session. Hidden from other gods. At session end, directives resolve and gods are scored.

1. **Cause a Dark Age.** No civilization may rise above Tech IV by era end.
2. **The Pious Triumph.** Brindlefolk control the most territory at era end.
3. **The Sword Wins.** Most aggressive civ (highest A score) controls the most territory.
4. **A New Religion.** Trigger a religious schism that converts at least 2 civs.
5. **Twin Empires.** Two civs each control at least 6 territories at era end.
6. **The Old Gods Are Forgotten.** Total piety across all civs drops below 15.
7. **Burn It Down.** At least one civ goes extinct.
8. **Peace Reigns.** No active wars at era end.

These need calibration during Saturday playtesting. All eight should be achievable within a 5-minute session through skilled play.

### Win condition

Session ends after a set number of ticks (15-20 ticks ≈ 5 minutes). Each god's directive resolves. Score awarded per directive. Highest-scoring god wins that round. The world keeps going.

### Persistence

When a session ends, the world doesn't reset. Civs continue. Year counter ticks. Past gods' names remain in the chronicle. Walking back into the venue the next day, the world is still running. This is the most distinct property of the game and is only possible because SpacetimeDB runs the tick inside the database itself.

---

## 4. AI agent design

### The trait vector + persona model

Each civilization is defined by two things the LLM reads on every decision:

**Structured (numbers):** Five trait scores, 0 to 10.

**Unstructured (writing):** A hand-written paragraph in the civ's voice.

Example, Aelthar:

> You are King Aelthar of the warlike Aelthar civilization. You rule a people of the iron hills who live by the sword and read omens in fire. You distrust the gods unless they offer war-favor. Recent kings have died young and the people whisper of curses. You believe expansion is destiny. To stop is to die. You speak in short, hard sentences.

### How traits affect decisions

The LLM is given the trait scores and an explicit instruction:

> Your traits: Aggression 9, Piety 4, Mercantile 2, Scholarly 3, Stability 6. These numbers should heavily influence which action you pick. High aggression leans toward war, expansion, hostile envoys. Low piety means ignore religious omens. Low mercantile means avoid trade alliances.

The model genuinely weights its choice on these numbers. Tested with Claude Haiku, this works reliably.

### How a god action propagates to a civ reaction

Walk through end to end:

1. **Player taps Curse on Aelthar's capital.** Phone calls `cast_miracle(type: "curse", target: territory_47)` reducer.

2. **Reducer fires atomically.** Deducts 20 faith from god's balance. Writes a row to `miracles_cast` table. Updates the target territory: adds `current_event: "plague"`, drops controlling civ's population by 15. All clients see the diff within a frame.

3. **Narration procedure runs.** `narrate_miracle(miracle_id)` pulls context, calls LLM: *"Write one sentence chronicling this event in the voice of an ancient historian."* Returns: *"The Aelthar fields rot beneath a plague sent by Hex. Children weep in the granaries."* Writes to `chronicle_entries`. All chronicle drawers update.

4. **Wait for next world tick** (up to 15 seconds).

5. **`world_tick` fires.** For each civ, calls `civ_decide(civ_id)` procedure.

6. **Aelthar's decision context is built.** Procedure gathers:
   - Aelthar's current stats and traits
   - Aelthar's persona description
   - Recent events affecting Aelthar (the plague is in the top 3)
   - Neighbors and relationships

7. **LLM is called with full context.** Prompt explicitly mentions the curse: *"In the last 3 ticks, the god Hex cursed your capital with plague (-15 population)."*

8. **LLM responds in character.** Aelthar might decide: abandon the western campaign, build defenses, blame the western priests. The LLM picks an action from the menu and writes a narration sentence.

9. **Action applies.** `civ_take_action` reducer runs. War state cleared, defense bonus added. Narration written to chronicle. Map updates.

The whole cycle from miracle cast to civ reaction: roughly 16 to 20 seconds, depending on LLM latency.

**The key principle:** the AI doesn't react to the god directly. It reacts to the *state of the world*. The god changes the state. The AI reads the new state and responds as a real ruler would. That's what makes it feel intelligent rather than scripted.

### Sources of randomness within rules

Three sources keep replay value high:

1. **LLM temperature 0.8.** Same input never produces identical output. Aelthar might react to a curse with rage, with religious dread, or with paranoid suspicion. All in character.
2. **Random civ tick order.** When two civs want the same neutral tile, the order resolves it.
3. **Random god directives.** Each session draws a different mix from the pool of 8.

---

## 5. The rulebook (four sections, four owners)

The rulebook is the most important non-code asset. Lives in a shared Notion or Markdown doc.

### Section A: Civ action menu (game design)

Owner: builder (Shreyam). See action table in §3. Locked Friday night, tuned Saturday during playtesting.

### Section B: Miracle effects (player power design)

Owner: builder. See miracle table in §3. Same timeline as Section A.

### Section C: Civ personas (writing)

Owner: prompt + game design lead. Spend disproportionate time here.

For each of the four civs, write:
- Persona paragraph (~200 words, in the civ's voice)
- 3 to 5 example narrations the LLM should produce
- The voice (short and hard? flowing and poetic? measured and academic?)
- Speech tics (how does the civ name things, phrase decisions)

These get fed to the LLM as few-shot exemplars. Quality of these directly determines whether the game feels alive or random.

### Section D: Event-to-reaction mapping (prompt engineering)

Owner: builder. The procedure that builds the LLM prompt every tick.

Pseudo-code:
```
recent_events = miracles_cast.filter(target = me, last 3 ticks)
neighbors = civs.adjacent(me)
context = {
  my_traits, my_persona, my_recent_actions,
  recent_events_affecting_me,
  neighbor_states, current_relationships
}
prompt = build_civ_prompt(context)
response = llm.complete(prompt, temperature=0.8)
```

The prompt explicitly tells the LLM: *"In the last 3 ticks, X happened to you. React appropriately."* The LLM does the translation from "plague hit" to "react like a king whose people are dying." We don't script that translation.

### When to lock the rulebook

- **Friday night before doors:** Draft v0 of all four sections.
- **Saturday hours 4–10:** Refine Section C as we see what the LLM does. Add few-shot exemplars where it misbehaves.
- **Saturday hours 16–22:** Tune A and B during playtesting. Faith costs, action prerequisites, trait thresholds.
- **Saturday hour 22:** Rulebook frozen. No changes after this.

---

## 6. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind + shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| Fonts | Cinzel (serif display) + Inter (sans) |
| Backend | SpacetimeDB v2 (TypeScript server modules) |
| Deployment (frontend) | Vercel |
| Deployment (backend) | SpacetimeDB Maincloud |
| LLM | Claude Haiku (fast and cheap, ~1000 calls per session) |
| LLM SDK | Anthropic TypeScript SDK |
| Map asset | v0-generated SVG, hand-named regions |
| Dev tools | Cursor + Claude Code + v0 |

### Why TypeScript modules (not Rust or C#)

SpacetimeDB v2 supports TypeScript server modules natively. Full-stack TypeScript means one language across client and server. Lower context-switching cost, faster iteration, every team member can read and modify both sides.

### Why Claude Haiku

Fast (~500ms to 1.5s per call), cheap, good enough for short structured outputs. Civ decisions and chronicle narrations don't need GPT-5-level reasoning. Budget for the weekend: $30 to $50.

### Why Vercel + Maincloud

Both deploy in 90 seconds with public URLs. Both are first-party recommended paths. "Hosted and working" prize requirement is satisfied trivially.

### Official resources to use

- **Skill files for Claude Code:** `npx skills add clockworklabs/spacetimedb`. Installs 16 official skill files so Claude Code knows SpacetimeDB v2 cold.
- **Template repo:** `clockworklabs/spacetimedb-template-nextjs-ts`. Starting point for the build. Saves ~3 hours of scaffolding.
- **Reference template:** `chat-react-ts`. Working chat app showing subscriptions + reducers end to end.
- **Docs:** https://spacetimedb.com/docs
- **Discord:** https://discord.gg/SpacetimeDB (for help during the hackathon)

---

## 7. Architecture

### Tables

| Table | Purpose |
|---|---|
| `territories` | id, name, owner_civ_id, terrain_type, has_capital, current_event |
| `civilizations` | id, name, color, population, faith, tech, aggression, mercantile, piety, scholarly, stability, leader_persona, current_thought |
| `gods` | id, identity (SpacetimeDB Identity), name, color, faith_balance, secret_directive |
| `miracles_cast` | id, god_id, miracle_type, target_id, timestamp, narration |
| `civ_actions` | id, civ_id, action_type, target, timestamp, narration |
| `chronicle_entries` | id, timestamp, type, civ_color, god_color, text, related_territory_id |
| `alliances` | civ_a_id, civ_b_id, status (alliance / war / neutral) |
| `world_meta` | current_year, era, session_id, tick_count |

### Reducers (atomic state mutations)

| Reducer | What it does |
|---|---|
| `join_world(god_name)` | Creates god, assigns secret directive, gives starting faith |
| `cast_miracle(type, target_id)` | Checks faith balance, deducts cost, applies effect, triggers narration procedure |
| `civ_take_action(civ_id, action, target)` | Applies civ's chosen action to world state |
| `regen_faith()` | Scheduled. Ticks every god's faith up by 5 every 10 seconds |
| `world_tick()` | Scheduled. Heartbeat. Advances year, triggers civ decisions |
| `chronicle_pruner()` | Scheduled. Archives entries older than current era |

### Scheduled reducers (the autonomous heartbeat)

| Schedule | Reducer |
|---|---|
| Every 15 seconds | `world_tick()` |
| Every 10 seconds | `regen_faith()` |
| Every 5 minutes | `chronicle_pruner()` |

Critical: these tick whether or not anyone is connected. The world keeps running.

### Procedures (LLM bridge, HTTP-capable)

| Procedure | Purpose |
|---|---|
| `civ_decide(civ_id)` | Build context, call LLM, parse decision, call `civ_take_action` |
| `narrate_miracle(miracle_id)` | Call LLM for one-sentence chronicle text |
| `react_to_intervention(civ_id, miracle_id)` | Update civ's `current_thought` field after a miracle hits |

### Subscriptions per surface

| Client | Subscribes to |
|---|---|
| Big screen (laptop) | `territories`, `civilizations`, `gods`, `chronicle_entries`, `miracles_cast` |
| Phone (god panel) | Same + filtered own `god` row for faith + directive |
| Civ inspector panel | One `civilization` row + its recent `chronicle_entries` |

### Identity

SpacetimeDB issues every connected client a stable Identity automatically. No login required. The god joining the world gets an Identity that persists across sessions. That's how the chronicle remembers your god name when you return tomorrow.

### Why this is the deepest possible SpacetimeDB use

Every primitive is used visibly:
- Tables hold the entire world state
- Reducers handle atomic mutations (preventing race conditions when two gods target the same civ same tick)
- Scheduled reducers run the simulation autonomously
- Procedures bridge LLM calls into the database
- Subscriptions stream live state to every connected client
- Identity makes the god name persistent

When a judge asks "where's SpacetimeDB in this," we point at the screen and say: everything moving is a subscription, everything atomic is a reducer, the world keeps ticking when we close the laptop because the database is running the simulation.

---

## 8. UI / UX

### Two-screen design

This is the most important UX decision. Two distinct interfaces:

- **Big screen (laptop):** the world. Full map, chronicle, pantheon bar. Theater view.
- **Phone (each player):** the god panel. Identity, faith counter, miracle buttons. Controller.

This creates a sports-game feel. Laptop is broadcast. Phones are controllers. Judges play on their own devices while watching the shared screen.

### Six surfaces

#### 1. The map (hero)

18 to 20 named territories as SVG paths. Each filled with civ color (light shade), outlined with darker shade. Unclaimed regions in neutral gray. Capital territories marked with a small dark dot. Active events overlay (gold pulse for blessing, red stain for plague, comet trail for strikes). Tap a region to open civ inspector.

#### 2. The chronicle

Bottom panel, scrolling upward as new entries arrive. 3 to 4 entries visible at a time. Each styled like an illuminated manuscript:
- Year timestamp on the left ("Y 47")
- 2px colored bar matching the civ or god responsible
- Italic serif text for narrated events

Big events (extinction, schism, dark age) get a full-width banner that scrolls past before settling.

#### 3. The pantheon bar

Top strip showing all gods currently in the world. Each god is a small colored circle with their chosen name. When a god casts a miracle, their icon pulses. Their color flashes on the affected tile.

#### 4. The god panel (phone-first)

Mobile layout:
- Identity card (god name, color, faith counter, regen bar)
- 4 to 7 miracle buttons in a 2-column grid
- Each button shows: icon, name, faith cost
- Tap a miracle, enter targeting mode, tap a target on the mini-map
- Status panel below shows current targeting state

#### 5. The civ inspector

Slide-in side panel, triggered by tapping a civ tile or pennant. Shows:
- Civ name + leader portrait + flag color
- Personality tags (chips: "Warlike", "Pious", "Schismatic")
- Stats as 5 thin bars (no numbers unless tap-and-hold)
- Recent 3 actions in plain text
- **Current thought** in italics: the LLM-generated reasoning behind the last action

The current thought is what makes the civ feel alive. Players read these and start to care about specific civs.

#### 6. Onboarding (3 screens, 15 seconds)

- **Splash:** "PANTHEON. You are a god. The world is alive. Do not be merciful."
- **Name input:** "Your divine name." Helper text below: "Whispered examples: Iron Eye, the Tide, Bringer of Locusts"
- **Directive reveal:** Secret directive in large serif text. Italic warning below: "Do not share this with other gods."

### Visual style: illuminated manuscript

This is the single most important style decision. The aesthetic does three things:

1. Reads as intentional rather than rushed. Flat-illustration parchment looks finished even when assets are sparse.
2. Hides graphical limitations. Stylized icons on a faded map don't need beautiful 3D sprites.
3. Fits the theme. Gods writing in the world's chronicle. Civs as illustrations. Miracles as illuminations.

Palette: deep sepia / parchment background, ink-black lines, civ colors as bold accents (crimson, indigo, purple, teal). Cinzel for divine elements (god names, era titles, chronicle entries). Inter for UI chrome.

Animations are ink-bleed style. Color spreads across tiles when a civ expands. Dark stains spread for plagues. Gold glow blooms for blessings. No bouncy Unity-style effects.

### Animation priorities (effort to impact)

1. **Chronicle entry slide-in.** Single biggest "polished feel" cue. 2 hours of work.
2. **One signature miracle animation.** Pick the comet strike, animate it beautifully (particles, screen shake, banner). The judges will see it twice. 3 hours.
3. **Pantheon bar pulse.** Other gods' icons flashing when they act. The multiplayer feel. 2 hours.
4. **Civ inspector current-thought typography.** Sells AI agency. 1 hour.
5. **Onboarding pacing.** Three crisp screens, no friction. 2 hours.

These five get disproportionate effort. Everything else can be functional-but-plain.

---

## 9. Build plan (hour by hour)

### Friday before doors (8 PM to 11 PM, before hackathon clock starts)

Pre-hackathon prep. Boring but critical. See §11 for the full checklist.

### Hour 0 to 4 (Friday 8 PM to midnight)

**Goal: the world ticks, the map renders, the SpacetimeDB pipe works end to end.**

- Pull `nextjs-ts` template, configure for our project
- Define schema in TypeScript (all tables in §7)
- Write placeholder `world_tick` reducer: pick random civ, random action, random target
- Schedule it every 15 seconds
- Frontend lead pulls SVG map into Next.js, wires SpacetimeDB subscriptions so territory colors update
- Deploy empty version to Vercel + SpacetimeDB Maincloud

By midnight: territories change colors randomly. No AI, no UX polish. The pipe is live.

### Hour 4 to 10 (midnight Saturday to 6 AM)

**Goal: civs make in-character decisions, chronicle reads like real history.**

- Replace random tick logic with LLM calls via procedures
- Write `civ_decide` procedure: gather context, call Claude Haiku, parse JSON response
- Write `narrate_miracle` procedure (we'll use it later but build the LLM bridge now)
- Prompt person hand-writes Section C of rulebook: 4 civ personas with 3-5 few-shot exemplars each
- Test: do the civs feel different? Adjust prompts until yes.

By 6 AM: kingdoms feel alive. Chronicle entries are in-character. Still no human players yet.

### Hour 10 to 16 (6 AM to noon Saturday)

**Goal: gods can join, see effects, the game is playable end to end.**

- Build `join_world` reducer: create god, assign directive, give starting faith
- Build `cast_miracle` reducer: check balance, deduct, apply effect, trigger narration
- Build phone UI: identity card, faith counter, miracle buttons
- Wire each button to call the right reducer
- Build pantheon bar on big screen so all gods show up
- Test multiplayer: 4 phones connecting, casting miracles, seeing effects

By noon: rough but playable end to end.

### Hour 16 to 22 (noon to 6 PM Saturday)

**Goal: it's a game, not a sim. There's tension, win conditions, dramatic arcs.**

- Implement secret directive system
- Implement win condition check at era end
- Display leaderboard / results screen
- Calibrate economy: faith regen rate, miracle costs, ticks per era
- Pre-seed brewing tensions in starting state (two civs at war when session starts)
- Playtest as a team, adjust until 5-minute sessions feel dramatic

By 6 PM: the team plays it and has fun.

### Hour 22 to 28 (6 PM to midnight Saturday)

**Goal: feels like a product, not a hackathon project.**

- All animations: chronicle slide-in, civ expansion ink-bleed, signature miracle cinematic
- Onboarding screens with correct pacing
- Polish the civ inspector typography
- Audio? Skip unless someone has cycles. Sound is high-leverage but high-risk for time.
- Test with strangers if any are around (mentors, other teams)

By midnight: demoable to strangers.

### Hour 28 to 34 (midnight Sunday to 6 AM)

**Goal: submission complete.**

- Shoot demo video. 4 takes of a real 5-minute session, all team members playing as gods.
- Edit to 90 seconds in CapCut with voiceover walking through gameplay.
- Title card open, GitHub link close.
- Write GitHub README. Title, pitch, screenshot, "How SpacetimeDB powers Pantheon" section, setup instructions, team credits. Treat this as a graded asset.
- Fill out DevSpot submission form. Summary, links, documentation.

By 6 AM Sunday: submission complete. Five hours of buffer.

### Hour 34 to 39 (6 AM to 11 AM Sunday)

**Goal: nothing breaks at submission.**

- Bug fixes
- Three full demo dry-runs (one team member plays the role of cold judge)
- Charge phones, print backup QR codes on paper, bring backup laptop
- 11 AM: submit

11:00 AM to 12:30 PM: breakfast, decompress, prepare to present.

12:30 PM: winner ceremony.

---

## 10. Team role split (4 people, linear workflow)

The "linear workflow" means one builder writes most code with Claude Code. Others layer in parallel work that doesn't block the builder.

### Shreyam — builder

- SpacetimeDB schema, reducers, procedures, scheduled reducers
- LLM integration (Claude Haiku via procedures)
- Client-side SpacetimeDB SDK integration
- Deployment pipeline (Vercel + Maincloud)
- Section A, B, D of the rulebook
- Final demo execution

### Frontend lead

- Map SVG integration and territory click handling
- Civ inspector slide-in panel
- Pantheon bar
- Phone UI (god panel, miracle buttons, mini-map)
- All Framer Motion animations
- Onboarding flow polish
- Mobile responsiveness

### Prompt + game design lead

- Section C of the rulebook (civ personas)
- Few-shot exemplars for LLM
- Secret directive content
- Pre-seeded scenario setup
- Calibration during playtesting (faith costs, action thresholds)
- Spot-check narration quality throughout

### Pitch + video lead

- Demo script (written out word-for-word)
- Run-of-show for judging visits
- Demo video shoot and edit (CapCut)
- GitHub README (treated as a graded asset)
- DevSpot submission form
- Booth setup (printed QR codes, signage, sticker swag if time)

---

## 11. Pre-hackathon prep checklist (Friday 8 PM to 11 PM)

Before doors open. The plumbing all teams should have done but won't.

### Each laptop

- [ ] Install SpacetimeDB CLI (`spacetime --version` returns ≥ 1.4.0)
- [ ] Run `npx skills add clockworklabs/spacetimedb` to install official Claude Code skills
- [ ] Clone the `clockworklabs/spacetimedb-template-nextjs-ts` template into a folder named `pantheon`
- [ ] Test: `spacetime publish` works against the template, React app connects locally
- [ ] Vercel CLI installed, GitHub linked
- [ ] Anthropic API key in `.env`, $50 credit confirmed on the account
- [ ] Cursor + Claude Code configured

### Shared assets

- [ ] Map SVG generated in v0 — fantasy continent with 18 named regions, each as a clickable path with unique fill colors
- [ ] Notion or Markdown doc for rulebook (link shared)
- [ ] GitHub repo created, all teammates added
- [ ] Vercel project created and linked to repo
- [ ] SpacetimeDB Maincloud project created
- [ ] First deploy succeeded: empty Next.js + empty SpacetimeDB module, both live, both connected via public URL

### Logistics

- [ ] All phones charged
- [ ] Long USB cables packed (the venue may not have outlets close)
- [ ] Backup laptop available
- [ ] QR codes pre-printed on paper (in case wifi dies during demo)
- [ ] Stickers / business cards if you want booth swag

### Mental prep

- [ ] Everyone reads this doc end to end
- [ ] Read through `chat-react-ts` template once so the subscription/reducer patterns are familiar
- [ ] Watch one SpacetimeDB tutorial video so the v2 API feels familiar

---

## 12. Demo strategy

### The pitch (10 seconds)

> Risk meets Civilization, except the players are AI agents and you're a god watching from above. The civilizations on this map make their own decisions. You drop miracles to shape what happens. We've been running this same world for 12 hours. Scan the QR, you're in.

### The user journey at the booth

#### Approach

Judge sees a screen with a colored map, scrolling chronicle, four god icons pulsing in a corner. Something is moving. The motion is the hook.

#### Scan and onboard (15 seconds)

Splash screen. Name input. Secret directive reveal. Tap to enter.

#### First look (30 seconds)

Phone shows god panel. Big screen shows their name appearing in the pantheon. They see Aelthar mid-war with Brindlefolk. Chronicle reads in-character text.

#### First miracle (45 seconds)

They tap Curse. Aim at Aelthar's capital. Big screen flashes red. Chronicle reads new entry attributing the curse to their god name. 15 seconds later, Aelthar's LLM responds in-character: abandons the war, mourns the dead. They changed history.

#### Multiplayer discovery (90 seconds)

Another god joins (another judge). They notice the other god is helping a civ they want to weaken. Without speaking, they're in a shadow war.

#### Escalation (2 minutes)

Faith spends faster. Whisper used. Civs schism. A civ goes extinct. The world tilts.

#### Resolution (60 seconds)

Era end. Secret directives reveal. Confetti for the winner. Final chronicle entry: "This world has been recorded. Era 3 begins now."

#### The closer

> The world doesn't reset between sessions. We've been running this same simulation since Friday. Your god name is in the chronicle now, permanently. Tomorrow if you scan that QR again, your god is still here. SpacetimeDB makes that work. The simulation runs inside the database itself, even when nobody's connected.

### The pitch for the SpacetimeDB integration question

When a judge asks "where's SpacetimeDB in this:"

> Pantheon is built on SpacetimeDB. The map you see is a table. The four AI civilizations live inside the database. They tick autonomously every 15 seconds via scheduled reducers, calling LLMs from procedures to decide their next move. When you cast a miracle, it's an atomic reducer that writes to shared state every screen in this room is subscribed to. We close our laptop, the world keeps going. We open it tomorrow, our god is still in the chronicle. None of this is possible without SpacetimeDB, and we'd argue this is the deepest possible use of what it's built for.

---

## 13. Risks and mitigations

### LLM latency could kill the demo

**Risk:** Civ decisions take 2 to 4 seconds. Pacing breaks if demos feel sluggish.

**Mitigations:**
- Claude Haiku (fastest tier)
- Stream where possible
- Pre-generate fallback narration templates for instant chronicle entries
- Schedule civ decisions slightly ahead of visual tick so they arrive on time

### Persona prompts feeling random instead of characterful

**Risk:** LLM generates generic medieval-fantasy slop. Civs feel interchangeable.

**Mitigations:**
- Hand-write 5 to 7 few-shot exemplars per civ. This is the highest-leverage prompt work.
- Test each civ in isolation before integrating
- Lock the persona doc by Saturday hour 10

### First 30 seconds bores new judges

**Risk:** A judge joins, world is mid-cycle, nothing dramatic happens immediately, they leave.

**Mitigations:**
- Pre-seed brewing tensions (two civs at war when session starts)
- Speed up ticks during demo (8 seconds instead of 15)
- One pre-scripted dramatic event 30 seconds after each new session start

### Win conditions feel arbitrary

**Risk:** Directives don't resolve in ways that feel earned.

**Mitigations:**
- Pre-test that all 8 directives are achievable in 5 minutes
- Calibrate during Saturday playtesting
- If a directive feels broken, cut it

### Map readability with multiple overlays

**Risk:** Civ colors + capital markers + active events + god intervention flashes = visual noise.

**Mitigations:**
- Only one overlay per tile at a time
- Effects fade in 2 seconds
- Test readability with a stranger Saturday afternoon

### LLM cost overrun

**Risk:** 1000 LLM calls per session × multiple test runs over 30 hours could exceed budget.

**Mitigations:**
- Set spending cap at $75 to be safe
- Use Haiku exclusively
- Cache narrations for repeated event types
- Monitor spend daily

### Deployment failing at the last minute

**Risk:** Vercel or Maincloud breaks Sunday morning, demo can't run.

**Mitigations:**
- Deploy continuously throughout the weekend, not just at the end
- Have a local build as backup
- Test on the venue wifi by Saturday afternoon

---

## 14. Submission checklist (Sunday 11 AM deadline)

- [ ] **Summary** filled in on DevSpot
- [ ] **Video** uploaded (90 seconds, voiceover, GitHub link in end card)
- [ ] **GitHub** link added to submission, repo is public
- [ ] **GitHub README** complete with:
  - [ ] Project name + one-paragraph pitch
  - [ ] Screenshot
  - [ ] "How SpacetimeDB powers Pantheon" section
  - [ ] Setup / run instructions
  - [ ] Team credits
- [ ] **Live demo URL** working (Vercel)
- [ ] **Documentation** linked (could be the README or a separate doc)
- [ ] All four team members listed
- [ ] Submission marked "best student team" eligible

---

## 15. The sound bites

Useful one-liners for pitching, the video, the README, social posts.

- *"Risk meets Civilization, except the players are AI agents and you're a god watching from above."*
- *"The simulation runs inside the database itself, even when nobody's connected."*
- *"We close our laptop, the world keeps going."*
- *"Every screen moving is a SpacetimeDB subscription. Every atomic action is a reducer. Every AI decision is a procedure call to an LLM."*
- *"This is the deepest possible use of what SpacetimeDB is built for."*
- *"Your god name is permanently in the chronicle. Come back tomorrow, you're still there."*

---

## 16. Appendix: ideas considered and rejected

For context, in case anyone asks why we picked this direction.

### Ideas considered

1. **AI Casino** (multiple mini-games on shared backend): too much scope spread across too many surfaces. Completeness score would suffer.
2. **Prompt Battle Arena** (Jackbox-style party game): solid but crowded space. At least 3 other teams will build something similar.
3. **AI LinkedIn** (multiplayer engagement-economy satire): great pitch but feed-shape, passive scrolling, comedy is fragile in 30 hours.
4. **AI Werewolf / Mafia** (social deduction with AI players): good fit but balance is hard. AI players need to be beatable but not stupid.
5. **AI Stock Exchange / News Market**: NY Tech Week-coded but math-heavy. More backend complexity than we want.
6. **AI Reality TV House** (Big Brother in a database): highest "what is this" reaction but hard to give players real agency.
7. **AI Edit Wars (Wikipedia-style)**: highest pure originality but hard to demo in 60 seconds.
8. **AI Heist** (asymmetric roles + AI teammates): too complex for 30 hours.

### Why Pantheon won

- Best alignment with SpacetimeDB's actual strengths (persistent multi-agent state)
- Hits all four bonus criteria natively
- Two-screen design (laptop theater + phone controllers) is a unique demo experience
- Persistence is the strongest "no one else has this" feature
- Risk-style map is universally legible in 5 seconds
- LLM agents as the population (not a feature) is genuinely novel
- Scales from 2 players to 8 without changing the design

### Why not Unreal Engine

Briefly: SpacetimeDB supports Unreal 5.6, but Unreal is wrong for Pantheon. Phones are the controllers, and deploying an Unreal mobile build to multiple phones in 30 hours is fantasy. The game is 2D so Unreal's strengths (3D, physics, particles) are wasted. Build times kill iteration. The Unreal SDK is pinned to SpacetimeDB v1.12, not the v2 we're using. No team Unreal experience. "Hosted and working" favors web deployment. The decisive constraint is the phone-controller model. That alone makes web the only realistic choice.

### Why Risk-style map (not hex)

Faster to author. Reads instantly. Each territory gets a name (hex tiles stay anonymous). Visual density without complexity. Geography actually matters (chokepoints, peninsulas) rather than being abstracted.

---

## 17. Final reminder

The game lives or dies on three things:
1. **Persona quality.** If the civs feel alive, everything else works. If they feel random, nothing else matters.
2. **The first 30 seconds.** Judges decide if your project is good in the first minute. Pre-seeded tensions and a fast onboarding are non-negotiable.
3. **The persistence demo moment.** When we tell a judge the world will still be running tomorrow, that has to be true. Don't accidentally restart the world during demo prep.

Build for those three. Everything else is supporting.

Good luck. Build something worth winning.

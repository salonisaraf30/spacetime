# Pantheon — Rulebook

Shared design doc for the Prompt & Game Design Lead. Fill in each section before or during Phase 2. Builder needs Sections A, B, and C before Step 2.3.

---

## Section A — Civ Actions

> Define every action a civilization can take each tick: what it does mechanically, what triggers it, and any constraints.

| Action | Mechanic | Trigger Conditions | Notes |
|--------|----------|-------------------|-------|
| expand | | | |
| build | | | |
| declare_war | | | |
| form_alliance | | | |
| develop_tech | | | |
| send_envoy | | | |
| convert | | | |

---

## Section B — Miracles

> Define every miracle a god can cast: cost, effect, valid targets, and any timing rules.

| Miracle | Faith Cost | Effect | Valid Target | Notes |
|---------|-----------|--------|-------------|-------|
| bless | 10 | | | |
| curse | 20 | | | |
| portent | 15 | | | |
| whisper | 40 | | | |
| inspire | 10 | | | |
| strike | 50 | | | |
| reveal | 5 | | | |

---

## Section C — Civ Personas

> One persona block per civilization (~150–200 words each). Written in the civ's own voice. Handed to Builder as strings for the `leader_persona` field.

### Aelthar (Crimson — Aggression 9)

<!-- Write the persona here -->

---

### Brindlefolk (Indigo — Piety 9)

<!-- Write the persona here -->

---

### Sapient (Purple — Scholarly 9)

<!-- Write the persona here -->

---

### Merchant Princes (Teal — Mercantile 9)

<!-- Write the persona here -->

---

## Section D — Event-to-Reaction Mapping

> For each world event, describe how each civ type should react in the next tick's LLM decision. Used to tune the prompts in Step 2.3 and calibrate realism in Step 2.6.

| Event | Warlike Civ Reaction | Pious Civ Reaction | Scholarly Civ Reaction | Mercantile Civ Reaction |
|-------|---------------------|-------------------|----------------------|------------------------|
| plague on own territory | | | | |
| blessing on own territory | | | | |
| comet strike on own territory | | | | |
| neighbor declares war | | | | |
| neighbor forms alliance | | | | |
| god casts portent | | | | |
| era end approaching | | | | |

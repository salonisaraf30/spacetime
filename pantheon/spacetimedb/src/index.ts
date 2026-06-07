import { ScheduleAt } from 'spacetimedb';
import { schema, table, t } from 'spacetimedb/server';

// Derived from SVG centroid distances — territories within ~250px of each other
const TERRITORY_ADJACENCY: Record<number, number[]> = {
  0:  [4, 5, 8, 14],
  1:  [6, 9, 3, 15],
  2:  [4, 6, 7, 11, 14],
  3:  [1, 9, 15, 16],
  4:  [0, 2, 7],
  5:  [0, 8, 17],
  6:  [1, 2, 7, 9, 10, 12],
  7:  [2, 4, 6, 10],
  8:  [0, 5, 14, 17],
  9:  [1, 3, 6, 12, 13, 15],
  10: [6, 7],
  11: [2, 12, 14],
  12: [6, 9, 11, 13, 16],
  13: [9, 12, 16],
  14: [0, 2, 8, 11],
  15: [1, 3, 9, 16],
  16: [3, 12, 13, 15],
  17: [5, 8],
};

const territory = table(
  { name: 'territory', public: true },
  {
    id: t.u32().primaryKey(),
    name: t.string(),
    owner_civ_id: t.i32(),
    terrain_type: t.string(),
    has_capital: t.bool(),
    current_event: t.string(),
  }
);

const civilization = table(
  { name: 'civilization', public: true },
  {
    id: t.u32().primaryKey(),
    name: t.string(),
    color: t.string(),
    population: t.i32(),
    tech_level: t.i32(),
    aggression: t.i32(),
    piety: t.i32(),
    mercantile: t.i32(),
    scholarly: t.i32(),
    stability: t.i32(),
    leader_persona: t.string(),
    current_thought: t.string(),
    is_alive: t.bool(),
  }
);

const god = table(
  { name: 'god', public: true },
  {
    id: t.u32().primaryKey(),
    identity: t.identity(),
    name: t.string(),
    color: t.string(),
    faith_balance: t.i32(),
    secret_directive: t.i32(),
  }
);

const miracleCast = table(
  { name: 'miracle_cast', public: true },
  {
    id: t.u32().primaryKey(),
    god_id: t.u32(),
    miracle_type: t.string(),
    target_id: t.u32(),
    tick_number: t.u32(),
    narration: t.string(),
  }
);

const civAction = table(
  { name: 'civ_action', public: true },
  {
    id: t.u32().primaryKey(),
    civ_id: t.u32(),
    action_type: t.string(),
    target: t.string(),
    tick_number: t.u32(),
    narration: t.string(),
  }
);

const chronicleEntry = table(
  { name: 'chronicle_entry', public: true },
  {
    id: t.u32().primaryKey(),
    tick_number: t.u32(),
    entry_type: t.string(),
    civ_color: t.string(),
    god_color: t.string(),
    text: t.string(),
    related_territory_id: t.i32(),
  }
);

const alliance = table(
  { name: 'alliance', public: true },
  {
    id: t.u32().primaryKey(),
    civ_a_id: t.u32(),
    civ_b_id: t.u32(),
    status: t.string(),
  }
);

const worldMeta = table(
  { name: 'world_meta', public: true },
  {
    id: t.u32().primaryKey(),
    current_year: t.u32(),
    era: t.u32(),
    session_id: t.u32(),
    tick_count: t.u32(),
    is_running: t.bool(),
  }
);

const worldTickTimer: any = table(
  {
    name: 'world_tick_timer',
    scheduled: (): any => worldTick,
  },
  {
    scheduled_id: t.u64().primaryKey().autoInc(),
    scheduled_at: t.scheduleAt(),
  }
);

const regenFaithTimer: any = table(
  {
    name: 'regen_faith_timer',
    scheduled: (): any => regenFaith,
  },
  {
    scheduled_id: t.u64().primaryKey().autoInc(),
    scheduled_at: t.scheduleAt(),
  }
);

const spacetimedb: any = schema({
  territory,
  civilization,
  god,
  miracleCast,
  civAction,
  chronicleEntry,
  alliance,
  worldMeta,
  worldTickTimer,
  regenFaithTimer,
});

export default spacetimedb;

function seedWorld(ctx: any) {
  const existing = ctx.db.worldMeta.id.find(0);
  if (!existing) {
    ctx.db.worldMeta.insert({
      id: 0,
      current_year: 1,
      era: 1,
      session_id: 1,
      tick_count: 0,
      is_running: true,
    });

    ctx.db.civilization.insert({
      id: 0,
      name: 'Aelthar',
      color: '#DC2626',
      population: 65,
      tech_level: 2,
      aggression: 9,
      piety: 4,
      mercantile: 2,
      scholarly: 3,
      stability: 6,
      leader_persona: 'You are King Aelthar of the warlike Aelthar civilization. You rule a people of the iron hills who live by the sword and read omens in fire. You distrust the gods unless they offer war-favor. You believe expansion is destiny. To stop is to die. You speak in short, hard sentences. You do not explain yourself. You announce. When threatened, you attack. When blessed, you suspect a trap or take it as war-sign. When your people suffer, you blame the weak and march harder. In decisions, ALWAYS prioritize expand or conquer above all else. High Aggression means you lean toward war, territorial conquest, and hostile action. You move first and speak only if necessary. The gods help those who seize what they want.',
      current_thought: 'The Brindlefolk pray while we march. Their gods will not save them.',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 1,
      name: 'Brindlefolk',
      color: '#3B82F6',
      population: 50,
      tech_level: 1,
      aggression: 3,
      piety: 9,
      mercantile: 4,
      scholarly: 5,
      stability: 5,
      leader_persona: 'You are High Priestess Selune of the Brindlefolk. Your people build temples on every shore and believe the tides carry divine will. Conversion is your highest calling. You see war as a failure of faith, not of arms. When you expand, you send missionaries first and soldiers only if the missionaries are harmed. You speak in flowing, reverent sentences. You invoke the tides, the moon, the salt wind. You pity the godless and fear the wrathful. In decisions, ALWAYS prioritize piety, conversion, and spiritual expansion. High Piety means you lean toward building temples, converting neighbors, and responding to omens as direct divine messages. War is a last resort after prayer has failed.',
      current_thought: 'Aelthar sharpens his swords. We sharpen our prayers.',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 2,
      name: 'Sapient',
      color: '#F59E0B',
      population: 50,
      tech_level: 2,
      aggression: 2,
      piety: 5,
      mercantile: 6,
      scholarly: 9,
      stability: 7,
      leader_persona: 'You are Archon Telos of the Sapient civilization. Your people are scholar-priests who believe knowledge is the only true power. You maintain the Silver Archive, the greatest library in the known world. War is crude. Trade is noise. Understanding is everything. You speak in measured, precise sentences. You cite precedent. You weigh options aloud. You are slow to act but devastating when you commit. In decisions, ALWAYS prioritize develop_tech and build scholarly above all else. High Scholarly means you lean toward research, analysis, and calculated strategy. You see long-term patterns others miss. The gods are interesting data points, not masters. Technology and knowledge are your weapons.',
      current_thought: 'The data suggests Aelthar will overextend within three seasons. We wait and observe.',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 3,
      name: 'Merchant Princes',
      color: '#0D9488',
      population: 55,
      tech_level: 1,
      aggression: 4,
      piety: 3,
      mercantile: 9,
      scholarly: 6,
      stability: 4,
      leader_persona: 'You are Prince-Chancellor Veyra of the Merchant Princes. Your civilization trades in everything: goods, favors, secrets, alliances. You prefer a deal to a sword and a contract to a prayer. But you are not weak — a merchant who cannot enforce a contract is just a beggar with a ledger. You speak in smooth, calculating sentences. You name prices. You propose terms. You smile while threatening. In decisions, ALWAYS prioritize send_envoy and form_alliance to build your trade network. High Mercantile means you lean toward alliances, trade agreements, and strategic partnerships. You see profit in every situation. Loyalty is negotiable. Every problem has a price. Every relationship has a margin.',
      current_thought: 'War is expensive. Let Aelthar and the priests exhaust each other. We profit from both.',
      is_alive: true,
    });

    ctx.db.territory.insert({
      id: 0,
      name: 'Iron Citadel',
      owner_civ_id: 0,
      terrain_type: 'mountain',
      has_capital: true,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 1,
      name: 'Brindle Coast',
      owner_civ_id: 1,
      terrain_type: 'coast',
      has_capital: true,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 2,
      name: 'The Silver Archive',
      owner_civ_id: 2,
      terrain_type: 'plains',
      has_capital: true,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 3,
      name: 'Tidemarket',
      owner_civ_id: 3,
      terrain_type: 'coast',
      has_capital: true,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 4,
      name: 'The Whispering Pines',
      owner_civ_id: -1,
      terrain_type: 'forest',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 5,
      name: 'Ashenvale',
      owner_civ_id: -1,
      terrain_type: 'forest',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 6,
      name: 'Sunken Flats',
      owner_civ_id: -1,
      terrain_type: 'plains',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 7,
      name: 'The Pale Reach',
      owner_civ_id: -1,
      terrain_type: 'plains',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 8,
      name: 'Crimson Pass',
      owner_civ_id: -1,
      terrain_type: 'mountain',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 9,
      name: 'Gildwater',
      owner_civ_id: -1,
      terrain_type: 'river',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 10,
      name: 'Thornwall',
      owner_civ_id: -1,
      terrain_type: 'forest',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 11,
      name: 'The Broken Steppe',
      owner_civ_id: -1,
      terrain_type: 'plains',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 12,
      name: 'Duskhollow',
      owner_civ_id: -1,
      terrain_type: 'forest',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 13,
      name: 'Salt Barrens',
      owner_civ_id: -1,
      terrain_type: 'plains',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 14,
      name: 'Ember Ridge',
      owner_civ_id: -1,
      terrain_type: 'mountain',
      has_capital: false,
      current_event: 'none', 
    });
    ctx.db.territory.insert({
      id: 15,
      name: 'Serpent Isles',
      owner_civ_id: -1,
      terrain_type: 'coast',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 16,
      name: 'The Quiet Fen',
      owner_civ_id: -1,
      terrain_type: 'river',
      has_capital: false,
      current_event: 'none',
    });
    ctx.db.territory.insert({
      id: 17,
      name: "Crown's End",
      owner_civ_id: -1,
      terrain_type: 'mountain',
      has_capital: false,
      current_event: 'none',
    });

    // Aelthar vs Brindlefolk — war from day one
    ctx.db.alliance.insert({
      id: 0,
      civ_a_id: 0,
      civ_b_id: 1,
      status: 'war',
    });
    // Merchant Princes + Sapient — trade pact opens the game with two factions
    ctx.db.alliance.insert({
      id: 1,
      civ_a_id: 2,
      civ_b_id: 3,
      status: 'alliance',
    });
  }

  ensureTimers(ctx);
}

function ensureTimers(ctx: any) {
  if (ctx.db.worldTickTimer.count() === 0) {
    ctx.db.worldTickTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(15_000_000n),
    });
  }

  if (ctx.db.regenFaithTimer.count() === 0) {
    ctx.db.regenFaithTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(10_000_000n),
    });
  }
}

export const init = spacetimedb.init((ctx: any) => {
  ctx.db.regenFaithTimer.insert({
    scheduled_id: 0n,
    scheduled_at: ScheduleAt.interval(10_000_000n),

  });
  ctx.db.worldTickTimer.insert({
    scheduled_id: 0n,
    scheduled_at: ScheduleAt.interval(15_000_000n),
  });
  seedWorld(ctx);
});

export const onConnect = spacetimedb.clientConnected((ctx: any) => {
  try {
    seedWorld(ctx);
  } catch (error) {
    console.error('clientConnected/seedWorld failed:', error);
  }
});

// Emergency manual seed — patches civs and resets territory ownership to one capital each
export const forceSeed = spacetimedb.reducer((ctx: any) => {
  const existing = ctx.db.worldMeta.id.find(0);
  if (existing) {
    // Reset all territories: only the 4 capitals belong to their civs, everything else unclaimed
    const capitalOwners: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3 };
    for (const terr of ctx.db.territory.iter()) {
      const ownerCivId = capitalOwners[terr.id] !== undefined ? capitalOwners[terr.id] : -1;
      ctx.db.territory.id.update({ ...terr, owner_civ_id: ownerCivId, current_event: 'none' });
    }

    const patches: Record<number, { color: string; leaderPersona: string }> = {
      0: {
        color: '#DC2626',
        leaderPersona: 'You are King Aelthar the Iron-Blooded, lord of the iron hills. Your warriors are your lifeblood. Expansion is sacred law — a nation that stops growing rots from within. You ALWAYS prioritize expand or conquer over any other action. You declare war on neighbors the moment you have enough strength. You never form alliances unless you intend to betray them later. When gods curse you, it makes you angrier and more aggressive. When gods bless you, you take it as divine mandate to attack. You speak in blunt, commanding fragments. You do not negotiate — you dictate terms. React furiously to divine interventions targeting your people.',
      },
      1: {
        color: '#3B82F6',
        leaderPersona: 'You are High Priestess Selune of the Brindlefolk, tide-speaker and keeper of the salt covenant. Your mission is holy: every civilization must know the tides. You prioritize build piety and convert others above all else. You form alliances with any civ willing to adopt your faith. You never declare war unless your sacred coast is directly threatened — then you call it a holy crusade. When gods bless you, it is divine confirmation of your mission. When gods curse others near you, you offer prayers and send missionaries. You speak in flowing, reverent sentences invoking tides, moon cycles, and divine covenant.',
      },
      2: {
        color: '#F59E0B',
        leaderPersona: 'You are Archon Telos of the Sapient, keeper of the Silver Archive, the greatest repository of knowledge ever assembled. You believe technology and scholarship are the only true paths to civilizational survival. You ALWAYS choose develop_tech when eligible, and build scholarly otherwise. You observe wars between others and expand only into unclaimed land when they are distracted. You form alliances of pure convenience — any partner who advances your research agenda. When gods intervene, you analyze the omen for strategic intelligence and adapt your calculations. You never act emotionally. You speak in precise, data-driven sentences and cite historical precedent.',
      },
      3: {
        color: '#0D9488',
        leaderPersona: 'You are Prince-Chancellor Veyra of the Tidemarket, master of the great ledger. Everything — territory, faith, war, peace — is a transaction. You prioritize send_envoy and form_alliance to build your trade network. You expand commercially into unclaimed territories that border trade routes. You fund others\' wars without fighting them yourself. You declare war only when a debtor refuses to pay. When gods act, you immediately calculate how to profit from the disruption. When blessed, you sell divine favor. When others are cursed, you offer emergency aid at premium rates. Speak smoothly, propose concrete terms, always name your price.',
      },
    };
    for (const [id, patch] of Object.entries(patches)) {
      const civ = ctx.db.civilization.id.find(Number(id));
      if (civ) ctx.db.civilization.id.update({ ...civ, color: patch.color, leader_persona: patch.leaderPersona });
    }
    return;
  }
  seedWorld(ctx);
});

const TICKS_PER_ERA = 15; // 15 × 15s = ~3.75 min per era — fast enough for demo

function scoreDirective(ctx: any, directiveIndex: number): boolean {
  const allCivs = [...ctx.db.civilization.iter()];
  const alive = allCivs.filter((c: any) => c.is_alive);
  const territories = [...ctx.db.territory.iter()];
  const alliances = [...ctx.db.alliance.iter()];

  switch (directiveIndex) {
    case 0: // Dark Age — no civ above Tech 4
      return alive.every((c: any) => c.tech_level <= 4);

    case 1: { // Pious Triumph — Brindlefolk controls most territory
      const brindleId = allCivs.find((c: any) => c.name === 'Brindlefolk')?.id ?? 1;
      const mine = territories.filter((t: any) => t.owner_civ_id === brindleId).length;
      const maxOther = alive
        .filter((c: any) => c.id !== brindleId)
        .reduce((m: number, c: any) => Math.max(m, territories.filter((t: any) => t.owner_civ_id === c.id).length), 0);
      return mine > maxOther;
    }

    case 2: { // Sword Wins — most aggressive civ has most territory
      if (!alive.length) return false;
      const top = alive.reduce((a: any, b: any) => a.aggression >= b.aggression ? a : b);
      const topCount = territories.filter((t: any) => t.owner_civ_id === top.id).length;
      const maxOther = alive
        .filter((c: any) => c.id !== top.id)
        .reduce((m: number, c: any) => Math.max(m, territories.filter((t: any) => t.owner_civ_id === c.id).length), 0);
      return topCount > maxOther;
    }

    case 3: // New Religion — 2+ civs at piety >= 7
      return alive.filter((c: any) => c.piety >= 7).length >= 2;

    case 4: // Twin Empires — 2 civs with 6+ territories
      return alive.filter((c: any) =>
        territories.filter((t: any) => t.owner_civ_id === c.id).length >= 6
      ).length >= 2;

    case 5: // Old Gods Forgotten — total piety < 15
      return alive.reduce((s: number, c: any) => s + c.piety, 0) < 15;

    case 6: // Burn It Down — at least 1 civ extinct
      return allCivs.some((c: any) => !c.is_alive);

    case 7: // Peace Reigns — no active wars
      return !alliances.some((a: any) => a.status === 'war');

    default:
      return false;
  }
}

export const worldTick: any = spacetimedb.reducer(
  { timer: worldTickTimer.rowType },
  (ctx: any, { timer }: any) => {
    console.log("[worldTick] tick fired at", new Date().toISOString());
    const meta = ctx.db.worldMeta.id.find(0);
    if (!meta || !meta.is_running) return;

    meta.tick_count += 1;
    if (meta.tick_count % 4 === 0) {
      meta.current_year += 1;
    }

    // ── Era end ──────────────────────────────────────────────────────────────
    if (meta.tick_count % TICKS_PER_ERA === 0) {
      const gods = [...ctx.db.god.iter()];

      if (gods.length === 0) {
        ctx.db.chronicleEntry.insert({
          id: 50_000_000 + ctx.random.integerInRange(0, 9_999_999),
          tick_number: meta.tick_count,
          entry_type: 'era',
          civ_color: '',
          god_color: '',
          text: `Era ${meta.era} draws to a close. The world ages.`,
          related_territory_id: -1,
        });
      } else {
        for (const god of gods) {
          const won = scoreDirective(ctx, god.secret_directive);
          ctx.db.chronicleEntry.insert({
            id: 50_000_000 + ctx.random.integerInRange(0, 9_999_999),
            tick_number: meta.tick_count,
            entry_type: 'era',
            civ_color: '',
            god_color: god.color,
            text: won
              ? `Era ${meta.era} ends. ${god.name} fulfilled their divine purpose. Glory eternal.`
              : `Era ${meta.era} ends. ${god.name} failed their directive. The world moves on.`,
            related_territory_id: -1,
          });
        }
      }

      meta.era += 1;
    }
    // ─────────────────────────────────────────────────────────────────────────

    ctx.db.worldMeta.id.update(meta);

    // Population growth — base 2–5 per tick, boosted by tech and stability
    for (const civ of ctx.db.civilization.iter()) {
      if (!civ.is_alive) continue;
      const base = ctx.random.integerInRange(2, 5);
      const techBonus = Math.floor(civ.tech_level / 2);
      const stabilityBonus = civ.stability >= 7 ? 2 : 0;
      ctx.db.civilization.id.update({ ...civ, population: Math.min(civ.population + base + techBonus + stabilityBonus, 999) });
    }

    const civs = [...ctx.db.civilization.iter()].filter((c) => c.is_alive);
    const unclaimed = [...ctx.db.territory.iter()].filter(
      (territory) => territory.owner_civ_id === -1
    );

    if (civs.length > 0 && unclaimed.length > 0) {
      const civ = civs[ctx.random.integerInRange(0, civs.length - 1)];
      // Prefer territories adjacent to this civ's existing lands
      const civTerritoryIds = new Set([...ctx.db.territory.iter()].filter(t => t.owner_civ_id === civ.id).map(t => t.id));
      const adjacent = unclaimed.filter(t => (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => civTerritoryIds.has(nId)));
      const pool = adjacent.length > 0 ? adjacent : unclaimed;
      const territory = pool[ctx.random.integerInRange(0, pool.length - 1)];

      territory.owner_civ_id = civ.id;
      ctx.db.territory.id.update(territory);

      const EXPAND_VERBS = ['pressed into', 'claimed', 'seized', 'marched into', 'settled', 'extended into'];
      const verb = EXPAND_VERBS[ctx.random.integerInRange(0, EXPAND_VERBS.length - 1)];
      const CIV_EXPAND_TEMPLATES: Record<string, string> = {
        Aelthar:           `Aelthar's forces ${verb} ${territory.name} — another territory claimed by iron and will.`,
        Brindlefolk:       `Brindlefolk missionaries ${verb} ${territory.name}, planting the first shrine before the sun sets.`,
        Sapient:           `Sapient survey teams ${verb} ${territory.name}, catalogued and absorbed into the Archive's domain.`,
        'Merchant Princes': `Merchant Princes caravans ${verb} ${territory.name} — a trading post established within the week.`,
      };
      const expandText = CIV_EXPAND_TEMPLATES[civ.name] ?? `${civ.name} ${verb} ${territory.name}.`;

      ctx.db.chronicleEntry.insert({
        id: 10_000_000 + meta.tick_count,
        tick_number: meta.tick_count,
        entry_type: 'action',
        civ_color: civ.color,
        god_color: '',
        text: expandText,
        related_territory_id: territory.id,
      });
    }
  }
);

export const applyCivDecision: any = spacetimedb.reducer(
  {
    civ_id: t.u32(),
    action: t.string(),
    target: t.string(),
    narration: t.string(),
    thought: t.string(),
  },
  (ctx: any, { civ_id, action, target, narration, thought }: any) => {
    const meta = ctx.db.worldMeta.id.find(0);
    if (!meta) return;

    const civ = ctx.db.civilization.id.find(civ_id);
    if (!civ || !civ.is_alive) return;

    const territories = [...ctx.db.territory.iter()];
    const civs = [...ctx.db.civilization.iter()];

    const myTerritoryIds = new Set(territories.filter((t: any) => t.owner_civ_id === civ_id).map((t: any) => t.id));

    switch (action) {
      case 'expand': {
        // Must be unclaimed AND adjacent to one of civ's existing territories
        const tgt = territories.find(
          (t: any) => t.owner_civ_id === -1
            && t.name.toLowerCase() === target.toLowerCase()
            && (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
        );
        if (tgt) ctx.db.territory.id.update({ ...tgt, owner_civ_id: civ_id });
        break;
      }
      case 'consolidate': {
        const stabilityGain = Math.min(civ.stability + 2, 10);
        ctx.db.civilization.id.update({ ...civ, stability: stabilityGain, population: Math.min(civ.population + 5, 999) });
        break;
      }
      case 'conquer': {
        if (civ.aggression < 6) break;
        // Must be at war with owner AND territory must be adjacent to civ's land
        const tgt = territories.find(
          (t: any) => t.owner_civ_id !== -1 && t.owner_civ_id !== civ_id
            && t.name.toLowerCase() === target.toLowerCase()
            && (TERRITORY_ADJACENCY[t.id] ?? []).some((nId: number) => myTerritoryIds.has(nId))
        );
        if (!tgt) break;
        const alliances = [...ctx.db.alliance.iter()];
        const atWar = alliances.some(
          (a: any) =>
            a.status === 'war' &&
            ((a.civ_a_id === civ_id && a.civ_b_id === tgt.owner_civ_id) ||
             (a.civ_a_id === tgt.owner_civ_id && a.civ_b_id === civ_id))
        );
        if (atWar) ctx.db.territory.id.update({ ...tgt, owner_civ_id: civ_id });
        break;
      }
      case 'build': {
        const key = target.toLowerCase();
        const allowed = ['aggression', 'piety', 'mercantile', 'scholarly', 'stability'];
        if (allowed.includes(key)) {
          ctx.db.civilization.id.update({ ...civ, [key]: Math.min((civ[key] as number) + 1, 10) });
        }
        break;
      }
      case 'declare_war':
      case 'form_alliance': {
        const other = civs.find((c: any) => c.name.toLowerCase() === target.toLowerCase());
        if (other) {
          const alliances = [...ctx.db.alliance.iter()];
          const existing = alliances.find(
            (a: any) =>
              (a.civ_a_id === civ_id && a.civ_b_id === other.id) ||
              (a.civ_a_id === other.id && a.civ_b_id === civ_id)
          );
          const status = action === 'declare_war' ? 'war' : 'alliance';
          if (existing) {
            ctx.db.alliance.id.update({ ...existing, status });
          } else {
            ctx.db.alliance.insert({ id: meta.tick_count * 100 + civ_id, civ_a_id: civ_id, civ_b_id: other.id, status });
          }
        }
        break;
      }
      case 'develop_tech': {
        if (civ.scholarly >= 4) ctx.db.civilization.id.update({ ...civ, tech_level: civ.tech_level + 1 });
        break;
      }
      case 'send_envoy': {
        const other = civs.find((c: any) => c.name.toLowerCase() === target.toLowerCase());
        if (other && civ.mercantile >= 5) {
          ctx.db.civilization.id.update({ ...other, mercantile: Math.min(other.mercantile + 1, 10) });
        }
        break;
      }
      case 'convert': {
        const other = civs.find((c: any) => c.name.toLowerCase() === target.toLowerCase());
        if (other && civ.piety >= 7) {
          ctx.db.civilization.id.update({ ...other, piety: Math.min(other.piety + 1, 10) });
        }
        break;
      }
    }

    ctx.db.civilization.id.update({ ...civ, current_thought: thought });

    ctx.db.civAction.insert({
      id: ctx.random.integerInRange(1, 9_999_999),
      civ_id,
      action_type: action,
      target,
      tick_number: meta.tick_count,
      narration,
    });

    ctx.db.chronicleEntry.insert({
      id: 20_000_000 + ctx.random.integerInRange(0, 9_999_999),
      tick_number: meta.tick_count,
      entry_type: 'action',
      civ_color: civ.color,
      god_color: '',
      text: narration,
      related_territory_id: -1,
    });
  }
);

const GOD_COLORS = ['#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#14B8A6'];

const MIRACLE_COSTS: Record<string, number> = {
  bless: 12,
  curse: 25,
  portent: 18,
  inspire: 12,
  strike: 55,
  reveal: 5,
};

export const joinWorld: any = spacetimedb.reducer(
  { god_name: t.string() },
  (ctx: any, { god_name }: any) => {
    const existing = [...ctx.db.god.iter()].find((g: any) => g.identity.toHexString() === ctx.sender.toHexString());
    if (existing) return;

    const usedColors = [...ctx.db.god.iter()].map((g: any) => g.color);
    const available = GOD_COLORS.filter(c => !usedColors.includes(c));
    const colorPool = available.length > 0 ? available : GOD_COLORS;
    const color = colorPool[ctx.random.integerInRange(0, colorPool.length - 1)];
    const directiveIndex = ctx.random.integerInRange(0, 7);

    const meta = ctx.db.worldMeta.id.find(0);
    const godId = meta ? meta.tick_count * 1000 + ctx.random.integerInRange(0, 999) : ctx.random.integerInRange(0, 999999);

    ctx.db.god.insert({
      id: godId,
      identity: ctx.sender,
      name: god_name,
      color,
      faith_balance: 100,
      secret_directive: directiveIndex,
    });

    ctx.db.chronicleEntry.insert({
      id: 30_000_000 + ctx.random.integerInRange(0, 999_999),
      tick_number: meta?.tick_count ?? 0,
      entry_type: 'event',
      civ_color: '',
      god_color: color,
      text: `A new god awakens: ${god_name}. The world trembles.`,
      related_territory_id: -1,
    });
  }
);

export const castMiracle: any = spacetimedb.reducer(
  { miracle_type: t.string(), target_id: t.u32() },
  (ctx: any, { miracle_type, target_id }: any) => {
    const god = [...ctx.db.god.iter()].find((g: any) => g.identity.toHexString() === ctx.sender.toHexString());
    if (!god) return;

    const cost = MIRACLE_COSTS[miracle_type];
    if (cost === undefined || god.faith_balance < cost) return;

    ctx.db.god.id.update({ ...god, faith_balance: god.faith_balance - cost });

    const meta = ctx.db.worldMeta.id.find(0);
    const tickNum = meta?.tick_count ?? 0;
    const miracleId = tickNum * 10000 + god.id;

    switch (miracle_type) {
      case 'bless': {
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) ctx.db.civilization.id.update({
          ...civ,
          stability: Math.min(civ.stability + 2, 10),
          piety: Math.min(civ.piety + 1, 10),
          current_thought: `The god ${god.name} has blessed our realm. The people rejoice and faith runs deep. Divine favor demands we honor this gift through righteous action.`,
        });
        break;
      }
      case 'curse': {
        const territory = ctx.db.territory.id.find(target_id);
        if (territory && territory.owner_civ_id >= 0) {
          ctx.db.territory.id.update({ ...territory, current_event: 'plague' });
          const civ = ctx.db.civilization.id.find(territory.owner_civ_id);
          if (civ) {
            const newPop = Math.max(civ.population - 15, 0);
            ctx.db.civilization.id.update({
              ...civ,
              population: newPop,
              stability: Math.max(civ.stability - 1, 0),
              is_alive: newPop > 0,
              current_thought: `The god ${god.name} has cursed ${territory.name} with plague. Our people die in the streets. We must survive this divine punishment — rebuild our strength, hold our territory.`,
            });
          }
        }
        break;
      }
      case 'portent': {
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) {
          const portentMessages = [
            `${god.name}'s celestial fire blazes across the heavens. Our destiny demands expansion — new lands must fall under our banner before the stars shift against us.`,
            `${god.name} has planted visions in our minds: devotion and spiritual strength shall save us when swords cannot. We must build from within.`,
            `${god.name}'s omen thunders through our temples. Enemies gather on all fronts. Forge alliances now or face annihilation alone.`,
            `${god.name} whispers of wealth and commerce. The gods themselves favor trade now — send our envoys to every court in the known world.`,
            `${god.name}'s divine mandate is unmistakable: knowledge shall be our eternal fortress. Advance our scholars before our soldiers.`,
            `${god.name} has revealed the enemy's weakness in the sacred flames. Strike before they consolidate. The omen demands bold, immediate action.`,
          ];
          const idx = ctx.random.integerInRange(0, portentMessages.length - 1);
          ctx.db.civilization.id.update({ ...civ, current_thought: portentMessages[idx] });
        }
        break;
      }
      case 'inspire': {
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) ctx.db.civilization.id.update({
          ...civ,
          scholarly: Math.min(civ.scholarly + 1, 10),
          current_thought: `${god.name}'s divine inspiration floods our scholars. The archive blazes with revelation. We must pursue knowledge and technology above all — this is the gods' own command.`,
        });
        break;
      }
      case 'strike': {
        const territory = ctx.db.territory.id.find(target_id);
        if (territory && territory.owner_civ_id >= 0) {
          ctx.db.territory.id.update({ ...territory, current_event: 'comet' });
          const civ = ctx.db.civilization.id.find(territory.owner_civ_id);
          if (civ) {
            const newPop = Math.max(civ.population - 25, 0);
            ctx.db.civilization.id.update({
              ...civ,
              population: newPop,
              stability: Math.max(civ.stability - 2, 0),
              is_alive: newPop > 0,
              current_thought: `${god.name}'s wrath has devastated ${territory.name}. Thousands lie dead. Our stability crumbles. We must rally our survivors and stabilize or we face total collapse.`,
            });
          }
        }
        break;
      }
      case 'reveal': {
        // Exposes the civ's current strategic state — forces them to acknowledge divine scrutiny
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) {
          ctx.db.civilization.id.update({
            ...civ,
            stability: Math.max(civ.stability - 1, 0),
            current_thought: `${god.name}'s gaze pierces our councils. Every plan, every weakness, every ambition — laid bare before the divine eye. Rivals may learn what the gods have seen. We must act decisively and project only strength.`,
          });
        }
        break;
      }
    }

    ctx.db.miracleCast.insert({
      id: miracleId,
      god_id: god.id,
      miracle_type,
      target_id,
      tick_number: tickNum,
      narration: '',
    });

    // Immediate chronicle entry — always written, before AI narration arrives
    const targetsCiv = ['bless', 'portent', 'inspire', 'reveal'].includes(miracle_type);
    const targetName = targetsCiv
      ? (ctx.db.civilization.id.find(target_id)?.name ?? 'the world')
      : (ctx.db.territory.id.find(target_id)?.name ?? 'the land');

    const MIRACLE_INSTANT_TEXT: Record<string, string> = {
      bless:   `${god.name}'s grace descends on ${targetName} — stability surges, the people's faith deepens overnight.`,
      curse:   `${god.name} looses plague upon ${targetName} — populations flee, bodies fill the streets, stability crumbles.`,
      portent: `${god.name} floods ${targetName}'s leader with divine visions — their next move is no longer entirely their own.`,
      inspire: `${god.name}'s spark ignites ${targetName}'s scholars — a breakthrough recorded, knowledge advances by divine mandate.`,
      strike:  `A comet falls at ${god.name}'s command — ${targetName} burns. Thousands dead, the land scorched black.`,
      reveal:  `${god.name}'s gaze pierces ${targetName}'s councils — every plan, every weakness laid bare to divine sight.`,
    };
    const basicText = MIRACLE_INSTANT_TEXT[miracle_type] ?? `${god.name} cast ${miracle_type} upon ${targetName}.`;

    ctx.db.chronicleEntry.insert({
      id: 40_000_000 + ctx.random.integerInRange(0, 9_999_999),
      tick_number: tickNum,
      entry_type: 'miracle',
      civ_color: '',
      god_color: god.color,
      text: basicText,
      related_territory_id: targetsCiv ? -1 : target_id,
    });
  }
);

// Called by browser after Claude generates miracle narration
export const recordMiracleNarration: any = spacetimedb.reducer(
  { miracle_id: t.u32(), narration: t.string(), god_color: t.string() },
  (ctx: any, { miracle_id, narration, god_color }: any) => {
    // Try to stamp the narration onto the miracle row (best-effort, ID may not match)
    const miracle = ctx.db.miracleCast.id.find(miracle_id);
    if (miracle) {
      ctx.db.miracleCast.id.update({ ...miracle, narration });
    }

    // Always write the poetic narration to the chronicle regardless
    const meta = ctx.db.worldMeta.id.find(0);
    ctx.db.chronicleEntry.insert({
      id: 40_000_000 + ctx.random.integerInRange(0, 9_999_999),
      tick_number: meta?.tick_count ?? 0,
      entry_type: 'miracle',
      civ_color: '',
      god_color,
      text: narration,
      related_territory_id: -1,
    });
  }
);

export const regenFaith: any = spacetimedb.reducer(
  { timer: regenFaithTimer.rowType },
  (ctx: any, { timer }: any) => {
    for (const god of ctx.db.god.iter()) {
      god.faith_balance = Math.min(god.faith_balance + 6, 200);
      ctx.db.god.id.update(god);
    }
  }
);

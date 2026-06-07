import { ScheduleAt } from 'spacetimedb';
import { schema, table, t } from 'spacetimedb/server';

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
      leader_persona: 'You are King Aelthar of the iron hills. Your people live by the sword and read omens in fire. You believe expansion is destiny — to stop is to die. You speak in short, hard sentences. You announce; you do not explain. When threatened, you attack. When blessed, you suspect a trap.',
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
      leader_persona: 'You are High Priestess Selune of the Brindlefolk. Your people build temples on every shore and believe the tides carry divine will. Conversion is your highest calling. You see war as a failure of faith. You speak in flowing, reverent sentences, invoking the tides, the moon, the salt wind.',
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
      leader_persona: 'You are Archon Telos of the Sapient. Your people are scholar-priests who believe knowledge is the only true power. You maintain the Silver Archive, the greatest library in the known world. War is crude. Trade is noise. Understanding is everything. You speak in measured, precise sentences and cite precedent.',
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
      leader_persona: 'You are Prince-Chancellor Veyra of the Merchant Princes. Your civilization trades in everything: goods, favors, secrets, alliances. You prefer a deal to a sword and a contract to a prayer. You are not weak — a merchant who cannot enforce a contract is just a beggar with a ledger. You speak smoothly, name prices, propose terms.',
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
      owner_civ_id: 0, // Aelthar — aggressive start, already holds mountain pass
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
      owner_civ_id: 0, // Aelthar — already expanding, feels like a threat
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
      current_event: 'comet', // visual drama — a comet already struck before the world began
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

// Emergency manual seed — also patches civ colors on existing world
export const forceSeed = spacetimedb.reducer((ctx: any) => {
  const existing = ctx.db.worldMeta.id.find(0);
  if (existing) {
    const colorPatch: Record<number, string> = { 0: '#DC2626', 1: '#3B82F6', 2: '#F59E0B', 3: '#0D9488' };
    for (const [id, color] of Object.entries(colorPatch)) {
      const civ = ctx.db.civilization.id.find(Number(id));
      if (civ) ctx.db.civilization.id.update({ ...civ, color });
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

    const civs = [...ctx.db.civilization.iter()].filter((c) => c.is_alive);
    const unclaimed = [...ctx.db.territory.iter()].filter(
      (territory) => territory.owner_civ_id === -1
    );

    if (civs.length > 0 && unclaimed.length > 0) {
      const civ = civs[ctx.random.integerInRange(0, civs.length - 1)];
      const territory =
        unclaimed[ctx.random.integerInRange(0, unclaimed.length - 1)];

      territory.owner_civ_id = civ.id;
      ctx.db.territory.id.update(territory);

      ctx.db.chronicleEntry.insert({
        id: 10_000_000 + meta.tick_count,
        tick_number: meta.tick_count,
        entry_type: 'action',
        civ_color: civ.color,
        god_color: '',
        text: `${civ.name} expanded into ${territory.name}.`,
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

    switch (action) {
      case 'expand': {
        const tgt = territories.find(
          (t: any) => t.owner_civ_id === -1 && t.name.toLowerCase() === target.toLowerCase()
        );
        if (tgt) ctx.db.territory.id.update({ ...tgt, owner_civ_id: civ_id });
        break;
      }
      case 'conquer': {
        if (civ.aggression < 6) break;
        // Must be at war with the territory's owner
        const tgt = territories.find(
          (t: any) => t.owner_civ_id !== -1 && t.owner_civ_id !== civ_id && t.name.toLowerCase() === target.toLowerCase()
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
        if (civ) ctx.db.civilization.id.update({ ...civ, stability: Math.min(civ.stability + 2, 10) });
        break;
      }
      case 'curse': {
        const territory = ctx.db.territory.id.find(target_id);
        if (territory && territory.owner_civ_id >= 0) {
          ctx.db.territory.id.update({ ...territory, current_event: 'plague' });
          const civ = ctx.db.civilization.id.find(territory.owner_civ_id);
          if (civ) {
            const newPop = Math.max(civ.population - 15, 0);
            ctx.db.civilization.id.update({ ...civ, population: newPop, is_alive: newPop > 0 });
          }
        }
        break;
      }
      case 'portent': {
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) ctx.db.civilization.id.update({ ...civ, current_thought: 'A divine omen fills the sky. Something is about to change.' });
        break;
      }
      case 'inspire': {
        const civ = ctx.db.civilization.id.find(target_id);
        if (civ) ctx.db.civilization.id.update({ ...civ, scholarly: Math.min(civ.scholarly + 1, 10) });
        break;
      }
      case 'strike': {
        const territory = ctx.db.territory.id.find(target_id);
        if (territory && territory.owner_civ_id >= 0) {
          ctx.db.territory.id.update({ ...territory, current_event: 'comet' });
          const civ = ctx.db.civilization.id.find(territory.owner_civ_id);
          if (civ) {
            const newPop = Math.max(civ.population - 25, 0);
            ctx.db.civilization.id.update({ ...civ, population: newPop, stability: Math.max(civ.stability - 2, 0), is_alive: newPop > 0 });
          }
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
    const basicText = `${god.name} cast ${miracle_type} upon ${targetName}.`;

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

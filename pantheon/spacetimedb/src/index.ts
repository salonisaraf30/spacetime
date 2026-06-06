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
      population: 50,
      tech_level: 1,
      aggression: 9,
      piety: 4,
      mercantile: 2,
      scholarly: 3,
      stability: 6,
      leader_persona: 'Warlike iron kings...',
      current_thought: '',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 1,
      name: 'Brindlefolk',
      color: '#4F46E5',
      population: 50,
      tech_level: 1,
      aggression: 3,
      piety: 9,
      mercantile: 4,
      scholarly: 5,
      stability: 5,
      leader_persona: 'Pious coastal people...',
      current_thought: '',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 2,
      name: 'Sapient',
      color: '#7C3AED',
      population: 50,
      tech_level: 1,
      aggression: 2,
      piety: 5,
      mercantile: 6,
      scholarly: 9,
      stability: 7,
      leader_persona: 'Scholar-priests...',
      current_thought: '',
      is_alive: true,
    });
    ctx.db.civilization.insert({
      id: 3,
      name: 'Merchant Princes',
      color: '#0D9488',
      population: 50,
      tech_level: 1,
      aggression: 4,
      piety: 3,
      mercantile: 9,
      scholarly: 6,
      stability: 4,
      leader_persona: 'Wealthy trading dynasty...',
      current_thought: '',
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

    ctx.db.alliance.insert({
      id: 0,
      civ_a_id: 0,
      civ_b_id: 1,
      status: 'war',
    });
  }

  ensureTimers(ctx);
}

function ensureTimers(ctx: any) {
  if ([...ctx.db.worldTickTimer.iter()].length === 0) {
    ctx.db.worldTickTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(15_000_000n),
    });
  }

  if ([...ctx.db.regenFaithTimer.iter()].length === 0) {
    ctx.db.regenFaithTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(10_000_000n),
    });
  }
}

export const init = spacetimedb.init((ctx: any) => {
  seedWorld(ctx);
});

export const onConnect = spacetimedb.clientConnected((ctx: any) => {
  seedWorld(ctx);
});

export const worldTick: any = spacetimedb.reducer(
  { timer: worldTickTimer.rowType },
  (ctx: any, { timer }: any) => {
    const meta = ctx.db.worldMeta.id.find(0);
    if (!meta || !meta.is_running) return;

    meta.tick_count += 1;
    if (meta.tick_count % 4 === 0) {
      meta.current_year += 1;
    }
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
        id: meta.tick_count,
        tick_number: meta.tick_count,
        entry_type: 'action',
        civ_color: civ.color,
        god_color: '',
        text: `${civ.name} expanded into ${territory.name}.`,
        related_territory_id: territory.id,
      });
    }

    ctx.db.worldTickTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(15_000_000n),
    });
  }
);

export const regenFaith: any = spacetimedb.reducer(
  { timer: regenFaithTimer.rowType },
  (ctx: any, { timer }: any) => {
    for (const god of ctx.db.god.iter()) {
      god.faith_balance = Math.min(god.faith_balance + 5, 200);
      ctx.db.god.id.update(god);
    }

    ctx.db.regenFaithTimer.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(10_000_000n),
    });
  }
);

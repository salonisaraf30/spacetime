"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";
import { DIRECTIVES, DIRECTIVE_TITLES } from "../constants/directives";
import { motion, AnimatePresence } from "framer-motion";

const MIRACLES = [
  { type: "bless",   name: "Bless",   cost: 12, icon: "✦", desc: "+2 stability",       targetsCiv: true,  tier: "I",   rarity: "common" },
  { type: "inspire", name: "Inspire", cost: 12, icon: "☀", desc: "+1 scholarly",        targetsCiv: true,  tier: "I",   rarity: "common" },
  { type: "portent", name: "Portent", cost: 18, icon: "◎", desc: "Bias next decision",  targetsCiv: true,  tier: "II",  rarity: "rare"   },
  { type: "curse",   name: "Curse",   cost: 25, icon: "☠", desc: "-15 pop, plague",     targetsCiv: false, tier: "III", rarity: "rare"   },
  { type: "strike",  name: "Strike",  cost: 55, icon: "⚡", desc: "Devastate territory", targetsCiv: false, tier: "IV",  rarity: "epic"   },
  { type: "reveal",  name: "Reveal",  cost: 5,  icon: "◈", desc: "See hidden state",    targetsCiv: true,  tier: "I",   rarity: "common" },
];

const CARD_ROTATIONS = [-5, -3, -1, 1, 3, 5];

const RARITY_LINE: Record<string, string> = {
  common: "rgba(196,155,96,0.4)",
  rare:   "rgba(217,119,6,0.7)",
  epic:   "rgba(220,38,38,0.7)",
};

export default function GodPanel() {
  const { isActive: connected, getConnection, identity: myIdentity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);

  const [gods] = useTable(tables.god);
  const [civs] = useTable(tables.civilization);
  const [territories] = useTable(tables.territory);
  const [alliances] = useTable(tables.alliance);
  const [worldMeta] = useTable(tables.worldMeta);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe([
      "SELECT * FROM god",
      "SELECT * FROM civilization",
      "SELECT * FROM territory",
      "SELECT * FROM alliance",
      "SELECT * FROM world_meta",
    ]);
  }, [conn, connected]);

  const myGodFromDB = myIdentity
    ? gods.find(g => g.identity.toHexString() === myIdentity.toHexString())
    : undefined;

  const [localGod] = useState<{name:string;directiveIndex:number;color:string}|null>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('pantheon-god') || 'null'); } catch { return null; }
  });

  const godName = myGodFromDB?.name ?? localGod?.name ?? "";
  const godColor = myGodFromDB?.color ?? localGod?.color ?? "#F59E0B";
  const godDirective = myGodFromDB?.secretDirective ?? localGod?.directiveIndex ?? 0;
  const godFaith = myGodFromDB?.faithBalance ?? 80;
  const hasGod = !!myGodFromDB || !!localGod;

  const [selected, setSelected] = useState<typeof MIRACLES[number] | null>(null);
  const [targeting, setTargeting] = useState(false);
  const [casting, setCasting] = useState(false);
  const [lastCast, setLastCast] = useState("");
  const [showDirective, setShowDirective] = useState(false);
  const [eraNotice, setEraNotice] = useState<{ era: number; won: boolean } | null>(null);
  const prevEraRef = useRef<number | null>(null);
  const [divineFeedback, setDivineFeedback] = useState<{
    miracleType: string;
    targetName: string;
    mechBadges: string[];
    echoText: string | null;
    echoLoading: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isNew = new URLSearchParams(window.location.search).get("new");
      if (isNew) setShowDirective(true);
    }
  }, []);

  const world = worldMeta[0];

  useEffect(() => {
    if (!world || !myGodFromDB) return;
    if (prevEraRef.current !== null && world.era > prevEraRef.current) {
      const won = scoreDirective(myGodFromDB.secretDirective, civs, territories, alliances).passing;
      setEraNotice({ era: prevEraRef.current, won });
      const timer = setTimeout(() => setEraNotice(null), 15000);
      return () => clearTimeout(timer);
    }
    prevEraRef.current = world.era;
  }, [world?.era]);

  useEffect(() => {
    if (!connected || hasGod) return;
    const timer = setTimeout(() => { window.location.href = "/join"; }, 5000);
    return () => clearTimeout(timer);
  }, [connected, hasGod]);

  async function handleTarget(id: number, name: string) {
    if (!selected || !conn || casting) return;
    setCasting(true);
    try {
      conn.reducers.castMiracle({ miracleType: selected.type, targetId: id });

      // Resolve which civ owns the target (works for both civ-targeted and territory-targeted miracles)
      const targetCiv = selected.targetsCiv
        ? civs.find(c => c.id === id)
        : civs.find(c => c.id === territories.find(ter => ter.id === id)?.ownerCivId);
      const civName = targetCiv?.name;
      const terrName = !selected.targetsCiv ? territories.find(ter => ter.id === id)?.name : undefined;

      const MECH_EFFECTS: Record<string, string> = {
        bless:   "stability +2, piety +1",
        curse:   "plague: population -15, stability -1",
        portent: "divine vision reshapes leader's next decision",
        inspire: "scholarly +1",
        strike:  "comet: population -25, stability -2, territory scorched",
        reveal:  "civilization's plans exposed to divine sight",
      };

      // Narration fire-and-forget
      fetch("/api/narrate-miracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          godName,
          miracleType: selected.type,
          territoryName: terrName ?? name,
          civName,
          mechEffect: MECH_EFFECTS[selected.type] ?? selected.type,
          targetCivPop: targetCiv?.population,
          targetCivStability: targetCiv?.stability,
        }),
      }).then(r => r.json()).then(({ narration }) => {
        if (narration) {
          const miracleId = Date.now() % 1000000;
          conn.reducers.recordMiracleNarration({ miracleId, narration, godColor });
        }
      }).catch(() => {});

      // Immediate civ reaction — fire API call, write result back as a civ_action
      if (targetCiv) {
        fetch("/api/miracle-reaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            civ: targetCiv,
            territories,
            alliances,
            worldMeta: world,
            miracle: { type: selected.type, targetId: id },
            godName,
          }),
        }).then(r => r.json()).then((reaction) => {
          if (reaction?.action && conn) {
            conn.reducers.applyCivDecision({
              civId: reaction.civId,
              action: reaction.action,
              target: reaction.target ?? "none",
              narration: reaction.narration ?? "",
              thought: reaction.thought ?? "",
            });
          }
        }).catch(() => {});
      }

      setLastCast(`${selected.name} cast on ${name}`);
      setTimeout(() => setLastCast(""), 4000);

      // Immediate mechanic summary badges — computed client-side, no API needed
      const MECH_BADGES: Record<string, (tgt: string, civ?: any) => string[]> = {
        bless:   (t, c) => [`${t}: stability +2`, `piety +1`, `was ${c?.stability ?? "?"}→${Math.min((c?.stability ?? 0) + 2, 10)}`],
        curse:   (t, c) => [`${t}: pop -15`, `stability -1`, `plague lands`],
        portent: (t)    => [`${t}: next decision fated`, `divine vision planted`],
        inspire: (t, c) => [`${t}: scholarly +1`, `was ${c?.scholarly ?? "?"}→${Math.min((c?.scholarly ?? 0) + 1, 10)}`],
        strike:  (t)    => [`${t}: pop -25`, `stability -2`, `territory scorched`],
        reveal:  (t, c) => [`${t}: stability -1`, `plans exposed`, `divine scrutiny active`],
      };
      const mechBadges = (MECH_BADGES[selected.type] ?? ((t: string) => [`${t}: ${selected.type}`]))(name, targetCiv);

      // Show feedback immediately with badges, echo loading
      setDivineFeedback({ miracleType: selected.type, targetName: name, mechBadges, echoText: null, echoLoading: true });

      // Build world state summary for the AI
      const civWorld = civs.map(c => ({
        name: c.name,
        territories: territories.filter(t => t.ownerCivId === c.id).length,
        techLevel: c.techLevel,
        piety: c.piety,
        aggression: c.aggression,
        stability: c.stability,
        isAlive: c.isAlive,
      }));
      const { passing: dirPassing, detail: dirDetail } = scoreDirective(godDirective, civs, territories, alliances);

      // Fire divine-echo API — updates the feedback panel with strategic context
      fetch("/api/divine-echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directiveIndex: godDirective,
          miracleType: selected.type,
          targetName: name,
          mechEffect: MECH_EFFECTS[selected.type] ?? selected.type,
          civWorld,
          directivePassing: dirPassing,
          directiveDetail: dirDetail,
        }),
      }).then(r => r.json()).then(({ echo }) => {
        setDivineFeedback(prev => prev ? { ...prev, echoText: echo, echoLoading: false } : null);
      }).catch(() => {
        setDivineFeedback(prev => prev ? { ...prev, echoLoading: false } : null);
      });

      // Auto-dismiss feedback after 20 seconds
      setTimeout(() => setDivineFeedback(null), 20000);
    } catch {}
    setCasting(false);
    setSelected(null);
    setTargeting(false);
  }

  const faithPct = Math.min((godFaith / 200) * 100, 100);
  const directive = DIRECTIVES[godDirective] ?? "";

  const targetList = selected?.targetsCiv
    ? civs.filter(c => c.isAlive).map(c => ({ id: c.id, name: c.name, color: c.color }))
    : territories.map(ter => ({ id: ter.id, name: ter.name, color: "rgba(196,155,96,0.6)" }));

  if (!connected) {
    return <div style={{ ...styles.root, alignItems: "center", justifyContent: "center" }}><p className="gp-loading">Connecting to the Heavens…</p></div>;
  }

  if (!hasGod) {
    return (
      <div style={{ ...styles.root, alignItems: "center", justifyContent: "center" }}>
        <p className="gp-loading">{connected ? "Awakening your divine spark…" : "Connecting…"}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');

        .gp-root {
          position: fixed; inset: 0;
          background: #d4c4a0;
          font-family: 'EB Garamond', Georgia, serif;
          color: #3E2723;
          overflow: hidden;
          display: flex; flex-direction: column;
        }

        /* Textures */
        .gp-tex-noise {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
          background-image: url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
          background-size: 300px; z-index: 1;
        }
        .gp-stain-1 { position: absolute; width: 350px; height: 280px; top: -5%; left: -5%; border-radius: 50%; background: radial-gradient(ellipse, rgba(160,120,60,0.14) 0%, rgba(140,100,40,0.06) 50%, transparent 70%); pointer-events: none; z-index: 1; }
        .gp-stain-2 { position: absolute; width: 250px; height: 200px; bottom: 10%; right: -3%; border-radius: 50%; background: radial-gradient(ellipse, rgba(130,90,30,0.12) 0%, rgba(120,80,20,0.05) 45%, transparent 70%); pointer-events: none; z-index: 1; }
        .gp-edge-burn { position: absolute; inset: 0; pointer-events: none; z-index: 1; box-shadow: inset 0 0 60px rgba(100,60,15,0.3), inset 0 0 120px rgba(80,40,10,0.14); }
        .gp-border-outer { position: absolute; inset: 16px; border: 1.5px solid rgba(93,64,55,0.4); pointer-events: none; z-index: 2; }
        .gp-border-inner { position: absolute; inset: 20px; border: 0.5px solid rgba(93,64,55,0.18); pointer-events: none; z-index: 2; }

        /* Container */
        .gp-scroll {
          position: relative; z-index: 10;
          display: flex; flex-direction: column;
          height: 100%; max-width: 460px;
          margin: 0 auto; width: 100%;
          padding: 1.75rem 1.5rem;
          overflow-y: auto;
        }
        .gp-scroll::-webkit-scrollbar { width: 3px; }
        .gp-scroll::-webkit-scrollbar-thumb { background: rgba(93,64,55,0.3); border-radius: 2px; }

        /* Identity */
        .gp-identity { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
        .gp-orb { width: 2.8rem; height: 2.8rem; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(93,64,55,0.35); }
        .gp-god-name { font-family: 'Cinzel', serif; font-size: 1.6rem; font-weight: 700; color: #3E2723; line-height: 1; letter-spacing: 0.06em; }
        .gp-god-sub { font-family: 'EB Garamond', serif; font-size: 0.72rem; font-style: italic; color: #8B7355; letter-spacing: 0.2em; margin-top: 0.2rem; }

        /* Divider */
        .gp-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; }
        .gp-div-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, #8B7355aa, #8B7355, #8B7355aa, transparent); }
        .gp-div-sym { font-size: 12px; color: #8B7355; line-height: 1; }

        /* Faith */
        .gp-faith { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem; padding: 0.65rem 0.9rem; border: 1px solid rgba(93,64,55,0.3); background: rgba(255,248,230,0.35); }
        .gp-faith-label { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.22em; text-transform: uppercase; color: #8B7355; }
        .gp-faith-track { flex: 1; height: 3px; background: rgba(93,64,55,0.15); position: relative; overflow: hidden; }
        .gp-faith-num { font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; color: #3E2723; min-width: 2rem; text-align: right; }

        /* Cards */
        .gp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; padding-bottom: 1rem; }
        .gp-card {
          border: 1px solid rgba(93,64,55,0.45);
          background: rgba(255,248,230,0.5);
          padding: 0.85rem 0.65rem;
          text-align: center;
          cursor: pointer;
          display: flex; flex-direction: column; gap: 0.35rem;
          position: relative; transform-origin: bottom center;
          transition: box-shadow 0.2s, background 0.2s;
          box-shadow: 0 3px 8px rgba(62,39,35,0.15);
        }
        .gp-card:hover:not(:disabled) {
          background: rgba(255,248,230,0.75);
          box-shadow: 0 8px 20px rgba(62,39,35,0.25);
        }
        .gp-card:disabled { opacity: 0.35; cursor: not-allowed; }
        .gp-card-top { display: flex; justify-content: space-between; align-items: center; }
        .gp-card-icon { font-size: 1.5rem; display: block; text-align: center; color: #3E2723; }
        .gp-card-tier { font-family: 'Cinzel', serif; font-size: 0.48rem; color: #8B7355; letter-spacing: 0.1em; }
        .gp-card-name { font-family: 'Cinzel', serif; font-size: 0.75rem; color: #3E2723; letter-spacing: 0.06em; text-transform: uppercase; }
        .gp-card-desc { font-family: 'EB Garamond', serif; font-size: 0.75rem; color: #5D4037; font-style: italic; line-height: 1.3; }
        .gp-rarity-line { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.3rem; }
        .gp-rarity-cost { font-family: monospace; font-size: 0.42rem; letter-spacing: 0.08em; text-transform: uppercase; }

        /* Targeting */
        .gp-target-panel { display: flex; flex-direction: column; height: 100%; }
        .gp-target-prompt-wrap { text-align: center; margin-bottom: 1.25rem; }
        .gp-target-prompt { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #3E2723; margin: 0 0 0.2rem; }
        .gp-target-sub { font-family: 'EB Garamond', serif; font-size: 0.88rem; font-style: italic; color: #8B7355; margin: 0; }
        .gp-target-scroll { display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto; padding-bottom: 0.75rem; flex: 1; }
        .gp-target-btn {
          display: flex; align-items: center; gap: 0.85rem;
          background: rgba(255,248,230,0.45); border: 1px solid rgba(93,64,55,0.35);
          padding: 0.75rem 0.9rem; color: #3E2723;
          font-family: 'Cinzel', serif; font-size: 0.88rem; letter-spacing: 0.04em;
          cursor: pointer; text-align: left;
          transition: background 0.15s, border-color 0.15s;
        }
        .gp-target-btn:hover:not(:disabled) { background: rgba(255,248,230,0.75); border-color: rgba(93,64,55,0.6); }
        .gp-target-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gp-target-orb { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .gp-cancel-btn {
          font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: #8B7355;
          background: transparent; border: 1px solid rgba(93,64,55,0.35);
          padding: 0.65rem; margin-top: auto; cursor: pointer;
          transition: background 0.15s;
        }
        .gp-cancel-btn:hover { background: rgba(255,248,230,0.4); }

        /* Footer / Directive */
        .gp-footer { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }
        .gp-feedback { font-family: 'EB Garamond', serif; font-size: 0.9rem; color: #5D4037; text-align: center; font-style: italic; margin: 0; }

        /* Directive box */
        .gp-directive {
          padding: 0.9rem 1rem; border: 1px solid rgba(93,64,55,0.35);
          background: rgba(255,248,230,0.35); position: relative;
        }
        .gp-directive-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
        .gp-directive-label { font-family: 'Cinzel', serif; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.22em; color: #8B7355; margin: 0; }
        .gp-directive-text { font-family: 'EB Garamond', serif; font-size: 0.92rem; font-style: italic; line-height: 1.5; margin: 0 0 0.4rem; color: #3E2723; }
        .gp-directive-detail { font-family: 'EB Garamond', serif; font-size: 0.78rem; color: #8B7355; margin: 0; }
        .gp-status-badge {
          font-family: 'Cinzel', serif; font-size: 0.55rem; font-weight: bold;
          padding: 0.18rem 0.55rem; border: 1px solid; letter-spacing: 0.1em;
        }

        /* Divine Feedback */
        .gp-divine {
          padding: 0.85rem 1rem; border: 1px solid rgba(93,64,55,0.45);
          background: rgba(255,248,230,0.5); position: relative;
          box-shadow: 0 3px 10px rgba(62,39,35,0.12);
        }
        .gp-divine-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .gp-divine-label { font-family: 'Cinzel', serif; font-size: 0.55rem; letter-spacing: 0.22em; text-transform: uppercase; color: #5D4037; }
        .gp-divine-target { font-family: monospace; font-size: 0.55rem; color: #8B7355; margin-bottom: 0.45rem; letter-spacing: 0.05em; }
        .gp-divine-badges { display: flex; flex-wrap: wrap; gap: 0.28rem; margin-bottom: 0.6rem; }
        .gp-divine-badge { font-family: monospace; font-size: 0.58rem; padding: 0.15rem 0.4rem; border: 1px solid rgba(93,64,55,0.3); background: rgba(93,64,55,0.08); color: #5D4037; }
        .gp-divine-echo { font-family: 'EB Garamond', serif; font-size: 0.88rem; font-style: italic; line-height: 1.55; margin: 0; color: #3E2723; }
        .gp-divine-loading { font-family: 'EB Garamond', serif; font-size: 0.82rem; font-style: italic; color: #A1887F; margin: 0; }
        .gp-dismiss { background: none; border: none; color: rgba(93,64,55,0.4); cursor: pointer; font-size: 0.65rem; padding: 0 0.2rem; line-height: 1; }

        /* Corner accent */
        .gp-corner-tl { position: absolute; top: -1px; left: -1px; width: 8px; height: 8px; border-top: 1px solid rgba(93,64,55,0.55); border-left: 1px solid rgba(93,64,55,0.55); }
        .gp-corner-br { position: absolute; bottom: -1px; right: -1px; width: 8px; height: 8px; border-bottom: 1px solid rgba(93,64,55,0.55); border-right: 1px solid rgba(93,64,55,0.55); }

        /* Main button */
        .gp-btn-wrap { position: relative; display: inline-block; }
        .gp-btn {
          font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700;
          letter-spacing: 0.3em; color: #FDFBF7; background: #5D4037;
          border: 1.5px solid #3E2723; padding: 0.85rem 2.5rem;
          cursor: pointer; transition: all 0.25s; text-transform: uppercase;
          box-shadow: 0 3px 8px rgba(62,39,35,0.25);
        }
        .gp-btn:hover { background: #3E2723; transform: translateY(-1px); box-shadow: 0 5px 14px rgba(62,39,35,0.3); }

        /* Modal overlay */
        .gp-overlay {
          position: fixed; inset: 0; background: rgba(62,39,35,0.6);
          backdrop-filter: blur(6px); z-index: 100;
          display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        }
        .gp-modal {
          background: #d4c4a0; border: 1.5px solid rgba(93,64,55,0.5);
          padding: 2.5rem 2rem; text-align: center; max-width: 380px; width: 100%;
          box-shadow: 0 0 40px rgba(62,39,35,0.3), inset 0 0 30px rgba(255,248,230,0.2);
          position: relative;
        }
        .gp-modal-eyebrow { font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.3em; color: #8B2E2E; text-transform: uppercase; margin-bottom: 0.85rem; }
        .gp-modal-title { font-family: 'Cinzel', serif; font-size: 1.5rem; font-weight: 700; color: #3E2723; line-height: 1.2; margin-bottom: 1.25rem; letter-spacing: 0.06em; }
        .gp-modal-desc { font-family: 'EB Garamond', serif; font-size: 1.05rem; font-style: italic; color: #5D4037; line-height: 1.6; margin-bottom: 1.75rem; }
        .gp-modal-warn { font-family: 'EB Garamond', serif; font-size: 0.75rem; font-style: italic; color: rgba(139,46,46,0.7); margin-bottom: 1.75rem; }

        /* Loading */
        .gp-loading { font-family: 'Cinzel', serif; font-size: 1.1rem; letter-spacing: 0.1em; color: #8B7355; text-align: center; position: relative; z-index: 10; }
      `}</style>

      <div className="gp-root">
        <div className="gp-tex-noise" />
        <div className="gp-stain-1" />
        <div className="gp-stain-2" />
        <div className="gp-edge-burn" />
        <div className="gp-border-outer" />
        <div className="gp-border-inner" />

        <div className="gp-scroll">
          {/* Identity */}
          <div className="gp-identity">
            <div className="gp-orb" style={{ background: `radial-gradient(circle at 35% 35%, ${godColor}, ${godColor}88)`, boxShadow: `0 0 14px ${godColor}55` }} />
            <div>
              <div className="gp-god-name">{godName}</div>
              <div className="gp-god-sub">Pantheon Ascendant</div>
            </div>
          </div>

          <div className="gp-divider">
            <div className="gp-div-line" /><span className="gp-div-sym">✦</span><div className="gp-div-line" />
          </div>

          {/* Faith */}
          <div className="gp-faith">
            <span className="gp-faith-label">Faith</span>
            <div className="gp-faith-track">
              <motion.div
                style={{ position: "absolute", top: 0, left: 0, bottom: 0, background: godColor }}
                animate={{ width: `${faithPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="gp-faith-num">{godFaith}</span>
          </div>

          {/* Action area */}
          <div style={{ flex: 1, position: "relative" }}>
            <AnimatePresence mode="wait">
              {!targeting ? (
                <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="gp-grid">
                  {MIRACLES.map((m, i) => {
                    const canAfford = godFaith >= m.cost;
                    const rarityColor = RARITY_LINE[m.rarity];
                    return (
                      <motion.button
                        key={m.type}
                        className="gp-card"
                        whileHover={canAfford ? { y: -8, rotate: 0, scale: 1.04, zIndex: 10 } : {}}
                        whileTap={canAfford ? { scale: 0.97 } : {}}
                        style={{ rotate: `${CARD_ROTATIONS[i]}deg`, borderColor: canAfford ? rarityColor : "rgba(93,64,55,0.15)" }}
                        disabled={!canAfford}
                        onClick={() => { setSelected(m); setTargeting(true); }}
                      >
                        <div className="gp-card-top">
                          <span className="gp-card-icon">{m.icon}</span>
                          <span className="gp-card-tier">{m.tier}</span>
                        </div>
                        <div className="gp-card-name">{m.name}</div>
                        <div className="gp-card-desc">{m.desc}</div>
                        <div className="gp-rarity-line">
                          <div style={{ flex: 1, height: "1px", background: rarityColor }} />
                          <span className="gp-rarity-cost" style={{ color: rarityColor }}>{m.cost}✦</span>
                          <div style={{ flex: 1, height: "1px", background: rarityColor }} />
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="targeting" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }} className="gp-target-panel">
                  <div className="gp-target-prompt-wrap">
                    <p className="gp-target-prompt">
                      Casting <strong style={{ color: godColor }}>{selected?.name}</strong>
                    </p>
                    <p className="gp-target-sub">Select your focal point</p>
                  </div>

                  <div className="gp-target-scroll">
                    {targetList.map((item, i) => (
                      <motion.button
                        key={item.id}
                        className="gp-target-btn"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleTarget(item.id, item.name)}
                        disabled={casting}
                      >
                        <div className="gp-target-orb" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}88` }} />
                        {item.name}
                      </motion.button>
                    ))}
                  </div>

                  <button className="gp-cancel-btn" onClick={() => { setSelected(null); setTargeting(false); }}>
                    Cancel Invocation
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="gp-footer">
            <AnimatePresence>
              {divineFeedback ? (
                <motion.div key="divine-feedback" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.3 }}>
                  <DivineFeedback {...divineFeedback} godColor={godColor} onDismiss={() => setDivineFeedback(null)} />
                </motion.div>
              ) : lastCast ? (
                <motion.p key="last-cast" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="gp-feedback">
                  ✦ {lastCast}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <DirectiveStatus directiveIndex={godDirective} civs={civs} territories={territories} alliances={alliances} />
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showDirective && hasGod && (
            <motion.div className="gp-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="gp-modal">
                <div className="gp-corner-tl" /><div className="gp-corner-br" />
                <p className="gp-modal-eyebrow">Your Secret Directive</p>
                <p className="gp-modal-title">{DIRECTIVE_TITLES[godDirective] ?? "Unknown Purpose"}</p>
                <p className="gp-modal-desc">{directive}</p>
                <p className="gp-modal-warn">Speak of this to no other god.</p>
                <div className="gp-btn-wrap">
                  <button className="gp-btn" onClick={() => setShowDirective(false)}>Accept</button>
                </div>
              </div>
            </motion.div>
          )}

          {eraNotice && (
            <motion.div className="gp-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="gp-modal">
                <div className="gp-corner-tl" /><div className="gp-corner-br" />
                <p className="gp-modal-eyebrow" style={{ color: eraNotice.won ? "#2a6e20" : "#8B2E2E" }}>Era {eraNotice.era} Ends</p>
                <div style={{ fontSize: "3rem", marginBottom: "0.85rem", color: eraNotice.won ? "#2a6e20" : "#8B2E2E" }}>
                  {eraNotice.won ? "✦" : "✗"}
                </div>
                <p className="gp-modal-title">{eraNotice.won ? "Directive Fulfilled" : "Directive Failed"}</p>
                <p className="gp-modal-desc">{directive}</p>
                <div className="gp-btn-wrap">
                  <button className="gp-btn" onClick={() => setEraNotice(null)}>Continue</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// --- Component: DivineFeedback ---
function DivineFeedback({ miracleType, targetName, mechBadges, echoText, echoLoading, godColor, onDismiss }: {
  miracleType: string; targetName: string; mechBadges: string[];
  echoText: string | null; echoLoading: boolean; godColor: string; onDismiss: () => void;
}) {
  return (
    <div className="gp-divine">
      <div className="gp-corner-tl" style={{ borderColor: godColor }} />
      <div className="gp-corner-br" style={{ borderColor: godColor }} />
      <div className="gp-divine-head">
        <span className="gp-divine-label" style={{ color: godColor }}>⚡ Divine Consequence</span>
        <button className="gp-dismiss" onClick={onDismiss}>✕</button>
      </div>
      <div className="gp-divine-target">{miracleType.toUpperCase()} → {targetName}</div>
      <div className="gp-divine-badges">
        {mechBadges.map((badge, i) => (
          <span key={i} className="gp-divine-badge" style={{ borderColor: `${godColor}44`, color: godColor, background: `${godColor}12` }}>{badge}</span>
        ))}
      </div>
      {echoLoading
        ? <p className="gp-divine-loading">Consulting the divine record…</p>
        : echoText ? <p className="gp-divine-echo">{echoText}</p> : null}
    </div>
  );
}

// --- Scoring Logic ---
function scoreDirective(
  directiveIndex: number,
  civs: readonly any[],
  territories: readonly any[],
  alliances: readonly any[]
): { passing: boolean; detail: string } {
  const alive = civs.filter(c => c.isAlive);

  switch (directiveIndex) {
    case 0: {
      const maxTech = alive.reduce((m, c) => Math.max(m, c.techLevel), 0);
      return { passing: maxTech <= 4, detail: `Max tech: ${maxTech} · need ≤ 4` };
    }
    case 1: {
      const brindleId = civs.find(c => c.name === "Brindlefolk")?.id ?? 1;
      const myCount = territories.filter(t => t.ownerCivId === brindleId).length;
      const maxOther = alive
        .filter(c => c.id !== brindleId)
        .reduce((m, c) => Math.max(m, territories.filter(t => t.ownerCivId === c.id).length), 0);
      return { passing: myCount > maxOther, detail: `Brindlefolk: ${myCount} · Others max: ${maxOther}` };
    }
    case 2: {
      const top = [...alive].sort((a, b) => b.aggression - a.aggression)[0];
      if (!top) return { passing: false, detail: "No civs" };
      const topCount = territories.filter(t => t.ownerCivId === top.id).length;
      const maxOther = alive
        .filter(c => c.id !== top.id)
        .reduce((m, c) => Math.max(m, territories.filter(t => t.ownerCivId === c.id).length), 0);
      return { passing: topCount > maxOther, detail: `${top.name} (Agg ${top.aggression}): ${topCount} · Others: ${maxOther}` };
    }
    case 3: {
      const pious = alive.filter(c => c.piety >= 7);
      return { passing: pious.length >= 2, detail: `${pious.length}/2 civs at piety ≥ 7${pious.length ? ` · ${pious.map((c: any) => c.name).join(", ")}` : ""}` };
    }
    case 4: {
      const big = alive.filter(c => territories.filter(t => t.ownerCivId === c.id).length >= 6);
      return { passing: big.length >= 2, detail: `${big.length}/2 empires with 6+ territories${big.length ? ` · ${big.map((c: any) => `${c.name} (${territories.filter((t: any) => t.ownerCivId === c.id).length})`).join(", ")}` : ""}` };
    }
    case 5: {
      const total = alive.reduce((s, c) => s + c.piety, 0);
      return { passing: total < 15, detail: `Total piety: ${total} · need < 15` };
    }
    case 6: {
      const dead = civs.filter(c => !c.isAlive);
      return { passing: dead.length >= 1, detail: dead.length > 0 ? `Extinct: ${dead.map((c: any) => c.name).join(", ")}` : "All civs still alive" };
    }
    case 7: {
      const wars = alliances.filter(a => a.status === "war");
      return { passing: wars.length === 0, detail: wars.length === 0 ? "No active wars" : `${wars.length} active war${wars.length > 1 ? "s" : ""}` };
    }
    default:
      return { passing: false, detail: "" };
  }
}

// --- Component: DirectiveStatus ---
function DirectiveStatus({ directiveIndex, civs, territories, alliances }: {
  directiveIndex: number; civs: readonly any[]; territories: readonly any[]; alliances: readonly any[];
}) {
  const text = DIRECTIVES[directiveIndex] ?? "";
  const { passing, detail } = scoreDirective(directiveIndex, civs, territories, alliances);
  const accent = passing ? "#2a6e20" : "#8B2E2E";
  const accentBorder = passing ? "rgba(42,110,32,0.35)" : "rgba(139,46,46,0.35)";

  return (
    <div className="gp-directive" style={{ borderColor: accentBorder }}>
      <div className="gp-corner-tl" style={{ borderColor: accent }} />
      <div className="gp-corner-br" style={{ borderColor: accent }} />
      <div className="gp-directive-head">
        <p className="gp-directive-label">Secret Directive</p>
        <span className="gp-status-badge" style={{ borderColor: accentBorder, color: accent }}>
          {passing ? "✓ Fulfilling" : "✗ Unmet"}
        </span>
      </div>
      <p className="gp-directive-text">{text}</p>
      <p className="gp-directive-detail">{detail}</p>
    </div>
  );
}

// --- Styles (minimal — most styling moved to <style> block) ---
const styles: Record<string, CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#d4c4a0",
    color: "#3E2723",
    fontFamily: "'EB Garamond', Georgia, serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
};

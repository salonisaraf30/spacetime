"use client";

import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";

const MIRACLES = [
  { type: "bless",   name: "Bless",   cost: 12, icon: "✦", desc: "+2 stability", targetsCiv: true },
  { type: "inspire", name: "Inspire", cost: 12, icon: "☀", desc: "+1 scholarly", targetsCiv: true },
  { type: "portent", name: "Portent", cost: 18, icon: "◎", desc: "Bias next decision", targetsCiv: true },
  { type: "curse",   name: "Curse",   cost: 25, icon: "☠", desc: "-15 pop, plague", targetsCiv: false },
  { type: "strike",  name: "Strike",  cost: 55, icon: "⚡", desc: "Devastate territory", targetsCiv: false },
  { type: "reveal",  name: "Reveal",  cost: 5,  icon: "◈", desc: "See hidden state", targetsCiv: true },
];

import { DIRECTIVES, DIRECTIVE_TITLES } from "../constants/directives";

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

  // Try to find god by identity first, fall back to localStorage
  const myGodFromDB = myIdentity
    ? gods.find(g => g.identity.toHexString() === myIdentity.toHexString())
    : undefined;

  const [localGod] = useState<{name:string;directiveIndex:number;color:string}|null>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('pantheon-god') || 'null'); } catch { return null; }
  });

  // Merged god data — DB row wins over localStorage
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isNew = new URLSearchParams(window.location.search).get("new");
      if (isNew) setShowDirective(true);
    }
  }, []);

  const world = worldMeta[0];

  // Detect era change and score personal directive
  useEffect(() => {
    if (!world || !myGodFromDB) return;
    if (prevEraRef.current !== null && world.era > prevEraRef.current) {
      const won = scoreDirective(myGodFromDB.secretDirective, civs, territories, alliances).passing;
      setEraNotice({ era: prevEraRef.current, won });
      const t = setTimeout(() => setEraNotice(null), 15000);
      return () => clearTimeout(t);
    }
    prevEraRef.current = world.era;
  }, [world?.era]);

  // Only redirect if no localStorage data AND no DB data AND connected
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

      const civName = selected.targetsCiv
        ? civs.find(c => c.id === id)?.name
        : civs.find(c => territories.find(t => t.id === id)?.ownerCivId === c.id)?.name;
      const terrName = !selected.targetsCiv ? territories.find(t => t.id === id)?.name : undefined;

      fetch("/api/narrate-miracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ godName, miracleType: selected.type, territoryName: terrName ?? name, civName }),
      }).then(r => r.json()).then(({ narration }) => {
        if (narration) {
          const miracleId = Date.now() % 1000000;
          conn.reducers.recordMiracleNarration({ miracleId, narration, godColor });
        }
      }).catch(() => {});

      setLastCast(`${selected.name} cast on ${name}`);
    } catch {}
    setCasting(false);
    setSelected(null);
    setTargeting(false);
  }

  const faithPct = Math.min((godFaith / 200) * 100, 100);
  const directive = DIRECTIVES[godDirective] ?? "";

  const targetList = selected?.targetsCiv
    ? civs.filter(c => c.isAlive).map(c => ({ id: c.id, name: c.name, color: c.color }))
    : territories.map(t => ({ id: t.id, name: t.name, color: "#888" }));

  if (!connected) {
    return <div style={{ ...styles.root, justifyContent: "center" }}><p style={{ color: "#d4c5a9" }}>Connecting...</p></div>;
  }

  if (!hasGod) {
    return (
      <div style={{ ...styles.root, justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "#d4c5a9" }}>{connected ? "Finding your god..." : "Connecting..."}</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Era result notification */}
      {eraNotice && (
        <div style={styles.overlay}>
          <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.25em", color: "#92400e", marginBottom: "0.75rem" }}>
            Era {eraNotice.era} Ends
          </p>
          <div style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            color: eraNotice.won ? "#7ef0a9" : "#ef4444",
          }}>
            {eraNotice.won ? "✓" : "✗"}
          </div>
          <p style={{ fontSize: "1.3rem", color: "#f5e6c8", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
            {eraNotice.won ? "Directive Fulfilled" : "Directive Failed"}
          </p>
          <p style={{ fontSize: "0.85rem", fontStyle: "italic", lineHeight: 1.6, color: "#a89880", marginBottom: "0.5rem", maxWidth: "18rem", textAlign: "center" }}>
            {directive}
          </p>
          <p style={{ fontSize: "0.68rem", color: "#6b5a47", marginBottom: "2rem", fontStyle: "italic" }}>
            Era {eraNotice.era + 1} begins now.
          </p>
          <button style={styles.btn} onClick={() => setEraNotice(null)}>CONTINUE</button>
        </div>
      )}

      {showDirective && hasGod && (
        <div style={styles.overlay}>
          <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.25em", color: "#ef4444", marginBottom: "0.5rem" }}>
            Your Secret Directive
          </p>
          <p style={{ fontSize: "1.3rem", color: "#f5e6c8", marginBottom: "1.25rem", letterSpacing: "0.05em" }}>
            {DIRECTIVE_TITLES[godDirective] ?? "Unknown Purpose"}
          </p>
          <p style={{ fontSize: "0.9rem", fontStyle: "italic", lineHeight: 1.7, color: "#a89880", marginBottom: "2rem", maxWidth: "18rem", textAlign: "center" }}>
            {directive}
          </p>
          <p style={{ fontSize: "0.65rem", color: "#4a3a28", marginBottom: "2rem", fontStyle: "italic" }}>
            Do not share this with other gods.
          </p>
          <button style={styles.btn} onClick={() => setShowDirective(false)}>I UNDERSTAND</button>
        </div>
      )}
      {/* Identity */}
      <div style={styles.identity}>
        <div style={{ ...styles.godDot, background: godColor }} />
        <div>
          <div style={styles.godName}>{godName}</div>
          <div style={styles.godSub}>God of Pantheon</div>
        </div>
      </div>

      {/* Faith bar */}
      <div style={styles.faithRow}>
        <span style={styles.faithLabel}>FAITH</span>
        <div style={styles.faithTrack}>
          <div style={{ ...styles.faithFill, width: `${faithPct}%`, background: godColor }} />

        </div>
        <span style={styles.faithNum}>{godFaith}</span>
      </div>

      {/* Miracle grid */}
      {!targeting ? (
        <div style={styles.grid}>
          {MIRACLES.map(m => {
            const canAfford = godFaith >= m.cost;
            return (
              <button
                key={m.type}
                style={{ ...styles.card, opacity: canAfford ? 1 : 0.4, borderColor: canAfford ? "#78350f" : "#2a1f14" }}
                disabled={!canAfford}
                onClick={() => { setSelected(m); setTargeting(true); }}
              >
                <div style={styles.cardTop}>
                  <span style={styles.cardIcon}>{m.icon}</span>
                  <span style={{ ...styles.cardCost, color: godColor }}>{m.cost} ✦</span>
                </div>
                <div style={styles.cardName}>{m.name}</div>
                <div style={styles.cardDesc}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={styles.targetPanel}>
          <p style={styles.targetPrompt}>
            Casting <strong style={{ color: godColor }}>{selected?.name}</strong> — choose target
          </p>
          <div style={styles.targetList}>
            {targetList.map(t => (
              <button
                key={t.id}
                style={styles.targetBtn}
                onClick={() => handleTarget(t.id, t.name)}
                disabled={casting}
              >
                <div style={{ ...styles.targetDot, background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
          <button style={styles.cancelBtn} onClick={() => { setSelected(null); setTargeting(false); }}>
            Cancel
          </button>
        </div>
      )}

      {/* Last cast feedback */}
      {lastCast && (
        <p style={styles.feedback}>✦ {lastCast}</p>
      )}

      {/* Secret directive with live progress */}
      <DirectiveStatus
        directiveIndex={godDirective}
        civs={civs}
        territories={territories}
        alliances={alliances}
      />
    </div>
  );
}

function scoreDirective(
  directiveIndex: number,
  civs: readonly any[],
  territories: readonly any[],
  alliances: readonly any[]
): { passing: boolean; detail: string } {
  const alive = civs.filter(c => c.isAlive);

  switch (directiveIndex) {
    case 0: { // Dark Age — no civ above Tech 4
      const maxTech = alive.reduce((m, c) => Math.max(m, c.techLevel), 0);
      return { passing: maxTech <= 4, detail: `Max tech: ${maxTech} · need ≤ 4` };
    }
    case 1: { // Pious Triumph — Brindlefolk controls most territory
      const brindleId = civs.find(c => c.name === "Brindlefolk")?.id ?? 1;
      const myCount = territories.filter(t => t.ownerCivId === brindleId).length;
      const maxOther = alive
        .filter(c => c.id !== brindleId)
        .reduce((m, c) => Math.max(m, territories.filter(t => t.ownerCivId === c.id).length), 0);
      return { passing: myCount > maxOther, detail: `Brindlefolk: ${myCount} · Others max: ${maxOther}` };
    }
    case 2: { // Sword Wins — most aggressive civ has most territory
      const top = [...alive].sort((a, b) => b.aggression - a.aggression)[0];
      if (!top) return { passing: false, detail: "No civs" };
      const topCount = territories.filter(t => t.ownerCivId === top.id).length;
      const maxOther = alive
        .filter(c => c.id !== top.id)
        .reduce((m, c) => Math.max(m, territories.filter(t => t.ownerCivId === c.id).length), 0);
      return { passing: topCount > maxOther, detail: `${top.name} (Agg ${top.aggression}): ${topCount} · Others: ${maxOther}` };
    }
    case 3: { // New Religion — 2+ civs at piety ≥ 7
      const pious = alive.filter(c => c.piety >= 7);
      return { passing: pious.length >= 2, detail: `${pious.length}/2 civs at piety ≥ 7${pious.length ? ` · ${pious.map((c: any) => c.name).join(", ")}` : ""}` };
    }
    case 4: { // Twin Empires — 2 civs with 6+ territories
      const big = alive.filter(c => territories.filter(t => t.ownerCivId === c.id).length >= 6);
      return { passing: big.length >= 2, detail: `${big.length}/2 empires with 6+ territories${big.length ? ` · ${big.map((c: any) => `${c.name} (${territories.filter((t: any) => t.ownerCivId === c.id).length})`).join(", ")}` : ""}` };
    }
    case 5: { // Old Gods Forgotten — total piety < 15
      const total = alive.reduce((s, c) => s + c.piety, 0);
      return { passing: total < 15, detail: `Total piety: ${total} · need < 15` };
    }
    case 6: { // Burn It Down — 1+ civ extinct
      const dead = civs.filter(c => !c.isAlive);
      return { passing: dead.length >= 1, detail: dead.length > 0 ? `Extinct: ${dead.map((c: any) => c.name).join(", ")}` : "All civs still alive" };
    }
    case 7: { // Peace Reigns — no active wars
      const wars = alliances.filter(a => a.status === "war");
      return { passing: wars.length === 0, detail: wars.length === 0 ? "No active wars" : `${wars.length} active war${wars.length > 1 ? "s" : ""}` };
    }
    default:
      return { passing: false, detail: "" };
  }
}

function DirectiveStatus({ directiveIndex, civs, territories, alliances }: {
  directiveIndex: number;
  civs: readonly any[];
  territories: readonly any[];
  alliances: readonly any[];
}) {
  const text = DIRECTIVES[directiveIndex] ?? "";
  const { passing, detail } = scoreDirective(directiveIndex, civs, territories, alliances);

  return (
    <div style={{
      marginTop: "auto",
      padding: "0.85rem",
      border: `1px solid ${passing ? "rgba(126,240,169,0.25)" : "rgba(239,68,68,0.2)"}`,
      borderRadius: "0.6rem",
      background: passing ? "rgba(126,240,169,0.04)" : "rgba(239,68,68,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#6b5a47", margin: 0 }}>
          Secret Directive
        </p>
        <span style={{
          fontSize: "0.62rem",
          fontWeight: "bold",
          padding: "0.15rem 0.5rem",
          borderRadius: "999px",
          background: passing ? "rgba(126,240,169,0.15)" : "rgba(239,68,68,0.15)",
          color: passing ? "#7ef0a9" : "#ef4444",
          letterSpacing: "0.08em",
        }}>
          {passing ? "✓ PASSING" : "✗ NOT MET"}
        </span>
      </div>
      <p style={{ fontSize: "0.85rem", fontStyle: "italic", lineHeight: 1.5, margin: "0 0 0.5rem", color: "#d4c5a9" }}>
        {text}
      </p>
      <p style={{ fontSize: "0.68rem", color: "#8a7a68", margin: 0, lineHeight: 1.4 }}>
        {detail}
      </p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    overflowY: "auto",
    background: "#0d0a07",
    color: "#d4c5a9",
    fontFamily: "Georgia, 'Times New Roman', serif",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    maxWidth: "26rem",
    margin: "0 auto",
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    paddingTop: "0.5rem",
  },
  godDot: {
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "50%",
    flexShrink: 0,
  },
  godName: { fontSize: "1.4rem", color: "#f5e6c8", lineHeight: 1 },
  godSub: { fontSize: "0.7rem", color: "#6b5a47", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.2rem" },
  faithRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  faithLabel: { fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#6b5a47", width: "3rem" },
  faithTrack: { flex: 1, height: "6px", background: "#1a1208", borderRadius: "999px", overflow: "hidden" },
  faithFill: { height: "100%", borderRadius: "999px", transition: "width 0.5s ease" },
  faithNum: { fontSize: "0.9rem", fontWeight: "bold", width: "2.5rem", textAlign: "right" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.65rem",
  },
  card: {
    background: "#1a1208",
    border: "1px solid #78350f",
    borderRadius: "0.6rem",
    padding: "0.75rem",
    textAlign: "left",
    cursor: "pointer",
    color: "#d4c5a9",
    fontFamily: "Georgia, serif",
    transition: "background 0.15s",
  },
  cardTop: { display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" },
  cardIcon: { fontSize: "1.2rem" },
  cardCost: { fontSize: "0.72rem" },
  cardName: { fontSize: "0.9rem", fontWeight: "bold", marginBottom: "0.2rem" },
  cardDesc: { fontSize: "0.7rem", color: "#6b5a47" },
  targetPanel: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  targetPrompt: { fontSize: "0.9rem", textAlign: "center", margin: 0 },
  targetList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  targetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: "#1a1208",
    border: "1px solid #3a2a1a",
    borderRadius: "0.5rem",
    padding: "0.65rem 0.9rem",
    color: "#d4c5a9",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    fontSize: "0.9rem",
    textAlign: "left",
  },
  targetDot: { width: "0.7rem", height: "0.7rem", borderRadius: "50%", flexShrink: 0 },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #3a2a1a",
    color: "#6b5a47",
    padding: "0.5rem",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontFamily: "Georgia, serif",
  },
  feedback: {
    fontSize: "0.8rem",
    color: "#92400e",
    textAlign: "center",
    fontStyle: "italic",
    margin: 0,
  },
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "#0d0a07ee",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    textAlign: "center" as const,
    zIndex: 100,
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#d4c5a9",
  },
  btn: {
    padding: "0.75rem 2.5rem",
    border: "1px solid #92400e",
    background: "transparent",
    color: "#f5e6c8",
    fontSize: "0.85rem",
    letterSpacing: "0.15em",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
  },
};

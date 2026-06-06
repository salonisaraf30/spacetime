"use client";

import { useEffect, useRef, useState } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";

const MIRACLES = [
  { type: "bless",   name: "Bless",   cost: 10, icon: "✦", desc: "+2 stability", targetsCiv: true },
  { type: "inspire", name: "Inspire", cost: 10, icon: "☀", desc: "+1 scholarly", targetsCiv: true },
  { type: "portent", name: "Portent", cost: 15, icon: "◎", desc: "Bias next decision", targetsCiv: true },
  { type: "curse",   name: "Curse",   cost: 20, icon: "☠", desc: "-15 pop, plague", targetsCiv: false },
  { type: "strike",  name: "Strike",  cost: 50, icon: "⚡", desc: "Devastate territory", targetsCiv: false },
  { type: "reveal",  name: "Reveal",  cost: 5,  icon: "◈", desc: "See hidden state", targetsCiv: true },
];

const DIRECTIVES = [
  "Cause a Dark Age. No civ above Tech 4.",
  "The Pious Triumph. Brindlefolk hold the most territory.",
  "The Sword Wins. Most aggressive civ holds the most land.",
  "A New Religion. Two civs reach piety 7+.",
  "Twin Empires. Two civs hold 6+ territories each.",
  "The Old Gods Are Forgotten. Total piety drops below 15.",
  "Burn It Down. At least one civ goes extinct.",
  "Peace Reigns. No active wars at era end.",
];

export default function GodPanel() {
  const { isActive: connected, getConnection, identity: myIdentity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);

  const [gods] = useTable(tables.god);
  const [civs] = useTable(tables.civilization);
  const [territories] = useTable(tables.territory);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe([
      "SELECT * FROM god",
      "SELECT * FROM civilization",
      "SELECT * FROM territory",
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isNew = new URLSearchParams(window.location.search).get("new");
      if (isNew) setShowDirective(true);
    }
  }, []);

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
      {showDirective && hasGod && (
        <div style={styles.overlay}>
          <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.25em", color: "#ef4444", marginBottom: "1rem" }}>
            Your Secret Directive
          </p>
          <p style={{ fontSize: "1.05rem", fontStyle: "italic", lineHeight: 1.7, color: "#f5e6c8", marginBottom: "2rem" }}>
            {directive}
          </p>
          <p style={{ fontSize: "0.7rem", color: "#6b5a47", marginBottom: "2rem", fontStyle: "italic" }}>
            Do not share this with other gods.
          </p>
          <button style={styles.btn} onClick={() => setShowDirective(false)}>BEGIN</button>
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

      {/* Secret directive */}
      <div style={styles.directiveBox}>
        <p style={styles.directiveLabel}>Secret Directive</p>
        <p style={styles.directiveText}>{directive}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
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
  directiveBox: {
    marginTop: "auto",
    padding: "0.75rem",
    border: "1px solid #2a1f14",
    borderRadius: "0.6rem",
    background: "#1a1208",
  },
  directiveLabel: { fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6b5a47", margin: "0 0 0.4rem" },
  directiveText: { fontSize: "0.82rem", fontStyle: "italic", lineHeight: 1.5, margin: 0, color: "#a89880" },
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

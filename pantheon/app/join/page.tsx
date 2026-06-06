"use client";

import { useEffect, useRef, useState } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";

const DIRECTIVES = [
  "Cause a Dark Age. No civilization may rise above Tech Level 4 by era's end.",
  "The Pious Triumph. Brindlefolk must control the most territory when the era closes.",
  "The Sword Wins. The most aggressive civilization must hold the most land.",
  "A New Religion. At least two civilizations must reach piety 7 or higher.",
  "Twin Empires. Two civilizations must each hold 6 or more territories.",
  "The Old Gods Are Forgotten. Total piety across all civilizations must fall below 15.",
  "Burn It Down. At least one civilization must go extinct before the era ends.",
  "Peace Reigns. No active wars may remain when the era closes.",
];

type Screen = "splash" | "name" | "directive";

export default function JoinPage() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [godName, setGodName] = useState("");
  const [directive, setDirective] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { isActive: connected, getConnection, identity: myIdentity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);
  const [gods] = useTable(tables.god);

  // Keep a ref to gods so interval callbacks see the latest value
  const godsRef = useRef(gods);
  useEffect(() => { godsRef.current = gods; }, [gods]);

  const myIdentityRef = useRef(myIdentity);
  useEffect(() => { myIdentityRef.current = myIdentity; }, [myIdentity]);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe(["SELECT * FROM god"]);
  }, [conn, connected]);

  // If already joined, go straight to god-panel
  useEffect(() => {
    if (!myIdentity || !connected) return;
    const existing = gods.find(g => g.identity.toHexString() === myIdentity.toHexString());
    if (existing) window.location.href = "/god-panel";
  }, [gods, myIdentity, connected]);

  useEffect(() => {
    if (screen === "name") inputRef.current?.focus();
  }, [screen]);

  function handleJoin() {
    if (!godName.trim() || !conn || joining) return;
    setJoining(true);
    setError("");
    try {
      conn.reducers.joinWorld({ godName: godName.trim() });
      // Save to localStorage so god-panel can render immediately without subscription
      const colors = ['#F59E0B','#10B981','#EC4899','#8B5CF6','#EF4444','#06B6D4','#F97316','#14B8A6'];
      const di = Math.floor(Math.random() * 8);
      localStorage.setItem('pantheon-god', JSON.stringify({
        name: godName.trim(),
        directiveIndex: di,
        color: colors[di % colors.length],
      }));
    } catch (e) {
      setError("Failed to join. Try again.");
      setJoining(false);
      return;
    }
    setTimeout(() => { window.location.href = "/god-panel?new=1"; }, 1500);
  }

  return (
    <div style={styles.root}>
      {screen === "splash" && (
        <div style={styles.center}>
          <p style={styles.eyebrow}>A world is alive. Do not be merciful.</p>
          <h1 style={styles.title}>PANTHEON</h1>
          <p style={styles.subtitle}>
            You are a god.<br />The civilizations below live and breathe.<br />Shape their fate.
          </p>
          <button style={styles.btn} onClick={() => setScreen("name")}>ENTER</button>
        </div>
      )}

      {screen === "name" && (
        <div style={styles.center}>
          <p style={styles.label}>Your Divine Name</p>
          <input
            ref={inputRef}
            style={styles.input}
            value={godName}
            onChange={e => setGodName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            placeholder="Iron Eye"
            maxLength={24}
          />
          <p style={styles.hint}>
            Examples: Iron Eye · the Tide · Bringer of Locusts
          </p>
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={{ ...styles.btn, opacity: godName.trim() && !joining ? 1 : 0.4 }}
            onClick={handleJoin}
            disabled={!godName.trim() || joining}
          >
            {joining ? "AWAKENING..." : "AWAKEN"}
          </button>
          {!connected && <p style={{ ...styles.hint, color: "#ef4444" }}>Connecting to world...</p>}
        </div>
      )}

      {screen === "directive" && (
        <div style={styles.center}>
          <p style={{ ...styles.eyebrow, color: "#ef4444", letterSpacing: "0.25em" }}>
            Your Secret Directive
          </p>
          <p style={styles.directiveText}>{directive}</p>
          <p style={{ ...styles.hint, color: "#ef444466", marginBottom: "2rem" }}>
            Do not share this with other gods.
          </p>
          <button style={styles.btn} onClick={() => window.location.href = "/god-panel"}>
            BEGIN
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0d0a07",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#d4c5a9",
  },
  center: {
    textAlign: "center",
    maxWidth: "22rem",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    color: "#9fd3ff",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "3.5rem",
    letterSpacing: "0.3em",
    color: "#f5e6c8",
    margin: "0 0 1rem",
    fontWeight: "normal",
  },
  subtitle: {
    fontSize: "1rem",
    lineHeight: 1.6,
    color: "#a89880",
    marginBottom: "2rem",
  },
  btn: {
    padding: "0.75rem 2.5rem",
    border: "1px solid #92400e",
    background: "transparent",
    color: "#f5e6c8",
    fontSize: "0.85rem",
    letterSpacing: "0.15em",
    cursor: "pointer",
    marginTop: "1.5rem",
    fontFamily: "Georgia, serif",
    transition: "background 0.2s",
  },
  label: {
    fontSize: "1.1rem",
    color: "#f5e6c8",
    marginBottom: "1.25rem",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #92400e",
    color: "#f5e6c8",
    fontSize: "1.6rem",
    textAlign: "center",
    padding: "0.5rem 0",
    outline: "none",
    fontFamily: "Georgia, serif",
  },
  hint: {
    fontSize: "0.72rem",
    color: "#6b5a47",
    marginTop: "0.75rem",
    fontStyle: "italic",
  },
  error: {
    fontSize: "0.8rem",
    color: "#ef4444",
    marginTop: "0.5rem",
  },
  directiveText: {
    fontSize: "1.1rem",
    lineHeight: 1.7,
    color: "#f5e6c8",
    fontStyle: "italic",
    margin: "1.25rem 0 1.5rem",
    padding: "0 0.5rem",
  },
};

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";

const HOST = process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? "wss://maincloud.spacetimedb.com";
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME ?? "nextjs-ts";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

import { DIRECTIVES, DIRECTIVE_TITLES } from "../constants/directives";

type Screen = "splash" | "choice" | "name" | "directive";

export default function JoinPage() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [godName, setGodName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [existingGod, setExistingGod] = useState<{ name: string; color: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isActive: connected, getConnection, identity: myIdentity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);
  const [gods] = useTable(tables.god);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe(["SELECT * FROM god"]);
  }, [conn, connected]);

  // Detect existing god → show choice screen instead of auto-redirecting
  useEffect(() => {
    if (!myIdentity || !connected || screen !== "splash") return;
    const found = gods.find(g => g.identity.toHexString() === myIdentity.toHexString());
    if (found) {
      setExistingGod({ name: found.name, color: found.color });
      setScreen("choice");
    }
  }, [gods, myIdentity, connected]);

  useEffect(() => {
    if (screen === "name") inputRef.current?.focus();
  }, [screen]);

  function handleContinue() {
    window.location.href = "/god-panel";
  }

  function handleNewGod() {
    // Clear identity so SpacetimeDB assigns a fresh one on next connect
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("pantheon-god");
    }
    setExistingGod(null);
    setScreen("name");
  }

  function handleJoin() {
    if (!godName.trim() || !conn || joining) return;
    setJoining(true);
    setError("");
    try {
      conn.reducers.joinWorld({ godName: godName.trim() });
      const colors = ["#F59E0B", "#10B981", "#EC4899", "#8B5CF6", "#EF4444", "#06B6D4", "#F97316", "#14B8A6"];
      const di = Math.floor(Math.random() * 8);
      localStorage.setItem("pantheon-god", JSON.stringify({
        name: godName.trim(),
        directiveIndex: di,
        color: colors[di % colors.length],
      }));
    } catch {
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

      {screen === "choice" && existingGod && (
        <div style={styles.center}>
          <p style={styles.eyebrow}>You have walked this world before</p>
          <div style={styles.godCard}>
            <div style={{ ...styles.godOrb, background: existingGod.color }} />
            <span style={styles.godCardName}>{existingGod.name}</span>
          </div>
          <p style={{ ...styles.subtitle, marginBottom: "2rem" }}>
            Continue as this god, or awaken anew?
          </p>
          <div style={styles.choiceRow}>
            <button style={styles.btn} onClick={handleContinue}>
              CONTINUE
            </button>
            <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={handleNewGod}>
              NEW GOD
            </button>
          </div>
          <p style={{ ...styles.hint, marginTop: "1.25rem" }}>
            Creating a new god removes your old identity from this device.
          </p>
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
          <p style={styles.directiveText}>{DIRECTIVES[0]}</p>
          <p style={{ ...styles.hint, color: "#ef444466", marginBottom: "2rem" }}>
            Do not share this with other gods. Your true directive awaits inside.
          </p>
          <button style={styles.btn} onClick={() => window.location.href = "/god-panel?new=1"}>
            BEGIN
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
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
  godCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1.5rem",
    border: "1px solid rgba(146,64,14,0.4)",
    borderRadius: "0.5rem",
    background: "rgba(146,64,14,0.06)",
    marginBottom: "1.25rem",
  },
  godOrb: {
    width: "1.1rem",
    height: "1.1rem",
    borderRadius: "50%",
    flexShrink: 0,
  },
  godCardName: {
    fontSize: "1.2rem",
    color: "#f5e6c8",
    letterSpacing: "0.05em",
  },
  choiceRow: {
    display: "flex",
    gap: "0.75rem",
  },
  btn: {
    padding: "0.75rem 2rem",
    border: "1px solid #92400e",
    background: "transparent",
    color: "#f5e6c8",
    fontSize: "0.85rem",
    letterSpacing: "0.15em",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    transition: "background 0.2s",
  },
  btnGhost: {
    borderColor: "#3a2a1a",
    color: "#6b5a47",
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

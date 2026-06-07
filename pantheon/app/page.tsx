"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../src/module_bindings";
import { GameMap } from "./components/GameMap";
import { Chronicle } from "./components/Chronicle";
import { PantheonBar } from "./components/PantheonBar";

import { DIRECTIVES, DIRECTIVE_TITLES } from "./constants/directives";

function scoreDirective(
  directiveIndex: number,
  civs: readonly any[],
  territories: readonly any[],
  alliances: readonly any[]
): boolean {
  const alive = civs.filter((c: any) => c.isAlive);
  switch (directiveIndex) {
    case 0: return alive.every((c: any) => c.techLevel <= 4);
    case 1: {
      const id = civs.find((c: any) => c.name === "Brindlefolk")?.id ?? 1;
      const mine = territories.filter((t: any) => t.ownerCivId === id).length;
      const max = alive.filter((c: any) => c.id !== id).reduce((m: number, c: any) =>
        Math.max(m, territories.filter((t: any) => t.ownerCivId === c.id).length), 0);
      return mine > max;
    }
    case 2: {
      if (!alive.length) return false;
      const top = alive.reduce((a: any, b: any) => a.aggression >= b.aggression ? a : b);
      const topN = territories.filter((t: any) => t.ownerCivId === top.id).length;
      const max = alive.filter((c: any) => c.id !== top.id).reduce((m: number, c: any) =>
        Math.max(m, territories.filter((t: any) => t.ownerCivId === c.id).length), 0);
      return topN > max;
    }
    case 3: return alive.filter((c: any) => c.piety >= 7).length >= 2;
    case 4: return alive.filter((c: any) =>
      territories.filter((t: any) => t.ownerCivId === c.id).length >= 6).length >= 2;
    case 5: return alive.reduce((s: number, c: any) => s + c.piety, 0) < 15;
    case 6: return civs.some((c: any) => !c.isAlive);
    case 7: return !alliances.some((a: any) => a.status === "war");
    default: return false;
  }
}

export default function BigScreen() {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<number | null>(null);
  const [eraResult, setEraResult] = useState<{ era: number; results: { god: any; won: boolean }[] } | null>(null);

  const { isActive: connected, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);

  const [worldMeta] = useTable(tables.worldMeta);
  const [gods] = useTable(tables.god);
  const [civs] = useTable(tables.civilization);
  const [territories] = useTable(tables.territory);
  const [alliances] = useTable(tables.alliance);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe([
      "SELECT * FROM world_meta",
      "SELECT * FROM god",
      "SELECT * FROM civilization",
      "SELECT * FROM territory",
      "SELECT * FROM alliance",
    ]);
  }, [conn, connected]);

  const world = worldMeta[0];
  const prevEraRef = useRef<number | null>(null);

  useEffect(() => {
    if (!world) return;
    if (prevEraRef.current !== null && world.era > prevEraRef.current) {
      const results = gods.map(god => ({
        god,
        won: scoreDirective(god.secretDirective, civs, territories, alliances),
      }));
      setEraResult({ era: prevEraRef.current, results });
      const timer = setTimeout(() => setEraResult(null), 12000);
      return () => clearTimeout(timer);
    }
    prevEraRef.current = world.era;
  }, [world?.era]);

  return (
    <div style={styles.root}>
      <PantheonBar />

      <div style={styles.mapContainer}>
        <GameMap onTerritoryClick={(id) => setSelectedTerritoryId(id === selectedTerritoryId ? null : id)} />
      </div>

      <Chronicle />

      {/* Era results overlay */}
      {eraResult && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <p style={styles.overlayEyebrow}>Era {eraResult.era} Ends</p>
            <h2 style={styles.overlayTitle}>The Reckoning</h2>
            <p style={styles.overlaySubtitle}>The gods reveal their hidden purposes.</p>
            <div style={styles.resultsList}>
              {eraResult.results.length === 0 ? (
                <p style={styles.noGods}>No gods walked the earth this era.</p>
              ) : (
                eraResult.results.map(({ god, won }) => {
                  const directiveText = DIRECTIVES[god.secretDirective] ?? "Unknown purpose.";
                  return (
                    <div
                      key={god.id}
                      style={{
                        ...styles.resultRow,
                        borderColor: won ? "rgba(126,240,169,0.2)" : "rgba(239,68,68,0.15)",
                        background: won ? "rgba(126,240,169,0.04)" : "rgba(239,68,68,0.04)",
                      }}
                    >
                      <div style={{ ...styles.resultOrb, background: god.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                          <span style={styles.resultName}>{god.name}</span>
                          <span style={{ ...styles.resultBadge, color: won ? "#7ef0a9" : "#ef4444", borderColor: won ? "rgba(126,240,169,0.3)" : "rgba(239,68,68,0.3)" }}>
                            {won ? "✓ FULFILLED" : "✗ FAILED"}
                          </span>
                        </div>
                        <p style={{ ...styles.directiveReveal, color: "#d4a017", fontStyle: "normal", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                          {DIRECTIVE_TITLES[god.secretDirective] ?? "Unknown Purpose"}
                        </p>
                        <p style={styles.directiveReveal}>{directiveText}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p style={styles.overlayNext}>Era {(eraResult.era) + 1} begins now.</p>
            <button style={styles.overlayBtn} onClick={() => setEraResult(null)}>CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#0d0a07",
    color: "#d4c5a9",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    minHeight: 0,
    overflow: "hidden",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(7,4,1,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(6px)",
  },
  overlayCard: {
    background: "rgba(13,10,7,0.95)",
    border: "1px solid rgba(146,64,14,0.5)",
    borderRadius: "0.75rem",
    padding: "2.5rem 3rem",
    textAlign: "center",
    maxWidth: "40rem",
    width: "90vw",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  overlayEyebrow: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.25em",
    color: "#92400e",
    margin: "0 0 0.5rem",
  },
  overlayTitle: {
    fontSize: "2rem",
    fontWeight: "normal",
    color: "#f5e6c8",
    margin: "0 0 1.75rem",
    letterSpacing: "0.1em",
  },
  overlaySubtitle: {
    fontSize: "0.78rem",
    color: "#6b5a47",
    fontStyle: "italic",
    margin: "-1rem 0 1.75rem",
  },
  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.75rem",
    textAlign: "left",
  },
  resultRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.75rem 0.9rem",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  resultOrb: {
    width: "0.8rem",
    height: "0.8rem",
    borderRadius: "50%",
    marginTop: "0.2rem",
  },
  resultName: {
    fontSize: "1rem",
    color: "#f5e6c8",
    fontWeight: "bold",
  },
  resultBadge: {
    fontSize: "0.62rem",
    fontWeight: "bold",
    letterSpacing: "0.1em",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  directiveReveal: {
    fontSize: "0.75rem",
    color: "#8a7a68",
    fontStyle: "italic",
    lineHeight: 1.5,
    margin: 0,
  },
  noGods: {
    fontSize: "0.9rem",
    color: "#6b5a47",
    fontStyle: "italic",
  },
  overlayNext: {
    fontSize: "0.8rem",
    color: "#6b5a47",
    fontStyle: "italic",
    marginBottom: "1.5rem",
  },
  overlayBtn: {
    padding: "0.65rem 2rem",
    border: "1px solid #92400e",
    background: "transparent",
    color: "#f5e6c8",
    fontSize: "0.8rem",
    letterSpacing: "0.15em",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
  },
};

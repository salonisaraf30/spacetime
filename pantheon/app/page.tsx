"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../src/module_bindings";
import { GameMap } from "./components/GameMap";
import { Chronicle } from "./components/Chronicle";
import { PantheonBar } from "./components/PantheonBar";
import CometStrike from "./components/animations/CometStrike";
import {
  BlessAnimation,
  CurseAnimation,
  PortentAnimation,
  InspireAnimation,
  RevealAnimation,
} from "./components/animations";
import { CivInspector } from "./components/CivInspector";

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

// Approximate SVG centroids (in 1380×752 space) for each territory
const TERRITORY_SVG_CENTERS: Record<number, [number, number]> = {
  0:  [428,  218], 1:  [1076, 353], 2:  [731,  316], 3:  [1145, 549],
  4:  [649,  158], 5:  [207,  263], 6:  [925,  323], 7:  [856,  256],
  8:  [304,  399], 9:  [993,  421], 10: [925,  135], 11: [635,  467],
  12: [814,  511], 13: [883,  556], 14: [538,  369], 15: [1214, 467],
  16: [1021, 602], 17: [152,  331],
};

function territoryToScreenPct(
  territoryId: number,
  containerRect: DOMRect
): { x: number; y: number } | null {
  const center = TERRITORY_SVG_CENTERS[territoryId];
  if (!center || typeof window === "undefined") return null;
  const screenX = containerRect.left + (center[0] / 1380) * containerRect.width;
  const screenY = containerRect.top  + (center[1] / 752)  * containerRect.height;
  return { x: (screenX / window.innerWidth) * 100, y: (screenY / window.innerHeight) * 100 };
}

function territoryToScreenPx(
  territoryId: number,
  containerRect: DOMRect
): { x: number; y: number } | null {
  const center = TERRITORY_SVG_CENTERS[territoryId];
  if (!center || typeof window === "undefined") return null;
  return {
    x: containerRect.left + (center[0] / 1380) * containerRect.width,
    y: containerRect.top  + (center[1] / 752)  * containerRect.height,
  };
}

const ACTION_ICONS: Record<string, string> = {
  expand: "▶", conquer: "⚔", declare_war: "⚔", form_alliance: "◈",
  develop_tech: "✦", send_envoy: "◉", convert: "☽", build: "■", consolidate: "◫",
};

const MIRACLE_ICONS: Record<string, string> = {
  bless: "✦", curse: "☠", strike: "⚡", inspire: "☀", portent: "◎", reveal: "◈",
};

type ReactionToast = {
  civName: string;
  civColor: string;
  action: string;
  narration: string;
  miracleType: string | null;
  godName: string | null;
  godColor: string | null;
};

type ActiveAnimation = {
  id: number;
  type: string;
  position: { x: number; y: number };
  name?: string;
};

export default function BigScreen() {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<number | null>(null);
  const [eraResult, setEraResult] = useState<{ era: number; results: { god: any; won: boolean }[] } | null>(null);
  const [activeStrike, setActiveStrike] = useState<{ x: number; y: number; name: string } | null>(null);
  const [activeAnimations, setActiveAnimations] = useState<ActiveAnimation[]>([]);
  const [pulseEventCivId, setPulseEventCivId] = useState<number | null>(null);
  const [reactionToast, setReactionToast] = useState<ReactionToast | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { isActive: connected, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);

  const [worldMeta] = useTable(tables.worldMeta);
  const [gods] = useTable(tables.god);
  const [civs] = useTable(tables.civilization);
  const [territories] = useTable(tables.territory);
  const [alliances] = useTable(tables.alliance);
  const [miracleCasts] = useTable(tables.miracleCast);
  const [civActions] = useTable(tables.civAction);

  // Track latest processed IDs to avoid re-firing on subscribe
  const prevMiracleIdRef = useRef(-1);
  const prevCivActionIdRef = useRef(-1);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe([
      "SELECT * FROM world_meta",
      "SELECT * FROM god",
      "SELECT * FROM civilization",
      "SELECT * FROM territory",
      "SELECT * FROM alliance",
      "SELECT * FROM miracle_cast",
      "SELECT * FROM civ_action",
      "SELECT * FROM chronicle_entry",
    ]);
  }, [conn, connected]);

  // Wire all 6 animations + CometStrike on new miracle casts
  useEffect(() => {
    if (!miracleCasts.length) return;
    const sorted = [...miracleCasts].sort((a, b) => b.id - a.id);
    const latest = sorted[0];
    if (prevMiracleIdRef.current === -1) {
      prevMiracleIdRef.current = latest.id;
      return;
    }
    if (latest.id <= prevMiracleIdRef.current) return;
    prevMiracleIdRef.current = latest.id;

    // Resolve target territory (civ-targeted miracles: use any owned territory for coords)
    const isCivTargeted = ["bless", "portent", "inspire", "reveal"].includes(latest.miracleType);
    const territory = isCivTargeted
      ? territories.find(t => t.ownerCivId === latest.targetId)
      : territories.find(t => t.id === latest.targetId);
    if (!territory) return;

    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (latest.miracleType === "strike") {
      const pos = territoryToScreenPct(territory.id, rect);
      if (pos) setActiveStrike({ x: pos.x, y: pos.y, name: territory.name });
    } else {
      const pos = territoryToScreenPx(territory.id, rect);
      if (pos) {
        setActiveAnimations(prev => [...prev, { id: latest.id, type: latest.miracleType, position: pos, name: territory.name }]);
      }
    }
  }, [miracleCasts.length, territories]);

  // Divine Consequence Toast + territory pulse on new civ actions
  useEffect(() => {
    if (!civActions.length) return;
    const sorted = [...civActions].sort((a, b) => b.id - a.id);
    const latest = sorted[0];
    if (prevCivActionIdRef.current === -1) {
      prevCivActionIdRef.current = latest.id;
      return;
    }
    if (latest.id <= prevCivActionIdRef.current) return;
    prevCivActionIdRef.current = latest.id;

    const civ = civs.find(c => c.id === latest.civId);
    if (!civ) return;

    // Territory pulse for impactful actions
    const PULSE_ACTIONS = ["expand", "conquer", "declare_war", "form_alliance"];
    if (PULSE_ACTIONS.includes(latest.actionType)) {
      setPulseEventCivId(civ.id);
      const timer = setTimeout(() => setPulseEventCivId(null), 3500);
      // cleanup captured in outer scope — this is fire-and-forget intentionally
      void timer;
    }

    // Check for a recent miracle targeting this civ (within 3 ticks)
    const recentMiracle = [...miracleCasts]
      .sort((a, b) => b.id - a.id)
      .find(m => {
        const recentEnough = latest.tickNumber - m.tickNumber <= 3;
        const targetsThisCiv =
          m.targetId === civ.id ||
          territories.some(t => t.id === m.targetId && t.ownerCivId === civ.id);
        return recentEnough && targetsThisCiv;
      });

    // Only show toast if this looks like a miracle reaction
    if (!recentMiracle) return;

    const god = gods.find(g => g.id === recentMiracle.godId);
    setReactionToast({
      civName: civ.name,
      civColor: civ.color,
      action: latest.actionType,
      narration: latest.narration,
      miracleType: recentMiracle.miracleType,
      godName: god?.name ?? null,
      godColor: god?.color ?? null,
    });
    const timer = setTimeout(() => setReactionToast(null), 7000);
    return () => clearTimeout(timer);
  }, [civActions.length, civs, miracleCasts, territories, gods]);

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

  function removeAnimation(id: number) {
    setActiveAnimations(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div style={styles.root}>
      <PantheonBar
        connected={connected}
        tick={world?.tickCount ?? 0}
        year={world?.currentYear ?? 1}
      />

      <div ref={mapContainerRef} style={styles.mapContainer}>
        <GameMap
          onTerritoryClick={(id) => setSelectedTerritoryId(id === selectedTerritoryId ? null : id)}
          pulseEventCivId={pulseEventCivId}
        />
      </div>

      <Chronicle />

      {/* CometStrike — strike miracle */}
      {activeStrike && (
        <CometStrike
          targetX={activeStrike.x}
          targetY={activeStrike.y}
          territoryName={activeStrike.name}
          onComplete={() => setActiveStrike(null)}
        />
      )}

      {/* All other miracle animations — pixel-coord, same pattern */}
      {activeAnimations.map(anim => {
        const props = {
          targetPosition: anim.position,
          onComplete: () => removeAnimation(anim.id),
        };
        switch (anim.type) {
          case "bless":   return <BlessAnimation   key={anim.id} {...props} territoryName={anim.name} />;
          case "curse":   return <CurseAnimation   key={anim.id} {...props} />;
          case "portent": return <PortentAnimation key={anim.id} {...props} />;
          case "inspire": return <InspireAnimation key={anim.id} {...props} />;
          case "reveal":  return <RevealAnimation  key={anim.id} {...props} />;
          default: return null;
        }
      })}

      {/* Divine Consequence Toast */}
      {reactionToast && (
        <div style={styles.toast}>
          {reactionToast.miracleType && reactionToast.godName && (
            <div style={styles.toastCause}>
              <div style={{ ...styles.toastOrb, background: reactionToast.godColor ?? "#c49b60" }} />
              <span style={styles.toastGodName}>{reactionToast.godName}</span>
              <span style={{
                ...styles.toastBadge,
                color: reactionToast.godColor ?? "#c49b60",
                borderColor: `${reactionToast.godColor ?? "#c49b60"}55`,
              }}>
                {MIRACLE_ICONS[reactionToast.miracleType] ?? "✦"} {reactionToast.miracleType}
              </span>
              <span style={styles.toastArrow}>→</span>
            </div>
          )}
          <div style={styles.toastEffect}>
            <div style={{ ...styles.toastOrb, background: reactionToast.civColor }} />
            <span style={{ ...styles.toastCivName, color: reactionToast.civColor, textShadow: `0 0 12px ${reactionToast.civColor}` }}>
              {reactionToast.civName}
            </span>
            <span style={styles.toastAction}>
              {ACTION_ICONS[reactionToast.action] ?? "·"} {reactionToast.action.replace(/_/g, " ")}
            </span>
          </div>
          {reactionToast.narration && (
            <p style={styles.toastNarration}>"{reactionToast.narration}"</p>
          )}
        </div>
      )}

      {/* Civ Inspector — slide-in panel on territory click */}
      <CivInspector
        territoryId={selectedTerritoryId}
        territories={territories}
        civs={civs}
        miracleCasts={miracleCasts}
        civActions={civActions}
        gods={gods}
        onClose={() => setSelectedTerritoryId(null)}
      />

      {/* Era results overlay */}
      {eraResult && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <div style={styles.overlayRuleWrap}>
              <div style={styles.overlayRuleThick} />
              <div style={styles.overlayRuleThin} />
            </div>

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
                        borderColor: won ? "rgba(30,90,30,0.4)" : "rgba(120,30,30,0.35)",
                        background: won ? "rgba(30,80,30,0.06)" : "rgba(120,30,30,0.06)",
                      }}
                    >
                      <div style={{
                        width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${god.color}`, background: god.color + "22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginTop: "0.1rem",
                      }}>
                        <span style={{ fontSize: "0.7rem", color: god.color, fontFamily: "Georgia, serif" }}>
                          {god.name.charAt(0)}
                        </span>
                      </div>
                      <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                          <span style={styles.resultName}>{god.name}</span>
                          <span style={{
                            ...styles.resultBadge,
                            color: won ? "#1a5a20" : "#8B1A1A",
                            borderColor: won ? "rgba(30,90,30,0.5)" : "rgba(139,26,26,0.5)",
                          }}>
                            {won ? "✓ Fulfilled" : "✗ Failed"}
                          </span>
                        </div>
                        <p style={styles.directiveTitle}>
                          {DIRECTIVE_TITLES[god.secretDirective] ?? "Unknown Purpose"}
                        </p>
                        <p style={styles.directiveReveal}>{directiveText}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.overlayRuleWrap}>
              <div style={styles.overlayRuleThick} />
              <div style={styles.overlayRuleThin} />
            </div>

            <p style={styles.overlayNext}>Era {eraResult.era + 1} begins now.</p>
            <button style={styles.overlayBtn} onClick={() => setEraResult(null)}>Continue</button>
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

  // Divine Consequence Toast
  toast: {
    position: "fixed",
    left: "1.5rem",
    bottom: "3rem",
    zIndex: 80,
    background: "linear-gradient(135deg, rgba(13,8,5,0.96), rgba(25,15,8,0.98))",
    border: "1px solid rgba(196,155,96,0.4)",
    padding: "0.85rem 1.25rem",
    maxWidth: "22rem",
    boxShadow: "0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(196,155,96,0.04)",
    animation: "toastIn 0.4s ease-out",
  },
  toastCause: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
    paddingBottom: "0.5rem",
    borderBottom: "1px solid rgba(196,155,96,0.2)",
  },
  toastOrb: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  toastGodName: {
    fontFamily: "Georgia, serif",
    fontSize: "0.75rem",
    fontVariant: "small-caps",
    color: "#c49b60",
    letterSpacing: "0.05em",
  },
  toastBadge: {
    fontFamily: "Georgia, serif",
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    padding: "0.1rem 0.45rem",
    border: "1px solid",
    fontVariant: "small-caps",
  },
  toastArrow: {
    color: "rgba(196,155,96,0.5)",
    fontSize: "0.8rem",
    marginLeft: "auto",
  },
  toastEffect: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.45rem",
  },
  toastCivName: {
    fontFamily: "Georgia, serif",
    fontSize: "1rem",
    fontWeight: "bold",
    letterSpacing: "0.04em",
  },
  toastAction: {
    fontFamily: "Georgia, serif",
    fontSize: "0.75rem",
    color: "#d4c5a9",
    fontVariant: "small-caps",
    letterSpacing: "0.08em",
    marginLeft: "auto",
  },
  toastNarration: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "0.72rem",
    fontStyle: "italic",
    color: "rgba(212,197,169,0.7)",
    margin: 0,
    lineHeight: 1.4,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(5,3,1,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(4px)",
  },
  overlayCard: {
    background: [
      `repeating-linear-gradient(transparent, transparent 1.65rem, rgba(100,55,15,0.1) 1.65rem, rgba(100,55,15,0.1) calc(1.65rem + 1px))`,
      `linear-gradient(160deg, rgba(200,163,106,0.99) 0%, rgba(186,149,91,0.99) 100%)`,
    ].join(", "),
    border: "2px solid rgba(100,55,15,0.5)",
    padding: "2rem 2.5rem 2rem",
    textAlign: "center",
    maxWidth: "38rem",
    width: "90vw",
    maxHeight: "85vh",
    overflowY: "auto",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#1a0d04",
  },
  overlayRuleWrap: { display: "flex", flexDirection: "column", gap: "2px", marginBottom: "1.25rem" },
  overlayRuleThick: { height: "1.5px", background: "rgba(100,55,15,0.5)" },
  overlayRuleThin: { height: "0.5px", background: "rgba(100,55,15,0.28)" },
  overlayEyebrow: { fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#3a1808", margin: "0 0 0.4rem", fontVariant: "small-caps" },
  overlayTitle: { fontSize: "2.2rem", fontWeight: "normal", color: "#1a0800", margin: "0 0 0.4rem", letterSpacing: "0.06em" },
  overlaySubtitle: { fontSize: "0.78rem", color: "#5a3010", fontStyle: "italic", margin: "0 0 1.5rem" },
  resultsList: { display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem", textAlign: "left" },
  resultRow: { display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 0.85rem", border: "1px solid", borderRadius: "1px" },
  resultName: { fontSize: "0.95rem", color: "#1a0800", fontWeight: "bold" },
  resultBadge: { fontSize: "0.58rem", fontWeight: "bold", letterSpacing: "0.1em", padding: "0.15rem 0.5rem", border: "1px solid", flexShrink: 0, whiteSpace: "nowrap", fontVariant: "small-caps" },
  directiveTitle: { fontSize: "0.68rem", color: "#5a2e08", fontVariant: "small-caps", letterSpacing: "0.06em", margin: "0 0 0.2rem" },
  directiveReveal: { fontSize: "0.74rem", color: "#3a2008", fontStyle: "italic", lineHeight: 1.55, margin: 0 },
  noGods: { fontSize: "0.88rem", color: "#5a3010", fontStyle: "italic" },
  overlayNext: { fontSize: "0.75rem", color: "#5a3010", fontStyle: "italic", margin: "1.1rem 0 1.1rem" },
  overlayBtn: {
    padding: "0.6rem 2.2rem",
    border: "1px solid rgba(100,55,15,0.6)",
    background: "transparent",
    color: "#1a0800",
    fontSize: "0.72rem",
    letterSpacing: "0.2em",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    fontVariant: "small-caps",
    transition: "background 0.2s",
  },
};

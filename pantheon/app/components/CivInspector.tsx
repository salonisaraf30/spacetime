"use client";

import { type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CivData {
  id: number;
  name: string;
  color: string;
  population: number;
  techLevel: number;
  aggression: number;
  piety: number;
  mercantile: number;
  scholarly: number;
  stability: number;
  currentThought: string;
  isAlive: boolean;
}

interface Territory {
  id: number;
  name: string;
  ownerCivId: number;
  currentEvent: string;
}

interface MiracleCast {
  id: number;
  godId: number;
  miracleType: string;
  targetId: number;
  tickNumber: number;
  narration: string;
}

interface CivAction {
  id: number;
  civId: number;
  actionType: string;
  target: string;
  tickNumber: number;
  narration: string;
}

interface God {
  id: number;
  name: string;
  color: string;
}

interface CivInspectorProps {
  territoryId: number | null;
  territories: readonly Territory[];
  civs: readonly CivData[];
  miracleCasts: readonly MiracleCast[];
  civActions: readonly CivAction[];
  gods: readonly God[];
  onClose: () => void;
}

// Colors that read well on warm parchment
const TRAITS = [
  { key: "aggression" as keyof CivData, label: "Aggression", color: "#8B1A1A", glyph: "⚔" },
  { key: "piety"      as keyof CivData, label: "Piety",      color: "#1A2E78", glyph: "✝" },
  { key: "mercantile" as keyof CivData, label: "Mercantile", color: "#1A5A44", glyph: "⚖" },
  { key: "scholarly"  as keyof CivData, label: "Scholarly",  color: "#4A1A78", glyph: "✎" },
  { key: "stability"  as keyof CivData, label: "Stability",  color: "#6A3808", glyph: "⚐" },
] as const;

export function CivInspector({ territoryId, territories, civs, miracleCasts, civActions, gods, onClose }: CivInspectorProps) {
  const territory = territoryId !== null ? territories.find(t => t.id === territoryId) : null;
  const civ = territory && territory.ownerCivId >= 0
    ? civs.find(c => c.id === territory.ownerCivId)
    : null;

  return (
    <>
      <style>{`
        .insp-scroll::-webkit-scrollbar { width: 4px; }
        .insp-scroll::-webkit-scrollbar-track { background: rgba(100,55,15,0.1); }
        .insp-scroll::-webkit-scrollbar-thumb { background: rgba(100,55,15,0.35); border-radius: 2px; }
        .insp-terr::-webkit-scrollbar { width: 3px; }
        .insp-terr::-webkit-scrollbar-thumb { background: rgba(100,55,15,0.3); }
        .insp-close-btn { transition: color 0.18s; }
        .insp-close-btn:hover { color: #6b3010 !important; }
      `}</style>

      <AnimatePresence>
        {territoryId !== null && (
          <motion.div
            key="inspector"
            className="insp-scroll"
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            style={styles.panel}
          >
            {/* Civ-color top bar */}
            {civ && (
              <div style={{
                position: "sticky",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: `linear-gradient(to right, ${civ.color}, ${civ.color}44, transparent)`,
                marginLeft: "-1.4rem",
                marginBottom: "1.25rem",
                flexShrink: 0,
                zIndex: 2,
              }} />
            )}

            <button
              className="insp-close-btn"
              onClick={onClose}
              style={styles.closeBtn}
              aria-label="Close"
            >✕</button>

            {!territory ? null : !civ ? (
              <Unclaimed name={territory.name} />
            ) : (
              <Claimed
                civ={civ}
                territory={territory}
                territories={territories}
                miracleCasts={miracleCasts}
                civActions={civActions}
                gods={gods}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Unclaimed({ name }: { name: string }) {
  return (
    <div style={{ paddingTop: "2rem" }}>
      <p style={styles.eyebrow}>Terra Incognita</p>
      <h2 style={styles.civName}>{name}</h2>
      <p style={{ ...styles.muteText, marginTop: "0.6rem", fontStyle: "italic" }}>
        No civilization lays claim to this land.
      </p>
    </div>
  );
}

const MIRACLE_GLYPHS: Record<string, string> = {
  bless: "✦", curse: "☠", portent: "◎", inspire: "☀", strike: "⚡", reveal: "◈",
};
const MIRACLE_COLORS: Record<string, string> = {
  bless: "#1A5A44", curse: "#8B1A1A", portent: "#4A1A78", inspire: "#1A5A44", strike: "#8B1A1A", reveal: "#1A2E78",
};
const ACTION_GLYPHS: Record<string, string> = {
  expand: "◉", conquer: "⚔", build: "⚒", declare_war: "⚡", form_alliance: "⚖", develop_tech: "✎", send_envoy: "→", convert: "✝",
};

function Claimed({ civ, territory, territories, miracleCasts, civActions, gods }: {
  civ: CivData;
  territory: Territory;
  territories: readonly Territory[];
  miracleCasts: readonly MiracleCast[];
  civActions: readonly CivAction[];
  gods: readonly God[];
}) {
  const ownedTerrs = territories.filter(t => t.ownerCivId === civ.id);
  const terrCount = ownedTerrs.length;

  // Miracles targeting this civ directly or its territories, sorted newest first
  const civTerritoryIds = new Set(ownedTerrs.map(t => t.id));
  const recentMiracles = [...miracleCasts]
    .filter(m => m.targetId === civ.id || civTerritoryIds.has(m.targetId))
    .sort((a, b) => b.tickNumber - a.tickNumber)
    .slice(0, 4);

  // Most recent civ actions, newest first
  const recentActions = [...civActions]
    .filter(a => a.civId === civ.id)
    .sort((a, b) => b.tickNumber - a.tickNumber)
    .slice(0, 3);

  const godMap = new Map(gods.map(g => [g.id, g]));

  return (
    <>
      {/* Header: wax seal + name */}
      <div style={styles.header}>
        <div style={{
          ...styles.seal,
          border: `2px solid ${civ.color}`,
          boxShadow: `0 0 0 1px ${civ.color}44, inset 0 0 8px ${civ.color}22`,
        }}>
          <span style={{ ...styles.sealLetter, color: civ.color }}>
            {civ.name.charAt(0)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={styles.civName}>{civ.name}</h2>
          <p style={styles.territoryName}>{territory.name}</p>
          <div style={styles.tags}>
            {civ.aggression >= 7 && <Tag c="#8B1A1A">Warlike</Tag>}
            {civ.piety      >= 7 && <Tag c="#1A2E78">Pious</Tag>}
            {civ.mercantile >= 7 && <Tag c="#1A5A44">Mercantile</Tag>}
            {civ.scholarly  >= 7 && <Tag c="#4A1A78">Scholarly</Tag>}
            {civ.stability  <= 3 && <Tag c="#8B5A00">Unstable</Tag>}
            {!civ.isAlive        && <Tag c="#3a2810">Extinct</Tag>}
          </div>
        </div>
      </div>

      <InkRule label="Ledger of State" />

      {/* Ruled stats table */}
      <table style={styles.table}>
        <tbody>
          {[
            { label: "Population",  val: civ.population, color: "#2a1200" },
            { label: "Tech Level",  val: civ.techLevel,  color: "#2a1200" },
            { label: "Aggression",  val: civ.aggression, color: "#8B1A1A" },
            { label: "Piety",       val: civ.piety,      color: "#1A2E78" },
            { label: "Territories", val: terrCount,      color: civ.color },
          ].map(({ label, val, color }) => (
            <tr key={label} style={styles.tr}>
              <td style={styles.tdLabel}>{label}</td>
              <td style={{ ...styles.tdVal, color }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <InkRule label="Nature of the Realm" />

      {/* Trait bars */}
      <div style={styles.traits}>
        {TRAITS.map(({ key, label, color, glyph }) => {
          const val = civ[key] as number;
          return (
            <div key={key} style={styles.traitRow}>
              <span style={{ ...styles.traitGlyph, color }}>{glyph}</span>
              <span style={styles.traitLabel}>{label}</span>
              <div style={styles.track}>
                <motion.div
                  style={{ ...styles.fill, background: color }}
                  animate={{ width: `${val * 10}%` }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                />
              </div>
              <span style={{ ...styles.traitNum, color }}>{val}</span>
            </div>
          );
        })}
      </div>

      {ownedTerrs.length > 0 && (
        <>
          <InkRule label="Territories Held" />
          <div className="insp-terr" style={styles.terrList}>
            {ownedTerrs.map(t => (
              <div key={t.id} style={styles.terrRow}>
                <span style={{ color: civ.color, fontSize: "0.5rem", flexShrink: 0 }}>◉</span>
                <span style={styles.terrName}>{t.name}</span>
                {t.currentEvent !== "none" && (
                  <span style={{ color: t.currentEvent === "plague" ? "#880000" : "#994400", fontSize: "0.6rem" }}>
                    {t.currentEvent === "plague" ? "☠" : "☄"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Divine Interventions */}
      {recentMiracles.length > 0 && (
        <>
          <InkRule label="Divine Interventions" />
          <div style={styles.divineList}>
            {recentMiracles.map(m => {
              const god = godMap.get(m.godId);
              const glyph = MIRACLE_GLYPHS[m.miracleType] ?? "✦";
              const col = MIRACLE_COLORS[m.miracleType] ?? "#4a2808";
              const targetTerr = territories.find(t => t.id === m.targetId);
              const targetLabel = targetTerr ? targetTerr.name : civ.name;
              return (
                <div key={m.id} style={styles.divineRow}>
                  <span style={{ ...styles.divineGlyph, color: col }}>{glyph}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.divineHeader}>
                      {god && (
                        <div style={{ ...styles.divineDot, background: god.color + "22", border: `1px solid ${god.color}` }}>
                          <span style={{ fontSize: "0.45rem", color: god.color }}>{god.name.charAt(0)}</span>
                        </div>
                      )}
                      <span style={{ ...styles.divineName, color: god?.color ?? "#4a2808" }}>
                        {god?.name ?? "Unknown god"}
                      </span>
                      <span style={{ ...styles.divineBadge, color: col }}>
                        {m.miracleType}
                      </span>
                      <span style={styles.divineYear}>Yr.{m.tickNumber}</span>
                    </div>
                    <p style={styles.divineTarget}>→ {targetLabel}</p>
                    {m.narration && (
                      <p style={styles.divineNarration}>{m.narration}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Recent Decrees (civ decisions) */}
      {recentActions.length > 0 && (
        <>
          <InkRule label="Recent Decrees" />
          <div style={styles.decreeList}>
            {recentActions.map((action, i) => {
              const glyph = ACTION_GLYPHS[action.actionType] ?? "·";
              const isFirst = i === 0;
              return (
                <div key={action.id} style={{ ...styles.decreeRow, opacity: isFirst ? 1 : 0.65 }}>
                  <span style={{ ...styles.decreeGlyph, color: civ.color }}>{glyph}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.decreeActionLine}>
                      <span style={styles.decreeAction}>{action.actionType.replace("_", " ")}</span>
                      {action.target !== "none" && action.target && (
                        <span style={styles.decreeTarget}>{action.target}</span>
                      )}
                      <span style={styles.divineYear}>Yr.{action.tickNumber}</span>
                    </div>
                    {action.narration && (
                      <p style={styles.decreeNarration}>{action.narration}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Counsel of the Realm — current thought (may include divine influence) */}
      {civ.currentThought && (
        <>
          <InkRule label="Counsel of the Realm" />
          <div style={styles.thought}>
            <span style={styles.quoteL}>"</span>
            <p style={styles.thoughtText}>{civ.currentThought}</p>
            <span style={styles.quoteR}>"</span>
          </div>
        </>
      )}
    </>
  );
}

function InkRule({ label }: { label: string }) {
  return (
    <div style={styles.sectionRule}>
      <div style={styles.sectionLineThick} />
      <div style={styles.sectionLineThin} />
      <span style={styles.sectionLabel}>{label}</span>
      <div style={styles.sectionLineThick} />
      <div style={styles.sectionLineThin} />
    </div>
  );
}

function Tag({ children, c }: { children: React.ReactNode; c: string }) {
  return (
    <span style={{
      fontSize: "0.55rem",
      padding: "0.1rem 0.4rem",
      border: `1px solid ${c}`,
      color: c,
      letterSpacing: "0.08em",
      fontVariant: "small-caps" as const,
      lineHeight: 1.4,
    }}>
      {children}
    </span>
  );
}

// Parchment warm ground, dark ink text
const BG = [
  `repeating-linear-gradient(transparent, transparent 1.65rem, rgba(100,55,15,0.12) 1.65rem, rgba(100,55,15,0.12) calc(1.65rem + 1px))`,
  `linear-gradient(160deg, rgba(198,162,105,0.99) 0%, rgba(185,148,90,0.99) 100%)`,
].join(", ");

const styles: Record<string, CSSProperties> = {
  panel: {
    position: "fixed",
    right: 0,
    top: 0,
    height: "100%",
    width: "min(22rem, 100vw)",
    background: BG,
    borderLeft: "2px solid rgba(100,55,15,0.5)",
    padding: "0 1.4rem 2rem",
    zIndex: 50,
    overflowY: "auto",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#1a0d04",
    boxShadow: "-16px 0 48px rgba(0,0,0,0.55)",
  },
  closeBtn: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "transparent",
    border: "none",
    color: "#7a4820",
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: "0.3rem",
    lineHeight: 1,
    fontFamily: "Georgia, serif",
  },
  eyebrow: {
    fontSize: "0.58rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.2em",
    color: "#3a1808",
    fontVariant: "small-caps" as const,
    marginBottom: "0.3rem",
  },
  header: {
    display: "flex",
    gap: "0.85rem",
    alignItems: "flex-start",
    marginBottom: "0.4rem",
    paddingRight: "1.5rem",
  },
  seal: {
    flexShrink: 0,
    width: "2.8rem",
    height: "2.8rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.25)",
    marginTop: "0.1rem",
  },
  sealLetter: {
    fontSize: "1.15rem",
    fontWeight: "normal",
  },
  civName: {
    fontSize: "1.2rem",
    fontWeight: "normal",
    color: "#1a0800",
    letterSpacing: "0.03em",
    margin: "0 0 0.1rem",
    lineHeight: 1.1,
  },
  territoryName: {
    fontSize: "0.58rem",
    color: "#4a2808",
    textTransform: "uppercase" as const,
    letterSpacing: "0.15em",
    fontVariant: "small-caps" as const,
    margin: "0 0 0.35rem",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.25rem",
  },
  muteText: {
    fontSize: "0.78rem",
    color: "#3a2008",
  },
  // Section rule
  sectionRule: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gridTemplateRows: "auto auto",
    alignItems: "center",
    gap: "0 0.5rem",
    margin: "0.8rem 0 0.5rem",
  },
  sectionLabel: {
    gridColumn: "2",
    gridRow: "1 / 3",
    fontSize: "0.5rem",
    color: "#4a2808",
    textTransform: "uppercase" as const,
    letterSpacing: "0.2em",
    fontVariant: "small-caps" as const,
    whiteSpace: "nowrap" as const,
  },
  sectionLineThick: {
    height: "1.5px",
    background: "rgba(100,55,15,0.45)",
  },
  sectionLineThin: {
    height: "0.5px",
    background: "rgba(100,55,15,0.22)",
    marginTop: "2px",
  },
  // Ledger table
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    border: "1px solid rgba(100,55,15,0.3)",
  },
  tr: {
    borderBottom: "1px solid rgba(100,55,15,0.18)",
  },
  tdLabel: {
    fontSize: "0.62rem",
    color: "#3a2008",
    padding: "0.28rem 0.55rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    fontVariant: "small-caps" as const,
  },
  tdVal: {
    fontSize: "0.82rem",
    fontWeight: "bold",
    padding: "0.28rem 0.55rem",
    textAlign: "right" as const,
  },
  // Traits
  traits: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.42rem",
  },
  traitRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  traitGlyph: {
    fontSize: "0.52rem",
    width: "0.7rem",
    textAlign: "center" as const,
    flexShrink: 0,
  },
  traitLabel: {
    fontSize: "0.58rem",
    color: "#3a2008",
    width: "5rem",
    flexShrink: 0,
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    fontVariant: "small-caps" as const,
  },
  track: {
    flex: 1,
    height: "4px",
    background: "rgba(100,55,15,0.18)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    opacity: 0.9,
  },
  traitNum: {
    fontSize: "0.68rem",
    fontWeight: "bold",
    width: "1.3rem",
    textAlign: "right" as const,
    flexShrink: 0,
  },
  // Territory list
  terrList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.2rem",
    maxHeight: "7rem",
    overflowY: "auto" as const,
  },
  terrRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  terrName: {
    fontSize: "0.7rem",
    color: "#4a2a0a",
    flex: 1,
    fontStyle: "italic",
  },
  // Divine Interventions
  divineList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  divineRow: {
    display: "flex",
    gap: "0.45rem",
    alignItems: "flex-start",
    padding: "0.35rem 0.5rem",
    background: "rgba(100,55,15,0.06)",
    border: "1px solid rgba(100,55,15,0.18)",
  },
  divineGlyph: {
    fontSize: "0.7rem",
    flexShrink: 0,
    marginTop: "0.1rem",
    width: "0.8rem",
    textAlign: "center" as const,
  },
  divineHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    marginBottom: "0.15rem",
    flexWrap: "wrap" as const,
  },
  divineDot: {
    width: "1rem",
    height: "1rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  divineName: {
    fontSize: "0.62rem",
    fontWeight: "bold",
    letterSpacing: "0.03em",
  },
  divineBadge: {
    fontSize: "0.5rem",
    fontVariant: "small-caps" as const,
    letterSpacing: "0.1em",
    border: "1px solid currentColor",
    padding: "0.08rem 0.3rem",
    opacity: 0.85,
  },
  divineYear: {
    fontSize: "0.48rem",
    color: "#5a3010",
    fontFamily: "monospace",
    marginLeft: "auto",
    flexShrink: 0,
  },
  divineTarget: {
    fontSize: "0.62rem",
    color: "#4a2808",
    fontStyle: "italic",
    margin: "0 0 0.1rem",
  },
  divineNarration: {
    fontSize: "0.62rem",
    color: "#3a2008",
    fontStyle: "italic",
    lineHeight: 1.45,
    margin: 0,
    opacity: 0.85,
  },
  // Recent Decrees
  decreeList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  decreeRow: {
    display: "flex",
    gap: "0.45rem",
    alignItems: "flex-start",
  },
  decreeGlyph: {
    fontSize: "0.65rem",
    flexShrink: 0,
    marginTop: "0.05rem",
    width: "0.8rem",
    textAlign: "center" as const,
  },
  decreeActionLine: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    marginBottom: "0.1rem",
    flexWrap: "wrap" as const,
  },
  decreeAction: {
    fontSize: "0.6rem",
    fontVariant: "small-caps" as const,
    letterSpacing: "0.08em",
    color: "#1a0800",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
  },
  decreeTarget: {
    fontSize: "0.6rem",
    color: "#4a2808",
    fontStyle: "italic",
  },
  decreeNarration: {
    fontSize: "0.66rem",
    color: "#3a2008",
    fontStyle: "italic",
    lineHeight: 1.45,
    margin: 0,
    overflow: "hidden" as const,
    display: "-webkit-box" as any,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
  },
  // Thought
  thought: {
    display: "flex",
    gap: "0.3rem",
    alignItems: "flex-start",
  },
  quoteL: {
    fontSize: "2rem",
    color: "rgba(100,55,15,0.3)",
    lineHeight: 0.8,
    flexShrink: 0,
    fontFamily: "Georgia, serif",
    userSelect: "none" as const,
  },
  quoteR: {
    fontSize: "2rem",
    color: "rgba(100,55,15,0.3)",
    lineHeight: 0.8,
    flexShrink: 0,
    alignSelf: "flex-end",
    fontFamily: "Georgia, serif",
    userSelect: "none" as const,
  },
  thoughtText: {
    fontSize: "0.77rem",
    fontStyle: "italic",
    color: "#4a2a0a",
    lineHeight: 1.65,
    flex: 1,
    margin: 0,
  },
};

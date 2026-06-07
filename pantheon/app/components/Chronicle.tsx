"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTable } from "spacetimedb/react";
import { tables } from "../../src/module_bindings";

const TYPE_BADGE: Record<string, { label: string; icon: string; bg: string; textColor: string }> = {
  miracle: { label: "MIRACLE", icon: "✦", bg: "rgba(160,80,10,0.16)",  textColor: "#7a3a08" },
  action:  { label: "ACTION",  icon: "⚔", bg: "rgba(50,90,160,0.14)",  textColor: "#304a80" },
  event:   { label: "EVENT",   icon: "◈", bg: "rgba(40,120,70,0.14)",   textColor: "#1a6030" },
  era:     { label: "ERA",     icon: "❖", bg: "rgba(100,55,15,0.12)",   textColor: "#6b3010" },
};

const INK_RULE = "rgba(100,55,15,0.35)";

export function Chronicle() {
  const [chronicleEntries] = useTable(tables.chronicleEntry);
  const [civs] = useTable(tables.civilization);
  const [gods] = useTable(tables.god);
  const [open, setOpen] = useState(false);
  const prevLen = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (chronicleEntries.length > prevLen.current) {
      if (open && listRef.current) listRef.current.scrollTop = 0;
    }
    prevLen.current = chronicleEntries.length;
  }, [chronicleEntries.length, open]);

  const visible = [...chronicleEntries]
    .sort((a, b) =>
      b.tickNumber !== a.tickNumber ? b.tickNumber - a.tickNumber : b.id - a.id
    )
    .slice(0, 40);

  const latestEntry = visible[0];
  const previewText = latestEntry
    ? (() => {
        const civName = civs.find(c => c.color === latestEntry.civColor)?.name ?? "";
        const godName = gods.find(g => g.color === latestEntry.godColor)?.name ?? "";
        const entity = civName || godName || "World";
        return `${entity} — ${latestEntry.text.slice(0, 60)}${latestEntry.text.length > 60 ? "…" : ""}`;
      })()
    : "No entries yet";

  return (
    <div style={styles.root}>
      <style>{`
        .chr-scroll::-webkit-scrollbar { width: 4px; }
        .chr-scroll::-webkit-scrollbar-track { background: rgba(120,70,20,0.1); }
        .chr-scroll::-webkit-scrollbar-thumb { background: rgba(120,70,20,0.35); border-radius: 2px; }
        .chr-entry { border-radius: 2px; transition: background 0.15s; }
        .chr-entry:hover { background: rgba(120,70,20,0.08); }
        .chr-header:hover .chr-title { opacity: 1; }
      `}</style>

      {/* Clickable header — always visible */}
      <div
        className="chr-header"
        style={styles.header}
        onClick={() => setOpen(o => !o)}
      >
        <div style={styles.ruleWrap}>
          <div style={styles.ruleThick} />
          <div style={styles.ruleThin} />
        </div>
        <div style={styles.titleGroup}>
          <span style={styles.titleOrnament}>✦</span>
          <span className="chr-title" style={styles.title}>The Chronicle</span>
          <span style={styles.titleOrnament}>✦</span>
        </div>
        <div style={styles.ruleWrap}>
          <div style={styles.ruleThick} />
          <div style={styles.ruleThin} />
        </div>
        <span style={{ ...styles.chevron, transform: open ? "rotate(0deg)" : "rotate(180deg)" }}>
          ▾
        </span>
      </div>

      {/* Preview line when collapsed */}
      {!open && visible.length > 0 && (
        <div style={styles.previewBar}>
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
            background: latestEntry?.civColor || latestEntry?.godColor || "#6b3010",
          }} />
          <span style={styles.previewText}>{previewText}</span>
        </div>
      )}

      {/* Expandable list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="chronicle-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <ul ref={listRef} className="chr-scroll" style={styles.list}>
              <AnimatePresence initial={false}>
                {visible.map((entry, i) => {
                  const isEra = entry.entryType === "era";
                  const entityColor = entry.civColor || entry.godColor || "#6b3010";
                  const fade = Math.max(0.28, 1 - i * 0.05);

                  const civName = civs.find(c => c.color === entry.civColor)?.name ?? "";
                  const godName = gods.find(g => g.color === entry.godColor)?.name ?? "";
                  const entityName = civName || godName;

                  const badge = TYPE_BADGE[entry.entryType] ?? TYPE_BADGE.event;

                  return (
                    <motion.li
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
                      animate={{ opacity: fade, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.38, ease: "easeOut" }}
                      style={{ listStyle: "none" }}
                    >
                      {isEra ? (
                        <div style={styles.eraRow}>
                          <div style={styles.eraDivLine} />
                          <span style={styles.eraGlyph}>❖</span>
                          <span style={styles.eraText}>{entry.text}</span>
                          <span style={styles.eraYear}>Yr.{entry.tickNumber}</span>
                          <div style={styles.eraDivLine} />
                        </div>
                      ) : (
                        <div className="chr-entry" style={styles.entry}>
                          <div style={styles.entryTop}>
                            <span style={{ ...styles.entityDot, background: entityColor, boxShadow: `0 0 5px ${entityColor}88` }} />
                            <span style={{ ...styles.entityName, color: entityColor }}>
                              {entityName || "The World"}
                            </span>
                            <div style={styles.topFlex} />
                            <span style={{ ...styles.badge, background: badge.bg, color: badge.textColor }}>
                              {badge.icon} {badge.label}
                            </span>
                            <span style={styles.year}>Yr.{entry.tickNumber}</span>
                          </div>
                          <div style={styles.entryBottom}>
                            <span style={styles.narration}>{entry.text}</span>
                          </div>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    background: [
      `repeating-linear-gradient(transparent, transparent 1.9rem, ${INK_RULE} 1.9rem, ${INK_RULE} calc(1.9rem + 1px))`,
      `linear-gradient(to bottom, rgba(200,163,105,0.97), rgba(185,148,92,0.98))`,
    ].join(", "),
    borderTop: "2px solid rgba(100,55,15,0.55)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.35rem 1.25rem",
    cursor: "pointer",
    userSelect: "none" as const,
    flexShrink: 0,
  },
  ruleWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  ruleThick: { height: "1.5px", background: "rgba(100,55,15,0.55)" },
  ruleThin:  { height: "0.5px", background: "rgba(100,55,15,0.3)" },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flexShrink: 0,
  },
  title: {
    fontSize: "0.6rem",
    fontVariant: "small-caps" as const,
    letterSpacing: "0.3em",
    color: "#3a1808",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap" as const,
    opacity: 0.75,
    transition: "opacity 0.15s",
  },
  titleOrnament: { fontSize: "0.45rem", color: "rgba(100,55,15,0.5)" },
  chevron: {
    fontSize: "0.65rem",
    color: "rgba(100,55,15,0.55)",
    flexShrink: 0,
    transition: "transform 0.25s ease",
    marginLeft: "0.25rem",
  },

  // Preview bar — shows latest entry when collapsed
  previewBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.18rem 1.25rem 0.3rem",
    borderTop: "1px solid rgba(100,55,15,0.15)",
  },
  previewText: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontStyle: "italic",
    fontSize: "0.7rem",
    color: "#5a3810",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
  },

  // Expanded list
  list: {
    overflowY: "auto" as const,
    maxHeight: "12rem",
    display: "flex",
    flexDirection: "column" as const,
    padding: "0.2rem 0 0.4rem",
    margin: 0,
  },

  // Normal entries — two-row layout
  entry: {
    padding: "0.22rem 1.25rem",
    borderBottom: "1px solid rgba(120,70,20,0.1)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.12rem",
  },
  entryTop: {
    display: "flex",
    alignItems: "center",
    gap: "0.32rem",
  },
  entityDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  entityName: {
    fontSize: "0.66rem",
    fontWeight: 700,
    fontFamily: "Georgia, serif",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    flexShrink: 0,
  },
  topFlex: { flex: 1 },
  badge: {
    fontSize: "0.44rem",
    fontFamily: "monospace",
    letterSpacing: "0.07em",
    padding: "0.08rem 0.32rem",
    borderRadius: "2px",
    flexShrink: 0,
    fontWeight: 600,
  },
  year: {
    fontSize: "0.48rem",
    color: "#5a3010",
    fontFamily: "monospace",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  entryBottom: {
    paddingLeft: "1.2rem",
  },
  narration: {
    fontSize: "0.69rem",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontStyle: "italic",
    color: "#3a2010",
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  } as CSSProperties,

  // Era entries
  eraRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.22rem 1.25rem",
    borderTop: "1px solid rgba(100,55,15,0.3)",
    borderBottom: "1px solid rgba(100,55,15,0.3)",
    margin: "0.12rem 0",
    background: "rgba(100,55,15,0.06)",
  },
  eraGlyph: {
    fontSize: "0.6rem",
    color: "#6b3010",
    flexShrink: 0,
    fontFamily: "Georgia, serif",
  },
  eraDivLine: {
    flex: "0 0 1.2rem",
    height: "1px",
    background: "rgba(100,55,15,0.4)",
  },
  eraText: {
    flex: 1,
    fontSize: "0.7rem",
    color: "#3a1800",
    fontFamily: "Georgia, serif",
    fontVariant: "small-caps" as const,
    letterSpacing: "0.05em",
    textAlign: "center" as const,
  },
  eraYear: {
    fontSize: "0.48rem",
    color: "#5a3010",
    fontFamily: "monospace",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
};

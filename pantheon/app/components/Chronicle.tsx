"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable } from "spacetimedb/react";
import { tables } from "../../src/module_bindings";

const ENTRY_ICONS: Record<string, string> = {
  action:  "⚔",
  miracle: "✦",
  event:   "◎",
  era:     "❖",
};

export function Chronicle() {
  const [chronicleEntries] = useTable(tables.chronicleEntry);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [newId, setNewId] = useState<number | null>(null);

  // Detect new entries for animation
  const prevLen = useRef(0);
  useEffect(() => {
    if (chronicleEntries.length > prevLen.current) {
      const sorted = [...chronicleEntries].sort((a, b) => b.tickNumber !== a.tickNumber ? b.tickNumber - a.tickNumber : b.id - a.id);
      if (sorted[0]) {
        setNewId(sorted[0].id);
        setTimeout(() => setNewId(null), 1200);
      }
    }
    prevLen.current = chronicleEntries.length;
  }, [chronicleEntries.length]);

  const visible = [...chronicleEntries]
    .sort((a, b) => b.tickNumber !== a.tickNumber ? b.tickNumber - a.tickNumber : b.id - a.id)
    .slice(0, 40);

  if (!visible.length) return null;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>The Chronicle</span>
        <span style={styles.headerRule} />
      </div>
      <div style={styles.entries}>
        {visible.map((entry, i) => {
          const accent = entry.civColor || entry.godColor || "#92400e";
          const isNew = entry.id === newId;
          const icon = ENTRY_ICONS[entry.entryType] ?? "·";
          const isEra = entry.entryType === "era";
          const isMiracle = entry.entryType === "miracle";

          return (
            <div
              key={entry.id}
              style={{
                ...styles.entry,
                ...(isNew ? styles.entryNew : {}),
                ...(isEra ? styles.entryEra : {}),
                opacity: Math.max(0.35, 1 - i * 0.16),
                borderLeftColor: accent,
              }}
            >
              <span style={{ ...styles.icon, color: accent }}>{icon}</span>
              <div style={styles.body}>
                <span
                  style={{
                    ...styles.text,
                    ...(isMiracle ? styles.miracleText : {}),
                    ...(isEra ? styles.eraText : {}),
                  }}
                >
                  {entry.text}
                </span>
                <span style={styles.tick}>Y {entry.tickNumber}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0px transparent; }
          50%       { box-shadow: 0 0 18px rgba(245,230,200,0.18); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: "100%",
    maxHeight: "12rem",
    overflowY: "auto",
    padding: "0.6rem 1.25rem 0.75rem",
    background: "rgba(7, 4, 1, 0.72)",
    backdropFilter: "blur(14px)",
    borderTop: "1px solid rgba(146, 64, 14, 0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "0.5rem",
  },
  headerLabel: {
    fontSize: "0.6rem",
    textTransform: "uppercase",
    letterSpacing: "0.22em",
    color: "#92400e",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap",
  },
  headerRule: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(to right, rgba(146,64,14,0.4), transparent)",
  },
  entries: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  entry: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    borderLeft: "2px solid #92400e",
    paddingLeft: "0.6rem",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    transition: "opacity 0.8s ease",
    animation: "slideUp 0.5s ease forwards",
  },
  entryNew: {
    animation: "slideUp 0.5s ease forwards, glowPulse 1.2s ease",
  },
  entryEra: {
    borderLeft: "2px solid #d4a017",
    background: "rgba(212,160,23,0.06)",
    borderRadius: "0 4px 4px 0",
    paddingRight: "0.5rem",
  },
  icon: {
    fontSize: "0.7rem",
    marginTop: "0.1rem",
    flexShrink: 0,
    fontFamily: "Georgia, serif",
  },
  body: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.6rem",
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: "0.78rem",
    color: "#c4b49a",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontStyle: "italic",
    lineHeight: 1.4,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miracleText: {
    color: "#e8d5a0",
  },
  eraText: {
    color: "#d4a017",
    fontStyle: "normal",
    fontWeight: "bold",
    letterSpacing: "0.03em",
  },
  tick: {
    fontSize: "0.6rem",
    color: "#5a4a38",
    fontFamily: "monospace",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
};

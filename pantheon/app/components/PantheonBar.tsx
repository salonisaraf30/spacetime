"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable } from "spacetimedb/react";
import { tables } from "../../src/module_bindings";

const BG = [
  `repeating-linear-gradient(transparent, transparent 1.55rem, rgba(100,55,15,0.12) 1.55rem, rgba(100,55,15,0.12) calc(1.55rem + 1px))`,
  `linear-gradient(to bottom, rgba(198,162,105,0.99), rgba(188,152,95,0.99))`,
].join(", ");

interface PantheonBarProps {
  connected: boolean;
  tick: number;
  year: number;
}

export function PantheonBar({ connected, tick, year }: PantheonBarProps) {
  const [gods] = useTable(tables.god);
  const [miracleCasts] = useTable(tables.miracleCast);
  const [pulsingGodId, setPulsingGodId] = useState<number | null>(null);

  const prevMiracleLen = useRef(0);
  useEffect(() => {
    if (miracleCasts.length > prevMiracleLen.current) {
      const sorted = [...miracleCasts].sort((a, b) => b.id - a.id);
      const latest = sorted[0];
      if (latest) {
        const god = gods.find(g => g.id === latest.godId);
        if (god) {
          setPulsingGodId(god.id);
          setTimeout(() => setPulsingGodId(null), 1800);
        }
      }
    }
    prevMiracleLen.current = miracleCasts.length;
  }, [miracleCasts.length, gods]);

  if (!gods.length) return null;

  return (
    <div style={styles.root}>
      {/* Double-rule bottom border matching Chronicle header */}
      <style>{`
        @keyframes orbPulse {
          0%   { transform: scale(1); box-shadow: 0 0 0 1px var(--c); }
          40%  { transform: scale(1.5); box-shadow: 0 0 0 3px var(--c), 0 0 14px var(--c); }
          100% { transform: scale(1); box-shadow: 0 0 0 1px var(--c); }
        }
      `}</style>

      {/* Left label with flanking rules */}
      <div style={styles.labelGroup}>
        <div style={styles.ruleWrap}>
          <div style={styles.ruleThick} />
          <div style={styles.ruleThin} />
        </div>
        <span style={styles.label}>✦ Pantheon ✦</span>
        <div style={styles.ruleWrap}>
          <div style={styles.ruleThick} />
          <div style={styles.ruleThin} />
        </div>
      </div>

      <div style={styles.divider} />

      {/* Gods */}
      <div style={styles.gods}>
        {gods.map(god => {
          const isPulsing = pulsingGodId === god.id;
          return (
            <div key={god.id} style={styles.godItem}>
              {/* Wax-seal orb */}
              <div
                style={{
                  ...styles.orb,
                  background: god.color + "22",
                  border: `2px solid ${god.color}`,
                  boxShadow: isPulsing
                    ? `0 0 0 3px ${god.color}44, 0 0 16px ${god.color}88`
                    : `0 0 0 1px ${god.color}33`,
                  transform: isPulsing ? "scale(1.3)" : "scale(1)",
                  transition: "box-shadow 0.3s ease, transform 0.3s ease",
                }}
              >
                <span style={{ ...styles.orbLetter, color: god.color }}>
                  {god.name.charAt(0)}
                </span>
              </div>
              <span style={{
                ...styles.godName,
                color: isPulsing ? god.color : "#2a1200",
                transition: "color 0.3s ease",
              }}>
                {god.name}
              </span>
              {isPulsing && (
                <span style={{ ...styles.flash, color: god.color }}>✦</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: status strip */}
      <div style={styles.statusStrip}>
        <div style={styles.divider} />
        <span style={styles.statusItem}>
          <span style={styles.statusKey}>Status</span>
          <span style={{ ...styles.statusVal, color: connected ? "#2a6e20" : "#8b4000" }}>
            {connected ? "Connected" : "Connecting"}
          </span>
        </span>
        <div style={styles.statusDot} />
        <span style={styles.statusItem}>
          <span style={styles.statusKey}>Tick</span>
          <span style={styles.statusVal}>{tick}</span>
        </span>
        <div style={styles.statusDot} />
        <span style={styles.statusItem}>
          <span style={styles.statusKey}>Year</span>
          <span style={styles.statusVal}>{year}</span>
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    padding: "0.4rem 1.25rem",
    background: BG,
    borderBottom: "2px solid rgba(100,55,15,0.55)",
    flexShrink: 0,
  },
  labelGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
  },
  ruleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    width: "1.5rem",
  },
  ruleThick: {
    height: "1.5px",
    background: "rgba(100,55,15,0.5)",
  },
  ruleThin: {
    height: "0.5px",
    background: "rgba(100,55,15,0.28)",
  },
  label: {
    fontSize: "0.85rem",
    fontVariant: "small-caps" as const,
    letterSpacing: "0.28em",
    color: "#3a1808",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap" as const,
  },
  divider: {
    width: "1.5px",
    height: "1rem",
    background: "rgba(100,55,15,0.4)",
    flexShrink: 0,
  },
  gods: {
    display: "flex",
    alignItems: "center",
    gap: "1.1rem",
    overflowX: "auto" as const,
    flexWrap: "nowrap" as const,
  },
  godItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flexShrink: 0,
    position: "relative" as const,
  },
  orb: {
    width: "1.4rem",
    height: "1.4rem",
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  orbLetter: {
    fontSize: "0.62rem",
    fontFamily: "Georgia, serif",
    lineHeight: 1,
  },
  godName: {
    fontSize: "0.72rem",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.04em",
    color: "#2a1200",
  },
  hint: {
    fontSize: "0.58rem",
    color: "#5a3010",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  statusStrip: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    flexShrink: 0,
  },
  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  statusKey: {
    fontSize: "0.52rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#5a3010",
    fontVariant: "small-caps" as const,
    fontFamily: "Georgia, serif",
  },
  statusVal: {
    fontSize: "0.7rem",
    fontWeight: "bold",
    color: "#2a1200",
    fontFamily: "Georgia, serif",
  },
  statusDot: {
    width: "3px",
    height: "3px",
    borderRadius: "50%",
    background: "rgba(100,55,15,0.35)",
    flexShrink: 0,
  },
  flash: {
    fontSize: "0.55rem",
    position: "absolute" as const,
    top: "-0.5rem",
    left: "0.3rem",
    animation: "fadeOut 1.8s ease forwards",
  },
};

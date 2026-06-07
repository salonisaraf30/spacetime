"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable } from "spacetimedb/react";
import { tables } from "../../src/module_bindings";

export function PantheonBar() {
  const [gods] = useTable(tables.god);
  const [miracleCasts] = useTable(tables.miracleCast);
  const [pulsingGodId, setPulsingGodId] = useState<number | null>(null);

  // Pulse god orb when a new miracle is cast
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
      <span style={styles.label}>Pantheon</span>
      <div style={styles.divider} />
      <div style={styles.gods}>
        {gods.map(god => {
          const isPulsing = pulsingGodId === god.id;
          return (
            <div key={god.id} style={styles.godItem}>
              <div
                style={{
                  ...styles.orb,
                  background: god.color,
                  boxShadow: isPulsing
                    ? `0 0 0 3px ${god.color}55, 0 0 24px ${god.color}88`
                    : `0 0 0 1px ${god.color}33`,
                  transform: isPulsing ? "scale(1.35)" : "scale(1)",
                  transition: "box-shadow 0.3s ease, transform 0.3s ease",
                }}
              />
              <span style={{
                ...styles.godName,
                color: isPulsing ? god.color : "#a89880",
                transition: "color 0.3s ease",
              }}>
                {god.name}
              </span>
              {isPulsing && (
                <span style={{ ...styles.miracleFlash, color: god.color }}>✦</span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes orbPulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    padding: "0.5rem 1.25rem",
    background: "rgba(7, 4, 1, 0.80)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(146, 64, 14, 0.25)",
  },
  label: {
    fontSize: "0.6rem",
    textTransform: "uppercase",
    letterSpacing: "0.22em",
    color: "#92400e",
    fontFamily: "Georgia, serif",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  divider: {
    width: "1px",
    height: "1rem",
    background: "rgba(146,64,14,0.35)",
    flexShrink: 0,
  },
  gods: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    overflowX: "auto",
    flexWrap: "nowrap",
  },
  godItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    flexShrink: 0,
    position: "relative",
  },
  orb: {
    width: "0.6rem",
    height: "0.6rem",
    borderRadius: "50%",
    flexShrink: 0,
  },
  godName: {
    fontSize: "0.72rem",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.04em",
    transition: "color 0.3s",
  },
  miracleFlash: {
    fontSize: "0.6rem",
    position: "absolute",
    top: "-0.5rem",
    left: "0",
    animation: "fadeOut 1.8s ease forwards",
  },
};

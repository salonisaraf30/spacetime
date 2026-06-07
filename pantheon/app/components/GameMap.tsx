"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";
import { TERRITORY_TO_PATH, TERRITORY_PATHS } from "../constants/territory-paths";

const EVENT_OVERLAYS: Record<string, string> = {
  plague:   "#7f0000",
  blessing: "#ffd700",
  comet:    "#ff6600",
  none:     "transparent",
};

interface GameMapProps {
  onTerritoryClick?: (territoryId: number) => void;
}

export function GameMap({ onTerritoryClick }: GameMapProps) {
  const [territories] = useTable(tables.territory);
  const [civilizations] = useTable(tables.civilization);
  const [worldMeta] = useTable(tables.worldMeta);
  const [alliances] = useTable(tables.alliance);
  const [miracleCasts] = useTable(tables.miracleCast);
  const [gods] = useTable(tables.god);
  const world = worldMeta[0];

  const MAP_W = 1380;
  const MAP_H = 752;

  const getFitView = () => {
    if (typeof window === 'undefined') return { scale: 1, x: 0, y: 0 };
    const scale = Math.min(window.innerWidth / MAP_W, window.innerHeight / MAP_H);
    return {
      scale,
      x: (window.innerWidth - MAP_W * scale) / 2,
      y: (window.innerHeight - MAP_H * scale) / 2,
    };
  };

  const clampView = (x: number, y: number, scale: number) => {
    const mapW = MAP_W * scale;
    const mapH = MAP_H * scale;
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    return {
      x: mapW <= vW ? (vW - mapW) / 2 : Math.min(0, Math.max(x, vW - mapW)),
      y: mapH <= vH ? (vH - mapH) / 2 : Math.min(0, Math.max(y, vH - mapH)),
    };
  };

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });

  // Set real fit view after mount (getFitView needs window, can't run on server)
  useEffect(() => { setView(getFitView()); }, []);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 });

  const { isActive: connected, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);
  const aiTickInProgressRef = useRef(false);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder()
      .subscribe([
        'SELECT * FROM territory',
        'SELECT * FROM civilization',
        'SELECT * FROM world_meta',
        'SELECT * FROM alliance',
        'SELECT * FROM miracle_cast',
        'SELECT * FROM chronicle_entry',
        'SELECT * FROM god',
      ]);
  }, [conn, connected]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const civColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const civ of civilizations) map[civ.id] = civ.color;
    return map;
  }, [civilizations]);

  // Flash map: territoryId → flash color, cleared after animation
  const [flashMap, setFlashMap] = useState<Record<number, string>>({});
  const prevMiracleCountRef = useRef(0);

  useEffect(() => {
    if (miracleCasts.length <= prevMiracleCountRef.current) return;
    prevMiracleCountRef.current = miracleCasts.length;

    const sorted = [...miracleCasts].sort((a, b) => b.id - a.id);
    const latest = sorted[0];
    if (!latest) return;

    const CIV_MIRACLES = ['bless', 'portent', 'inspire', 'reveal'];
    const targetsCiv = CIV_MIRACLES.includes(latest.miracleType);

    const affectedIds: number[] = targetsCiv
      ? territories.filter(t => t.ownerCivId === latest.targetId).map(t => t.id)
      : [latest.targetId];

    const color =
      latest.miracleType === 'curse'  ? '#ff1111' :
      latest.miracleType === 'strike' ? '#ff6600' :
      latest.miracleType === 'bless'  ? '#ffd700' :
      latest.miracleType === 'inspire'? '#00cfff' :
      latest.miracleType === 'portent'? '#cc88ff' :
      '#ffffff';

    setFlashMap(prev => {
      const next = { ...prev };
      for (const id of affectedIds) next[id] = color;
      return next;
    });

    setTimeout(() => {
      setFlashMap(prev => {
        const next = { ...prev };
        for (const id of affectedIds) delete next[id];
        return next;
      });
    }, 2200);
  }, [miracleCasts.length]);

  useEffect(() => {
    if (!world || !connected || !conn || aiTickInProgressRef.current) return;
    aiTickInProgressRef.current = true;
    const recentMiracles = miracleCasts.filter(
      (m) => m.tickNumber >= world.tickCount - 3
    );
    fetch("/api/ai-tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ civs: civilizations, territories, alliances, worldMeta: world, recentMiracles, gods: gods.map(g => ({ id: g.id, name: g.name, color: g.color })) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.decisions) return;
        for (const { civId, decision } of data.decisions) {
          conn.reducers.applyCivDecision({
            civId,
            action: decision.action,
            target: decision.target,
            narration: decision.narration,
            thought: decision.thought,
          });
        }
      })
      .catch(console.error)
      .finally(() => { aiTickInProgressRef.current = false; });
  }, [world?.tickCount]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "0") setView(getFitView());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clampScale = (s: number) => {
    const minScale = Math.min(window.innerWidth / MAP_W, window.innerHeight / MAP_H);
    return Math.min(3.5, Math.max(minScale, s));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stageRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: view.x, originY: view.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    setView(v => {
      const rawX = dragRef.current.originX + e.clientX - dragRef.current.startX;
      const rawY = dragRef.current.originY + e.clientY - dragRef.current.startY;
      return { ...v, ...clampView(rawX, rawY, v.scale) };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setView(v => {
      const nextScale = clampScale(v.scale * factor);
      const worldX = (cursorX - v.x) / v.scale;
      const worldY = (cursorY - v.y) / v.scale;
      const rawX = cursorX - worldX * nextScale;
      const rawY = cursorY - worldY * nextScale;
      return { scale: nextScale, ...clampView(rawX, rawY, nextScale) };
    });
  };

  // Build territory counts per civ
  const terrCountByCiv = useMemo(() => {
    const map: Record<number, number> = {};
    for (const t of territories) {
      if (t.ownerCivId >= 0) map[t.ownerCivId] = (map[t.ownerCivId] ?? 0) + 1;
    }
    return map;
  }, [territories]);

  // Build territory name lists per civ
  const terrNamesByCiv = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const t of territories) {
      if (t.ownerCivId >= 0) {
        if (!map[t.ownerCivId]) map[t.ownerCivId] = [];
        map[t.ownerCivId].push(t.name);
      }
    }
    return map;
  }, [territories]);

  return (
    <main className="map-app">
      <div className="hud hud-left">
        <p className="eyebrow">SpacetimeDB live pipe</p>
        <h1>Pantheon</h1>
        <p className="subtitle">Drag to pan · Scroll to zoom · 0 to reset</p>
      </div>

      <div className="hud hud-right">
        <div className="status-chip compact">
          <span>Status</span>
          <strong className={connected ? "good" : "warn"}>
            {connected ? "Connected" : "Connecting"}
          </strong>
        </div>
        <div className="status-chip compact">
          <span>Tick</span>
          <strong>{world?.tickCount ?? 0}</strong>
        </div>
        <div className="status-chip compact">
          <span>Year</span>
          <strong>{world?.currentYear ?? 1}</strong>
        </div>
      </div>

      {/* Bottom-left: civ stats + territory legend */}
      {civilizations.length > 0 && (
        <div style={civPanelStyle}>
          <div style={civPanelHeader}>Civilizations</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ color: "#6b5a47", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                <th style={{ ...th, textAlign: "left" }}>Civ</th>
                <th style={th}>Pop</th>
                <th style={th}>Tech</th>
                <th style={th}>Agg</th>
                <th style={th}>Pie</th>
                <th style={th}>Terr</th>
              </tr>
            </thead>
            <tbody>
              {[...civilizations].sort((a, b) => a.id - b.id).map(civ => {
                const terrCount = terrCountByCiv[civ.id] ?? 0;
                const terrNames = terrNamesByCiv[civ.id] ?? [];
                return (
                  <tr key={civ.id} title={terrNames.join(", ")} style={{ opacity: civ.isAlive ? 1 : 0.4, cursor: "default" }}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <div style={{ width: "0.55rem", height: "0.55rem", borderRadius: "50%", background: civ.color, flexShrink: 0 }} />
                        <span style={{ color: "#d4c5a9", fontWeight: "bold", fontSize: "0.68rem" }}>{civ.name}</span>
                      </div>
                    </td>
                    <td style={td}>{civ.population}</td>
                    <td style={td}>{civ.techLevel}</td>
                    <td style={td}>{civ.aggression}</td>
                    <td style={td}>{civ.piety}</td>
                    <td style={{ ...td, color: civ.color, fontWeight: "bold" }}>{terrCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Territory → Civ legend */}
          <div style={legendDivider} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", maxHeight: "140px", overflowY: "auto" }}>
            {territories
              .filter(t => t.ownerCivId >= 0)
              .sort((a, b) => a.ownerCivId - b.ownerCivId)
              .map(t => {
                const civ = civilizations.find(c => c.id === t.ownerCivId);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "0.45rem", height: "0.45rem", borderRadius: "50%", background: civ?.color ?? "#888", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.62rem", color: "#a89880" }}>{t.name}</span>
                    {t.currentEvent !== "none" && (
                      <span style={{ fontSize: "0.55rem", color: t.currentEvent === "plague" ? "#7f0000" : "#ff6600" }}>
                        {t.currentEvent === "plague" ? "☠" : "☄"}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div
        ref={stageRef}
        className="map-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="map-viewport"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {/* Layer 1: fantasy map image */}
          <img
            src="/map.png"
            alt="Pantheon world map"
            className="map-image"
            draggable={false}
          />

          {/* Layer 2: SVG overlay for civ colors, events, and click handling */}
          <svg
            ref={svgRef}
            viewBox="0 0 1380 752"
            preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "all" }}
          >
            <defs>
              <style>{`
                @keyframes miracleFlash {
                  0%   { opacity: 0.85; }
                  30%  { opacity: 0.95; }
                  100% { opacity: 0; }
                }
                @keyframes miraclePulse {
                  0%, 100% { opacity: 0.15; }
                  50%       { opacity: 0.55; }
                }
              `}</style>
            </defs>
            {/* DEBUG: static borders — visible even when DB is empty */}
            {Object.entries(TERRITORY_PATHS).map(([id, d]) => (
              <path key={`debug-${id}`} d={d} fill="none" stroke="red" strokeWidth="2" />
            ))}
            {territories.map(territory => {
              const pathId = TERRITORY_TO_PATH[territory.id];
              if (!pathId || !TERRITORY_PATHS[pathId]) return null;

              const fillColor = territory.ownerCivId >= 0
                ? (civColorMap[territory.ownerCivId] ?? "transparent")
                : "transparent";
              const eventColor = EVENT_OVERLAYS[territory.currentEvent] ?? "transparent";

              return (
                <g key={territory.id} style={{ pointerEvents: "all" }}>
                  <path
                    d={TERRITORY_PATHS[pathId]}
                    fill={fillColor}
                    fillOpacity={fillColor === "transparent" ? 0 : 0.35}
                    stroke="red"
                    strokeWidth="2"
                    style={{ cursor: "pointer", transition: "fill 0.7s" }}
                    onClick={() => onTerritoryClick?.(territory.id)}
                  />
                  {eventColor !== "transparent" && (
                    <path
                      d={TERRITORY_PATHS[pathId]}
                      fill={eventColor}
                      fillOpacity={0.25}
                      stroke={eventColor}
                      strokeWidth="2"
                      strokeOpacity={0.5}
                      style={{ pointerEvents: "none", animation: "miraclePulse 2s infinite" }}
                    />
                  )}
                </g>
              );
            })}

            {/* Miracle flash layer — top of stack, fades out */}
            {Object.entries(flashMap).map(([idStr, color]) => {
              const pathId = TERRITORY_TO_PATH[Number(idStr)];
              if (!pathId || !TERRITORY_PATHS[pathId]) return null;
              return (
                <path
                  key={`flash-${idStr}`}
                  d={TERRITORY_PATHS[pathId]}
                  fill={color}
                  stroke={color}
                  strokeWidth="3"
                  style={{ pointerEvents: "none", animation: "miracleFlash 2.2s ease-out forwards" }}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </main>
  );
}

const civPanelStyle = {
  position: "absolute" as const,
  top: "11rem",
  right: "1rem",
  zIndex: 3,
  pointerEvents: "auto" as const,
  background: "rgba(7, 4, 1, 0.82)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(146,64,14,0.3)",
  borderRadius: "0.6rem",
  padding: "0.6rem 0.75rem",
  width: "min(22rem, calc(100vw - 2rem))",
  maxHeight: "calc(100vh - 14rem)",
  overflowY: "auto" as const,
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#a89880",
};

const civPanelHeader = {
  fontSize: "0.58rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
  color: "#92400e",
  marginBottom: "0.45rem",
};

const legendDivider = {
  height: "1px",
  background: "rgba(146,64,14,0.2)",
  margin: "0.45rem 0",
};

const th = {
  textAlign: "right" as const,
  padding: "0.15rem 0.4rem",
  fontWeight: "normal" as const,
};

const td = {
  textAlign: "right" as const,
  padding: "0.2rem 0.4rem",
  fontSize: "0.68rem",
  color: "#8a7a68",
};

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
  const [territories, territoriesLoading] = useTable(tables.territory);
  const [civilizations] = useTable(tables.civilization);
  const [worldMeta] = useTable(tables.worldMeta);
  const [alliances] = useTable(tables.alliance);
  const [miracleCasts] = useTable(tables.miracleCast);
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
  const [view, setView] = useState(getFitView);
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
      ]);
  }, [conn, connected]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const civColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const civ of civilizations) map[civ.id] = civ.color;
    return map;
  }, [civilizations]);

  useEffect(() => {
    if (!world || !connected || !conn) return;
    const recentMiracles = miracleCasts.filter(
      (m) => m.tickNumber >= world.tickCount - 3
    );
    fetch("/api/ai-tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ civs: civilizations, territories, alliances, worldMeta: world, recentMiracles }),
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
      .catch(console.error);
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
            {/* DEBUG: static borders — visible even when DB is empty */}
            {Object.entries(TERRITORY_PATHS).map(([id, d]) => (
              <path key={`debug-${id}`} d={d} fill="none" stroke="red" strokeWidth="2" />
            ))}
            {!territoriesLoading && territories.map(territory => {
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
                      style={{ pointerEvents: "none", animation: "pulse 2s infinite" }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </main>
  );
}

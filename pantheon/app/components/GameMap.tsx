"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, reducers, tables } from "../../src/module_bindings";
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
  const world = worldMeta[0];

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
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
    console.log("[sub] subscribing...");
    try {
      conn.subscriptionBuilder()
        .onApplied(() => console.log("[GameMap] subscription applied"))
        .onError((e: unknown) => console.error("[GameMap] subscription error:", e))
        .subscribe(['SELECT * FROM world_meta']);
    } catch (e) {
      console.error("[sub] error:", e);
    }
  }, [conn, connected]);

  const [svgCursor, setSvgCursor] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const civColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const civ of civilizations) map[civ.id] = civ.color;
    return map;
  }, [civilizations]);

  useEffect(() => {
    console.log("[GameMap] connected:", connected, "worldMeta:", worldMeta.length, "territories:", territories.length, "civs:", civilizations.length);
  }, [connected, worldMeta, territories, civilizations]);

  useEffect(() => {
    if (!world || !connected) return;
    console.log("[GameMap] tick fired:", world.tickCount);
    fetch("/api/ai-tick", { method: "POST" }).catch(console.error);
  }, [world?.tickCount]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "0") setView({ scale: 1, x: 0, y: 0 });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clampScale = (s: number) => Math.min(3.5, Math.max(0.65, s));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stageRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originX: view.x, originY: view.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    setView(v => ({ ...v, x: dragRef.current.originX + e.clientX - dragRef.current.startX, y: dragRef.current.originY + e.clientY - dragRef.current.startY }));
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
      return { scale: nextScale, x: cursorX - worldX * nextScale, y: cursorY - worldY * nextScale };
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
            onMouseMove={(e) => {
              const svg = svgRef.current;
              if (!svg) return;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX; pt.y = e.clientY;
              const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
              setSvgCursor({ x: Math.round(p.x), y: Math.round(p.y) });
            }}
            onMouseLeave={() => setSvgCursor(null)}
          >
            {/* DEBUG: coordinate display */}
            {svgCursor && (
              <text x={svgCursor.x + 6} y={svgCursor.y - 6} fill="yellow" fontSize="14" fontFamily="monospace" style={{ pointerEvents: "none" }}>
                {svgCursor.x},{svgCursor.y}
              </text>
            )}
          {/* DEBUG: show all paths without DB data */}
            {Object.entries(TERRITORY_PATHS).map(([id, d]) => (
              <path key={id} d={d} fill="none" stroke="red" strokeWidth="2" />
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

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
  pulseEventCivId?: number | null;
}

export function GameMap({ onTerritoryClick, pulseEventCivId = null }: GameMapProps) {
  const [territories] = useTable(tables.territory);
  const [civilizations] = useTable(tables.civilization);
  const [worldMeta] = useTable(tables.worldMeta);
  const [alliances] = useTable(tables.alliance);
  const [miracleCasts] = useTable(tables.miracleCast);
  const [gods] = useTable(tables.god);
  const world = worldMeta[0];

  const { isActive: connected, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);
  const aiTickInProgressRef = useRef(false);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe([
      'SELECT * FROM territory',
      'SELECT * FROM civilization',
      'SELECT * FROM world_meta',
      'SELECT * FROM alliance',
      'SELECT * FROM miracle_cast',
      'SELECT * FROM chronicle_entry',
      'SELECT * FROM god',
    ]);
  }, [conn, connected]);

  const civColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const civ of civilizations) map[civ.id] = civ.color;
    return map;
  }, [civilizations]);

  const [flashMap, setFlashMap] = useState<Record<number, { color: string; type: string }>>({});
  const [shaking, setShaking] = useState(false);
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
      latest.miracleType === 'curse'   ? '#cc0000' :
      latest.miracleType === 'strike'  ? '#ff8800' :
      latest.miracleType === 'bless'   ? '#ffd700' :
      latest.miracleType === 'inspire' ? '#00cfff' :
      latest.miracleType === 'portent' ? '#cc88ff' :
      '#ffffff';

    if (latest.miracleType === 'strike') {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }

    setFlashMap(prev => {
      const next = { ...prev };
      for (const id of affectedIds) next[id] = { color, type: latest.miracleType };
      return next;
    });

    setTimeout(() => {
      setFlashMap(prev => {
        const next = { ...prev };
        for (const id of affectedIds) delete next[id];
        return next;
      });
    }, 3000);
  }, [miracleCasts.length]);

  useEffect(() => {
    if (!world || !connected || !conn || aiTickInProgressRef.current) return;
    aiTickInProgressRef.current = true;
    const recentMiracles = miracleCasts.filter(m => m.tickNumber >= world.tickCount - 8);
    fetch("/api/ai-tick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ civs: civilizations, territories, alliances, worldMeta: world, recentMiracles, gods: gods.map(g => ({ id: g.id, name: g.name, color: g.color })) }),
    })
      .then(r => r.json())
      .then(data => {
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

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const tidAttr = (e.target as Element).closest('[data-tid]')?.getAttribute('data-tid');
    if (tidAttr != null) onTerritoryClick?.(Number(tidAttr));
  }

  return (
    <main className="map-app">
      <div className="map-stage" onClick={handleClick}>
        <div style={{ width: "100%", height: "100%", position: "relative", animation: shaking ? "screenShake 0.6s ease-out forwards" : undefined }}>
          <img src="/map.png" alt="Pantheon world map" className="map-image" draggable={false} />

          <svg
            viewBox="0 0 1380 752"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "all" }}
          >
            <defs>
              <style>{`
                .miracle-path { transform-box: fill-box; transform-origin: center; }

                @keyframes strikeBlast {
                  0%   { opacity: 1; }
                  20%  { opacity: 0.9; }
                  100% { opacity: 0; }
                }
                @keyframes strikeRing1 {
                  0%   { opacity: 0.85; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.3); }
                }
                @keyframes strikeRing2 {
                  0%   { opacity: 0.6; transform: scale(1.05); }
                  100% { opacity: 0; transform: scale(1.5); }
                }
                @keyframes curseBleed {
                  0%   { opacity: 0.75; }
                  40%  { opacity: 0.6; }
                  100% { opacity: 0; }
                }
                @keyframes curseRing1 {
                  0%   { opacity: 0.55; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.25); }
                }
                @keyframes curseRing2 {
                  0%   { opacity: 0.4; transform: scale(1.08); }
                  100% { opacity: 0; transform: scale(1.4); }
                }
                @keyframes blessRadiance {
                  0%   { opacity: 0; }
                  18%  { opacity: 0.85; }
                  100% { opacity: 0; }
                }
                @keyframes blessRing1 {
                  0%   { opacity: 0.7; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.3); }
                }
                @keyframes blessRing2 {
                  0%   { opacity: 0.5; transform: scale(1.06); }
                  100% { opacity: 0; transform: scale(1.5); }
                }
                @keyframes portentFlash {
                  0%   { opacity: 0.65; }
                  100% { opacity: 0; }
                }
                @keyframes portentRipple1 {
                  0%   { opacity: 0.6; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.2); }
                }
                @keyframes portentRipple2 {
                  0%   { opacity: 0.45; transform: scale(1.04); }
                  100% { opacity: 0; transform: scale(1.35); }
                }
                @keyframes portentRipple3 {
                  0%   { opacity: 0.3; transform: scale(1.08); }
                  100% { opacity: 0; transform: scale(1.5); }
                }
                @keyframes inspireFlash {
                  0%   { opacity: 0; }
                  12%  { opacity: 0.9; }
                  100% { opacity: 0; }
                }
                @keyframes inspireRing1 {
                  0%   { opacity: 0.7; transform: scale(1); }
                  100% { opacity: 0; transform: scale(1.28); }
                }
                @keyframes inspireRing2 {
                  0%   { opacity: 0.45; transform: scale(1.05); }
                  100% { opacity: 0; transform: scale(1.45); }
                }
                @keyframes revealScan {
                  0%   { opacity: 0.6; }
                  100% { opacity: 0; }
                }
                @keyframes miraclePulse {
                  0%, 100% { opacity: 0.15; }
                  50%       { opacity: 0.55; }
                }
                @keyframes civPulse {
                  0%   { stroke-opacity: 0.9; stroke-width: 6px; }
                  50%  { stroke-opacity: 0.55; stroke-width: 10px; }
                  100% { stroke-opacity: 0; stroke-width: 16px; }
                }
                @keyframes screenShake {
                  0%   { translate: 0 0; }
                  10%  { translate: -6px -3px; }
                  20%  { translate: 6px 4px; }
                  32%  { translate: -4px 5px; }
                  44%  { translate: 5px -4px; }
                  56%  { translate: -3px 3px; }
                  68%  { translate: 3px -2px; }
                  80%  { translate: -1px 1px; }
                  100% { translate: 0 0; }
                }
              `}</style>
            </defs>

            {territories.map(territory => {
              const pathId = TERRITORY_TO_PATH[territory.id];
              if (!pathId || !TERRITORY_PATHS[pathId]) return null;

              const fillColor = territory.ownerCivId >= 0
                ? (civColorMap[territory.ownerCivId] ?? "transparent")
                : "transparent";
              const eventColor = EVENT_OVERLAYS[territory.currentEvent] ?? "transparent";

              return (
                <g key={territory.id} data-tid={territory.id} style={{ pointerEvents: "all", cursor: "pointer" }}>
                  <path
                    d={TERRITORY_PATHS[pathId]}
                    fill={fillColor}
                    fillOpacity={fillColor === "transparent" ? 0 : 0.35}
                    style={{ transition: "fill 0.7s" }}
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
                  {pulseEventCivId != null && territory.ownerCivId === pulseEventCivId && (
                    <path
                      className="miracle-path"
                      d={TERRITORY_PATHS[pathId]}
                      fill="none"
                      stroke={civColorMap[pulseEventCivId] ?? "#ffffff"}
                      style={{ pointerEvents: "none", animation: "civPulse 1.4s ease-out 2 forwards" }}
                    />
                  )}
                </g>
              );
            })}

            {Object.entries(flashMap).map(([idStr, { color, type }]) => {
              const pathId = TERRITORY_TO_PATH[Number(idStr)];
              if (!pathId || !TERRITORY_PATHS[pathId]) return null;
              const d = TERRITORY_PATHS[pathId];
              const ps = { pointerEvents: "none" as const };
              const mp = "miracle-path";

              if (type === 'strike') return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#ffffff" stroke="#ff8800" strokeWidth="2" style={{ animation: "strikeBlast 0.7s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#ff8800" strokeWidth="5" style={{ animation: "strikeRing1 1.2s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#ff4400" strokeWidth="3" style={{ animation: "strikeRing2 1.6s ease-out 0.1s forwards" }} />
                </g>
              );
              if (type === 'curse') return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#880000" stroke="#cc0000" strokeWidth="2" style={{ animation: "curseBleed 2.8s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#cc0000" strokeWidth="4" style={{ animation: "curseRing1 1.8s ease-out 0.2s forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#880000" strokeWidth="3" style={{ animation: "curseRing2 2.4s ease-out 0.5s forwards" }} />
                </g>
              );
              if (type === 'bless') return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#ffd700" stroke="#ffee66" strokeWidth="2" style={{ animation: "blessRadiance 2.2s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#ffd700" strokeWidth="4" style={{ animation: "blessRing1 1.6s ease-out 0.15s forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#ffee88" strokeWidth="2" style={{ animation: "blessRing2 2.2s ease-out 0.4s forwards" }} />
                </g>
              );
              if (type === 'portent') return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#6600aa" stroke="#cc88ff" strokeWidth="2" style={{ animation: "portentFlash 2.6s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#cc88ff" strokeWidth="4" style={{ animation: "portentRipple1 1.4s ease-out 0s forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#aa66cc" strokeWidth="3" style={{ animation: "portentRipple2 1.8s ease-out 0.25s forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#884499" strokeWidth="2" style={{ animation: "portentRipple3 2.2s ease-out 0.5s forwards" }} />
                </g>
              );
              if (type === 'inspire') return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#00aaff" stroke="#00cfff" strokeWidth="2" style={{ animation: "inspireFlash 1.8s ease-out forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#00cfff" strokeWidth="4" style={{ animation: "inspireRing1 1.4s ease-out 0.1s forwards" }} />
                  <path className={mp} d={d} fill="none" stroke="#0088cc" strokeWidth="2" style={{ animation: "inspireRing2 2s ease-out 0.3s forwards" }} />
                </g>
              );
              return (
                <g key={`flash-${idStr}`} style={ps}>
                  <path className={mp} d={d} fill="#ffffff" stroke="#ffffff" strokeWidth="2" style={{ animation: "revealScan 1.6s ease-out forwards" }} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </main>
  );
}

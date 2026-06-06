'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTable, useSpacetimeDB } from 'spacetimedb/react';
import { tables } from '../src/module_bindings';

const TERRITORY_POSITIONS: Record<number, { top: string; left: string }> = {
  0: { top: '29%', left: '31%' },
  1: { top: '47%', left: '78%' },
  2: { top: '42%', left: '53%' },
  3: { top: '73%', left: '83%' },
  4: { top: '21%', left: '47%' },
  5: { top: '35%', left: '15%' },
  6: { top: '43%', left: '67%' },
  7: { top: '34%', left: '62%' },
  8: { top: '53%', left: '22%' },
  9: { top: '56%', left: '72%' },
  10: { top: '18%', left: '67%' },
  11: { top: '62%', left: '46%' },
  12: { top: '68%', left: '59%' },
  13: { top: '74%', left: '64%' },
  14: { top: '49%', left: '39%' },
  15: { top: '62%', left: '88%' },
  16: { top: '80%', left: '74%' },
  17: { top: '44%', left: '11%' },
};

const TERRAIN_LABEL: Record<string, string> = {
  plains: 'Plains',
  mountain: 'Mountain',
  river: 'River',
  coast: 'Coast',
  forest: 'Forest',
};

export function WorldMap() {
  const { isActive: connected } = useSpacetimeDB();
  const [territories, territoriesLoading] = useTable(tables.territory);
  const [civilizations] = useTable(tables.civilization);
  const [worldMeta] = useTable(tables.worldMeta);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const civById = useMemo(() => {
    const map = new Map<number, (typeof civilizations)[number]>();
    for (const civ of civilizations) map.set(civ.id, civ);
    return map;
  }, [civilizations]);

  const world = worldMeta[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '0') {
        setView({ scale: 1, x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const clampScale = (nextScale: number) => Math.min(3.5, Math.max(0.65, nextScale));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = stageRef.current;
    if (!el) return;
    el.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setView((current) => ({
      ...current,
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const el = stageRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const direction = event.deltaY > 0 ? -1 : 1;
    const zoomFactor = direction > 0 ? 1.08 : 0.92;

    setView((current) => {
      const nextScale = clampScale(current.scale * zoomFactor);
      const worldX = (cursorX - current.x) / current.scale;
      const worldY = (cursorY - current.y) / current.scale;
      return {
        scale: nextScale,
        x: cursorX - worldX * nextScale,
        y: cursorY - worldY * nextScale,
      };
    });
  };

  return (
    <main className="map-app">
      <div className="hud hud-left">
        <p className="eyebrow">SpacetimeDB live pipe</p>
        <h1>Pantheon</h1>
        <p className="subtitle">
          Drag to pan. Scroll to zoom. Press `0` to reset.
        </p>
      </div>

      <div className="hud hud-right">
        <div className="status-chip compact">
          <span>Status</span>
          <strong className={connected ? 'good' : 'warn'}>
            {connected ? 'Connected' : 'Connecting'}
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
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <img
            src="/fantasy_map.svg"
            alt="Fantasy world map"
            className="map-image"
            draggable={false}
          />
          <div className="territory-layer">
            {!territoriesLoading &&
              territories.map((territory) => {
                const civ =
                  territory.ownerCivId >= 0
                    ? civById.get(territory.ownerCivId)
                    : undefined;
                const position = TERRITORY_POSITIONS[territory.id] ?? {
                  top: '50%',
                  left: '50%',
                };

                return (
                  <div
                    key={territory.id}
                    className={`territory-pin ${territory.ownerCivId >= 0 ? 'claimed' : 'unclaimed'}`}
                    style={position}
                  >
                    <div
                      className="territory-dot"
                      style={{
                        background: civ?.color ?? 'rgba(255,255,255,0.7)',
                        boxShadow: civ ? `0 0 0 6px ${civ.color}22` : 'none',
                      }}
                    />
                    <div className="territory-label">
                      <strong>{territory.name}</strong>
                      <span>
                        {civ
                          ? `${civ.name} · ${civ.color}`
                          : `Unclaimed · ${TERRAIN_LABEL[territory.terrainType] ?? territory.terrainType}`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </main>
  );
}

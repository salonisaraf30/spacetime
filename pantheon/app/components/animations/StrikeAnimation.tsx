"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { C, overlayStyle } from "./shared";

interface Props {
  targetPosition: { x: number; y: number };
  onComplete: () => void;
  territoryName?: string;
}

function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const NUM_EMBERS = 25;

const shakeKeyframes = {
  x: [0, -8, 8, -7, 7, -5, 5, -3, 3, -1, 1, 0],
  y: [0, 5, -5, 6, -4, 4, -3, 3, -2, 2, -1, 0],
};
const shakeTimes = [0, 0.08, 0.17, 0.25, 0.33, 0.42, 0.5, 0.58, 0.67, 0.75, 0.83, 1];

export function StrikeAnimation({ targetPosition, onComplete, territoryName }: Props) {
  const { x, y } = targetPosition;
  const [showFlash, setShowFlash] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Compute meteor data once, using real viewport dimensions
  const meteors = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;

    // 14 pre-impact meteors fan across the whole sky from upper-right
    const pre = Array.from({ length: 14 }, (_, i) => {
      // Angle: 195-235 degrees (lower-left direction)
      const angleDeg = 195 + sr(i * 3) * 40;
      const angleRad = (angleDeg * Math.PI) / 180;
      // Start off the right edge, spread vertically across top half
      const startX = vw + 80 + sr(i * 7) * 300;
      const startY = -60 + sr(i * 11) * (vh * 0.55);
      // Travel far enough to cross the viewport
      const dist = vw * 1.4 + sr(i * 13) * vw * 0.6;
      return {
        startX,
        startY,
        dx: Math.cos(angleRad) * dist,
        dy: Math.sin(angleRad) * dist,
        trailLen: 120 + sr(i * 17) * 180,
        thickness: 1.5 + sr(i * 19) * 2.5,
        delay: sr(i * 5) * 0.38,
        duration: 0.32 + sr(i * 23) * 0.2,
        color: sr(i * 29) > 0.55 ? C.gold : "#ffffff",
        angleDeg,
        isPost: false,
      };
    });

    // 8 post-impact debris streaks radiating outward from impact
    const post = Array.from({ length: 8 }, (_, i) => {
      const angleDeg = (i / 8) * 360 + sr(i * 41) * 30 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dist = 180 + sr(i * 43) * 220;
      return {
        startX: x,
        startY: y,
        dx: Math.cos(angleRad) * dist,
        dy: Math.sin(angleRad) * dist,
        trailLen: 50 + sr(i * 17) * 60,
        thickness: 1.5 + sr(i * 31) * 2,
        delay: 0.66 + sr(i * 37) * 0.3,
        duration: 0.4 + sr(i * 23) * 0.25,
        color: sr(i * 53) > 0.4 ? "#FF6600" : "#FF8C00",
        angleDeg,
        isPost: true,
      };
    });

    return [...pre, ...post];
  }, [x, y]);

  const cometStartX = x + 700;
  const cometStartY = y - 480;

  const embers = useMemo(() => Array.from({ length: NUM_EMBERS }, (_, i) => {
    const angle = (i / NUM_EMBERS) * 360 + sr(i * 7) * 15;
    const rad = (angle * Math.PI) / 180;
    const speed = 60 + sr(i * 11) * 160;
    return {
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed - 100,
      delay: 0.62 + sr(i * 13) * 0.1,
      size: 3 + sr(i * 17) * 5,
      color: sr(i * 19) > 0.5 ? "#FF8C00" : "#FF4500",
    };
  }), []);

  const shockwaves = [
    { delay: 0.62, maxR: 160 },
    { delay: 0.77, maxR: 230 },
    { delay: 0.92, maxR: 300 },
  ];

  useEffect(() => {
    const flashTimer = setTimeout(() => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 80);
    }, 580);
    const bannerTimer = setTimeout(() => setShowBanner(true), 1400);
    const bannerOutTimer = setTimeout(() => setShowBanner(false), 3400);
    const completeTimer = setTimeout(onComplete, 4100);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(bannerTimer);
      clearTimeout(bannerOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      {/* White viewport flash at impact */}
      {showFlash && (
        <div style={{ position: "fixed", inset: 0, background: "white", zIndex: 10010, pointerEvents: "none" }} />
      )}

      {/* ── METEOR SHOWER (HTML divs, fixed, no clipping) ── */}
      {meteors.map((m, i) => {
        // The div is an elongated strip pointing in travel direction.
        // We place it so its right edge (the bright "head") starts at (m.startX, m.startY).
        // Then animate x/y to move it across the screen.
        return (
          <motion.div
            key={`meteor-${i}`}
            style={{
              position: "fixed",
              // Place left edge so right edge sits at startX
              left: m.startX - m.trailLen,
              top: m.startY - m.thickness / 2,
              width: m.trailLen,
              height: Math.max(m.thickness, 2),
              // Gradient: transparent at tail (left), bright at head (right)
              background: `linear-gradient(to right, transparent, ${m.color})`,
              borderRadius: "0 999px 999px 0",
              // Rotate around the right edge (head) so the tail swings correctly
              transformOrigin: "right center",
              // boxShadow gives a bit of glow
              boxShadow: `0 0 ${m.thickness * 3}px ${m.thickness}px ${m.color}88`,
              zIndex: 10000,
            }}
            initial={{ rotate: m.angleDeg, x: 0, y: 0, opacity: 0 }}
            animate={{
              // x/y move in screen space regardless of rotation — correct behaviour
              x: [0, m.dx],
              y: [0, m.dy],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              delay: m.delay,
              duration: m.duration,
              times: [0, 0.05, 0.75, 1],
              ease: "linear",
            }}
          />
        );
      })}

      {/* ── SCREEN SHAKE WRAPPER (impact + aftermath) ── */}
      <motion.div
        style={{ position: "fixed", inset: 0 }}
        initial={{ x: 0, y: 0 }}
        animate={shakeKeyframes}
        transition={{ delay: 0.6, duration: 0.7, times: shakeTimes }}
      >
        {/* Main comet core */}
        <motion.div
          style={{
            position: "absolute",
            left: cometStartX,
            top: cometStartY,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "radial-gradient(circle, white 30%, #93C5FD 70%)",
            boxShadow: "0 0 24px 10px white, 0 0 50px 20px #93C5FD",
            zIndex: 10002,
          }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{
            x: [0, -(cometStartX - x)],
            y: [0, -(cometStartY - y)],
            scale: [0.4, 1.0, 3.5],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, times: [0, 0.85, 1], ease: "easeIn" }}
        />

        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
        >
          <defs>
            <filter id="strike-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="strike-trail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="60%" stopColor="#FF8C00" stopOpacity="0.4" />
              <stop offset="100%" stopColor="white" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Main comet trail */}
          <motion.line
            x1={cometStartX - 400} y1={cometStartY - 280}
            x2={cometStartX} y2={cometStartY}
            stroke="url(#strike-trail)"
            strokeWidth="10"
            filter="url(#strike-glow)"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.9, 0],
              x1: [cometStartX - 400, x - 400],
              y1: [cometStartY - 280, y - 280],
              x2: [cometStartX, x],
              y2: [cometStartY, y],
            }}
            transition={{ duration: 0.6, times: [0, 0.5, 1] }}
          />

          {/* Explosion bloom */}
          <motion.circle
            cx={x} cy={y} r={0}
            fill="#FF8C00"
            filter="url(#strike-glow)"
            initial={{ r: 0, opacity: 0.9 }}
            animate={{ r: [0, 80, 200], opacity: [0.9, 0.6, 0] }}
            transition={{ delay: 0.61, duration: 0.6, times: [0, 0.3, 1] }}
          />

          {/* Shockwave rings */}
          {shockwaves.map((sw, i) => (
            <motion.circle
              key={i}
              cx={x} cy={y} r={0}
              fill="none"
              stroke="#FF8C00"
              strokeWidth="3"
              filter="url(#strike-glow)"
              initial={{ r: 0, opacity: 0.8 }}
              animate={{ r: [0, sw.maxR], opacity: [0.8, 0] }}
              transition={{ delay: sw.delay, duration: 0.8 }}
            />
          ))}

          {/* Scorch crater */}
          <motion.ellipse
            cx={x} cy={y} rx={0} ry={0}
            fill="#1a0a00"
            initial={{ rx: 0, ry: 0, opacity: 0 }}
            animate={{ rx: [0, 55], ry: [0, 28], opacity: [0, 0.9] }}
            transition={{ delay: 0.8, duration: 0.4 }}
          />
          <motion.ellipse
            cx={x} cy={y} rx={55} ry={28}
            fill="none" stroke="#3d1500" strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7] }}
            transition={{ delay: 1.1, duration: 0.3 }}
          />
        </svg>

        {/* Ember chunks */}
        {embers.map((e, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: x, top: y,
              width: e.size, height: e.size,
              background: e.color,
              borderRadius: "2px",
              boxShadow: `0 0 ${e.size}px ${e.color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: [0, e.vx * 0.5, e.vx],
              y: [0, e.vy * 0.4, e.vy + 120],
              opacity: [1, 0.7, 0],
              rotate: [0, 180 + sr(i * 31) * 360],
            }}
            transition={{ delay: e.delay, duration: 1.2, times: [0, 0.4, 1], ease: "easeOut" }}
          />
        ))}
      </motion.div>

      {/* Banner */}
      {territoryName && (
        <motion.div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.92) 20%, rgba(0,0,0,0.92) 80%, transparent)",
            border: "1px solid #3d1500",
            borderLeft: "none",
            borderRight: "none",
            padding: "0.9rem 3rem",
            fontFamily: "'Cinzel', 'Palatino Linotype', serif",
            fontSize: "0.85rem",
            letterSpacing: "0.22em",
            color: "#FF8C00",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            zIndex: 10003,
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={showBanner ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          THE HEAVENS FALL UPON {territoryName.toUpperCase()}
        </motion.div>
      )}
    </div>
  );
}

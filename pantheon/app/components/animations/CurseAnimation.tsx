"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { C, overlayStyle } from "./shared";

interface Props {
  targetPosition: { x: number; y: number };
  onComplete: () => void;
}

function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const NUM_DROPS = 20;

export function CurseAnimation({ targetPosition, onComplete }: Props) {
  const { x, y } = targetPosition;

  const drops = Array.from({ length: NUM_DROPS }, (_, i) => {
    const angle = -55 - sr(i * 3) * 20; // steep left-to-right angle
    const startX = x - 300 - sr(i * 7) * 200;
    const startY = y - 380 - sr(i * 11) * 120;
    const rad = (angle * Math.PI) / 180;
    const travelX = x - startX + (sr(i * 13) - 0.5) * 60;
    const travelY = y - startY;
    return { startX, startY, travelX, travelY, delay: i * 0.08, angle };
  });

  // Splash particles per drop: 4 per drop
  const splashes = drops.map((drop, di) =>
    Array.from({ length: 4 }, (_, si) => ({
      angle: (si / 4) * 360 + sr(di * 100 + si) * 40,
      dist: 12 + sr(di * 200 + si) * 20,
      delay: drop.delay + 0.38,
    }))
  ).flat();

  useEffect(() => {
    const t = setTimeout(onComplete, 3100);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="curse-blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <radialGradient id="curse-stain" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a0000" stopOpacity="0.85" />
            <stop offset="60%" stopColor={C.crimson} stopOpacity="0.4" />
            <stop offset="100%" stopColor={C.crimson} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ink stain aftermath */}
        <motion.ellipse
          cx={x} cy={y}
          rx={0} ry={0}
          fill="url(#curse-stain)"
          initial={{ rx: 0, ry: 0, opacity: 0 }}
          animate={{ rx: [0, 60, 100], ry: [0, 30, 50], opacity: [0, 0.9, 0] }}
          transition={{ delay: 1.6, duration: 1.0, times: [0, 0.4, 1] }}
        />
      </svg>

      {/* Crimson teardrops */}
      {drops.map((drop, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: drop.startX,
            top: drop.startY,
            width: 4,
            height: 30,
            background: `linear-gradient(180deg, ${C.crimsonBright} 0%, ${C.crimson} 40%, transparent 100%)`,
            borderRadius: "2px 2px 50% 50%",
            transformOrigin: "top center",
            transform: `rotate(${drop.angle + 90}deg)`,
            boxShadow: `0 0 8px ${C.crimson}`,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scaleY: 1 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, drop.travelX * 0.5, drop.travelX],
            y: [0, drop.travelY * 0.5, drop.travelY],
          }}
          transition={{ delay: drop.delay, duration: 0.4, times: [0, 0.1, 1], ease: "easeIn" }}
        />
      ))}

      {/* Splash particles */}
      {splashes.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        return (
          <motion.div
            key={`splash-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: C.crimson,
            }}
            initial={{ opacity: 1, x: 0, y: 0 }}
            animate={{
              opacity: [1, 0],
              x: [0, Math.cos(rad) * s.dist],
              y: [0, Math.sin(rad) * s.dist],
            }}
            transition={{ delay: s.delay, duration: 0.25 }}
          />
        );
      })}
    </div>
  );
}

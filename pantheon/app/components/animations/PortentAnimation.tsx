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

const AURORA_BANDS = [
  { color: "#6D28D9", top: -280, height: 32, delay: 0 },
  { color: "#0D9488", top: -240, height: 24, delay: 0.12 },
  { color: "#3730A3", top: -200, height: 40, delay: 0.06 },
];

const EYE_PERIMETER = 420; // rough SVG path length for stroke-dashoffset

export function PortentAnimation({ targetPosition, onComplete }: Props) {
  const { x, y } = targetPosition;

  // 8 fragment directions
  const fragments = Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * 360,
    dist: 40 + sr(i * 17) * 50,
    delay: 1.8,
  }));

  useEffect(() => {
    const t = setTimeout(onComplete, 2900);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      {/* Aurora bands drifting down */}
      {AURORA_BANDS.map((band, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: x - 180,
            top: y + band.top,
            width: 360,
            height: band.height,
            background: `linear-gradient(90deg, transparent, ${band.color}88, transparent)`,
            borderRadius: 999,
            filter: "blur(8px)",
          }}
          initial={{ opacity: 0, scaleX: 0.6, y: 0 }}
          animate={{
            opacity: [0, 0.55, 0.45, 0],
            scaleX: [0.6, 1.2, 0.9, 1.1],
            y: [0, 30, 80, 130],
          }}
          transition={{ delay: band.delay, duration: 2.0, times: [0, 0.2, 0.6, 1] }}
        />
      ))}

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="portent-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ghostly eye — drawn via stroke-dashoffset */}
        {/* Eye outline: two arcs forming an eye shape */}
        <motion.g filter="url(#portent-glow)">
          {/* Top arc */}
          <motion.path
            d={`M ${x - 40},${y} Q ${x},${y - 35} ${x + 40},${y}`}
            fill="none"
            stroke={C.parchment}
            strokeWidth="1.5"
            strokeOpacity="0.7"
            strokeDasharray="120"
            initial={{ strokeDashoffset: 120 }}
            animate={{ strokeDashoffset: 0, opacity: [0, 1, 1, 0] }}
            transition={{ delay: 0.7, duration: 0.6, opacity: { delay: 0.7, duration: 0.6, times: [0, 0.2, 0.8, 1] } }}
          />
          {/* Bottom arc */}
          <motion.path
            d={`M ${x - 40},${y} Q ${x},${y + 35} ${x + 40},${y}`}
            fill="none"
            stroke={C.parchment}
            strokeWidth="1.5"
            strokeOpacity="0.7"
            strokeDasharray="120"
            initial={{ strokeDashoffset: 120 }}
            animate={{ strokeDashoffset: 0, opacity: [0, 1, 1, 0] }}
            transition={{ delay: 0.85, duration: 0.6, opacity: { delay: 0.85, duration: 0.6, times: [0, 0.2, 0.8, 1] } }}
          />
          {/* Pupil */}
          <motion.circle
            cx={x} cy={y} r={10}
            fill="none"
            stroke={C.parchment}
            strokeWidth="1"
            strokeOpacity="0.6"
            initial={{ opacity: 0, r: 0 }}
            animate={{ opacity: [0, 0.8, 0.8, 0], r: [0, 10, 12, 10] }}
            transition={{ delay: 1.2, duration: 0.5, times: [0, 0.3, 0.7, 1] }}
          />
        </motion.g>

        {/* Slow rotation wrapper — fake with wobble */}
        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, 15, -8, 20] }}
          transition={{ delay: 1.2, duration: 0.6 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        >
          {/* Fragment shards scatter on shattering */}
          {fragments.map((f, i) => {
            const rad = (f.angle * Math.PI) / 180;
            return (
              <motion.line
                key={i}
                x1={x} y1={y}
                x2={x + Math.cos(rad) * 12}
                y2={y + Math.sin(rad) * 12}
                stroke={C.parchment}
                strokeWidth="1"
                strokeOpacity="0.6"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.7, 0],
                  x2: [x + Math.cos(rad) * 12, x + Math.cos(rad) * f.dist],
                  y2: [y + Math.sin(rad) * 12, y + Math.sin(rad) * f.dist],
                }}
                transition={{ delay: f.delay, duration: 0.5, times: [0, 0.2, 1] }}
              />
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}

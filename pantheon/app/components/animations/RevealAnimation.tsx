"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { C, overlayStyle } from "./shared";

interface Props {
  targetPosition: { x: number; y: number };
  onComplete: () => void;
}

const SURVEY_LINES = [
  { x1: -60, y1: -8, x2: 60, y2: -8, len: 120 },
  { x1: -6, y1: -55, x2: -6, y2: 55, len: 110 },
  { x1: -45, y1: -45, x2: 45, y2: 45, len: 128 },
];

export function RevealAnimation({ targetPosition, onComplete }: Props) {
  const { x, y } = targetPosition;

  const numerals = ["I", "II", "III", "IV"];
  const numeralPositions = [
    { ox: -55, oy: -18 },
    { ox: 48,  oy: -18 },
    { ox: -55, oy: 30  },
    { ox: 48,  oy: 30  },
  ];

  useEffect(() => {
    const t = setTimeout(onComplete, 1900);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      {/* Silver column — clips downward to territory */}
      <motion.div
        style={{
          position: "absolute",
          left: x - 40,
          top: y - 400,
          width: 80,
          height: 400,
          background: `linear-gradient(180deg, transparent, ${C.silver}18 15%, ${C.silver}40 50%, ${C.silver}18 85%, transparent)`,
          filter: "blur(12px)",
        }}
        initial={{ scaleY: 0, opacity: 0, transformOrigin: "top center" }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 0.85, 0.7, 0],
        }}
        transition={{ duration: 1.8, times: [0, 0.28, 0.72, 1] }}
      />

      {/* Narrower bright core column */}
      <motion.div
        style={{
          position: "absolute",
          left: x - 15,
          top: y - 400,
          width: 30,
          height: 400,
          background: `linear-gradient(180deg, transparent, ${C.silver}60 20%, ${C.silver}88 50%, ${C.silver}60 80%, transparent)`,
          filter: "blur(4px)",
        }}
        initial={{ scaleY: 0, opacity: 0, transformOrigin: "top center" }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 1, 0.85, 0],
        }}
        transition={{ duration: 1.8, times: [0, 0.28, 0.72, 1] }}
      />

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="reveal-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Silver circle pulse at territory */}
        <motion.circle
          cx={x} cy={y} r={0}
          fill={C.silver}
          filter="url(#reveal-glow)"
          initial={{ r: 0, opacity: 0 }}
          animate={{ r: [0, 50, 80, 60, 0], opacity: [0, 0.6, 0.3, 0.2, 0] }}
          transition={{ delay: 0.5, duration: 1.0, times: [0, 0.2, 0.45, 0.7, 1] }}
        />

        {/* Survey lines draw via stroke-dashoffset */}
        {SURVEY_LINES.map((line, i) => (
          <motion.line
            key={i}
            x1={x + line.x1} y1={y + line.y1}
            x2={x + line.x1} y2={y + line.y1}
            stroke={C.silver}
            strokeWidth="1"
            strokeOpacity="0.6"
            strokeDasharray={line.len}
            filter="url(#reveal-glow)"
            initial={{ x2: x + line.x1, y2: y + line.y1, opacity: 0 }}
            animate={{
              x2: [x + line.x1, x + line.x2],
              y2: [y + line.y1, y + line.y2],
              opacity: [0, 0.7, 0.6, 0],
            }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.9, times: [0, 0.2, 0.7, 1] }}
          />
        ))}

        {/* Cinzel numerals tick upward at edges */}
        {numerals.map((num, i) => (
          <motion.text
            key={i}
            x={x + numeralPositions[i].ox}
            y={y + numeralPositions[i].oy}
            fill={C.silver}
            fontSize="9"
            fontFamily="'Cinzel', 'Palatino Linotype', serif"
            letterSpacing="0.12em"
            textAnchor="middle"
            fillOpacity="0"
            filter="url(#reveal-glow)"
            initial={{ fillOpacity: 0, y: y + numeralPositions[i].oy + 8 }}
            animate={{
              fillOpacity: [0, 0.7, 0.6, 0],
              y: [
                y + numeralPositions[i].oy + 8,
                y + numeralPositions[i].oy,
                y + numeralPositions[i].oy - 4,
                y + numeralPositions[i].oy - 10,
              ],
            }}
            transition={{ delay: 0.65 + i * 0.08, duration: 0.9, times: [0, 0.2, 0.6, 1] }}
          >
            {num}
          </motion.text>
        ))}
      </svg>
    </div>
  );
}

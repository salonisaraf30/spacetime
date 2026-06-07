"use client";
import { useEffect, useState } from "react";
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

const PATH_LENGTH = 340;
const NUM_MOTES = 12;

export function WhisperAnimation({ targetPosition, onComplete }: Props) {
  const { x, y } = targetPosition;

  // Source: top-center above territory, with a sinuous smoke-like curve
  const srcX = x + 10;
  const srcY = y - 380;
  const cp1X = x - 80;
  const cp1Y = y - 200;
  const cp2X = x + 60;
  const cp2Y = y - 80;
  const path = `M ${srcX} ${srcY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${y}`;

  const motes = Array.from({ length: NUM_MOTES }, (_, i) => ({
    angle: (i / NUM_MOTES) * 360,
    r: 14 + sr(i * 13) * 20,
    delay: 0.85 + sr(i * 7) * 0.2,
  }));

  useEffect(() => {
    const t = setTimeout(onComplete, 1900);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="whisper-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="whisper-thread" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0.9" />
            <stop offset="100%" stopColor={C.gold} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Gold thread draws down, then retracts */}
        {/* Draw phase */}
        <motion.path
          d={path}
          fill="none"
          stroke="url(#whisper-thread)"
          strokeWidth="2"
          filter="url(#whisper-glow)"
          strokeDasharray={PATH_LENGTH}
          initial={{ strokeDashoffset: PATH_LENGTH, opacity: 1 }}
          animate={{ strokeDashoffset: [PATH_LENGTH, 0, 0, PATH_LENGTH], opacity: [0.8, 0.8, 0.8, 0] }}
          transition={{ duration: 1.6, times: [0, 0.44, 0.7, 1] }}
        />

        {/* Origin gold point */}
        <motion.circle
          cx={srcX} cy={srcY} r={4}
          fill={C.gold}
          filter="url(#whisper-glow)"
          initial={{ opacity: 0, r: 2 }}
          animate={{ opacity: [0, 1, 1, 0], r: [2, 5, 4, 2] }}
          transition={{ duration: 1.4, times: [0, 0.1, 0.7, 1] }}
        />

        {/* Motes swirl inward at contact */}
        {motes.map((m, i) => {
          const rad = (m.angle * Math.PI) / 180;
          return (
            <motion.circle
              key={i}
              cx={x + Math.cos(rad) * m.r}
              cy={y + Math.sin(rad) * m.r}
              r={2}
              fill={C.gold}
              filter="url(#whisper-glow)"
              initial={{ opacity: 0, cx: x + Math.cos(rad) * m.r, cy: y + Math.sin(rad) * m.r }}
              animate={{
                opacity: [0, 0.8, 0],
                cx: [x + Math.cos(rad) * m.r, x + Math.cos(rad) * (m.r * 0.3), x],
                cy: [y + Math.sin(rad) * m.r, y + Math.sin(rad) * (m.r * 0.3), y],
              }}
              transition={{ delay: m.delay, duration: 0.45, times: [0, 0.6, 1] }}
            />
          );
        })}
      </svg>
    </div>
  );
}

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

const NUM_RAYS = 16;
const NUM_SPARKLES = 30;

export function InspireAnimation({ targetPosition, onComplete }: Props) {
  const { x, y } = targetPosition;

  // Shooting star: from upper-right, shallow arc
  const starStartX = x + 600;
  const starStartY = y - 260;

  const rays = Array.from({ length: NUM_RAYS }, (_, i) => ({
    angle: (i / NUM_RAYS) * 360,
    length: 40 + sr(i * 11) * 50,
    delay: 0.52,
  }));

  const sparkles = Array.from({ length: NUM_SPARKLES }, (_, i) => {
    const angle = (i / NUM_SPARKLES) * 360 + sr(i * 7) * 20;
    const rad = (angle * Math.PI) / 180;
    const speed = 80 + sr(i * 13) * 120;
    return {
      angle,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed - 80, // upward bias at launch
      delay: 0.54 + sr(i * 17) * 0.15,
      size: 2 + sr(i * 3) * 3,
      rotation: sr(i * 19) * 360,
    };
  });

  useEffect(() => {
    const t = setTimeout(onComplete, 2600);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={overlayStyle}>
      {/* Shooting star core + trail */}
      <motion.div
        style={{
          position: "absolute",
          left: starStartX,
          top: starStartY,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "white",
          boxShadow: `0 0 12px 4px white, -200px 0 80px 20px ${C.gold}44`,
          filter: "blur(0.5px)",
        }}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1.5 }}
        animate={{
          opacity: [1, 1, 0],
          x: [0, -(starStartX - x)],
          y: [0, -(starStartY - y)],
          scale: [1.5, 1, 2],
        }}
        transition={{ duration: 0.5, times: [0, 0.85, 1], ease: "easeIn" }}
      />

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="inspire-glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Impact starburst rays */}
        {rays.map((ray, i) => {
          const rad = (ray.angle * Math.PI) / 180;
          return (
            <motion.line
              key={i}
              x1={x} y1={y}
              x2={x + Math.cos(rad) * ray.length}
              y2={y + Math.sin(rad) * ray.length}
              stroke={C.gold}
              strokeWidth="2"
              strokeOpacity="0.9"
              filter="url(#inspire-glow)"
              initial={{ opacity: 0, x2: x, y2: y }}
              animate={{
                opacity: [0, 1, 0],
                x2: [x, x + Math.cos(rad) * ray.length],
                y2: [y, y + Math.sin(rad) * ray.length],
              }}
              transition={{ delay: ray.delay, duration: 0.5, times: [0, 0.15, 1] }}
            />
          );
        })}

        {/* Shockwave ring */}
        <motion.circle
          cx={x} cy={y} r={0}
          fill="none"
          stroke={C.gold}
          strokeWidth="2"
          strokeOpacity="0.7"
          filter="url(#inspire-glow)"
          initial={{ r: 0, opacity: 0.8 }}
          animate={{ r: [0, 120], opacity: [0.8, 0] }}
          transition={{ delay: 0.52, duration: 0.7 }}
        />
      </svg>

      {/* Sparkles — parabolic arcs outward */}
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: s.size,
            height: s.size,
            background: C.gold,
            borderRadius: "50%",
            boxShadow: `0 0 ${s.size * 2}px ${C.gold}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: [0, s.vx * 0.6, s.vx],
            y: [0, s.vy * 0.6, s.vy + 60], // gravity fallback
            opacity: [1, 0.8, 0],
            rotate: [0, s.rotation],
          }}
          transition={{ delay: s.delay, duration: 0.9, times: [0, 0.5, 1], ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

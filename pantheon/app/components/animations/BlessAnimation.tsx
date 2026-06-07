"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  targetPosition: { x: number; y: number };
  onComplete: () => void;
  territoryName?: string;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  wobble: number;
  wobbleSpeed: number;
}

interface LightBeam {
  x: number;
  startY: number;
  endY: number;
  currentY: number;
  width: number;
  speed: number;
  alpha: number;
}

interface GraceRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  vr: number;
  alpha: number;
  w: number;
}

export function BlessAnimation({ targetPosition, onComplete, territoryName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<"descending" | "blossom" | "done">("descending");

  // Keep ref current so the animation loop always calls the latest callback
  // without needing it in the dependency array (which would restart the animation
  // on every parent re-render from SpacetimeDB subscription updates)
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Size canvas to full viewport — use window as authoritative source
    const sizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    const px = targetPosition.x;
    const py = targetPosition.y;

    const beams: LightBeam[] = [];
    const sparkles: SparkleParticle[] = [];
    const rings: GraceRing[] = [];

    for (let i = 0; i < 6; i++) {
      beams.push({
        x: px + (Math.random() * 80 - 40),
        startY: -50 - Math.random() * 100,
        endY: py,
        currentY: -50,
        width: Math.random() * 6 + 3,
        speed: Math.random() * 15 + 20,
        alpha: Math.random() * 0.4 + 0.4,
      });
    }

    let localPhase: "descending" | "blossom" = "descending";
    let phaseTimer = 0;

    const createSparkle = (cx: number, cy: number, speedMult = 1): SparkleParticle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 2 + 0.5) * speedMult;
      const goldTones = ["#fff9e6", "#fef3c7", "#fde68a", "#ffffff", "#fffbeb"];
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 0.5,
        size: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.6 + 0.4,
        decay: Math.random() * 0.01 + 0.008,
        color: goldTones[Math.floor(Math.random() * goldTones.length)],
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.1 + 0.05,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Phase 1: beams descend from top to target
      if (localPhase === "descending") {
        let allArrived = true;
        for (const beam of beams) {
          if (beam.currentY < beam.endY) {
            beam.currentY += beam.speed;
            allArrived = false;
          } else {
            beam.currentY = beam.endY;
          }

          const gradient = ctx.createLinearGradient(beam.x, beam.startY, beam.x, beam.currentY);
          gradient.addColorStop(0, "rgba(254, 243, 199, 0)");
          gradient.addColorStop(0.7, `rgba(255, 250, 230, ${beam.alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${beam.alpha})`);
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = beam.width;
          ctx.lineCap = "round";
          ctx.moveTo(beam.x, beam.startY);
          ctx.lineTo(beam.x, beam.currentY);
          ctx.stroke();

          if (Math.random() < 0.3) {
            sparkles.push(createSparkle(beam.x, Math.min(beam.currentY, beam.endY), 0.3));
          }
        }

        if (allArrived) {
          localPhase = "blossom";
          setPhase("blossom");
          rings.push({ x: px, y: py, r: 5,  maxR: 140, vr: 2.5, alpha: 1,   w: 3   });
          rings.push({ x: px, y: py, r: 10, maxR: 200, vr: 1.8, alpha: 0.7, w: 1.5 });
          for (let i = 0; i < 90; i++) sparkles.push(createSparkle(px, py, 1.8));
        }
      }

      // Phase 2: rings expand outward
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += ring.vr;
        ring.alpha = 1 - ring.r / ring.maxR;
        if (ring.alpha <= 0) { rings.splice(i, 1); continue; }

        const ringGlow = ctx.createRadialGradient(ring.x, ring.y, ring.r - 4, ring.x, ring.y, ring.r + 4);
        ringGlow.addColorStop(0, "rgba(253, 230, 138, 0)");
        ringGlow.addColorStop(0.5, `rgba(255, 255, 255, ${ring.alpha * 0.8})`);
        ringGlow.addColorStop(1, "rgba(253, 230, 138, 0)");
        ctx.beginPath();
        ctx.strokeStyle = ringGlow;
        ctx.lineWidth = ring.w;
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sparkles: 4-pointed star shapes
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const p = sparkles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.wobble += p.wobbleSpeed;
        p.vx *= 0.97;
        p.vy *= 0.97;
        if (p.alpha <= 0) { sparkles.splice(i, 1); continue; }

        const sz = p.size * (0.7 + Math.sin(p.wobble) * 0.3);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = "#fcd34d";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - sz * 1.5);
        ctx.quadraticCurveTo(p.x, p.y, p.x + sz * 1.5, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + sz * 1.5);
        ctx.quadraticCurveTo(p.x, p.y, p.x - sz * 1.5, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - sz * 1.5);
        ctx.fill();
        ctx.restore();
      }

      // Fountain: keep spawning sparkles for first 120 frames of blossom
      if (localPhase === "blossom" && phaseTimer < 120) {
        phaseTimer++;
        if (Math.random() < 0.4) {
          sparkles.push(createSparkle(px + (Math.random() * 30 - 15), py + (Math.random() * 20 - 10), 0.6));
        }
      }

      if (localPhase === "blossom" && sparkles.length === 0 && rings.length === 0) {
        setPhase("done");
        onCompleteRef.current();
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", sizeCanvas);
    };
    // Intentionally omit onComplete — stored in ref to avoid restarting animation on parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPosition.x, targetPosition.y]);

  return (
    // z-index 60 — above Chronicle (50) and PantheonBar
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      <AnimatePresence>
        {phase !== "done" && (
          <>
            {/* Celestial screen wash */}
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                pointerEvents: "none",
                mixBlendMode: "screen",
                background: "radial-gradient(circle at center, rgba(254,243,199,0.06) 0%, rgba(255,255,255,0) 70%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "blossom" ? 1 : 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />

            {/* Banner slides up from bottom */}
            <motion.div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                background: "linear-gradient(to top, rgba(13,10,6,0.92), rgba(20,15,10,0.4))",
                borderTop: "1px solid rgba(252,211,77,0.3)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                <h2 style={{
                  fontSize: "0.625rem",
                  letterSpacing: "0.6em",
                  color: "rgba(251,191,36,0.7)",
                  fontFamily: "Georgia, serif",
                  fontVariant: "small-caps",
                  textTransform: "uppercase",
                  marginBottom: "0.25rem",
                  margin: "0 0 0.25rem",
                }}>
                  Divine Intervention
                </h2>
                <motion.p
                  style={{
                    fontSize: "1.125rem",
                    letterSpacing: "0.25em",
                    color: "#fef3c7",
                    fontWeight: 600,
                    fontFamily: "Georgia, serif",
                    fontVariant: "small-caps",
                    margin: "0 0 0.125rem",
                  }}
                  animate={{
                    textShadow: [
                      "0 0 8px rgba(252,211,77,0.2)",
                      "0 0 20px rgba(252,211,77,0.5), 0 0 4px rgba(255,255,255,0.7)",
                      "0 0 8px rgba(252,211,77,0.2)",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  {territoryName
                    ? `BLESSINGS BESTOWED UPON ${territoryName.toUpperCase()}`
                    : "DIVINE BLESSINGS BESTOWED"}
                </motion.p>
                <p style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "0.1em",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  color: "rgba(254,243,199,0.5)",
                  margin: 0,
                }}>
                  Stability woven into the fabric of the land.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

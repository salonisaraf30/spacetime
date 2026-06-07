"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface CometStrikeProps {
  targetX: number // 0-100 percentage
  targetY: number // 0-100 percentage
  territoryName: string
  onComplete?: () => void
}

interface Particle {
  type: "fire" | "smoke" | "spark" | "debris"
  x: number
  y: number
  vx: number
  vy: number
  g: number
  drag: number
  r: number
  life: number
  maxLife: number
  hue?: number
  rot?: number
  vrot?: number
}

interface Ring {
  x: number
  y: number
  r: number
  vr: number
  life: number
  maxLife: number
  w: number
  hue: number
  delay?: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export default function CometStrike({
  targetX,
  targetY,
  territoryName,
  onComplete,
}: CometStrikeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<"warn" | "falling" | "impact" | "done">("warn")
  const [visible, setVisible] = useState(true)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const ringsRef = useRef<Ring[]>([])
  const meteorRef = useRef<Meteor | null>(null)
  const impactTimeRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const txFn = useCallback(() => {
    const cv = canvasRef.current
    return cv ? (cv.getBoundingClientRect().width * targetX) / 100 : 0
  }, [targetX])

  const tyFn = useCallback(() => {
    const cv = canvasRef.current
    return cv ? (cv.getBoundingClientRect().height * targetY) / 100 : 0
  }, [targetY])

  // Particle spawners
  const spawnTrail = useCallback((x: number, y: number) => {
    const particles = particlesRef.current
    for (let i = 0; i < 4; i++) {
      particles.push({
        type: "fire", x: x + rand(-6, 6), y: y + rand(-6, 6),
        vx: rand(-20, 20), vy: rand(-10, 30), g: 0, drag: 0.92,
        r: rand(3, 9), life: rand(0.3, 0.7), maxLife: 0.7, hue: rand(20, 45),
      })
    }
    for (let i = 0; i < 2; i++) {
      particles.push({
        type: "smoke", x: x + rand(-8, 8), y: y - rand(0, 10),
        vx: rand(-15, 15), vy: rand(-30, -10), g: 0, drag: 0.96,
        r: rand(8, 18), life: rand(0.6, 1.2), maxLife: 1.2,
      })
    }
  }, [])

  const explode = useCallback((x: number, y: number) => {
    const particles = particlesRef.current
    const rings = ringsRef.current

    // Fire particles
    for (let i = 0; i < 70; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 360)
      particles.push({
        type: "fire", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - rand(20, 80),
        g: 300, drag: 0.95, r: rand(4, 14),
        life: rand(0.4, 1.0), maxLife: 1.0, hue: rand(15, 50),
      })
    }

    // Sparks
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(100, 420)
      particles.push({
        type: "spark", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(40, 120),
        g: 500, drag: 0.97, r: rand(1, 3),
        life: rand(0.5, 1.1), maxLife: 1.1, hue: rand(35, 55),
      })
    }

    // Debris
    for (let i = 0; i < 24; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 260)
      particles.push({
        type: "debris", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(60, 160),
        g: 700, drag: 0.99, r: rand(2, 5),
        life: rand(0.8, 1.5), maxLife: 1.5,
        rot: rand(0, 6.28), vrot: rand(-12, 12),
      })
    }

    // Smoke
    for (let i = 0; i < 30; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(20, 90)
      particles.push({
        type: "smoke", x: x + rand(-10, 10), y: y + rand(-10, 10),
        vx: Math.cos(a) * sp, vy: -rand(20, 80), g: -20, drag: 0.98,
        r: rand(20, 50), life: rand(1.5, 3.0), maxLife: 3.0,
      })
    }

    // Shockwave rings
    rings.push({ x, y, r: 0, vr: 900, life: 0.7, maxLife: 0.7, w: 4, hue: 30 })
    rings.push({ x, y, r: 0, vr: 1100, life: 0.9, maxLife: 0.9, w: 2, hue: 15, delay: 0.1 })
    rings.push({ x, y, r: 0, vr: 650, life: 0.5, maxLife: 0.5, w: 6, hue: 45 })
  }, [])

  // Canvas draw functions
  const drawFire = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const lr = p.life / p.maxLife
    const r = p.r * (0.4 + lr * 0.8)
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    const a = Math.min(1, lr * 1.4)
    g.addColorStop(0, `rgba(255,255,${Math.floor(200 * lr)},${a})`)
    g.addColorStop(0.4, `hsla(${p.hue},100%,55%,${a * 0.8})`)
    g.addColorStop(1, `hsla(${(p.hue || 30) - 10},100%,40%,0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, 6.28)
    ctx.fill()
  }, [])

  const drawSmoke = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const lr = p.life / p.maxLife
    const r = p.r * (1.2 - lr * 0.5)
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    const a = lr * 0.28
    g.addColorStop(0, `rgba(40,28,18,${a})`)
    g.addColorStop(1, "rgba(20,14,10,0)")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, 6.28)
    ctx.fill()
  }, [])

  const drawSpark = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const lr = p.life / p.maxLife
    ctx.strokeStyle = `hsla(${p.hue},100%,${60 + lr * 20}%,${Math.min(1, lr * 1.5)})`
    ctx.lineWidth = p.r
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02)
    ctx.stroke()
  }, [])

  const drawDebris = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const lr = p.life / p.maxLife
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot || 0)
    ctx.fillStyle = `hsla(${rand(15, 30)},60%,${20 + lr * 20}%,${Math.min(1, lr * 1.4)})`
    ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2)
    ctx.restore()
  }, [])

  const drawMeteor = useCallback((ctx: CanvasRenderingContext2D, m: Meteor) => {
    // Fiery trail
    for (let i = 0; i < 14; i++) {
      const t = i / 14
      const trailX = m.x - m.vx * 0.016 * i * 1.2
      const trailY = m.y - m.vy * 0.016 * i * 1.2
      const rr = m.r * (1.3 - t * 0.9)
      const g = ctx.createRadialGradient(trailX, trailY, 0, trailX, trailY, rr * 2.2)
      g.addColorStop(0, `rgba(255,${Math.floor(200 - t * 120)},60,${0.5 * (1 - t)})`)
      g.addColorStop(0.5, `rgba(255,${Math.floor(100 - t * 60)},0,${0.25 * (1 - t)})`)
      g.addColorStop(1, "rgba(255,40,0,0)")
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(trailX, trailY, rr * 2.2, 0, 6.28)
      ctx.fill()
    }

    // Outer glow
    const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4)
    glow.addColorStop(0, "rgba(255,200,80,0.7)")
    glow.addColorStop(0.3, "rgba(255,100,0,0.4)")
    glow.addColorStop(1, "rgba(255,40,0,0)")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.r * 4, 0, 6.28)
    ctx.fill()

    // Rocky body
    const body = ctx.createRadialGradient(
      m.x - m.r * 0.3, m.y - m.r * 0.3, 0, m.x, m.y, m.r
    )
    body.addColorStop(0, "#fff8e8")
    body.addColorStop(0.35, "#ffb020")
    body.addColorStop(0.65, "#dc2626")
    body.addColorStop(0.9, "#5a1208")
    body.addColorStop(1, "#1c0a00")
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.r, 0, 6.28)
    ctx.fill()

    // Hot spot
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.beginPath()
    ctx.arc(m.x - m.r * 0.25, m.y - m.r * 0.2, m.r * 0.3, 0, 6.28)
    ctx.fill()
  }, [])

  // Main animation loop
  useEffect(() => {
    if (phase !== "falling" && phase !== "impact") return

    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = cv.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let alive = true

    function animate(now: number) {
      if (!alive) return
      const dt = Math.min(0.033, (now - (lastFrameRef.current || now)) / 1000)
      lastFrameRef.current = now

      ctx.clearRect(0, 0, W, H)

      const meteor = meteorRef.current
      const particles = particlesRef.current
      const rings = ringsRef.current

      // Update & draw meteor
      if (meteor) {
        meteor.x += meteor.vx * dt
        meteor.y += meteor.vy * dt
        meteor.r = Math.min(meteor.r + dt * 22, 26)
        spawnTrail(meteor.x, meteor.y)

        if (meteor.y >= tyFn()) {
          explode(txFn(), tyFn())
          meteorRef.current = null
          impactTimeRef.current = now / 1000
          setPhase("impact")

          // Screen shake
          const container = containerRef.current
          if (container) {
            container.style.animation = "comet-shake1 0.32s ease-in-out"
            setTimeout(() => {
              if (container) container.style.animation = "comet-shake2 0.26s ease-in-out"
            }, 320)
            setTimeout(() => {
              if (container) container.style.animation = ""
            }, 600)
          }
        }
      }

      // Draw smoke first (behind everything)
      ctx.globalCompositeOperation = "source-over"
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += p.g * dt
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
        if (p.vrot && p.rot !== undefined) p.rot += p.vrot * dt
        if (p.life <= 0) { particles.splice(i, 1); continue }
        if (p.type === "smoke") drawSmoke(ctx, p)
      }

      // Draw fire/sparks/debris (additive blending for glow)
      ctx.globalCompositeOperation = "lighter"
      particles.forEach((p) => {
        if (p.type === "fire") drawFire(ctx, p)
        else if (p.type === "spark") drawSpark(ctx, p)
        else if (p.type === "debris") {
          ctx.globalCompositeOperation = "source-over"
          drawDebris(ctx, p)
          ctx.globalCompositeOperation = "lighter"
        }
      })

      // Draw rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]
        if (r.delay && r.delay > 0) { r.delay -= dt; continue }
        r.r += r.vr * dt
        r.life -= dt
        if (r.life <= 0) { rings.splice(i, 1); continue }
        const a = Math.max(0, r.life / r.maxLife)
        ctx.strokeStyle = `hsla(${r.hue},100%,55%,${a})`
        ctx.lineWidth = r.w * a
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r, 0, 6.28)
        ctx.stroke()
      }

      // Draw meteor on top
      if (meteorRef.current) drawMeteor(ctx, meteorRef.current)

      // Ground fire glow after impact
      if (impactTimeRef.current > 0) {
        const gt = now / 1000 - impactTimeRef.current
        if (gt < 2.6) {
          const ga = Math.max(0, (1 - gt / 2.6)) * 0.5
          const txx = txFn(), tyy = tyFn()
          const gf = ctx.createRadialGradient(txx, tyy, 0, txx, tyy, 90)
          gf.addColorStop(0, `rgba(255,120,0,${ga})`)
          gf.addColorStop(0.5, `rgba(220,38,38,${ga * 0.5})`)
          gf.addColorStop(1, "rgba(255,40,0,0)")
          ctx.fillStyle = gf
          ctx.beginPath()
          ctx.arc(txx, tyy, 90, 0, 6.28)
          ctx.fill()
        }
      }

      ctx.globalCompositeOperation = "source-over"

      if (particles.length > 0 || rings.length > 0 || meteorRef.current) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setPhase("done")
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [phase, txFn, tyFn, spawnTrail, explode, drawFire, drawSmoke, drawSpark, drawDebris, drawMeteor])

  // Sequence controller
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // After warning, start meteor
    timers.push(
      setTimeout(() => {
        const cv = canvasRef.current
        if (!cv) return
        const rect = cv.getBoundingClientRect()
        const W = rect.width
        const H = rect.height
        const endX = (W * targetX) / 100
        const endY = (H * targetY) / 100
        meteorRef.current = {
          x: W * 0.66, y: -40,
          vx: -(W * 0.66 - endX) / 0.95,
          vy: (endY + 40) / 0.95,
          r: 6,
        }
        particlesRef.current = []
        ringsRef.current = []
        impactTimeRef.current = 0
        lastFrameRef.current = 0
        setPhase("falling")
      }, 950)
    )

    // Cleanup after everything
    timers.push(
      setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 5500)
    )

    return () => timers.forEach(clearTimeout)
  }, [targetX, targetY, onComplete])

  if (!visible) return null

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes comet-shake1 {
          0%, 100% { transform: translate(0); }
          10% { transform: translate(-9px, 5px); }
          25% { transform: translate(8px, -7px); }
          40% { transform: translate(-7px, 4px); }
          55% { transform: translate(6px, -4px); }
          70% { transform: translate(-4px, 3px); }
          85% { transform: translate(3px, -2px); }
        }
        @keyframes comet-shake2 {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-5px, 2px); }
          50% { transform: translate(4px, -3px); }
          75% { transform: translate(-2px, 1px); }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 50, overflow: "hidden" }}
      >
        {/* Canvas for particles */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />

        {/* Screen flash on impact */}
        <AnimatePresence>
          {phase === "impact" && (
            <motion.div
              style={{ position: "absolute", inset: 0, background: "white", zIndex: 14 }}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Red vignette on impact */}
        <AnimatePresence>
          {(phase === "impact" || phase === "done") && (
            <motion.div
              style={{
                position: "absolute", inset: 0, zIndex: 8,
                background: "radial-gradient(ellipse at 50% 50%, transparent 18%, rgba(180,30,0,0.12) 48%, rgba(0,0,0,0.55) 100%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5 }}
            />
          )}
        </AnimatePresence>

        {/* Warning text */}
        <AnimatePresence>
          {phase === "warn" && (
            <motion.div
              style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "flex-start", paddingTop: "14%", zIndex: 13,
              }}
            >
              <motion.p
                style={{ fontSize: 11, letterSpacing: "0.45em", color: "#dc2626", fontFamily: "'Cinzel','Palatino Linotype',serif" }}
                initial={{ opacity: 0, scale: 1.18, letterSpacing: "0.6em" }}
                animate={{ opacity: 0.6, scale: 1, letterSpacing: "0.45em" }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                DIVINE STRIKE INCOMING
              </motion.p>
              <motion.p
                style={{ fontSize: 9, letterSpacing: "0.3em", color: "rgba(249,115,22,0.5)", marginTop: 8, fontFamily: "monospace" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                // ORBITAL TRAJECTORY LOCKED
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Targeting reticle */}
        <AnimatePresence>
          {phase === "warn" && (
            <motion.div
              style={{ position: "absolute", left: `${targetX}%`, top: `${targetY}%`, zIndex: 12 }}
              initial={{ opacity: 0, scale: 2, rotate: -30 }}
              animate={{ opacity: 0.35, scale: 1, rotate: 0 }}
              transition={{ duration: 1 }}
            >
              <svg
                width="90" height="90" viewBox="0 0 90 90"
                fill="none" stroke="#ff2a00"
                style={{ transform: "translate(-50%, -50%)" }}
              >
                <circle cx="45" cy="45" r="40" strokeWidth="1" strokeDasharray="6 8" />
                <circle cx="45" cy="45" r="28" strokeWidth="1" opacity={0.7} />
                <path d="M45 2 L45 18 M45 72 L45 88 M2 45 L18 45 M72 45 L88 45" strokeWidth="1.5" />
                <circle cx="45" cy="45" r="3" fill="#ff2a00" stroke="none" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Banner */}
        <AnimatePresence>
          {(phase === "impact" || phase === "done") && (
            <motion.div
              style={{
                position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20, overflow: "hidden",
                background: "linear-gradient(to top, rgba(0,0,0,0.96), rgba(0,0,0,0.6))",
                borderTop: "2px solid rgba(255,42,0,0.67)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(220,38,38,0.5), transparent)" }} />
              <div style={{ padding: "1.25rem 1.5rem", textAlign: "center" }}>
                <h2 style={{ fontSize: 11, letterSpacing: "0.5em", color: "rgba(249,115,22,0.65)", fontFamily: "'Cinzel','Palatino Linotype',serif", marginBottom: 6, fontWeight: "normal" }}>
                  divine judgment
                </h2>
                <motion.p
                  style={{ fontSize: 19, letterSpacing: "0.2em", color: "white", fontWeight: "bold", fontFamily: "'Cinzel','Palatino Linotype',serif", margin: 0 }}
                  animate={{
                    textShadow: [
                      "0 0 4px rgba(255,42,0,0.2)",
                      "0 0 16px rgba(255,42,0,0.73), 0 0 34px rgba(255,106,0,0.27)",
                    ],
                  }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                >
                  {`⚡ ${territoryName.toUpperCase()} HAS FALLEN ⚡`}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

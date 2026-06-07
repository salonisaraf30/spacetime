"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTable, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, tables } from "../../src/module_bindings";
import { DIRECTIVES } from "../constants/directives";

const HOST = process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? "wss://maincloud.spacetimedb.com";
const DB_NAME = process.env.NEXT_PUBLIC_SPACETIMEDB_DB_NAME ?? "nextjs-ts";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

type Screen = "splash" | "choice" | "name" | "directive";

export default function JoinPage() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [godName, setGodName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [directive, setDirective] = useState("");
  const [existingGod, setExistingGod] = useState<{ name: string; color: string } | null>(null);
  const [dirRevealed, setDirRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isActive: connected, getConnection, identity: myIdentity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;
  const subscribedRef = useRef(false);
  const [gods] = useTable(tables.god);

  useEffect(() => {
    if (!conn || !connected || subscribedRef.current) return;
    subscribedRef.current = true;
    conn.subscriptionBuilder().subscribe(["SELECT * FROM god"]);
  }, [conn, connected]);

  useEffect(() => {
    if (!myIdentity || !connected || screen !== "splash") return;
    const found = gods.find(g => g.identity.toHexString() === myIdentity.toHexString());
    if (found) {
      setExistingGod({ name: found.name, color: found.color });
      setScreen("choice");
    }
  }, [gods, myIdentity, connected, screen]);

  useEffect(() => {
    if (screen === "name") inputRef.current?.focus();
  }, [screen]);

  useEffect(() => {
    if (screen === "directive") {
      setDirRevealed(false);
      const t = setTimeout(() => setDirRevealed(true), 300);
      return () => clearTimeout(t);
    }
  }, [screen]);

  function handleContinue() { window.location.href = "/god-panel"; }

  function handleNewGod() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("pantheon-god");
    }
    setExistingGod(null);
    setScreen("name");
  }

  function handleJoin() {
    if (!godName.trim() || !conn || joining) return;
    setJoining(true);
    setError("");
    try {
      conn.reducers.joinWorld({ godName: godName.trim() });
      const colors = ["#F59E0B","#10B981","#EC4899","#8B5CF6","#EF4444","#06B6D4","#F97316","#14B8A6"];
      const di = Math.floor(Math.random() * DIRECTIVES.length);
      setDirective(DIRECTIVES[di]);
      localStorage.setItem("pantheon-god", JSON.stringify({
        name: godName.trim(),
        directiveIndex: di,
        color: colors[di % colors.length],
      }));
      setScreen("directive");
    } catch {
      setError("The heavens reject you. Try again.");
      setJoining(false);
    }
  }

  function handleBegin() { window.location.href = "/god-panel?new=1"; }

  const nameReady = godName.trim().length > 0 && !joining && connected;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .join-root {
          min-height: 100vh;
          background: #d4c4a0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          font-family: 'EB Garamond', Georgia, serif;
          color: #3E2723;
          overflow: hidden;
        }

        .join-tex-noise {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
          background-image: url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
          background-size: 300px;
        }
        .join-tex-fibers {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.12;
          background-image: url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.02 0.4' numOctaves='2' seed='5'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.6'/%3E%3C/svg%3E");
          background-size: 200px;
        }

        .join-stain-1 { position: absolute; width: 280px; height: 220px; top: 5%; left: 8%; border-radius: 50%; background: radial-gradient(ellipse, rgba(160,120,60,0.18) 0%, rgba(140,100,40,0.08) 40%, transparent 70%); transform: rotate(-15deg); pointer-events: none; }
        .join-stain-2 { position: absolute; width: 200px; height: 160px; bottom: 10%; right: 12%; border-radius: 50%; background: radial-gradient(ellipse, rgba(130,90,30,0.15) 0%, rgba(120,80,20,0.06) 45%, transparent 70%); transform: rotate(20deg); pointer-events: none; }
        .join-stain-3 { position: absolute; width: 120px; height: 100px; top: 40%; right: 5%; border-radius: 50%; background: radial-gradient(ellipse, rgba(100,70,20,0.12) 0%, transparent 65%); pointer-events: none; }
        .join-stain-4 { position: absolute; width: 150px; height: 130px; bottom: 30%; left: 5%; border-radius: 50%; background: radial-gradient(ellipse, rgba(140,100,40,0.1) 0%, transparent 60%); transform: rotate(-30deg); pointer-events: none; }

        .join-fox { position: absolute; border-radius: 50%; background: rgba(140,100,40,0.15); pointer-events: none; }

        .join-fold-h { position: absolute; left: 0; right: 0; top: 48%; height: 1px; pointer-events: none; background: linear-gradient(to right, transparent 5%, rgba(120,80,30,0.08) 20%, rgba(120,80,30,0.12) 50%, rgba(120,80,30,0.08) 80%, transparent 95%); }
        .join-fold-v { position: absolute; top: 0; bottom: 0; left: 52%; width: 1px; pointer-events: none; background: linear-gradient(to bottom, transparent 5%, rgba(120,80,30,0.06) 20%, rgba(120,80,30,0.1) 50%, rgba(120,80,30,0.06) 80%, transparent 95%); }

        .join-ink { position: absolute; opacity: 0.06; pointer-events: none; background: #3E2723; }
        .join-ink-1 { top: 15%; right: 18%; width: 30px; height: 25px; border-radius: 60% 40% 50% 45%; transform: rotate(25deg); }
        .join-ink-2 { bottom: 20%; left: 15%; width: 15px; height: 12px; border-radius: 50% 45% 55% 40%; transform: rotate(-15deg); }
        .join-ink-3 { top: 65%; right: 30%; width: 8px; height: 6px; border-radius: 50%; }

        .join-edge-burn { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 60px rgba(100,60,15,0.35), inset 0 0 120px rgba(80,40,10,0.18), inset 0 0 200px rgba(60,30,5,0.08); }
        .join-edge-dark { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, rgba(120,80,20,0.1) 0%, transparent 3%, transparent 97%, rgba(100,60,15,0.12) 100%), linear-gradient(to right, rgba(120,80,20,0.08) 0%, transparent 3%, transparent 97%, rgba(100,60,15,0.1) 100%); }

        .join-border-outer { position: absolute; inset: 20px; border: 1.5px solid rgba(93,64,55,0.5); pointer-events: none; }
        .join-border-inner { position: absolute; inset: 24px; border: 0.5px solid rgba(93,64,55,0.2); pointer-events: none; }

        .join-wax-seal { position: absolute; bottom: 40px; right: 50px; width: 64px; height: 64px; z-index: 6; opacity: 0.5; pointer-events: none; }
        .join-wax-inner { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #b84c3a, #8B2E2E 50%, #6d1f1f 80%); box-shadow: 0 2px 6px rgba(62,20,15,0.4), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,150,130,0.2); display: flex; align-items: center; justify-content: center; }

        .join-screen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40px 24px; opacity: 0; pointer-events: none; transition: opacity 0.6s ease; z-index: 10; }
        .join-screen.active { opacity: 1; pointer-events: auto; }

        .join-content { position: relative; z-index: 5; text-align: center; max-width: 420px; width: 100%; }

        .join-flourish { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 28px; }
        .join-fl-line { width: 60px; height: 1px; background: linear-gradient(to right, transparent, #8B7355, transparent); }
        .join-fl-diamond { width: 6px; height: 6px; background: #8B7355; transform: rotate(45deg); flex-shrink: 0; }

        .join-eyebrow { font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.6em; color: #8B7355; text-transform: uppercase; margin-bottom: 8px; }
        .join-title { font-family: 'Cinzel', serif; font-size: 2.8rem; font-weight: 700; color: #3E2723; letter-spacing: 0.15em; line-height: 1; margin-bottom: 4px; text-shadow: 0 1px 0 rgba(255,240,200,0.5); }
        .join-title-sub { font-family: 'EB Garamond', serif; font-size: 0.85rem; font-style: italic; color: #8B7355; letter-spacing: 0.3em; margin-bottom: 24px; }
        .join-divider { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; width: 100%; }
        .join-div-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, #8B7355aa, #8B7355, #8B7355aa, transparent); }
        .join-div-sym { font-size: 14px; color: #8B7355; line-height: 1; }
        .join-quote { font-family: 'EB Garamond', serif; font-size: 1.15rem; font-style: italic; color: #5D4037; line-height: 1.7; margin-bottom: 32px; max-width: 360px; margin-left: auto; margin-right: auto; }
        .join-hint { font-family: 'EB Garamond', serif; font-size: 0.8rem; font-style: italic; color: #A1887F; margin-top: 10px; margin-bottom: 28px; }
        .join-error { font-family: 'EB Garamond', serif; font-size: 0.9rem; font-style: italic; color: #8B2E2E; margin-top: 8px; }
        .join-connecting { font-family: 'EB Garamond', serif; font-size: 0.82rem; font-style: italic; color: #A1887F; margin-top: 6px; }

        .join-input-wrap { position: relative; margin-bottom: 8px; width: 100%; }
        .join-input-border { position: absolute; inset: -6px; border: 1px solid #8B735544; pointer-events: none; }
        .join-input-corner { position: absolute; width: 8px; height: 8px; border: 1px solid #8B7355; }
        .join-input-corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
        .join-input-corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
        .join-input { width: 100%; background: rgba(255,248,230,0.45); border: 1px solid #8B7355; padding: 14px 16px; font-family: 'EB Garamond', serif; font-size: 1.5rem; text-align: center; color: #3E2723; outline: none; letter-spacing: 0.04em; transition: all 0.3s; }
        .join-input::placeholder { color: #A1887F; font-style: italic; font-size: 1.2rem; }
        .join-input:focus { background: rgba(255,248,230,0.7); border-color: #5D4037; box-shadow: 0 0 0 3px rgba(93,64,55,0.08); }

        .join-btn-wrap { position: relative; display: inline-block; }
        .join-btn-deco { position: absolute; top: 50%; width: 20px; height: 1px; background: #8B7355; transform: translateY(-50%); }
        .join-btn-deco.l { left: -28px; }
        .join-btn-deco.r { right: -28px; }
        .join-btn { font-family: 'Cinzel', serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.35em; color: #FDFBF7; background: #5D4037; border: 1.5px solid #3E2723; padding: 14px 48px; cursor: pointer; position: relative; transition: all 0.3s; text-transform: uppercase; box-shadow: 0 3px 8px rgba(62,39,35,0.25), inset 0 1px 0 rgba(255,255,255,0.08); }
        .join-btn::before { content: ''; position: absolute; inset: 3px; border: 0.5px solid rgba(253,251,247,0.12); pointer-events: none; }
        .join-btn:hover:not(:disabled) { background: #3E2723; box-shadow: 0 4px 12px rgba(62,39,35,0.35), inset 0 1px 0 rgba(255,255,255,0.1); transform: translateY(-1px); }
        .join-btn:active { transform: translateY(0); }
        .join-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .join-btn.ready { animation: btnGlow 2s ease-in-out infinite alternate; }
        @keyframes btnGlow {
          0%   { box-shadow: 0 3px 8px rgba(62,39,35,0.25), inset 0 1px 0 rgba(255,255,255,0.08); }
          100% { box-shadow: 0 3px 16px rgba(62,39,35,0.4), 0 0 24px rgba(139,115,85,0.2), inset 0 1px 0 rgba(255,255,255,0.12); }
        }

        .join-dir-badge-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; justify-content: center; }
        .join-dir-badge-line { width: 30px; height: 1px; background: linear-gradient(to right, transparent, #8B2E2E); }
        .join-dir-badge-line.r { background: linear-gradient(to left, transparent, #8B2E2E); }
        .join-dir-badge { font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.5em; color: #8B2E2E; text-transform: uppercase; margin: 0; }
        .join-dir-scroll { border: 1px solid rgba(139,115,85,0.4); background: rgba(255,248,230,0.35); padding: 28px 32px; margin-bottom: 16px; position: relative; max-width: 420px; }
        .join-dir-scroll::before, .join-dir-scroll::after { content: ''; position: absolute; width: 10px; height: 10px; border: 1px solid #8B7355; opacity: 0.6; }
        .join-dir-scroll::before { top: -5px; left: -5px; border-right: none; border-bottom: none; }
        .join-dir-scroll::after  { bottom: -5px; right: -5px; border-left: none; border-top: none; }
        .join-dir-text { font-family: 'EB Garamond', serif; font-size: 1.1rem; font-style: italic; color: #3E2723; line-height: 1.75; text-align: center; opacity: 0; margin: 0; transition: opacity 0s; }
        .join-dir-text.reveal { animation: dirReveal 2s ease-out forwards; }
        @keyframes dirReveal {
          0%   { opacity: 0; transform: translateY(10px); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0);   filter: blur(0);   }
        }
        .join-dir-warn { font-family: 'EB Garamond', serif; font-size: 0.78rem; font-style: italic; color: rgba(139,46,46,0.65); margin-bottom: 24px; }

        .join-god-card { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 24px; border: 1px solid rgba(139,115,85,0.5); background: rgba(255,248,230,0.4); margin-bottom: 20px; position: relative; }
        .join-god-orb { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #8B7355; flex-shrink: 0; }
        .join-god-name { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #3E2723; letter-spacing: 0.06em; }
        .join-choice-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .join-seal { width: 52px; height: 52px; margin: 20px auto 0; opacity: 0.16; }
        .join-seal svg { width: 100%; height: 100%; }
      `}</style>

      <div className="join-root">
        <div className="join-tex-noise" />
        <div className="join-tex-fibers" />
        <div className="join-stain-1" />
        <div className="join-stain-2" />
        <div className="join-stain-3" />
        <div className="join-stain-4" />

        {[
          { w:5, h:5, top:"12%", left:"22%" }, { w:3, h:3, top:"18%", left:"25%" },
          { w:4, h:4, top:"15%", left:"20%" }, { w:6, h:6, bottom:"15%", right:"20%" },
          { w:3, h:3, bottom:"18%", right:"23%" }, { w:4, h:4, top:"60%", left:"8%" },
          { w:3, h:3, top:"30%", right:"10%" }, { w:5, h:5, bottom:"35%", left:"12%" },
          { w:2, h:2, top:"45%", right:"15%" },
        ].map((f, i) => (
          <div key={i} className="join-fox" style={{ width: f.w, height: f.h, top: f.top, left: f.left, bottom: (f as any).bottom, right: (f as any).right }} />
        ))}

        <div className="join-fold-h" />
        <div className="join-fold-v" />
        <div className="join-ink join-ink-1" />
        <div className="join-ink join-ink-2" />
        <div className="join-ink join-ink-3" />
        <div className="join-edge-burn" />
        <div className="join-edge-dark" />
        <div className="join-border-outer" />
        <div className="join-border-inner" />

        {[
          { cls: "tl", sx: {} },
          { cls: "tr", sx: { top: 12, right: 12, left: "auto", transform: "scaleX(-1)" } },
          { cls: "bl", sx: { bottom: 12, top: "auto", transform: "scaleY(-1)" } },
          { cls: "br", sx: { bottom: 12, right: 12, top: "auto", left: "auto", transform: "scale(-1)" } },
        ].map(({ cls, sx }) => (
          <svg key={cls} width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#8B7355" strokeWidth="1.2"
            style={{ position: "absolute", top: 12, left: 12, zIndex: 6, opacity: 0.4, ...sx } as CSSProperties}>
            <path d="M4 4 L18 4 M4 4 L4 18" />
            <circle cx="4" cy="4" r="1.5" fill="#8B7355" />
          </svg>
        ))}

        <div className="join-wax-seal">
          <div className="join-wax-inner">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" stroke="#FDFBF7" strokeWidth="0.8">
              <circle cx="20" cy="20" r="14" />
              <circle cx="20" cy="20" r="10" strokeDasharray="2 2" />
              <path d="M20 8 L22 18 L20 20 L18 18 Z" fill="#FDFBF7" opacity="0.4" />
              <path d="M32 20 L22 18 L20 20 L22 22 Z" fill="#FDFBF7" opacity="0.4" />
              <path d="M20 32 L18 22 L20 20 L22 22 Z" fill="#FDFBF7" opacity="0.4" />
              <path d="M8 20 L18 22 L20 20 L18 18 Z" fill="#FDFBF7" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* SPLASH */}
        <div className={`join-screen${screen === "splash" ? " active" : ""}`}>
          <div className="join-content">
            <div className="join-flourish">
              <div className="join-fl-line" /><div className="join-fl-diamond" /><div className="join-fl-line" />
            </div>
            <p className="join-eyebrow">Ye are summoned</p>
            <h1 className="join-title">PANTHEON</h1>
            <p className="join-title-sub">A God Game</p>
            <div className="join-divider">
              <div className="join-div-line" />
              <span className="join-div-sym">&#x2766;</span>
              <div className="join-div-line" />
            </div>
            <p className="join-quote">
              "A deity is needed to guide the tides. The civilizations below live and breathe.
              By what name shall the people know you?"
            </p>
            <div className="join-btn-wrap">
              <div className="join-btn-deco l" />
              <button className="join-btn" onClick={() => setScreen("name")}>Enter the Pantheon</button>
              <div className="join-btn-deco r" />
            </div>
            <div className="join-seal">
              <svg viewBox="0 0 60 60" fill="none" stroke="#5D4037">
                <circle cx="30" cy="30" r="26" strokeWidth="1.5" />
                <circle cx="30" cy="30" r="22" strokeWidth="0.5" strokeDasharray="3 3" />
                <circle cx="30" cy="30" r="14" strokeWidth="0.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* CHOICE */}
        {existingGod && (
          <div className={`join-screen${screen === "choice" ? " active" : ""}`}>
            <div className="join-content">
              <div className="join-flourish">
                <div className="join-fl-line" /><div className="join-fl-diamond" /><div className="join-fl-line" />
              </div>
              <p className="join-eyebrow">You have walked this world before</p>
              <div className="join-god-card">
                <div className="join-god-orb" style={{ background: existingGod.color, boxShadow: `0 0 10px ${existingGod.color}88` }} />
                <span className="join-god-name">{existingGod.name}</span>
              </div>
              <p className="join-quote" style={{ marginBottom: "1.5rem" }}>Continue as this god, or awaken anew?</p>
              <div className="join-choice-row">
                <div className="join-btn-wrap">
                  <div className="join-btn-deco l" />
                  <button className="join-btn" onClick={handleContinue}>Continue</button>
                  <div className="join-btn-deco r" />
                </div>
                <div className="join-btn-wrap">
                  <div className="join-btn-deco l" />
                  <button className="join-btn" style={{ background: "transparent", color: "#5D4037", border: "1.5px solid #8B7355" }} onClick={handleNewGod}>New God</button>
                  <div className="join-btn-deco r" />
                </div>
              </div>
              <p className="join-hint" style={{ marginTop: "1rem" }}>Creating a new god removes your old identity from this device.</p>
            </div>
          </div>
        )}

        {/* NAME */}
        <div className={`join-screen${screen === "name" ? " active" : ""}`}>
          <div className="join-content">
            <div className="join-flourish">
              <div className="join-fl-line" /><div className="join-fl-diamond" /><div className="join-fl-line" />
            </div>
            <p className="join-eyebrow">Speak your name</p>
            <p className="join-quote" style={{ marginBottom: "24px" }}>
              "By what name shall the mortals cry out in prayer — and in terror?"
            </p>
            <div className="join-input-wrap">
              <div className="join-input-border">
                <div className="join-input-corner tl" />
                <div className="join-input-corner br" />
              </div>
              <input
                ref={inputRef}
                className="join-input"
                value={godName}
                onChange={e => setGodName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoin()}
                placeholder="Iron Eye"
                maxLength={24}
              />
            </div>
            <p className="join-hint">Whispered of old: Iron Eye &middot; The Tide &middot; Bringer of Locusts</p>
            {error && <p className="join-error">{error}</p>}
            {!connected && <p className="join-connecting">Connecting to the world...</p>}
            <div className="join-btn-wrap">
              <div className="join-btn-deco l" />
              <button className={`join-btn${nameReady ? " ready" : ""}`} onClick={handleJoin} disabled={!nameReady}>
                {joining ? "Awakening..." : "Awaken"}
              </button>
              <div className="join-btn-deco r" />
            </div>
          </div>
        </div>

        {/* DIRECTIVE */}
        <div className={`join-screen${screen === "directive" ? " active" : ""}`}>
          <div className="join-content">
            <div className="join-flourish">
              <div className="join-fl-line" /><div className="join-fl-diamond" /><div className="join-fl-line" />
            </div>
            <div className="join-dir-badge-wrap">
              <div className="join-dir-badge-line" />
              <p className="join-dir-badge">Your Secret Directive</p>
              <div className="join-dir-badge-line r" />
            </div>
            <div className="join-dir-scroll">
              <p className={`join-dir-text${dirRevealed ? " reveal" : ""}`}>
                {directive || DIRECTIVES[0]}
              </p>
            </div>
            <p className="join-dir-warn">Speak of this to no other god.</p>
            <div className="join-btn-wrap">
              <div className="join-btn-deco l" />
              <button className="join-btn" onClick={handleBegin}>Begin</button>
              <div className="join-btn-deco r" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

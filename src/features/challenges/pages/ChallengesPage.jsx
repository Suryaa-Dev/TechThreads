// ChallengesPage.jsx — [New UI S1]
// ─────────────────────────────────────────────────────────────────────────────
// Changes:
//
//  1. Mode-switch toggle redesigned
//     - Each side is now an independent clickable button (not a single div)
//       so keyboard Tab navigation and screen readers work correctly.
//     - Active label scales to 1 (full weight), inactive to 0.92 (dimmed).
//     - The sliding pill now uses spring easing and moves behind the labels.
//     - Left/Right arrow keys switch modes (useEffect keyboard listener).
//
//  2. Content crossfade + shimmer transition between modes
//     - A switching state (150ms) briefly shows a shimmer placeholder while
//       the new mode mounts. Prevents the jarring pop of instant swaps.
//     - The content wrapper fades in/out via CSS animation.
//
//  3. Mode-aware wordmark dot
//     - A 6px dot sits after the wordmark. Cyan when MCQ is active,
//       amber when Play is active. Transitions smoothly on switch.
//     - Communicates current mode at a glance without reading the toggle.
//
//  Logic and props: unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import TopBar        from "../components/TopBar";
import ChallengesMode from "./ChallengesMode";
// import GamingMode    from "./GamingMode";
import CodeWarsMode from './CodeWarsMode'


const NAV_H = 56;

// ── Keyframes injected once ───────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes cp-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes cp-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes cp-dot-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.3); }
    100% { transform: scale(1);   opacity: 1; }
  }
`;

// ── Shimmer skeleton shown during mode-switch ─────────────────────────────────
function SwitchShimmer() {
  return (
    <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 14,
          background: "linear-gradient(90deg, var(--bg2) 0%, var(--bg3) 40%, var(--bg2) 100%)",
          backgroundSize: "600px 100%",
          animation: `cp-shimmer 1.4s ease-in-out ${i * 0.1}s infinite`,
          opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  );
}

// ── Mode toggle button (one side) ─────────────────────────────────────────────
function ModeBtn({ label, icon, active, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-pressed={active}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 5, zIndex: 1, border: "none", background: "none", cursor: "pointer",
        fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700,
        color: active ? color : hov ? "var(--text)" : "var(--muted)",
        transform: active ? "scale(1)" : hov ? "scale(0.96)" : "scale(0.92)",
        transition: "color 0.2s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        letterSpacing: "0.02em",
        padding: "0 4px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChallengesPage({ onSelectGame, userStats, userId, mode, onModeChange }) {
  const isChallenge  = mode === "challenges";
  const [switching,  setSwitching]  = useState(false);
  const [contentKey, setContentKey] = useState(0); // re-mounts content to trigger fade-in

  // ── Switch with shimmer transition ──────────────────────────────────────────
  const handleSwitch = useCallback((next) => {
    if ((next === "challenges") === isChallenge) return; // same mode, no-op
    setSwitching(true);
    setTimeout(() => {
      onModeChange(next);
      setContentKey(k => k + 1);
      setSwitching(false);
    }, 160);
  }, [isChallenge, onModeChange]);

  // ── Keyboard: Left/Right arrow or [ ] switch modes ──────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft"  || e.key === "[") handleSwitch("challenges");
      if (e.key === "ArrowRight" || e.key === "]") handleSwitch("gaming");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSwitch]);

  // Derived colours for the active mode
  const activeColor = isChallenge ? "var(--cyan)" : "var(--amber)";
  const dotColor    = isChallenge ? "#00d4ff"     : "#f5a623";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <style>{KEYFRAMES}</style>

      {/* ── Sticky nav ──────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 150,
        height: NAV_H,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 28px", gap: 16,
      }}>

        {/* Left — wordmark + mode dot */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 13, color: "var(--cyan)",
          fontWeight: 700, letterSpacing: "0.08em", flex: 1,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          // <span style={{ color: "var(--muted)" }}>dev</span>arena
          {/* [S1] Mode indicator dot — cyan = MCQ, amber = Play */}
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: dotColor,
            display: "inline-block", flexShrink: 0,
            boxShadow: `0 0 6px ${dotColor}`,
            transition: "background 0.3s, box-shadow 0.3s",
            animation: "cp-dot-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            // Re-trigger pop on mode change via key
            animationName: "cp-dot-pop",
          }} key={mode} />
        </div>

        {/* Center — mode toggle */}
        <div style={{
          position: "relative",
          width: 196,
          height: 36,
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          borderRadius: 999,
          userSelect: "none",
          flexShrink: 0,
          display: "flex", alignItems: "center",
        }}>
          {/* sliding pill — behind the labels */}
          <div style={{
            position: "absolute",
            top: 3, left: isChallenge ? 3 : 97,
            width: 94, height: 28,
            borderRadius: 999,
            background: "var(--bg4)",
            boxShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px ${activeColor}22`,
            transition: "left 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
            pointerEvents: "none",
          }} />

          <ModeBtn
            icon="🎮" label="MCQ"
            active={isChallenge} color="var(--cyan)"
            onClick={() => handleSwitch("challenges")}
          />
          <ModeBtn
            icon="⚔" label="CodeWar"
            active={!isChallenge} color="var(--amber)"
            onClick={() => handleSwitch("gaming")}
          />
        </div>

        {/* Right — TopBar avatar */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <TopBar userStats={userStats} inlineMode />
        </div>
      </div>

      {/* ── Mode content ────────────────────────────────────────────────── */}
      {switching ? (
        <SwitchShimmer />
      ) : (
        <div
          key={contentKey}
          style={{ animation: "cp-fade-in 0.25s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {isChallenge
            ? <ChallengesMode onSelectGame={onSelectGame} userId={userId} />
            : <CodeWarsMode onBack={() => onModeChange('challenges')} />
          }
        </div>
      )}
    </div>
  );
}
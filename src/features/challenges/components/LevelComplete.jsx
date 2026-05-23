// LevelComplete.jsx — [New UI S5]
// ─────────────────────────────────────────────────────────────────────────────
// Changes:
//
//  1. Three-act layout
//     Act 1 (top): animated trophy/star cluster + particle burst
//     Act 2 (middle): stat grid (accuracy, XP, correct/total, stars earned)
//       + wide accuracy bar + SVG ring
//     Act 3 (bottom): "Next Level →" (primary, only if onNextLevel exists) +
//       "Back to Levels" (secondary). Clearer hierarchy than one button.
//
//  2. Review accordion
//     "Review Answers" section shows each question as a compact row —
//     ✓ or ✗, truncated question text, XP earned per question.
//     Collapsible, opened by default on first completion.
//
//  3. Replay vs first-completion differentiation
//     - Replay: muted heading "Practice Complete", dimmed stat grid,
//       "No XP on replay" banner, no "Next Level" button.
//     - First completion: full celebration colour scheme.
//
//  Props added: onNextLevel (optional), results (array of {text, correct, xp})
//  All existing props unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import TopBar from "./TopBar";
import { useEffect, useState } from "react";

const KEYFRAMES = `
  @keyframes lc-fade-up   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lc-scale-in  { from{opacity:0;transform:scale(0.35) rotate(-14deg)} 62%{transform:scale(1.18) rotate(4deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes lc-star-pop  { from{opacity:0;transform:scale(0) rotate(-32deg)} 68%{transform:scale(1.38) rotate(7deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes lc-stat-in   { from{opacity:0;transform:translateY(16px) scale(0.93)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes lc-btn-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lc-shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes lc-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes lc-particle  { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }
  @keyframes lc-bar-fill  { from{width:0} to{width:var(--pct)} }
  @keyframes lc-ring-draw { from{stroke-dashoffset:251} to{stroke-dashoffset:var(--offset)} }
  @keyframes lc-review-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lc-row-in    { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes lc-replay-pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
`;

// ── Particle burst ────────────────────────────────────────────────────────────
function Particles({ count, mounted }) {
  if (!mounted) return null;
  const colors = ["var(--cyan)","var(--amber)","var(--green)","#f472b6","#818cf8","#fb923c"];
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i + Math.random() * 28;
        const dist  = 100 + Math.random() * 220;
        const dx    = Math.cos((angle * Math.PI) / 180) * dist + "px";
        const dy    = (Math.sin((angle * Math.PI) / 180) * dist - 90) + "px";
        return (
          <div key={i} style={{
            position:"absolute", width: 4 + Math.random() * 5, height: 4 + Math.random() * 5,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: colors[i % colors.length],
            left: `${25 + Math.random() * 50}%`, top:"38%",
            "--dx": dx, "--dy": dy,
            animation: `lc-particle ${1.1 + Math.random() * 0.9}s cubic-bezier(0.2,0.8,0.4,1) ${0.45 + Math.random() * 0.5}s both`,
          }} />
        );
      })}
    </div>
  );
}

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ stars, mounted }) {
  return (
    <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:28 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          fontSize:36, opacity: i <= stars ? 1 : 0.14,
          filter: i <= stars ? "drop-shadow(0 0 10px rgba(245,166,35,0.75))" : "none",
          animation: i <= stars
            ? `lc-star-pop 0.52s cubic-bezier(0.34,1.56,0.64,1) ${0.68 + i * 0.15}s both`
            : "none",
        }}>⭐</div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ val, label, color, delay, muted }) {
  return (
    <div style={{
      background:"var(--bg2)", border:`1px solid ${muted ? "var(--border)" : "var(--border)"}`,
      borderRadius:14, padding:"16px 20px", textAlign:"center", minWidth:88,
      animation: `lc-stat-in 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
      opacity: muted ? 0.5 : 1,
      transition:"border-color 0.15s, transform 0.18s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(0,212,255,0.3)"; e.currentTarget.style.transform="translateY(-3px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="none"; }}
    >
      <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"var(--sans)", lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)", marginTop:5, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</div>
    </div>
  );
}

// ── Review accordion ──────────────────────────────────────────────────────────
function ReviewAccordion({ results, wasReplay }) {
  const [open, setOpen] = useState(!wasReplay);

  return (
    <div style={{
      width:"100%", maxWidth:520, marginTop:8,
      background:"var(--bg2)", border:"1px solid var(--border)",
      borderRadius:14, overflow:"hidden",
      animation:"lc-review-in 0.4s ease 1.3s both",
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"13px 18px", background:"none", border:"none", cursor:"pointer",
          fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)",
          letterSpacing:"0.08em",
          transition:"color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color="var(--text)"}
        onMouseLeave={e => e.currentTarget.style.color="var(--muted)"}
      >
        <span>// REVIEW ANSWERS ({results.filter(r => r.correct).length}/{results.length} correct)</span>
        <span style={{ fontSize:10, transition:"transform 0.2s", display:"inline-block", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </button>

      {/* Rows */}
      {open && (
        <div style={{ borderTop:"1px solid var(--border)" }}>
          {results.map((r, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"9px 18px",
              borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
              background: r.correct ? "rgba(0,230,118,0.03)" : "rgba(255,76,106,0.03)",
              animation:`lc-row-in 0.25s ease ${i * 40}ms both`,
            }}>
              {/* Status icon */}
              <span style={{
                fontSize:11, fontWeight:800, flexShrink:0, width:16, textAlign:"center",
                color: r.correct ? "var(--green)" : "var(--red)",
              }}>
                {r.correct ? "✓" : "✗"}
              </span>

              {/* Question number */}
              <span style={{ fontSize:9, fontFamily:"var(--mono)", color:"var(--muted)", flexShrink:0, minWidth:18 }}>
                {String(i + 1).padStart(2,"0")}
              </span>

              {/* Question text — truncated */}
              <span style={{
                flex:1, fontSize:11, color:"var(--muted)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                fontFamily:"var(--mono)",
              }}>
                {r.text}
              </span>

              {/* XP */}
              <span style={{
                fontSize:10, fontFamily:"var(--mono)", fontWeight:700, flexShrink:0,
                color: r.correct ? "var(--amber)" : "var(--muted)",
              }}>
                {r.correct ? `+${r.xp}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LevelComplete({
  level, correctCount, totalCount, xpEarned, xpAwarded,
  wasReplay, onContinue, onNextLevel, results = [], userStats,
}) {
  const accuracy  = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
  const stars     = accuracy === 100 ? 3 : accuracy >= 60 ? 2 : 1;
  const xpDisplay = wasReplay ? null : (xpAwarded ?? xpEarned);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const statItems = [
    { val:`${correctCount}/${totalCount}`, label:"Correct",  color:"var(--text)",                         delay:0.82 },
    { val:wasReplay?"—":`+${xpDisplay}`,  label:"XP Gained", color:wasReplay?"var(--muted)":"var(--cyan)", delay:0.92 },
    { val:`${accuracy}%`,                 label:"Accuracy",  color:accuracy===100?"var(--green)":"var(--amber)", delay:1.02 },
    { val:`${stars}/3 ⭐`,               label:"Stars",     color:"var(--amber)",                         delay:1.12 },
  ];

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)", color:"var(--text)", display:"flex", flexDirection:"column" }}>
      <style>{KEYFRAMES}</style>

      {/* Act 1 particles — first completion only, intensity = stars */}
      {!wasReplay && <Particles count={stars * 9} mounted={mounted} />}

      <TopBar userStats={userStats} />

      <div style={{
        flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        padding:"36px 24px 48px", position:"relative", zIndex:1,
        overflowY:"auto",
      }}>

        {/* ── ACT 1 — Celebration ──────────────────────────────────────── */}

        {/* Trophy / replay icon */}
        <div style={{
          fontSize:64, marginBottom:12, display:"inline-block",
          animation:`lc-scale-in 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, lc-float 3.5s ease-in-out 1s infinite`,
        }}>
          {wasReplay ? "🔁" : stars === 3 ? "🏆" : stars === 2 ? "🎖️" : "🎯"}
        </div>

        {/* Heading */}
        <h2 style={{
          fontSize:"clamp(22px,4vw,30px)", fontWeight:800, letterSpacing:"-0.025em",
          fontFamily:"var(--sans)", marginBottom:6, textAlign:"center",
          color: wasReplay ? "var(--muted)" : "var(--text)",
          animation:"lc-fade-up 0.48s ease 0.34s both",
        }}>
          {wasReplay ? "Practice Complete" : stars === 3 ? "Perfect Run! 🎉" : "Level Cleared!"}
        </h2>

        {/* Sub heading */}
        <p style={{
          fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)",
          marginBottom: wasReplay ? 10 : 22, textAlign:"center",
          animation:"lc-fade-up 0.48s ease 0.46s both",
        }}>
          // {level?.title} · {stars === 3 ? "flawless" : stars === 2 ? "solid effort" : "keep grinding"}
        </p>

        {/* Replay banner */}
        {wasReplay && (
          <div style={{
            fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)",
            background:"var(--bg2)", border:"1px solid var(--border)",
            borderRadius:8, padding:"7px 16px", marginBottom:22,
            animation:"lc-replay-pulse 2.2s ease-in-out infinite, lc-fade-up 0.48s ease 0.52s both",
          }}>
            // replay mode — no XP awarded on repeat completions
          </div>
        )}

        {/* Stars */}
        <StarRow stars={wasReplay ? 0 : stars} mounted={mounted} />

        {/* ── ACT 2 — Stats ────────────────────────────────────────────── */}

        {/* Accuracy bar */}
        <div style={{
          width:"100%", maxWidth:400, marginBottom:20,
          animation:mounted?"lc-fade-up 0.45s ease 0.88s both":"none",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.06em" }}>ACCURACY</span>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, fontWeight:700,
              color:accuracy===100?"var(--green)":wasReplay?"var(--muted)":"var(--amber)" }}>
              {accuracy}%
            </span>
          </div>
          <div style={{ position:"relative", height:6, background:"var(--bg4)", borderRadius:99, overflow:"hidden" }}>
            <div style={{
              position:"absolute", height:"100%", borderRadius:99,
              background: wasReplay
                ? "var(--border2)"
                : accuracy===100
                  ? "linear-gradient(90deg,var(--green),var(--cyan))"
                  : "linear-gradient(90deg,var(--amber),var(--cyan))",
              "--pct":`${accuracy}%`,
              animation:mounted?"lc-bar-fill 0.9s cubic-bezier(0.22,1,0.36,1) 0.95s both":"none",
              width:"var(--pct)",
            }}/>
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display:"flex", gap:10, marginBottom:30, flexWrap:"wrap", justifyContent:"center" }}>
          {statItems.map(s => (
            <StatCard key={s.label} {...s} muted={wasReplay && s.label === "XP Gained"} />
          ))}
        </div>

        {/* ── ACT 3 — Actions ──────────────────────────────────────────── */}
        <div style={{
          display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center",
          marginBottom:24,
          animation:"lc-btn-in 0.45s ease 1.08s both",
        }}>
          {/* Next Level — primary, only on first completion if handler provided */}
          {onNextLevel && !wasReplay && (
            <button
              onClick={onNextLevel}
              style={{
                padding:"12px 36px", borderRadius:12, fontSize:13, fontWeight:700,
                background:"var(--cyan)", color:"#000", border:"none", cursor:"pointer",
                fontFamily:"var(--sans)",
                transition:"background 0.18s, transform 0.15s, box-shadow 0.2s",
                position:"relative", overflow:"hidden",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#00bce0"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,212,255,0.35)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="var(--cyan)"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
            >
              Next Level →
              {/* Shimmer sweep */}
              <div style={{
                position:"absolute", inset:0, pointerEvents:"none",
                background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%)",
                backgroundSize:"200% 100%",
                animation:"lc-shimmer 2.6s linear 1.5s infinite",
              }}/>
            </button>
          )}

          {/* Back to Levels — secondary */}
          <button
            onClick={onContinue}
            style={{
              padding:"12px 28px", borderRadius:12, fontSize:13, fontWeight:700,
              background:"transparent", color:"var(--muted)",
              border:"1px solid var(--border2)", cursor:"pointer",
              fontFamily:"var(--sans)",
              transition:"color 0.15s, border-color 0.15s, transform 0.15s",
            }}
            onMouseEnter={e=>{ e.currentTarget.style.color="var(--text)"; e.currentTarget.style.borderColor="var(--border2)"; e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color="var(--muted)"; e.currentTarget.style.transform="none"; }}
          >
            ← Back to Levels
          </button>
        </div>

        {/* Review accordion — shown if we have per-question results */}
        {results.length > 0 && (
          <ReviewAccordion results={results} wasReplay={wasReplay} />
        )}
      </div>
    </div>
  );
}
// TopBar.jsx — [Session 3] Full rebuild
// ─────────────────────────────────────────────────────────────────────────────
// Before: gradient-initials circle + thin dropdown, no stats visible inline,
//         no avatar image, no XP ring, no route navigation.
//
// After:  Two modes, both aligned to the project's visual language:
//
//   inlineMode (used inside ChallengesPage sticky nav)
//   ─────────────────────────────────────────────────
//   [XP pill] [🔥 streak] [avatar] ← all inline, no positioning needed
//   Avatar opens a rich dropdown with full-name, username, stat grid,
//   profile navigation, and sign-out.
//
//   standalone (used inside LevelSelect — floats top-right)
//   ──────────────────────────────────────────────────────
//   Same avatar + dropdown, fixed position top-right.
//   XP + streak shown inside the dropdown only (no inline pills needed
//   since the page already has its own header).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

// ── XP level thresholds (every 500 XP = 1 level, capped display at Lv.99) ──
function xpToLevel(xp) {
  return Math.min(99, Math.floor((xp || 0) / 500) + 1);
}
function xpProgressPct(xp) {
  const intoLevel = (xp || 0) % 500;
  return Math.min(100, Math.round((intoLevel / 500) * 100));
}

// ── Rank label → short badge text ────────────────────────────────────────────
function rankLabel(rank) {
  if (!rank || rank === 0) return null;
  if (rank === 1) return "👑 #1";
  if (rank <= 3)  return `🥈 #${rank}`;
  if (rank <= 10) return `#${rank}`;
  return null; // don't show rank badge if not in top 10
}

// ── Thin XP progress bar used in the inline pill ─────────────────────────────
function XpPill({ xp }) {
  const level = xpToLevel(xp);
  const pct   = xpProgressPct(xp);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      background: "var(--bg2)", border: "1px solid var(--border2)",
      borderRadius: 999, padding: "0 10px 0 8px", height: 32,
    }}>
      {/* level badge */}
      <span style={{
        fontSize: 9, fontWeight: 800, fontFamily: "var(--mono)",
        color: "#0e0e0d", background: "var(--cyan)",
        padding: "2px 6px", borderRadius: 999, letterSpacing: "0.04em",
        flexShrink: 0,
      }}>
        Lv.{level}
      </span>

      {/* progress bar */}
      <div style={{
        width: 52, height: 4, background: "var(--bg4)",
        borderRadius: 99, overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: "linear-gradient(90deg, var(--cyan2), var(--cyan))",
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* xp count */}
      <span style={{
        fontSize: 10, fontWeight: 600, fontFamily: "var(--mono)",
        color: "var(--cyan)", letterSpacing: "0.02em", flexShrink: 0,
      }}>
        {(xp || 0).toLocaleString()}
      </span>
    </div>
  );
}

// ── Streak badge ──────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "var(--bg2)", border: "1px solid var(--border2)",
      borderRadius: 999, padding: "0 10px", height: 32,
      fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)",
      color: "var(--amber)", letterSpacing: "0.02em",
    }}>
      🔥 {streak}
    </div>
  );
}

// ── Avatar circle — real image or gradient initials fallback ─────────────────
function Avatar({ avatarUrl, initials, size = 36, active = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = avatarUrl && !imgFailed;

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      border: `2px solid ${active ? "var(--cyan)" : "var(--border2)"}`,
      boxShadow: active ? "0 0 0 3px rgba(0,212,255,0.18)" : "none",
      transition: "border-color 0.15s, box-shadow 0.15s",
      cursor: "pointer",
      background: showImg
        ? "var(--bg3)"
        : "linear-gradient(135deg, var(--cyan2), var(--purple))",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {showImg
        ? <img
            src={avatarUrl} alt="avatar"
            onError={() => setImgFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        : <span style={{
            fontSize: size * 0.36, fontWeight: 800,
            color: "#fff", fontFamily: "var(--sans)",
            userSelect: "none", letterSpacing: "-0.01em",
          }}>
            {initials || "U"}
          </span>
      }
    </div>
  );
}

// ── Dropdown menu item ────────────────────────────────────────────────────────
function MenuItem({ icon, label, onClick, danger = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 8,
        background: hov ? (danger ? "rgba(255,76,106,0.08)" : "var(--bg3)") : "none",
        border: "none",
        color: danger ? "var(--red)" : "var(--text)",
        fontSize: 13, cursor: "pointer",
        fontFamily: "var(--sans)", textAlign: "left",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TopBar({ userStats = {}, inlineMode = false }) {
  const xp        = userStats.xp        ?? 0;
  const streak    = userStats.streak    ?? 0;
  const initials  = userStats.initials  ?? "U";
  const avatarUrl = userStats.avatar_url ?? null;
  const username  = userStats.username  ?? "";
  const rank      = userStats.rank      ?? 0;

  const level    = xpToLevel(xp);
  const pct      = xpProgressPct(xp);
  const rankText = rankLabel(rank);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const navigate  = useNavigate();
  const { signOut } = useAuth();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const goTo = (path) => { setOpen(false); navigate(path); };

  // ── Shared dropdown (same for both modes) ────────────────────────────────
  const dropdown = open && (
    <div style={{
      position: "absolute",
      top: inlineMode ? 44 : 52,
      right: 0,
      width: 248,
      background: "var(--bg2)",
      border: "1px solid var(--border2)",
      borderRadius: 14,
      padding: "8px 8px 6px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      animation: "tb-drop 0.16s cubic-bezier(0.2,0,0,1.1)",
      zIndex: 300,
    }}>

      {/* ── Identity block ─────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 12px 14px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar avatarUrl={avatarUrl} initials={initials} size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: "var(--text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {username ? `@${username}` : initials}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, fontFamily: "var(--mono)",
                color: "#0e0e0d", background: "var(--cyan)",
                padding: "1px 6px", borderRadius: 999,
              }}>Lv.{level}</span>
              {rankText && (
                <span style={{
                  fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700,
                  color: "var(--amber)", letterSpacing: "0.04em",
                }}>{rankText}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Stat grid ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {/* XP card */}
          <div style={{
            background: "var(--bg3)", borderRadius: 8, padding: "8px 10px",
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 3 }}>
              TOTAL XP
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--cyan)", fontFamily: "var(--mono)" }}>
              {xp.toLocaleString()}
            </div>
            {/* mini progress to next level */}
            <div style={{ marginTop: 5, height: 3, background: "var(--bg4)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, width: `${pct}%`,
                background: "linear-gradient(90deg, var(--cyan2), var(--cyan))",
              }} />
            </div>
            <div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 3 }}>
              {pct}% → Lv.{level + 1}
            </div>
          </div>

          {/* Streak card */}
          <div style={{
            background: "var(--bg3)", borderRadius: 8, padding: "8px 10px",
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 3 }}>
              STREAK
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--mono)" }}>
              🔥 {streak}
            </div>
            <div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 8 }}>
              {streak === 0 ? "start a streak!" : streak === 1 ? "1 day streak" : `${streak} day streak`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <MenuItem icon="👤" label="Profile"      onClick={() => goTo("/profile")} />
      <MenuItem icon="🏆" label="Leaderboard"  onClick={() => goTo("/leaderboard")} />
      <MenuItem icon="⚙️" label="Settings"     onClick={() => goTo("/settings")} />

      <div style={{ borderTop: "1px solid var(--border)", margin: "6px 0" }} />

      <MenuItem icon="🚪" label="Sign Out" onClick={handleSignOut} danger />
    </div>
  );

  // ── inlineMode: stat pills + avatar, all in a row ────────────────────────
  if (inlineMode) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} ref={wrapRef}>
        <XpPill xp={xp} />
        <StreakBadge streak={streak} />
        <div onClick={() => setOpen(o => !o)}>
          <Avatar avatarUrl={avatarUrl} initials={initials} size={34} active={open} />
        </div>
        {dropdown}
        <style>{`
          @keyframes tb-drop {
            from { opacity:0; transform:translateY(-6px) scale(0.97); }
            to   { opacity:1; transform:translateY(0)   scale(1);    }
          }
        `}</style>
      </div>
    );
  }

  // ── standalone: fixed top-right floating avatar ──────────────────────────
  return (
    <div
      ref={wrapRef}
      style={{ position: "fixed", top: 18, right: 28, zIndex: 200 }}
    >
      <div onClick={() => setOpen(o => !o)}>
        <Avatar avatarUrl={avatarUrl} initials={initials} size={42} active={open} />
      </div>
      {dropdown}
      <style>{`
        @keyframes tb-drop {
          from { opacity:0; transform:translateY(-6px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}
// ChallengesMode.jsx — [New UI S2]
// ─────────────────────────────────────────────────────────────────────────────
// Changes:
//
//  1. Banner image removed → compact inline hero block
//     The 220px banner wasted ~30% viewport before any content. Replaced with:
//     - Monospace heading "// challenges" with a pulsing cursor
//     - Subtitle line
//     - Two live stat pills: total XP earned + levels completed (computed from
//       already-loaded games/progress data — no extra DB call)
//
//  2. Category pills redesigned with live counts
//     - Each pill shows "Category · N" where N is the number of games in that
//       category (computed from loaded games data, not hardcoded)
//     - Active pill: solid cyan fill (kept from .cat-tab--active)
//     - Inactive pills: ghost style with hover fill
//     - Removed the animated bottom-border underline (replaced by fill)
//     - Pill row fades up on mount same as before
//
//  3. GameCards redesign — XP ring, difficulty tier, CTA button
//     - Circular SVG XP progress ring in top-right (replaces hot badge position)
//     - Hot badge moves inside the ring area if present
//     - Difficulty tier badge: derived from game.tag
//     - CTA label: "Continue →" if in-progress, "Start" if untouched,
//       "Review" if 100% complete
//     - All animation logic unchanged (stagger entrance, shimmer skeleton)
//
//  Data/logic: unchanged. All Supabase calls identical.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "../../../services/supabaseClient";

// ── Keyframes ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes cmCursor {
    0%,100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  @keyframes cmHeroIn {
    from { opacity:0; transform:translateY(-14px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes cmTabsIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0);   }
  }
  @keyframes cmCardEntrance {
    from { opacity:0; transform:translateY(22px) scale(0.96); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes cmShimmer {
    0%   { background-position:-400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes cmEmptyIn {
    from { opacity:0; transform:scale(0.95); }
    to   { opacity:1; transform:scale(1);   }
  }
  @keyframes cmStatPop {
    from { opacity:0; transform:scale(0.88) translateY(4px); }
    to   { opacity:1; transform:scale(1)    translateY(0);   }
  }
`;

// ── Colour map (same as old GameCards, kept here for the new card) ─────────────
const COLOR_MAP = {
  cyan:   { accent:"var(--cyan)",   glow:"rgba(0,212,255,0.1)",   iconBg:"rgba(0,212,255,0.08)",   iconBorder:"rgba(0,212,255,0.2)",   ring:"#00d4ff" },
  amber:  { accent:"var(--amber)",  glow:"rgba(245,166,35,0.1)",  iconBg:"rgba(245,166,35,0.08)",  iconBorder:"rgba(245,166,35,0.2)",  ring:"#f5a623" },
  purple: { accent:"var(--purple)", glow:"rgba(156,111,255,0.1)", iconBg:"rgba(156,111,255,0.08)", iconBorder:"rgba(156,111,255,0.2)", ring:"#9c6fff" },
  green:  { accent:"var(--green)",  glow:"rgba(0,230,118,0.1)",   iconBg:"rgba(0,230,118,0.08)",   iconBorder:"rgba(0,230,118,0.2)",   ring:"#00e676" },
};

// ── Difficulty tier from tag ──────────────────────────────────────────────────
function diffTier(tag) {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (t.includes("beginner") || t.includes("easy") || t.includes("intro"))
    return { label: "Beginner", color: "var(--green)",  bg: "rgba(0,230,118,0.1)"  };
  if (t.includes("advanced") || t.includes("hard") || t.includes("expert"))
    return { label: "Advanced", color: "var(--red)",    bg: "rgba(255,76,106,0.1)" };
  return   { label: "Intermediate", color: "var(--amber)", bg: "rgba(245,166,35,0.1)" };
}

// ── CTA label from progress ───────────────────────────────────────────────────
function ctaLabel(progress, levels) {
  if (levels === 0)            return { text: "Coming Soon", disabled: true  };
  if (progress === 0)          return { text: "Start →",     disabled: false };
  if (progress >= levels)      return { text: "Review ✓",   disabled: false };
  return                              { text: "Continue →",  disabled: false };
}

// ── SVG circular progress ring ────────────────────────────────────────────────
function XpRing({ pct, color, size = 52 }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (circ * Math.min(pct, 100)) / 100;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      {/* track */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="var(--bg4)" strokeWidth={3} />
      {/* fill */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({ game, onClick }) {
  const [hovered, setHovered] = useState(false);
  const c          = COLOR_MAP[game.color] || COLOR_MAP.cyan;
  const progressPct = game.levels > 0 ? Math.round((game.progress / game.levels) * 100) : 0;
  const tier        = diffTier(game.tag);
  const cta         = ctaLabel(game.progress, game.levels);

  return (
    <div
      onClick={!cta.disabled ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg2)",
        border: `1px solid ${hovered ? c.accent : "var(--border)"}`,
        borderRadius: 16, padding: "22px 22px 18px",
        cursor: cta.disabled ? "default" : "pointer",
        position: "relative", overflow: "hidden",
        transform: hovered && !cta.disabled ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered && !cta.disabled ? `0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${c.accent}22` : "none",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.22s",
        display: "flex", flexDirection: "column", height: "100%",
      }}
    >
      {/* Glow overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none",
        background: `radial-gradient(ellipse at top left, ${c.glow} 0%, transparent 65%)`,
        opacity: hovered ? 1 : 0, transition: "opacity 0.3s",
      }} />

      {/* Top row: icon + XP ring */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, fontSize: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: c.iconBg, border: `1px solid ${c.iconBorder}`, flexShrink: 0,
        }}>
          {game.icon}
        </div>

        {/* XP ring + pct label */}
        <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
          <XpRing pct={progressPct} color={c.ring} size={52} />
          {/* Pct text centred in ring */}
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)",
              color: progressPct > 0 ? c.accent : "var(--muted)",
              lineHeight: 1,
            }}>
              {progressPct > 0 ? `${progressPct}%` : "—"}
            </span>
          </div>
          {/* Hot badge inside ring area if present */}
          {game.badge && (
            <div style={{
              position: "absolute", top: -4, right: -4,
              background: "var(--red)", color: "#fff",
              fontSize: 8, fontWeight: 700, padding: "2px 5px",
              borderRadius: 8, fontFamily: "var(--mono)", letterSpacing: "0.06em",
              lineHeight: 1.4,
            }}>
              {game.badge}
            </div>
          )}
        </div>
      </div>

      {/* Title + difficulty tier */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <h3 style={{
          fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em",
          fontFamily: "var(--sans)", margin: 0,
        }}>
          {game.title}
        </h3>
        {tier && (
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)",
            padding: "2px 7px", borderRadius: 20,
            color: tier.color, background: tier.bg,
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {tier.label}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{
        fontSize: 12, color: "var(--muted)", lineHeight: 1.65,
        fontFamily: "var(--mono)", flex: 1, margin: "0 0 16px",
      }}>
        {game.desc}
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: 5,
        }}>
          <span>Progress</span>
          <span style={{ color: c.accent, fontWeight: 700 }}>
            {game.progress} / {game.levels} levels
          </span>
        </div>
        <div style={{ height: 3, background: "var(--bg4)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${progressPct}%`, background: c.accent,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Footer: tag + CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
          background: "rgba(0,0,0,0.3)", border: `1px solid ${c.accent}44`,
          color: c.accent, letterSpacing: "0.08em", textTransform: "uppercase",
          fontFamily: "var(--mono)", flexShrink: 0,
        }}>
          {game.tag}
        </span>

        {/* CTA button */}
        <button
          onClick={e => { e.stopPropagation(); if (!cta.disabled) onClick(); }}
          disabled={cta.disabled}
          style={{
            padding: "5px 14px", borderRadius: 8, fontSize: 10, fontWeight: 700,
            fontFamily: "var(--mono)", letterSpacing: "0.04em", cursor: cta.disabled ? "default" : "pointer",
            border: `1px solid ${cta.disabled ? "var(--border)" : c.accent}`,
            background: hovered && !cta.disabled ? c.accent : "transparent",
            color: hovered && !cta.disabled ? "#000" : cta.disabled ? "var(--muted)" : c.accent,
            transition: "background 0.18s, color 0.18s",
            flexShrink: 0,
          }}
        >
          {cta.text}
        </button>
      </div>
    </div>
  );
}

// ── Hero stat pill ────────────────────────────────────────────────────────────
function StatPill({ label, value, color, delay }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 14px", borderRadius: 999,
      background: "var(--bg2)", border: "1px solid var(--border2)",
      animation: `cmStatPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
    }}>
      <span style={{
        fontSize: 14, fontWeight: 800, fontFamily: "var(--mono)", color,
      }}>{value}</span>
      <span style={{
        fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)",
        letterSpacing: "0.06em",
      }}>{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const CATEGORIES    = ["All", "Frontend", "Backend", "DSA", "System Design", "DevOps"];
const CATEGORY_MAP  = {
  "JavaScript":    "Frontend",
  "React":         "Frontend",
  "CSS":           "Frontend",
  "TypeScript":    "Frontend",
  "DSA":           "DSA",
  "Debug Master":  "Backend",
  "System Design": "System Design",
};

export default function ChallengesMode({ onSelectGame, userId }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [games,          setGames]          = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [gridKey,        setGridKey]        = useState(0);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setGridKey(k => k + 1);
  };

  useEffect(() => {
    if (!userId) return;
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const { data: gamesData, error } = await supabase
          .from("cg_game_types").select("*").eq("is_active", true)
          .order("order", { ascending: true });
        if (error) { console.error("Error fetching games:", error); return; }

        const { data: levelsData }   = await supabase.from("cg_levels").select("id, game_type_id");
        const { data: progressData } = await supabase
          .from("cg_user_level_progress").select("level_id, status, xp_earned").eq("user_id", userId);

        const progressMap = {};
        progressData?.forEach(p => { progressMap[p.level_id] = p; });

        const formatted = gamesData.map(g => {
          const gameLevels      = (levelsData || []).filter(l => l.game_type_id === g.id);
          const totalLevels     = gameLevels.length;
          const completedLevels = gameLevels.filter(l => progressMap[l.id]?.status === "completed").length;
          const earnedXp        = gameLevels.reduce((s, l) => s + (progressMap[l.id]?.xp_earned || 0), 0);
          return {
            id:       g.id,
            icon:     g.icon || "🎮",
            title:    g.title,
            desc:     g.description,
            color:    g.color || "cyan",
            tag:      g.tag,
            badge:    g.badge || null,
            category: CATEGORY_MAP[g.title] || "All",
            levels:   totalLevels,
            progress: completedLevels,
            xp:       g.xp_per_level || 0,
            earnedXp,
          };
        });

        setGames(formatted);
        setGridKey(k => k + 1);
      } catch (err) {
        console.error("Game load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, [userId]);

  const filteredGames = activeCategory === "All"
    ? games
    : games.filter(g => g.category === activeCategory);

  // Hero stats — computed from loaded data
  const totalXp        = games.reduce((s, g) => s + (g.earnedXp || 0), 0);
  const totalCompleted = games.reduce((s, g) => s + g.progress, 0);

  // Category counts for pills
  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === "All"
      ? games.length
      : games.filter(g => g.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <style>{KEYFRAMES}</style>

      {/* ── HERO — replaces the banner image ─────────────────────────────── */}
      <div className="page-container" style={{
        padding: "32px 24px 0",
        animation: "cmHeroIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Heading */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)",
          letterSpacing: "0.1em", marginBottom: 8,
        }}>
          // challenges
          <span style={{ animation: "cmCursor 1.1s step-end infinite", marginLeft: 2 }}>▋</span>
        </div>
        <h1 style={{
          fontSize: "clamp(26px,4vw,36px)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "var(--sans)",
          margin: "0 0 6px",
        }}>
          Pick your battleground.
        </h1>
        

        
      </div>

      {/* ── CATEGORY PILLS ────────────────────────────────────────────────── */}
      <div className="page-container" style={{
        padding: "18px 24px 20px", overflowX: "auto", scrollbarWidth: "none",
        animation: "cmTabsIn 0.45s ease 0.12s both",
      }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            const count    = catCounts[cat] || 0;
            if (cat !== "All" && count === 0) return null; // hide empty categories
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: "6px 14px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700, fontFamily: "var(--sans)",
                  cursor: "pointer", whiteSpace: "nowrap",
                  border: `1px solid ${isActive ? "var(--cyan)" : "var(--border2)"}`,
                  background: isActive ? "var(--cyan)" : "transparent",
                  color: isActive ? "#000" : "var(--muted)",
                  transition: "background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s",
                  transform: isActive ? "translateY(-1px)" : "none",
                  boxShadow: isActive ? "0 4px 14px rgba(0,212,255,0.25)" : "none",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.borderColor = "var(--border2)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.borderColor = "var(--border2)";
                    e.currentTarget.style.transform = "none";
                  }
                }}
              >
                {cat}
                {/* Count badge */}
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)",
                  padding: "1px 6px", borderRadius: 99,
                  background: isActive ? "rgba(0,0,0,0.18)" : "var(--bg3)",
                  color: isActive ? "#000" : "var(--muted)",
                  minWidth: 18, textAlign: "center",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GAME GRID ─────────────────────────────────────────────────────── */}
      <div
        key={gridKey}
        className="page-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16, padding: "0 24px 48px",
          alignItems: "start",
        }}
      >
        {/* Shimmer skeletons */}
        {isLoading && [1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: "var(--bg2)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 24, height: 240,
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.05) 50%,transparent 100%)",
              backgroundSize: "400px 100%",
              animation: `cmShimmer 1.6s ease-in-out ${i * 0.15}s infinite`,
              borderRadius: 16,
            }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg3)" }} />
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bg3)" }} />
              </div>
              <div style={{ height: 14, width: "55%", borderRadius: 6, background: "var(--bg3)" }} />
              <div style={{ height: 10, width: "90%", borderRadius: 6, background: "var(--bg4)" }} />
              <div style={{ height: 10, width: "70%", borderRadius: 6, background: "var(--bg4)" }} />
              <div style={{ marginTop: 8, height: 3,  borderRadius: 99, background: "var(--bg3)" }} />
            </div>
          </div>
        ))}

        {/* Game cards — staggered entrance */}
        {!isLoading && filteredGames.map((game, idx) => (
          <div
            key={game.id}
            style={{
              animation: "cmCardEntrance 0.4s cubic-bezier(0.22,1,0.36,1) both",
              animationDelay: `${idx * 55}ms`,
            }}
          >
            <GameCard game={game} onClick={() => onSelectGame(game)} />
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && filteredGames.length === 0 && (
          <div style={{
            gridColumn: "1 / -1", textAlign: "center", padding: "64px 24px",
            color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 13,
            animation: "cmEmptyIn 0.35s ease both",
          }}>
            // no games found for "{activeCategory}"
          </div>
        )}
      </div>
    </div>
  );
}
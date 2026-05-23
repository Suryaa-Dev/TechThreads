import { useState } from "react";

const COLOR_MAP = {
  cyan: {
    accent: "var(--cyan)",
    glow: "rgba(0,212,255,0.08)",
    iconBg: "rgba(0,212,255,0.08)",
    iconBorder: "rgba(0,212,255,0.2)",
    tagColor: "var(--cyan)",
  },
  amber: {
    accent: "var(--amber)",
    glow: "rgba(245,166,35,0.08)",
    iconBg: "rgba(245,166,35,0.08)",
    iconBorder: "rgba(245,166,35,0.2)",
    tagColor: "var(--amber)",
  },
  purple: {
    accent: "var(--purple)",
    glow: "rgba(156,111,255,0.08)",
    iconBg: "rgba(156,111,255,0.08)",
    iconBorder: "rgba(156,111,255,0.2)",
    tagColor: "var(--purple)",
  },
  green: {
    accent: "var(--green)",
    glow: "rgba(0,230,118,0.08)",
    iconBg: "rgba(0,230,118,0.08)",
    iconBorder: "rgba(0,230,118,0.2)",
    tagColor: "var(--green)",
  },
};

export default function GameCards({ game, onClick }) {
  const [hovered, setHovered] = useState(false);
  const c = COLOR_MAP[game.color] || COLOR_MAP.cyan;
  const progressPct =
    game.levels > 0 ? Math.round((game.progress / game.levels) * 100) : 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg2)",
        border: `1px solid ${hovered ? c.accent : "var(--border)"}`,
        borderRadius: "16px",
        padding: "24px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "16px",
          background: `radial-gradient(ellipse at top left, ${c.glow} 0%, transparent 60%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />

      {/* Hot badge */}
      {game.badge && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "var(--red)",
            color: "#fff",
            fontSize: "9px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "10px",
            fontFamily: "var(--mono)",
            letterSpacing: "0.06em",
          }}
        >
          {game.badge}
        </div>
      )}

      {/* Icon */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          marginBottom: "16px",
          background: c.iconBg,
          border: `1px solid ${c.iconBorder}`,
        }}
      >
        {game.icon}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 700,
          marginBottom: "6px",
          letterSpacing: "-0.01em",
          fontFamily: "var(--sans)",
        }}
      >
        {game.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          color: "var(--muted)",
          lineHeight: 1.6,
          marginBottom: "20px",
          fontFamily: "var(--mono)",
          flex: 1,
        }}
      >
        {game.desc}
      </p>

      {/* Progress */}
      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            fontFamily: "var(--mono)",
            color: "var(--muted)",
            marginBottom: "6px",
          }}
        >
          <span>Progress</span>
          <span style={{ color: c.accent }}>
            {game.progress} / {game.levels} levels
          </span>
        </div>
        <div
          style={{
            height: "4px",
            background: "var(--bg4)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: c.accent,
              borderRadius: "2px",
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: "20px",
            fontSize: "10px",
            fontWeight: 700,
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${c.tagColor}`,
            color: c.tagColor,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
          }}
        >
          {game.tag}
        </span>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
          <strong style={{ color: "var(--text)" }}>{game.levels}</strong> levels ·{" "}
          <strong style={{ color: "var(--text)" }}>+{game.xp} XP</strong> 
        </span>
      </div>
    </div>
  );
}
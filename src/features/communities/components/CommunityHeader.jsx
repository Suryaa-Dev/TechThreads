import React from "react";

const CommunityHeader = ({ community, isMember, onJoin, onLeave }) => {
  return (
    <div style={{
      borderRadius: 18, overflow: "hidden",
      border: "1px solid #252523",
      background: "#161615",
      marginBottom: 22,
    }}>
      {/* ── COVER ── */}
      <div style={{ position: "relative", height: 148, overflow: "hidden" }}>
        {community.cover_url ? (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${community.cover_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, #0c1018 0%, #191917 50%, #0c1018 100%)" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%, rgba(0,212,255,0.14) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(156,111,255,0.1) 0%, transparent 60%)" }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(14,18,25,0.96) 100%)" }} />
      </div>

      {/* ── INFO BAR ── */}
      <div style={{ padding: "18px 24px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: "#f0f4ff", margin: "0 0 4px", lineHeight: 1.15 }}>
            {community.name}
          </h1>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b7a99", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            // {community.slug || "community"}
          </p>
        </div>

        <div style={{ flexShrink: 0 }}>
          {isMember ? (
            <button
              onClick={onLeave}
              style={{
                padding: "10px 22px", borderRadius: 10,
                border: "1px solid rgba(0,230,118,0.35)",
                background: "rgba(0,230,118,0.1)",
                color: "#00e676",
                fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,76,106,0.12)"; e.currentTarget.style.borderColor = "rgba(255,76,106,0.35)"; e.currentTarget.style.color = "#ff4c6a"; e.currentTarget.textContent = "Leave"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,230,118,0.1)"; e.currentTarget.style.borderColor = "rgba(0,230,118,0.35)"; e.currentTarget.style.color = "#00e676"; e.currentTarget.textContent = "✓ Joined"; }}
            >
              ✓ Joined
            </button>
          ) : (
            <button
              onClick={onJoin}
              style={{
                padding: "10px 22px", borderRadius: 10,
                border: "1px solid rgba(0,212,255,0.45)",
                background: "rgba(0,212,255,0.12)",
                color: "#00d4ff",
                fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.22)"; e.currentTarget.style.boxShadow = "0 0 18px rgba(0,212,255,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              + Join Community
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityHeader;
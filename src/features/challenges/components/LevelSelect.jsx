import { useEffect, useState } from "react";
import TopBar from "./TopBar";
import { supabase } from "../../../services/supabaseClient";

const STATUS_STYLES = {
  done: {
    node:      { borderColor:"var(--cyan)", background:"rgba(0,212,255,0.08)", color:"var(--cyan)" },
    card:      { borderColor:"rgba(0,212,255,0.2)" },
    badge:     { background:"rgba(0,212,255,0.1)", color:"var(--cyan)" },
    label:     "✓ CLEARED",
    connector: "var(--cyan)",
    glow:      "rgba(0,212,255,0.15)",
  },
  active: {
    node:      { borderColor:"var(--amber)", background:"rgba(245,166,35,0.08)", color:"var(--amber)", boxShadow:"0 0 0 6px rgba(245,166,35,0.1)" },
    card:      { borderColor:"var(--amber)" },
    badge:     { background:"rgba(245,166,35,0.1)", color:"var(--amber)" },
    label:     "▶ IN PROGRESS",
    connector: "var(--border)",
    glow:      "rgba(245,166,35,0.15)",
  },
  locked: {
    node:      { borderColor:"var(--border)", background:"var(--bg2)", color:"var(--muted)", opacity:0.4 },
    card:      { borderColor:"var(--border)", opacity:0.4 },
    badge:     { background:"var(--bg4)", color:"var(--muted)" },
    label:     "🔒 LOCKED",
    connector: "var(--border)",
    glow:      "transparent",
  },
};

function StarRating({ count }) {
  return (
    <span style={{ fontSize:"13px", letterSpacing:"2px", display:"inline-flex", gap:2 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{
          color: i <= count ? "var(--amber)" : "var(--muted)",
          filter: i <= count ? "drop-shadow(0 0 4px rgba(245,166,35,0.6))" : "none",
          transition:"all 0.2s",
        }}>
          {i <= count ? "⭐" : "☆"}
        </span>
      ))}
    </span>
  );
}

// Pulsing dot for active level node
function PulsingRing({ color }) {
  return (
    <span style={{
      position:"absolute", inset:-10, borderRadius:"50%",
      border:`2px solid ${color}`,
      animation:"ls-ring-pulse 2s ease-out infinite",
      pointerEvents:"none",
    }}/>
  );
}

export default function LevelSelect({ game, onBack, onSelectLevel, userStats, userId }) {
  const [levels,    setLevels]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  useEffect(() => {
    if (!game?.id || !userId) return;

    const loadLevels = async () => {
      setIsLoading(true);
      try {
        const [{ data: levelData, error }, { data: progressData }, { data: questionCounts }] = await Promise.all([
          supabase.from("cg_levels").select("*").eq("game_type_id", game.id).order("order", { ascending:true }),
          supabase.from("cg_user_level_progress").select("*").eq("user_id", userId),
          supabase.from("cg_questions").select("level_id").in("level_id",
            (await supabase.from("cg_levels").select("id").eq("game_type_id", game.id)).data?.map(l => l.id) || []
          ),
        ]);

        if (error) { console.error("Error loading levels:", error); return; }

        const questionCountMap = {};
        questionCounts?.forEach(q => { questionCountMap[q.level_id] = (questionCountMap[q.level_id] || 0) + 1; });

        const progressMap = {};
        progressData?.forEach(p => { progressMap[p.level_id] = p; });

        const formatted = levelData.map((lvl, index) => {
          const progress = progressMap[lvl.id];
          let status = "locked";
          if (progress?.status === "completed") status = "done";
          else if (progress?.status === "active") status = "active";
          else if (index === 0) status = "active";
          return {
            id: index + 1, title: lvl.title, desc: lvl.description, status,
            xp: lvl.xp_reward || 120,
            questions: questionCountMap[lvl.id] ?? lvl.total_questions ?? 0,
            stars: progress?.stars || 0,
            level_id: lvl.id, game_id: lvl.game_type_id, order: lvl.order,
          };
        });
        setLevels(formatted);
      } catch (err) { console.error("Level load error:", err); }
      finally { setIsLoading(false); }
    };

    loadLevels();
  }, [game?.id, userId]);

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)", color:"var(--text)" }}>
      <style>{`
        /* ── Keyframes ── */
        @keyframes ls-fade-up    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ls-node-pop   { from { opacity:0; transform:scale(0.4); } 70% { transform:scale(1.12); } to { opacity:1; transform:scale(1); } }
        @keyframes ls-card-slide { from { opacity:0; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ls-connector  { from { transform:scaleY(0); } to { transform:scaleY(1); } }
        @keyframes ls-ring-pulse { 0% { opacity:0.6; transform:scale(1); } 100% { opacity:0; transform:scale(1.55); } }
        @keyframes ls-shimmer    { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        @keyframes ls-pulse-bg   { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }
        @keyframes ls-badge-glow { 0%,100% { box-shadow:0 0 0 0 transparent; } 50% { box-shadow:0 0 8px 2px var(--glow); } }
        @keyframes ls-star-enter { from { opacity:0; transform:scale(0) rotate(-20deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }

        /* connector line grows down */
        .ls-connector-line { transform-origin: top center; }
      `}</style>

      <TopBar userStats={userStats} />

      {/* Header */}
      <div className="page-container" style={{ padding:"32px 24px 0" }}>
        <button onClick={onBack} style={{
          display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontFamily:"var(--mono)",
          color:"var(--muted)", cursor:"pointer", marginBottom:24, background:"none", border:"none",
          transition:"color 0.15s, transform 0.15s",
          animation: mounted ? "ls-fade-up 0.4s ease 0.05s both" : "none",
        }}
          onMouseEnter={e => { e.currentTarget.style.color="var(--text)"; e.currentTarget.style.transform="translateX(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.color="var(--muted)"; e.currentTarget.style.transform="none"; }}
        >
          ← back to challenges
        </button>

        <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4, fontFamily:"var(--sans)", animation: mounted ? "ls-fade-up 0.4s ease 0.1s both" : "none" }}>
          {game?.icon} {game?.title}
        </h2>
        <p style={{ fontSize:13, color:"var(--muted)", fontFamily:"var(--mono)", marginBottom:28, animation: mounted ? "ls-fade-up 0.4s ease 0.18s both" : "none" }}>
          // {levels.length} levels · complete all to unlock Master Badge
        </p>
      </div>

      <div className="page-container" style={{ padding:"0 24px 40px" }}>

        {/* Skeleton */}
        {isLoading && [1,2,3].map(i => (
          <div key={i} style={{ display:"flex", gap:16, marginBottom:20, animation:`ls-pulse-bg 1.5s ease-in-out ${i*0.1}s infinite` }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--bg3)", flexShrink:0 }}/>
            <div style={{ flex:1, height:72, borderRadius:12, background:"var(--bg3)" }}/>
          </div>
        ))}

        {/* Level rows */}
        {!isLoading && levels.map((level, idx) => {
          const s           = STATUS_STYLES[level.status];
          const isLast      = idx === levels.length - 1;
          const isClickable = level.status !== "locked";
          const nodeDelay   = `${0.25 + idx * 0.08}s`;
          const cardDelay   = `${0.32 + idx * 0.08}s`;
          const connDelay   = `${0.28 + idx * 0.08}s`;

          return (
            <div key={level.level_id} style={{ position:"relative" }}>

              {/* Connector line — grows from top */}
              {!isLast && (
                <div
                  className="ls-connector-line"
                  style={{
                    position:"absolute", left:35, top:72, width:2, height:20,
                    background:s.connector, zIndex:0,
                    animation: mounted ? `ls-connector 0.4s ease ${connDelay} both` : "none",
                    opacity: level.status === "locked" ? 0.3 : 1,
                  }}
                />
              )}

              <div style={{ display:"flex", marginBottom:20, alignItems:"flex-start" }}>

                {/* Node circle */}
                <div
                  onClick={() => isClickable && onSelectLevel(level)}
                  style={{
                    width:72, height:72, borderRadius:"50%",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    border:"2px solid", flexShrink:0,
                    cursor: isClickable ? "pointer" : "not-allowed",
                    position:"relative", zIndex:1,
                    transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
                    animation: mounted ? `ls-node-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${nodeDelay} both` : "none",
                    ...s.node,
                  }}
                  onMouseEnter={e => { if (isClickable) { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow=`0 0 20px ${s.glow}`; }}}
                  onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=s.node.boxShadow||"none"; }}
                >
                  {/* Pulsing ring for active */}
                  {level.status === "active" && <PulsingRing color="var(--amber)"/>}
                  <span style={{ fontSize:20, fontWeight:800, fontFamily:"var(--sans)", lineHeight:1 }}>{level.id}</span>
                  <span style={{ fontSize:8, fontFamily:"var(--mono)", letterSpacing:"0.06em", marginTop:2 }}>
                    {level.status==="done"?"DONE":level.status==="active"?"NOW":"LOCK"}
                  </span>
                </div>

                {/* Card */}
                <div
                  onClick={() => isClickable && onSelectLevel(level)}
                  style={{
                    flex:1, marginLeft:16, padding:"18px 20px",
                    background:"var(--bg2)", border:"1px solid", borderRadius:12,
                    cursor: isClickable ? "pointer" : "not-allowed",
                    transition:"transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s, border-color 0.15s",
                    animation: mounted ? `ls-card-slide 0.45s ease ${cardDelay} both` : "none",
                    "--glow": s.glow,
                    ...s.card,
                  }}
                  onMouseEnter={e => {
                    if (!isClickable) return;
                    e.currentTarget.style.transform  = "translateX(6px)";
                    e.currentTarget.style.boxShadow  = `0 4px 20px ${s.glow}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <h3 style={{ fontSize:15, fontWeight:700, fontFamily:"var(--sans)" }}>{level.title}</h3>
                    <span style={{
                      fontSize:9, fontFamily:"var(--mono)", fontWeight:700,
                      padding:"3px 9px", borderRadius:20, letterSpacing:"0.05em",
                      ...s.badge,
                    }}>
                      {s.label}
                    </span>
                  </div>

                  <p style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)", marginBottom:12, lineHeight:1.55 }}>
                    {level.desc}
                  </p>

                  <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--amber)", display:"flex", alignItems:"center", gap:4 }}>
                      {level.status==="done"
                        ? <><span style={{ color:"var(--cyan)" }}>✓</span>{`+${level.xp} XP earned`}</>
                        : `+${level.xp} XP`
                      }
                    </span>
                    <span style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)" }}>
                      {level.questions===0 ? "no questions yet" : `${level.questions} question${level.questions!==1?"s":""}`}
                    </span>

                    {/* Stars animate in staggered */}
                    <span style={{ display:"inline-flex", gap:3, fontSize:13 }}>
                      {[1,2,3].map(i => (
                        <span key={i} style={{
                          display:"inline-block",
                          color: i<=level.stars ? "var(--amber)" : "var(--muted)",
                          filter: i<=level.stars ? "drop-shadow(0 0 4px rgba(245,166,35,0.6))" : "none",
                          animation: mounted && i<=level.stars
                            ? `ls-star-enter 0.35s cubic-bezier(0.34,1.56,0.64,1) ${parseFloat(cardDelay)+0.1+i*0.07}s both`
                            : "none",
                        }}>
                          {i<=level.stars?"⭐":"☆"}
                        </span>
                      ))}
                    </span>

                    {/* Progress bar for done levels */}
                    {level.status === "done" && (
                      <div style={{ flex:1, minWidth:60, height:3, background:"var(--bg3)", borderRadius:99, overflow:"hidden", marginLeft:"auto" }}>
                        <div style={{
                          height:"100%", borderRadius:99,
                          background:"linear-gradient(90deg,var(--cyan),var(--green))",
                          width: `${Math.min(100, Math.round((level.stars/3)*100))}%`,
                          transition:"width 0.8s ease",
                        }}/>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
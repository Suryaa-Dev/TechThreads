import React, { useEffect, useState } from "react";
import { supabase } from "../../../services/supabaseClient";

const TAG_COLORS = {
  Frontend: "#00d4ff", Backend: "#00e676", DSA: "#f5a623",
  "System Design": "#ff4c6a", DevOps: "#9c6fff", General: "#8b95ae",
};
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#00d4ff,#0099cc)",
  "linear-gradient(135deg,#9c6fff,#6b3fd4)",
  "linear-gradient(135deg,#00e676,#00a854)",
  "linear-gradient(135deg,#f5a623,#c97d00)",
  "linear-gradient(135deg,#ff4c6a,#c0003a)",
  "linear-gradient(135deg,#E8435A,#7F77DD)",
];
const gradientFor = (uid = "") =>
  AVATAR_GRADIENTS[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];

function MemberAvatar({ avatar, initials, userId }) {
  const [failed, setFailed] = useState(false);
  if (avatar && !failed) {
    return (
      <img src={avatar} alt={initials} onError={() => setFailed(true)}
        style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #252523", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: gradientFor(userId || ""), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: "#fff", border: "1px solid #252523" }}>
      {initials}
    </div>
  );
}

const CommunitySidebar = ({ communityId }) => {
  const [trending, setTrending] = useState([]);
  const [members,  setMembers]  = useState([]);

  useEffect(() => {
    if (!communityId) return;
    loadTrending();
    loadMembers();
  }, [communityId]);

  const loadTrending = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("id, caption, text, likes, tag")
      .eq("community_id", communityId)
      .neq("type", "prompt")
      .order("likes", { ascending: false })
      .limit(4);
    if (data) setTrending(data);
  };

  const loadMembers = async () => {
    const { data: rows } = await supabase
      .from("community_members")
      .select("user_id, created_at")
      .eq("community_id", communityId)
      .limit(8);
    if (!rows || rows.length === 0) return;

    const uids = rows.map(r => r.user_id).filter(Boolean);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uids);

    const pm = {};
    (profs || []).forEach(p => { pm[p.id] = p; });
    setMembers(rows.map(r => ({ ...r, profile: pm[r.user_id] || null })));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <SideCard title="// Trending Posts">
        {trending.length === 0
          ? <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#6b7a99", margin: 0 }}>No posts yet.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {trending.map((t, i) => (
                <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#2e2e2b", minWidth: 18, paddingTop: 1, fontWeight: 700, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, color: "#d0d8ee", margin: "0 0 3px", lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.caption || t.text || "Untitled post"}
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {t.tag && <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: TAG_COLORS[t.tag] || "#8b95ae", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t.tag}</span>}
                      <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: "#6b7a99" }}>♥ {t.likes || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </SideCard>

      <SideCard title="// Active Members">
        {members.length === 0
          ? <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#6b7a99", margin: 0 }}>No members yet.</p>
          : <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 9 }}>
                {members.map((m) => {
                  const name     = m.profile?.full_name || `User ${m.user_id.slice(0, 8)}`;
                  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <MemberAvatar avatar={m.profile?.avatar_url || null} initials={initials} userId={m.user_id} />
                      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: "#d0d8ee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#6b7a99", margin: 0 }}>
                {members.length} member{members.length !== 1 ? "s" : ""} shown
              </p>
            </div>
        }
      </SideCard>

      <SideCard title="// Stats">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatBox label="Members" value={members.length} color="#00d4ff" />
          <StatBox label="Top Posts" value={trending.length} color="#00e676" />
        </div>
      </SideCard>

    </div>
  );
};

const SideCard = ({ title, children }) => (
  <div style={{ background: "linear-gradient(145deg,#161615,#121211)", border: "1px solid #252523", borderRadius: 14, padding: "16px 18px" }}>
    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#00d4ff", margin: "0 0 13px", fontWeight: 700, letterSpacing: "0.05em" }}>{title}</p>
    {children}
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #252523", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color, margin: "0 0 4px", lineHeight: 1 }}>{value}</p>
    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#6b7a99", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
  </div>
);

export default CommunitySidebar;
// src/features/feed/components/ActivityStreamBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   FIXED: seed selects now include `user_id`
//   FIXED: author_name / github_username / author_avatar are gone from `posts`;
//          display fields (name, user, avatar) are now resolved via getProfileMap
//          after seeding, and via getProfile() for realtime inserts
//   FIXED: deduplication now keyed on user_id (not github_username which was null)
//   FIXED: buildRing accepts an optional pre-fetched `profile` param to hydrate
//          display fields from profiles table instead of stale post columns
//   ADDED: same-day-only filter — rings whose post was not created today
//          (local timezone) are excluded; a setInterval re-evaluates at midnight
//          so rings that cross midnight disappear dynamically without a reload
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";
import { getProfileMap, getProfile, getInitials, avatarGradient } from "../../../services/userService";

// ─────────────────────────────────────────────────────────────────────────────
// constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RINGS  = 12;
const SEED_COUNT = 8;

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAge(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function ringGradient(kind, seen) {
  if (seen) return "#252523";
  if (kind === "code")    return "linear-gradient(135deg, #f472b6, #818cf8, #38bdf8)";
  if (kind === "project") return "linear-gradient(135deg, #818cf8, #38bdf8)";
  return "linear-gradient(135deg, #f472b6, #a78bfa)";
}

function tooltipMeta(kind) {
  if (kind === "code")    return { verb: "posted",  color: "#38bdf8" };
  if (kind === "project") return { verb: "shipped", color: "#818cf8" };
  return                         { verb: "active",  color: "#34d399" };
}

/**
 * Returns true if the given timestamp falls on today in the user's local timezone.
 */
function isToday(ts) {
  if (!ts) return false;
  const postDate = new Date(ts);
  const now      = new Date();
  return (
    postDate.getFullYear() === now.getFullYear() &&
    postDate.getMonth()    === now.getMonth()    &&
    postDate.getDate()     === now.getDate()
  );
}

/**
 * Returns ms until midnight (local time) — used to schedule the cleanup tick.
 */
function msUntilMidnight() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

// ── buildRing ─────────────────────────────────────────────────────────────────
// `row`     — the raw DB row (posts or project_posts)
// `kind`    — "code" | "project"
// `profile` — optional pre-fetched profiles row; used to set display fields
//             because author_name / github_username / author_avatar are no longer
//             written to `posts` and would always be null without this.

function buildRing(row, kind, profile = null) {
  const rawId  = row?.id;
  const postId = rawId != null ? String(rawId) : null;

  // Prefer resolved profile fields; fall back to whatever the row has (project_posts
  // may still carry author_* columns), then to safe defaults.
  const name   = profile?.full_name  || row?.author_name     || "Dev";
  const user   = profile?.username   || row?.github_username || null;
  const avatar = profile?.avatar_url || row?.author_avatar   || null;

  const detail =
    kind === "code"
      ? row?.file_name     || "a snippet"
      : row?.project_title || "a project";

  return {
    id:     postId ? `${kind}-${postId}` : `${kind}-${Math.random()}`,
    postId,
    userId: row?.user_id ?? null,   // ← stored for deduplication keying
    kind,
    name,
    user,
    avatar,
    detail,
    ts:     row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
    seen:   false,
    isNew:  false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryRing
// ─────────────────────────────────────────────────────────────────────────────

function StoryRing({ ring, onSeen }) {
  const navigate = useNavigate();
  const { verb, color } = tooltipMeta(ring.kind);

  const handleClick = () => {
    onSeen(ring.id);
    if (!ring.postId || ring.postId === "undefined" || ring.postId === "null") {
      console.warn("[ActivityStreamBar] ring has no valid postId:", ring);
      return;
    }
    navigate(`/post/${ring.kind}/${ring.postId}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position:      "relative",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           5,
        cursor:        ring.postId ? "pointer" : "default",
        flexShrink:    0,
        animation:     ring.isNew ? "tg-pop 0.35s cubic-bezier(.34,1.56,.64,1) both" : "none",
      }}
      className="tg-story-item"
    >
      {/* gradient ring */}
      <div
        className="tg-ring-outer"
        style={{
          width: 58, height: 58, borderRadius: "50%",
          padding: "2.5px",
          background: ringGradient(ring.kind, ring.seen),
          transition: "transform 0.18s ease",
          flexShrink: 0,
        }}
      >
        <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"#0e0e0d", padding:"2.5px" }}>
          <div style={{
            width:"100%", height:"100%", borderRadius:"50%", overflow:"hidden",
            display:"flex", alignItems:"center", justifyContent:"center",
            background: ring.seen ? "#070a0f" : avatarGradient(ring.userId || ring.name),
            fontSize:14, fontWeight:700, color:"#fff",
            fontFamily:"'Syne', sans-serif",
          }}>
            {ring.avatar ? (
              <img src={ring.avatar} alt={ring.name}
                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            ) : (
              <span style={{ color: ring.seen ? "#3d4a6e" : "#fff" }}>
                {getInitials(ring.name)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* online dot */}
      {!ring.seen && (
        <div style={{
          position:"absolute", top:2, right:2,
          width:11, height:11, borderRadius:"50%",
          background:"#34d399", border:"2.5px solid #0e0e0d", zIndex:2,
        }} />
      )}

      {/* username */}
      <span style={{
        fontSize:10, color: ring.seen ? "#6b7a99" : "#aab4cc",
        fontFamily:"'Space Mono', monospace",
        maxWidth:58, overflow:"hidden", textOverflow:"ellipsis",
        whiteSpace:"nowrap", textAlign:"center",
      }}>
        {ring.user ? `@${ring.user}` : ring.name}
      </span>

      {/* hover tooltip */}
      <div className="tg-tooltip" style={{
        position:"absolute", bottom:"calc(100% + 10px)", left:"50%",
        transform:"translateX(-50%) translateY(4px)",
        background:"#161615", border:"1px solid #252523",
        borderRadius:10, padding:"8px 11px",
        whiteSpace:"nowrap", pointerEvents:"none",
        opacity:0, transition:"opacity 0.15s ease, transform 0.15s ease",
        zIndex:50, minWidth:140,
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:5 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#f0f4ff", fontFamily:"'Syne', sans-serif" }}>
            {ring.name}
          </span>
          <span style={{ fontSize:10, color:"#6b7a99", fontFamily:"'Space Mono', monospace" }}>
            {formatAge(ring.ts)}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{
            fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em",
            color, background:`${color}18`, border:`1px solid ${color}28`,
            borderRadius:4, padding:"1px 5px", fontFamily:"'Space Mono', monospace",
          }}>
            {verb}
          </span>
          <span style={{
            fontSize:11, color:"#aab4cc", fontFamily:"'Space Mono', monospace",
            overflow:"hidden", textOverflow:"ellipsis", maxWidth:110, whiteSpace:"nowrap",
          }}>
            {ring.detail}
          </span>
        </div>
        <div style={{ marginTop:6, fontSize:10, color:"#6b7a99", fontFamily:"'Space Mono', monospace" }}>
          click to view post
        </div>
        {/* tooltip caret */}
        <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
          width:0, height:0, borderLeft:"5px solid transparent",
          borderRight:"5px solid transparent", borderTop:"5px solid #252523" }} />
        <div style={{ position:"absolute", top:"calc(100% - 1px)", left:"50%", transform:"translateX(-50%)",
          width:0, height:0, borderLeft:"5px solid transparent",
          borderRight:"5px solid transparent", borderTop:"5px solid #161615", zIndex:1 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityStreamBar
// ─────────────────────────────────────────────────────────────────────────────

const ActivityStreamBar = () => {
  // `allRings` is the full unfiltered list; `rings` is today-only.
  // Keeping them separate lets the midnight tick refilter without re-fetching.
  const allRingsRef = useRef([]);
  const [rings,   setRings]   = useState([]);
  const [visible, setVisible] = useState(false);

  // ── today-filter ──────────────────────────────────────────────────────────
  // Applies isToday() and re-syncs `rings` state from allRingsRef.
  const applyTodayFilter = useCallback(() => {
    const todayRings = allRingsRef.current.filter((r) => isToday(r.ts));
    setRings(todayRings);
    setVisible(todayRings.length > 0);
  }, []);

  // ── midnight cleanup timer ─────────────────────────────────────────────────
  // Fires once at midnight to drop any rings that are now "yesterday".
  // Rearms itself each day so it keeps working across long sessions.
  useEffect(() => {
    let timeoutId;

    function armMidnightTick() {
      timeoutId = setTimeout(() => {
        applyTodayFilter();
        armMidnightTick(); // rearm for next midnight
      }, msUntilMidnight() + 500); // +500ms buffer past midnight
    }

    armMidnightTick();
    return () => clearTimeout(timeoutId);
  }, [applyTodayFilter]);

  // ── push a new ring into allRingsRef + re-filter ───────────────────────────
  // Deduplication is now by userId (not github_username which was always null).
  const pushRing = useCallback((ring) => {
    if (!ring.postId) return;

    allRingsRef.current = (() => {
      // Remove any existing ring for the same user (most recent post wins)
      const deduped = allRingsRef.current.filter((r) => {
        if (ring.userId && r.userId) return r.userId !== ring.userId;
        // Fallback for rings without userId: dedupe by composite id
        return r.id !== ring.id;
      });
      return [{ ...ring, isNew: true }, ...deduped].slice(0, MAX_RINGS);
    })();

    applyTodayFilter();

    // Clear the isNew pop flag after animation completes
    setTimeout(() => {
      allRingsRef.current = allRingsRef.current.map((r) =>
        r.id === ring.id ? { ...r, isNew: false } : r
      );
      applyTodayFilter();
    }, 400);
  }, [applyTodayFilter]);

  const markSeen = useCallback((id) => {
    allRingsRef.current = allRingsRef.current.map((r) =>
      r.id === id ? { ...r, seen: true } : r
    );
    applyTodayFilter();
  }, [applyTodayFilter]);

  // ── seed ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const seed = async () => {
      // user_id is now explicitly selected so we can resolve profiles
      const [{ data: cp }, { data: pp }] = await Promise.all([
        supabase
          .from("posts")
          .select("id, user_id, file_name, created_at")
          .order("created_at", { ascending: false })
          .limit(SEED_COUNT),
        supabase
          .from("project_posts")
          .select("id, user_id, author_name, github_username, author_avatar, project_title, created_at")
          .order("created_at", { ascending: false })
          .limit(SEED_COUNT),
      ]);

      // Collect all unique user_ids so we can batch-fetch profiles once
      const allRows  = [...(cp || []), ...(pp || [])];
      const userIds  = [...new Set(allRows.map((r) => r.user_id).filter(Boolean))];
      const profileMap = userIds.length ? await getProfileMap(userIds) : {};

      const raw = [
        ...(cp || []).map((r) => buildRing(r, "code",    profileMap[r.user_id] ?? null)),
        ...(pp || []).map((r) => buildRing(r, "project", profileMap[r.user_id] ?? null)),
      ]
        .filter((r) => !!r.postId)
        .sort((a, b) => b.ts - a.ts);

      // Deduplicate by userId — one ring per person, most-recent wins
      const seenUsers = new Set();
      const deduped   = [];
      for (const ring of raw) {
        const key = ring.userId || ring.id;
        if (!seenUsers.has(key)) {
          seenUsers.add(key);
          deduped.push(ring);
        }
        if (deduped.length >= MAX_RINGS) break;
      }

      allRingsRef.current = deduped;
      // Apply today-filter immediately after seeding
      applyTodayFilter();
    };

    seed();
  }, [applyTodayFilter]);

  // ── realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const codeCh = supabase
      .channel("asb-code")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const row     = payload.new;
          const profile = row.user_id ? await getProfile(row.user_id) : null;
          pushRing(buildRing(row, "code", profile));
        }
      )
      .subscribe();

    const projCh = supabase
      .channel("asb-proj")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_posts" },
        async (payload) => {
          const row     = payload.new;
          const profile = row.user_id ? await getProfile(row.user_id) : null;
          pushRing(buildRing(row, "project", profile));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(codeCh);
      supabase.removeChannel(projCh);
    };
  }, [pushRing]);

  if (!visible || rings.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes tg-pop {
          0%   { transform: scale(0.55); opacity: 0; }
          70%  { transform: scale(1.1);  }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes tg-bar-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes tg-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        .tg-story-item:hover .tg-ring-outer { transform: scale(1.08); }
        .tg-story-item:hover .tg-tooltip    { opacity: 1 !important; transform: translateX(-50%) translateY(0) !important; }
        .tg-rings-row::-webkit-scrollbar    { display: none; }
      `}</style>

      <div style={{ width:"100%", maxWidth:"672px", marginBottom:20, animation:"tg-bar-in 0.4s ease both" }}>

        {/* header */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"0 2px" }}>
          <span style={{ position:"relative", display:"inline-flex", width:6, height:6, flexShrink:0 }}>
            <span style={{
              position:"absolute", inset:0, borderRadius:"50%",
              background:"#34d399", opacity:0.65,
              animation:"tg-ping 1.5s cubic-bezier(0,0,.2,1) infinite",
            }} />
            <span style={{ position:"relative", width:6, height:6, borderRadius:"50%", background:"#34d399" }} />
          </span>
          <span style={{
            fontSize:10, fontWeight:700, letterSpacing:"0.12em",
            textTransform:"uppercase", color:"#6b7a99", fontFamily:"'Syne', sans-serif",
          }}>
            Active today
          </span>
          <div style={{ flex:1, height:1, background:"#252523" }} />
          <span style={{ fontSize:10, color:"#6b7a99", fontFamily:"'Space Mono', monospace" }}>
            {rings.filter(r => !r.seen).length} unseen
          </span>
        </div>

        {/* rings row */}
        <div className="tg-rings-row" style={{
          display:"flex", gap:14,
          overflowX:"auto", paddingBottom:8, paddingTop:4, paddingLeft:19, paddingRight:4,
          scrollbarWidth:"none", msOverflowStyle:"none",
          WebkitMaskImage:"linear-gradient(to right, transparent 0%, black 5%, black 88%, transparent 100%)",
          maskImage:"linear-gradient(to right, transparent 0%, black 5%, black 88%, transparent 100%)",
        }}>
          {rings.map((ring) => (
            <StoryRing key={ring.id} ring={ring} onSeen={markSeen} />
          ))}
        </div>

        <div style={{ height:1, background:"#252523", marginTop:6 }} />
      </div>
    </>
  );
};

export default ActivityStreamBar;
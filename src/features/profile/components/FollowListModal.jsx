import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";
import { FiX, FiUserCheck, FiUserPlus } from "react-icons/fi";

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── UserRow ───────────────────────────────────────────────────────────────────

function UserRow({ user, currentUserId, onNavigate }) {
  const [following,     setFollowing]     = useState(user.isFollowedByMe);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const isMe = currentUserId === user.id;

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!currentUserId || loadingFollow || isMe) return;
    setLoadingFollow(true);

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", user.id);
      setFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: user.id });
      setFollowing(true);
    }
    setLoadingFollow(false);
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group"
      onClick={() => onNavigate(user.username)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Avatar */}
      {user.avatar ? (
        <div
          className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
          style={{
            border: "2px solid transparent",
            background: "linear-gradient(#111318,#111318) padding-box, linear-gradient(135deg,#f472b6,#818cf8) border-box",
          }}
        >
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: "linear-gradient(135deg,#E8435A,#7F77DD)", color: "white" }}
        >
          {getInitials(user.name)}
        </div>
      )}

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#e8eaf6] truncate group-hover:text-pink-400 transition-colors">
          {user.name || user.username}
        </p>
        <p className="text-[11px] text-[#3d4a6e] font-mono truncate">@{user.username}</p>
      </div>

      {/* Follow / Unfollow — hidden for own row */}
      {!isMe && currentUserId && (
        <button
          onClick={handleFollow}
          disabled={loadingFollow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer flex-shrink-0"
          style={
            following
              ? { background: "rgba(255,255,255,0.04)", borderColor: "#2d3452", color: "#8891b2" }
              : { background: "rgba(244,114,182,0.10)", borderColor: "rgba(244,114,182,0.30)", color: "#f472b6" }
          }
          onMouseEnter={(e) => {
            if (following) {
              e.currentTarget.style.background   = "rgba(255,60,60,0.08)";
              e.currentTarget.style.borderColor  = "rgba(255,60,60,0.25)";
              e.currentTarget.style.color        = "#f87171";
            } else {
              e.currentTarget.style.background = "rgba(244,114,182,0.20)";
            }
          }}
          onMouseLeave={(e) => {
            if (following) {
              e.currentTarget.style.background  = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "#2d3452";
              e.currentTarget.style.color       = "#8891b2";
            } else {
              e.currentTarget.style.background = "rgba(244,114,182,0.10)";
            }
          }}
        >
          {following
            ? <><FiUserCheck size={12} /> Following</>
            : <><FiUserPlus  size={12} /> Follow</>
          }
        </button>
      )}
    </div>
  );
}

// ── FollowListModal ───────────────────────────────────────────────────────────
//
// Props:
//   mode          "followers" | "following"  — which tab to open on
//   targetUserId  whose list to show
//   currentUserId logged-in user id (powers follow buttons)
//   onClose       close callback

const FollowListModal = ({ mode, targetUserId, currentUserId, onClose }) => {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState(mode);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadList(tab); }, [tab, targetUserId]);

  const loadList = async (currentTab) => {
    setLoading(true);
    setUsers([]);
    try {
      // ── Step 1: get the relevant user ids from follows table ──────────────
      let userIds = [];

      if (currentTab === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", targetUserId);
        userIds = (data || []).map((r) => r.follower_id);
      } else {
        const { data } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", targetUserId);
        userIds = (data || []).map((r) => r.following_id);
      }

      if (userIds.length === 0) { setUsers([]); setLoading(false); return; }

      // ── Step 2: batch-fetch profiles from the profiles table ─────────────
      // NOTE: author_name / author_avatar / github_username were removed from
      // posts and project_posts — they must be read from `profiles` instead.
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", userIds);

      const profileMap = {};
      (profileRows || []).forEach((p) => { profileMap[p.id] = p; });

      // batch-check which of these users the logged-in user already follows
      let myFollowingSet = new Set();
      if (currentUserId) {
        const { data: myFollows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId)
          .in("following_id", userIds);
        myFollowingSet = new Set((myFollows || []).map((r) => r.following_id));
      }

      const enriched = userIds.map((uid) => {
        const p = profileMap[uid];
        return {
          id:            uid,
          name:          p?.full_name  || p?.username || "Unknown User",
          avatar:        p?.avatar_url || null,
          username:      p?.username   || uid.slice(0, 8),
          isFollowedByMe: myFollowingSet.has(uid),
        };
      });

      setUsers(enriched);
    } catch (err) {
      console.error("FollowList error:", err);
    }
    setLoading(false);
  };

  const handleNavigate = (username) => {
    onClose();
    navigate(`/user/${username}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "#111318",
          border: "1px solid #1a1e2e",
          boxShadow: "0 0 60px rgba(244,114,182,0.08)",
          maxHeight: "78vh",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: "#1a1e2e" }}
        >
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#0d0f14" }}>
            {["followers", "following"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-none"
                style={
                  tab === t
                    ? { background: "rgba(244,114,182,0.15)", color: "#f472b6" }
                    : { background: "transparent", color: "#3d4a6e" }
                }
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#3d4a6e] hover:text-white hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
          >
            <FiX size={15} />
          </button>
        </div>

        {/* ── User count label ── */}
        {!loading && users.length > 0 && (
          <div className="px-5 py-2 border-b flex-shrink-0" style={{ borderColor: "#1a1e2e" }}>
            <p className="text-[11px] text-[#3d4a6e] uppercase tracking-widest font-medium">
              {users.length} {tab === "followers" ? "follower" : "following"}{users.length !== 1 && tab === "followers" ? "s" : ""}
            </p>
          </div>
        )}

        {/* ── List ── */}
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: "#f472b6", borderTopColor: "transparent" }}
              />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <span className="text-3xl">{tab === "followers" ? "👥" : "🔭"}</span>
              <p className="text-[13px] text-[#3d4a6e]">
                {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </p>
            </div>
          ) : (
            users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUserId}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
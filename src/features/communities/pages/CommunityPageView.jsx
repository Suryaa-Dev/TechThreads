import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";
import { AuthContext } from "../../../context/AuthContext";
import { getProfileMap, avatarGradient, getInitials } from "../../../services/userService";
import {
  toggleCommunityLike,
  getCommunityLikedPosts,
} from "../../../services/likeService";
import {
  getCommunityComments,
  createCommunityPost,
  deleteCommunityPost,
  uploadCommunityFile,
} from "../../../services/postService";
import PostCard from "../components/PostCard";
import CommunitySidebar from "../components/CommunitySidebar";
import CommunityHeader from "../components/CommunityHeader";
import CreatePostModal from "../components/CreatePostModal";
import CommentDrawer from "../components/CommentDrawer";
import PromptsTab from "../components/PromptsTab";
import { awardBadge } from "../../../services/badgeEngine";

const TABS = ["posts", "Prompts", "about", "members"];

const CommunityPageView = () => {
  const { id, postId: deepLinkPostId } = useParams();
  const navigate = useNavigate();

  // ── AUTH — from context, no inline supabase.auth calls ────────
  const { user: currentUser } = useContext(AuthContext);

  const [community, setCommunity] = useState(null);
  const [posts, setPosts]         = useState([]);
  const [isMember, setIsMember]   = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading]     = useState(true);

  // ── PROFILE MAP ───────────────────────────────────────────────
  const [profileMap, setProfileMap] = useState({});

  // ── LIKES ─────────────────────────────────────────────────────
  const [localLikes, setLocalLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState({});

  // ── COMMENTS ──────────────────────────────────────────────────
  const [localComments, setLocalComments]   = useState({});
  const [commentCounts, setCommentCounts]   = useState({});

  // ── DRAWER ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [drawerPostId, setDrawerPostId] = useState(null);
  const drawerPost = posts.find((p) => p.id === drawerPostId) ?? null;

  // ── MODAL ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [postText, setPostText]   = useState("");
  const [postType, setPostType]   = useState("text");
  const [postFile, setPostFile]   = useState(null);
  const [postCode, setPostCode]   = useState("");
  const [posting, setPosting]     = useState(false);
  const [postError, setPostError] = useState("");

  // ── COMMUNITY + POSTS LOAD ────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadCommunity();
    loadPosts();
    checkMembership();

    const channel = supabase
      .channel(`cposts_${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts", filter: `community_id=eq.${id}` },
        (payload) => setPosts((prev) => [payload.new, ...prev])
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_posts", filter: `community_id=eq.${id}` },
        (payload) => setPosts((prev) => prev.map((p) => p.id === payload.new.id ? payload.new : p))
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "community_posts", filter: `community_id=eq.${id}` },
        (payload) => setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
      )
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch (_) { } };
  }, [id]);

  const loadCommunity = async () => {
    const { data } = await supabase.from("communities").select("*").eq("id", id).single();
    if (data) setCommunity(data);
  };

  const loadPosts = async () => {
    const uid = currentUser?.id ?? null;

    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("community_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
      const postIds = data.map((p) => p.id);

      // Seed like counts
      const likesSeed = {};
      data.forEach((p) => { likesSeed[p.id] = p.likes ?? 0; });
      setLocalLikes(likesSeed);

      // Seed liked state — use getCommunityLikedPosts from likeService
      if (uid && postIds.length > 0) {
        const likedSet = await getCommunityLikedPosts(uid, postIds);
        const likedSeed = {};
        likedSet.forEach((postId) => { likedSeed[postId] = true; });
        setLikedPosts(likedSeed);
      }

      // Batch-fetch profiles — use getProfileMap from userService
      const userIds = [...new Set(data.map((p) => p.user_id).filter(Boolean))];
      if (uid) userIds.push(uid);
      const map = await getProfileMap([...new Set(userIds)]);
      setProfileMap(map);

      loadCommentCounts(postIds);
    }
    setLoading(false);
  };

  const loadCommentCounts = async (postIds) => {
    if (!postIds || postIds.length === 0) return;
    const { data } = await supabase
      .from("community_comments")
      .select("post_id")
      .in("post_id", postIds);
    if (data) {
      const counts = {};
      data.forEach((row) => { counts[row.post_id] = (counts[row.post_id] ?? 0) + 1; });
      setCommentCounts(counts);
    }
  };

  const checkMembership = async () => {
    if (!currentUser) { setIsMember(false); return; }
    const { data } = await supabase
      .from("community_members")
      .select("id")
      .match({ community_id: id, user_id: currentUser.id })
      .limit(1);
    setIsMember((data || []).length > 0);
  };

  // ── JOIN / LEAVE ──────────────────────────────────────────────
  const handleJoin = async () => {
    if (!currentUser) return alert("Login required");
    const { error } = await supabase.from("community_members")
      .insert({ community_id: id, user_id: currentUser.id });
    if (!error) setIsMember(true);
    else alert(error.message);
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    const { error } = await supabase.from("community_members")
      .delete().match({ community_id: id, user_id: currentUser.id });
    if (!error) setIsMember(false);
  };

  // ── CREATE POST — use createCommunityPost + uploadCommunityFile from postService ──
  const handlePost = async ({ tag, fileName, title, githubUrl }) => {
    setPostError("");
    if (!postText.trim() && !postCode.trim() && !postFile) {
      setPostError("Add a caption, some code, or a file before posting.");
      return;
    }
    setPosting(true);
    if (!currentUser) { setPostError("You must be logged in."); setPosting(false); return; }

    let file_url = null;
    if ((postType === "image" || postType === "pdf") && postFile) {
      // Use uploadCommunityFile — bucket "community" handled internally
      const { url, error: upErr } = await uploadCommunityFile(id, postFile);
      if (upErr) { setPostError("File upload failed."); setPosting(false); return; }
      file_url = url;
    }

    const fields = {
      type: postType,
      text: postText.trim() || null,
      caption: postText.trim() || null,
      tag: tag || null,
      code: postType === "code" ? (postCode.trim() || null) : null,
      file_name: fileName?.trim() || postFile?.name || null,
      file_url,
      project_title: postType === "project" ? (title?.trim() || null) : null,
      project_link: postType === "project" ? (githubUrl?.trim() || null) : null,
    };

    // Use createCommunityPost from postService
    const { error: insertErr } = await createCommunityPost(currentUser.id, id, fields);
    if (insertErr) { setPostError(`Failed: ${insertErr.message}`); setPosting(false); return; }

    const { count: totalPosts } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUser.id);

    await awardBadge(currentUser.id, "community_posts_created", { value: totalPosts ?? 1 });

    closeModal();
    loadPosts();
  };

  // ── LIKE — use toggleCommunityLike from likeService ──────────
  const handleLike = async (postId) => {
    if (!currentUser) return alert("Login to like");
    const already = likedPosts[postId] ?? false;
    const current = localLikes[postId] ?? 0;
    const next    = already ? Math.max(0, current - 1) : current + 1;

    // Optimistic update
    setLikedPosts((p) => ({ ...p, [postId]: !already }));
    setLocalLikes((p) => ({ ...p, [postId]: next }));

    await toggleCommunityLike(postId, currentUser.id, already);

    // Keep the DB counter in sync (no trigger on community_posts.likes)
    await supabase.from("community_posts").update({ likes: next }).eq("id", postId);

    // Badge check for the post owner
    const { data: thePost } = await supabase
      .from("community_posts").select("user_id").eq("id", postId).single();

    if (thePost?.user_id && thePost.user_id !== currentUser.id) {
      const { data: ownerPosts } = await supabase
        .from("community_posts").select("id").eq("user_id", thePost.user_id);
      if (ownerPosts?.length) {
        const { count: totalLikes } = await supabase
          .from("community_likes").select("id", { count: "exact", head: true })
          .in("post_id", ownerPosts.map((p) => p.id));
        await awardBadge(thePost.user_id, "community_likes_received", { value: totalLikes ?? 0 });
      }
    }
  };

  // ── DELETE POST — use deleteCommunityPost from postService ───
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    const { error } = await deleteCommunityPost(postId, currentUser.id);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (drawerPostId === postId) setDrawerOpen(false);
    } else {
      alert(`Delete failed: ${error.message}`);
    }
  };

  // ── DEEP LINK ─────────────────────────────────────────────────
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!deepLinkPostId || loading || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDrawerPostId(deepLinkPostId);
    setDrawerOpen(true);
    setLocalComments((prev) => ({ ...prev, [deepLinkPostId]: null }));
    loadComments(deepLinkPostId);
    navigate(`/community/${id}`, { replace: true });
  }, [deepLinkPostId, loading, posts]);

  // ── DISPLAY NAME helpers (from profileMap) ────────────────────
  const resolveDisplayName = useCallback((userId) => {
    if (!userId) return null;
    return profileMap[userId]?.full_name || null;
  }, [profileMap]);

  const resolveUsername = useCallback((userId) => {
    if (!userId) return null;
    return profileMap[userId]?.username || null;
  }, [profileMap]);

  // ── COMMENTS — use getCommunityComments from postService ──────
  const loadComments = useCallback(async (postId) => {
    // getCommunityComments fetches stars, flags, replies, and computes _starred/_flagged
    const enriched = await getCommunityComments(postId, currentUser?.id ?? null);

    // Extend profileMap with any new author ids from comments + replies
    const allAuthorIds = [
      ...enriched.map((c) => c.user_id),
      ...enriched.flatMap((c) => (c._replies || []).map((r) => r.user_id)),
      currentUser?.id,
    ].filter(Boolean);

    const newMap = await getProfileMap(allAuthorIds);
    setProfileMap((prev) => ({ ...prev, ...newMap }));

    setLocalComments((prev) => ({ ...prev, [postId]: enriched }));
  }, [currentUser]);

  const handleCommentPosted = useCallback((postId) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, comments: (p.comments ?? 0) + 1 } : p
    ));
    setCommentCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
  }, []);

  const refreshComments = useCallback((postId) => {
    setLocalComments((prev) => ({ ...prev, [postId]: null }));
    loadComments(postId);
  }, [loadComments]);

  const handleOpenComments = useCallback((postId) => {
    setDrawerPostId(postId);
    setDrawerOpen(true);
    if (localComments[postId] === undefined) {
      setLocalComments((prev) => ({ ...prev, [postId]: null }));
      loadComments(postId);
    }
  }, [localComments, loadComments]);

  const closeModal = () => {
    setShowModal(false);
    setPostError("");
    setPostText(""); setPostCode(""); setPostFile(null); setPostType("text");
  };

  const isAdmin = !!(currentUser?.id && community?.created_by && currentUser.id === community.created_by);

  if (!community)
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#6b7a99" }}>
        // loading community...
      </div>
    );

  return (
    <div style={{ padding: "24px 20px", color: "#f0f4ff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <button
          onClick={() => navigate("/communities")}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, background: "transparent", border: "1px solid #252523", borderRadius: 8, padding: "6px 14px", color: "#8b95ae", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2e2e2b"; e.currentTarget.style.color = "#f0f4ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e2e2b"; e.currentTarget.style.color = "#8b95ae"; }}
        >← communities</button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

          <div style={{ minWidth: 0 }}>
            <CommunityHeader community={community} isMember={isMember} onJoin={handleJoin} onLeave={handleLeave} />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
                {TABS.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ padding: "7px 16px", borderRadius: 20, border: activeTab === tab ? "1px solid #00d4ff" : "1px solid #252523", background: activeTab === tab ? "rgba(0,212,255,0.1)" : "transparent", color: activeTab === tab ? "#00d4ff" : "#8b95ae", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s" }}
                  >{tab}</button>
                ))}
              </div>
              {activeTab === "posts" && isMember && (
                <button onClick={() => setShowModal(true)}
                  style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.1)", color: "#00d4ff", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.1)"; }}
                >+ Post</button>
              )}
            </div>

            {/* ── POSTS TAB ── */}
            {activeTab === "posts" && (
              <div>
                {loading && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#6b7a99" }}>// loading posts...</p>}
                {!loading && posts.filter(p => p.prompt_id === null).length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", border: "1px dashed #1e2535", borderRadius: 16 }}>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#6b7a99" }}>// no posts yet — be the first!</p>
                    {isMember && (
                      <button onClick={() => setShowModal(true)}
                        style={{ marginTop: 14, padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.08)", color: "#00d4ff", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >+ Create first post</button>
                    )}
                  </div>
                )}
                {posts
                  .filter(p => p.type !== "prompt")
                  .map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      currentUserId={currentUser?.id ?? null}
                      displayName={resolveDisplayName(p.user_id)}
                      avatarUrl={profileMap[p.user_id]?.avatar_url ?? null}
                      githubUsername={resolveUsername(p.user_id)}
                      communityId={id}
                      likeCount={localLikes[p.id] ?? p.likes ?? 0}
                      liked={likedPosts[p.id] ?? false}
                      commentCount={
                        localComments[p.id] != null
                          ? localComments[p.id].length
                          : (commentCounts[p.id] ?? p.comments ?? 0)
                      }
                      onLike={handleLike}
                      onDelete={handleDeletePost}
                      onOpenComments={handleOpenComments}
                    />
                  ))}
              </div>
            )}

            {/* ── PROMPTS TAB ── */}
            {activeTab === "Prompts" && (
              <PromptsTab
                communityId={id}
                currentUserId={currentUser?.id ?? null}
                isAdmin={isAdmin}
                profileMap={profileMap}
              />
            )}

            {/* ── ABOUT TAB ── */}
            {activeTab === "about" && (
              <div style={{ background: "linear-gradient(135deg, #161615 0%, #121211 100%)", border: "1px solid #252523", borderRadius: 14, padding: "24px" }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#00d4ff", margin: "0 0 12px", fontWeight: 700 }}>// About</p>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, color: "#8b95ae", lineHeight: 1.7, margin: 0 }}>
                  {community.description || "No description provided."}
                </p>
                {community.created_by && (
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#6b7a99", marginTop: 16 }}>
                    Created by {profileMap[community.created_by]?.full_name || `User ${community.created_by.slice(0, 8)}`}
                  </p>
                )}
              </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {activeTab === "members" && (
              <div style={{ background: "linear-gradient(135deg, #161615 0%, #121211 100%)", border: "1px solid #252523", borderRadius: 14, padding: "24px" }}>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#00d4ff", margin: "0 0 16px", fontWeight: 700 }}>// Members</p>
                <MemberList communityId={id} />
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <CommunitySidebar communityId={id} community={community} />
          </div>
        </div>
      </div>

      <CommentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        post={drawerPost}
        currentUserId={currentUser?.id ?? null}
        comments={drawerPostId ? (localComments[drawerPostId] ?? null) : null}
        onRefresh={() => drawerPostId && refreshComments(drawerPostId)}
        onCommentPosted={() => drawerPostId && handleCommentPosted(drawerPostId)}
        profileMap={profileMap}
      />

      <CreatePostModal
        showModal={showModal}
        closeModal={closeModal}
        text={postText}
        setText={setPostText}
        type={postType}
        setType={setPostType}
        file={postFile}
        handleFile={(e) => setPostFile(e.target.files[0])}
        code={postCode}
        setCode={setPostCode}
        handlePost={handlePost}
        posting={posting}
        postError={postError}
      />
    </div>
  );
};

// ─── MemberAvatar — uses avatarGradient from userService ─────────
function MemberAvatar({ avatar, initials, userId, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const grad = avatarGradient(userId);

  if (avatar && !failed) {
    return (
      <img src={avatar} alt={initials} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", border: "2px solid #252523", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 30 ? 13 : 9, fontWeight: 700, color: "#fff", border: "2px solid #252523", flexShrink: 0, fontFamily: "'Space Mono',monospace" }}>
      {initials}
    </div>
  );
}

// ─── MemberList — uses getProfileMap from userService ────────────
const MemberList = ({ communityId }) => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: rows } = await supabase
        .from("community_members")
        .select("user_id, created_at")
        .eq("community_id", communityId)
        .limit(30);

      if (!rows || !mounted) return;

      // Use getProfileMap from userService instead of inline supabase.from("profiles")
      const uids = rows.map(r => r.user_id).filter(Boolean);
      const pm = await getProfileMap(uids);

      if (mounted) setMembers(rows.map(r => ({ ...r, profile: pm[r.user_id] || null })));
    };
    load();
    return () => (mounted = false);
  }, [communityId]);

  if (!members.length)
    return <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#6b7a99" }}>No members yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {members.map((m) => {
        const name     = m.profile?.full_name || `User ${m.user_id.slice(0, 8)}`;
        const avatar   = m.profile?.avatar_url || null;
        const initials = getInitials(name);
        return (
          <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid #252523", borderRadius: 10 }}>
            <MemberAvatar avatar={avatar} initials={initials} userId={m.user_id} size={36} />
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#f0f4ff", margin: 0 }}>{name}</p>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b7a99", margin: "2px 0 0" }}>
                Joined {new Date(m.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommunityPageView;

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaGithub, FaRegHeart, FaHeart, FaRegComment } from "react-icons/fa";
import { FiShare2, FiEye, FiBookmark, FiMoreHorizontal, FiExternalLink, FiCheck, FiTrash2 } from "react-icons/fi";
import { MdContactPage, MdWorkOutline } from "react-icons/md";
import { supabase } from "../../../services/supabaseClient";
import { toggleFeedLike, getFeedLikedPosts } from "../../../services/likeService";
import { deleteFeedPost } from "../../../services/postService";
import Comments from "../../../components/Comments";

// ── constants ─────────────────────────────────────────────────────────────────

const TECH_COLORS = {
  react:          { color: "#61AFEF", bg: "rgba(97,175,239,0.10)",  border: "rgba(97,175,239,0.25)"   },
  nextjs:         { color: "#aaa9a5", bg: "rgba(170,169,165,0.08)", border: "rgba(170,169,165,0.2)"   },
  "next.js":      { color: "#aaa9a5", bg: "rgba(170,169,165,0.08)", border: "rgba(170,169,165,0.2)"   },
  typescript:     { color: "#5b9dd9", bg: "rgba(91,157,217,0.10)",  border: "rgba(91,157,217,0.25)"   },
  javascript:     { color: "#FFD43B", bg: "rgba(255,212,59,0.08)",  border: "rgba(255,212,59,0.25)"   },
  tailwind:       { color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)"   },
  "tailwind css": { color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)"   },
  python:         { color: "#FFD43B", bg: "rgba(255,212,59,0.08)",  border: "rgba(255,212,59,0.25)"   },
  css:            { color: "#D4537E", bg: "rgba(212,83,126,0.08)",  border: "rgba(212,83,126,0.25)"   },
  java:           { color: "#f89820", bg: "rgba(248,152,32,0.08)",  border: "rgba(248,152,32,0.25)"   },
  redux:          { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)"  },
  "redux toolkit":{ color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)" },
  node:           { color: "#68a063", bg: "rgba(104,160,99,0.08)",  border: "rgba(104,160,99,0.25)"   },
  "node.js":      { color: "#68a063", bg: "rgba(104,160,99,0.08)",  border: "rgba(104,160,99,0.25)"   },
  vue:            { color: "#42b883", bg: "rgba(66,184,131,0.08)",  border: "rgba(66,184,131,0.25)"   },
  svelte:         { color: "#ff3e00", bg: "rgba(255,62,0,0.08)",    border: "rgba(255,62,0,0.25)"     },
  firebase:       { color: "#FFCA28", bg: "rgba(255,202,40,0.08)",  border: "rgba(255,202,40,0.25)"   },
  supabase:       { color: "#3ECF8E", bg: "rgba(62,207,142,0.08)",  border: "rgba(62,207,142,0.25)"   },
};

const TYPE_META = {
  "Full-Stack": { color: "#f472b6", glow: "rgba(244,114,182,0.2)", icon: "⚡" },
  "Frontend":   { color: "#38bdf8", glow: "rgba(56,189,248,0.2)",  icon: "🎨" },
  "Backend":    { color: "#34d399", glow: "rgba(52,211,153,0.2)",  icon: "⚙️" },
  "ML/AI":      { color: "#a78bfa", glow: "rgba(167,139,250,0.2)", icon: "🧠" },
  "Mobile":     { color: "#fb923c", glow: "rgba(251,146,60,0.2)",  icon: "📱" },
  "Other":      { color: "#8891b2", glow: "rgba(136,145,178,0.2)", icon: "🔧" },
};

const TRENDING_THRESHOLD = 20;

// ── helpers ───────────────────────────────────────────────────────────────────

function getTechStyle(tech = "") {
  return TECH_COLORS[tech.trim().toLowerCase()] || {
    color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)",
  };
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(raw) {
  if (!raw) return "Just now";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function sharePost(id, type = "project", onCopied) {
  const url = `${window.location.origin}/post/${type}/${id}`;
  try { await navigator.clipboard.writeText(url); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = url; ta.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }
  onCopied?.();
}

// ── OverflowMenu ──────────────────────────────────────────────────────────────

function OverflowMenu({ postId, onClose, onDelete, isOwner, currentUser }) {
  const ref = useRef(null);
  const [copied,   setCopied]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const handleCopyLink = () => {
    sharePost(postId, "project", () => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this project post?")) return;
    setDeleting(true);
    const { error } = await deleteFeedPost("project_posts", postId, currentUser?.id ?? null);
    if (!error) {
      onDelete?.(postId);
      onClose();
    } else {
      console.error("Delete failed:", error);
      setDeleting(false);
    }
  };

  const items = [
    { label: copied ? "Copied!" : "Copy link", icon: copied ? "✓" : "🔗", action: handleCopyLink, danger: false },
    { label: "Save project",   icon: "🔖", action: onClose, danger: false },
    ...(!isOwner ? [{ label: "Report content", icon: "🚩", action: onClose, danger: true }] : []),
    ...(isOwner  ? [{ label: deleting ? "Deleting…" : "Delete post", icon: "🗑", action: handleDelete, danger: true }] : []),
  ];

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 w-48 rounded-xl overflow-hidden border shadow-xl"
      style={{ background:"#131312", borderColor:"#252523" }}>
      {items.map(({ label, icon, danger, action }) => (
        <button key={label} onClick={action}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left transition-colors cursor-pointer bg-transparent border-none
            ${danger ? "text-red-400 hover:bg-red-500/10" : "text-[#6b7280] hover:bg-white/5 hover:text-white"}`}>
          <span>{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

const ProjectCard = ({ post, currentUser, onDelete }) => {
  // liked: null = loading (unknown), false = not liked, true = liked
  const [likes,         setLikes]         = useState(post?.likes || 0);
  const [liked,         setLiked]         = useState(null);
  const [commentCount,  setCommentCount]  = useState(post?.comments || 0);
  const [bookmarked,    setBookmarked]    = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const [showMenu,      setShowMenu]      = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [shareCopied,   setShareCopied]   = useState(false);

  const navigate = useNavigate();

  const authorName     = post?.author_name      || "Unknown";
  const authorUsername = post?.github_username  || null;
  const authorAvatar   = post?.author_avatar    || null;
  const authorTime     = post?.created_at       || null;
  const projectTitle   = post?.project_title    || "Untitled Project";
  const projectDesc    = post?.project_desc     || "";
  const projectLink    = post?.project_link     || null;
  const projectLive    = post?.project_live_url || null;
  const projectImage   = post?.project_image    || null;
  const projectType    = post?.project_type     || null;
  const isTrending     = likes >= TRENDING_THRESHOLD;
  const typeMeta       = projectType ? (TYPE_META[projectType] || TYPE_META["Other"]) : null;
  const accentColor    = typeMeta?.color || "#a78bfa";
  const postId         = String(post?.id);
  const isOwner        = !!(currentUser?.id && post?.user_id && currentUser.id === post.user_id);

  const stackTechs = (post?.project_stack || "").split(",").map((t) => t.trim()).filter(Boolean);

  // ── author profile ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!post?.user_id) return;
    supabase.from("profiles").select("open_to_work, resume_url")
      .eq("id", post.user_id).single()
      .then(({ data }) => { if (data) setAuthorProfile(data); });
  }, [post?.user_id]);

  // ── restore liked state + accurate like count on mount ───────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // const { data: { user } } = await supabase.auth.getUser();
      const user = currentUser;
      if (cancelled) return;

      if (!user) { setLiked(false); return; }

      // check feed_post_likes for this user + post
      const { data: likeRow } = await supabase
        .from("feed_post_likes")
        .select("id")
        .eq("post_id",   postId)
        .eq("post_type", "project")
        .eq("user_id",   user.id)
        .maybeSingle();

      if (cancelled) return;
      setLiked(!!likeRow);   // ← restores filled heart after refresh

      // accurate total from feed_post_likes (DB trigger keeps posts.likes in sync too)
      const { count } = await supabase
        .from("feed_post_likes")
        .select("id", { count:"exact", head:true })
        .eq("post_id",   postId)
        .eq("post_type", "project");

      if (cancelled) return;
      if (count !== null) setLikes(count);
    };

    init();
    return () => { cancelled = true; };
  }, [postId]);

  // ── accurate comment count on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("feed_comments")
        .select("id", { count:"exact", head:true })
        .eq("post_id",   postId)
        .eq("post_type", "project");
      if (!cancelled && count !== null) setCommentCount(count);
    };
    fetchCount();
    return () => { cancelled = true; };
  }, [postId]);

  // ── realtime comment count ────────────────────────────────────────────────
  
   const channelRef = useRef(null);
//    useEffect(() => {
//   if (channelRef.current) return;

//   const channel = supabase.channel(`projcard-cmt-${postId}`);

//   channel
//     .on("postgres_changes",
//        { event:"INSERT", schema:"public", table:"feed_comments", filter:`post_id=eq.${postId}` },
//          () => setCommentCount((n) => n + 1))
//        .on("postgres_changes",
//          { event:"DELETE", schema:"public", table:"feed_comments", filter:`post_id=eq.${postId}` },
//          () => setCommentCount((n) => Math.max(0, n - 1)))
//     .subscribe();

//   channelRef.current = channel;

//   return () => {
//     supabase.removeChannel(channel);
//     channelRef.current = null;
//   };
// }, [postId]);


useEffect(() => {
  // 🔥 always cleanup previous channel FIRST
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }

  const channel = supabase.channel(
    `projcard-cmt-${postId}-${Date.now()}`
  );

  channel
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "feed_comments",
        filter: `post_id=eq.${postId}`,
      },
      () => setCommentCount((n) => n + 1)
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "feed_comments",
        filter: `post_id=eq.${postId}`,
      },
      () => setCommentCount((n) => Math.max(0, n - 1))
    )
    .subscribe();

  channelRef.current = channel;

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [postId]);

  // ── like toggle — feed_post_likes insert/delete ───────────────────────────
  const handleLike = useCallback(async () => {
    if (liked === null) return;  // still loading

    // const { data: { user } } = await supabase.auth.getUser();
    const user = currentUser;
    if (!user) return;

    if (liked) {
      setLiked(false);
      setLikes((n) => Math.max(0, n - 1));
      const { error } = await supabase
        .from("feed_post_likes")
        .delete()
        .match({ post_id:postId, post_type:"project", user_id:user.id });
      if (error) {
        console.error("Unlike failed:", error);
        setLiked(true); setLikes((n) => n + 1);
      }
    } else {
      setLiked(true);
      setLikes((n) => n + 1);
      const { error } = await supabase
        .from("feed_post_likes")
        .insert({ post_id:postId, post_type:"project", user_id:user.id });
      if (error) {
        console.error("Like failed:", error);
        setLiked(false); setLikes((n) => Math.max(0, n - 1));
      }
    }
  }, [liked, postId]);

  const handleShare = () => {
    sharePost(post.id, "project", () => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const likeLoading = liked === null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-2xl mx-auto mb-8 rounded-2xl overflow-hidden text-white"
        style={{ background:"#161615", border:"1px solid #252523", boxShadow: "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)" }}>

        <div className="h-[2.5px] w-full"
          style={{ background:`linear-gradient(90deg, ${accentColor}, #818cf8, #38bdf8)` }} />

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ background:"linear-gradient(135deg,#131312,#131312)" }}>
          <div className="flex items-center gap-3 min-w-0">
            {authorAvatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                style={{ border:"2px solid transparent", background:`linear-gradient(#131312,#131312) padding-box, linear-gradient(135deg,${accentColor},#818cf8) border-box` }}>
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background:"linear-gradient(135deg,#E8435A,#7F77DD)", color:"white" }}>
                {getInitials(authorName)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[15px] text-[#f0f4ff] cursor-pointer hover:text-pink-400 transition-colors"
                  onClick={() => authorUsername && navigate(`/user/id/${post.user_id}`)}>
                  {authorName}
                </span>
                {authorProfile?.open_to_work && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"#34d399" }}>
                    <MdWorkOutline size={9} /> Open to Work
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#6b7a99] font-mono mt-0.5">{formatTime(authorTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 relative">
            {typeMeta ? (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
                style={{ background:`${accentColor}18`, border:`1px solid ${accentColor}40`, color:accentColor }}>
                {typeMeta.icon} {projectType}
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)", color:"#a78bfa" }}>
                Project
              </span>
            )}
            <button onClick={() => setShowMenu((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3d4560] hover:text-white hover:bg-white/5 transition-all cursor-pointer bg-transparent border-none ml-1">
              <FiMoreHorizontal size={15} />
            </button>
            {showMenu && <OverflowMenu postId={post?.id} onClose={() => setShowMenu(false)} onDelete={onDelete} isOwner={isOwner} currentUser={currentUser} />}
          </div>
        </div>

        {/* body */}
        <div className="flex" style={{ minHeight:"170px" }}>
          {projectImage ? (
            <div className="flex-shrink-0 relative overflow-hidden"
              style={{ width:"175px", borderRight:`1px solid ${accentColor}30` }}>
              <img src={projectImage} alt={projectTitle}
                className="w-full h-full object-cover transition-transform duration-700"
                style={{ transform:"scale(1.0)" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform="scale(1.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform="scale(1.0)")} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background:`linear-gradient(to right, transparent 55%, ${accentColor}22 100%), linear-gradient(to bottom, ${accentColor}18 0%, transparent 40%, rgba(0,0,0,0.5) 100%)` }} />
              {typeMeta && (
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md z-10"
                  style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", border:`1px solid ${accentColor}45` }}>
                  <span style={{ fontSize:"9px" }}>{typeMeta.icon}</span>
                  <span style={{ fontSize:"9px", fontWeight:700, color:accentColor }}>{projectType}</span>
                </div>
              )}
              {isTrending && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md z-10"
                  style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", border:"1px solid rgba(244,114,182,0.4)" }}>
                  <span style={{ fontSize:"9px" }}>🔥</span>
                  <span style={{ fontSize:"9px", fontWeight:700, color:"#f472b6" }}>Hot</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background:`linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            </div>
          ) : (
            <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center"
              style={{ width:"80px", borderRight:`1px solid ${accentColor}25`, background:"#0e0e0d" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background:`radial-gradient(ellipse at center, ${accentColor}28 0%, transparent 70%)` }} />
              <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{ backgroundImage:`repeating-linear-gradient(45deg, ${accentColor} 0px, ${accentColor} 1px, transparent 1px, transparent 10px)` }} />
              <span className="relative z-10 text-2xl"
                style={{ filter:`drop-shadow(0 0 8px ${accentColor})`, opacity:0.7 }}>
                {typeMeta?.icon || "🔧"}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background:`linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            </div>
          )}

          {/* right content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between p-4 gap-3">
            <div>
              <h2 className="font-bold text-[#f0f4ff] leading-snug mb-1.5"
                style={{ fontSize:"15px", letterSpacing:"-0.01em", fontFamily:"var(--sans)" }}>
                {projectTitle}
              </h2>
              {projectDesc && (
                <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color:"#6b7280" }}>
                  {projectDesc}
                </p>
              )}
            </div>
            {stackTechs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stackTechs.slice(0, 4).map((tech, i) => {
                  const s = getTechStyle(tech);
                  return (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                      style={{ color:s.color, background:s.bg, border:`1px solid ${s.border}` }}>
                      {tech}
                    </span>
                  );
                })}
                {stackTechs.length > 4 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                    style={{ color:"#6b7a99", background:"rgba(255,255,255,0.03)", border:"1px solid #252523" }}>
                    +{stackTechs.length - 4}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {projectLink && (
                <a href={projectLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all"
                  style={{ background:"#e8eaf6", color:"#121211" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background="#fff"; e.currentTarget.style.transform="translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background="#e8eaf6"; e.currentTarget.style.transform="translateY(0)"; }}>
                  <FaGithub size={12} /> GitHub
                </a>
              )}
              {projectLive && (
                <a href={projectLive} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all"
                  style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", color:"#34d399" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background="rgba(52,211,153,0.2)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background="rgba(52,211,153,0.1)"; e.currentTarget.style.transform="translateY(0)"; }}>
                  <FiExternalLink size={11} /> Live Demo
                </a>
              )}
              {authorProfile?.resume_url && !projectLive && (
                <a href={authorProfile.resume_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all"
                  style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.28)", color:"#f472b6" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background="rgba(244,114,182,0.18)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background="rgba(244,114,182,0.08)"; e.currentTarget.style.transform="translateY(0)"; }}>
                  <MdContactPage size={13} /> Resume
                </a>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-t" style={{ borderColor:"#1e1e1c" }}>

          {/* like — disabled while loading */}
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer bg-transparent border-none
              ${liked === true ? "text-red-400" : "text-[#3d4560] hover:text-[#aab4cc] hover:bg-white/[0.04]"}
              ${likeLoading ? "opacity-40 cursor-default" : ""}`}
          >
            {liked === true
              ? <FaHeart size={13} className="text-red-400" />
              : <FaRegHeart size={13} />
            }
            <span>{likes}</span>
          </button>

          <div className="w-px h-4 bg-[#272725] mx-1" />

          <button onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#3d4560] hover:text-[#aab4cc] hover:bg-white/[0.04] transition-all cursor-pointer bg-transparent border-none">
            <FaRegComment size={13} /><span>{commentCount}</span>
          </button>

          <div className="w-px h-4 bg-[#272725] mx-1" />

          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#3d4560] hover:text-[#aab4cc] hover:bg-white/[0.04] transition-all cursor-pointer bg-transparent border-none">
            <FiEye size={13} /><span>{post?.views || 0}</span>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setBookmarked((v) => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer bg-transparent border-none
                ${bookmarked ? "text-yellow-400" : "text-[#3d4560] hover:text-[#aab4cc] hover:bg-white/[0.04]"}`}>
              <FiBookmark size={13} fill={bookmarked ? "currentColor" : "none"} />
            </button>

            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border"
              style={shareCopied
                ? { background:"rgba(52,211,153,0.12)", borderColor:"rgba(52,211,153,0.3)", color:"#34d399" }
                : { background:"rgba(99,102,241,0.08)", borderColor:"rgba(99,102,241,0.2)", color:"#818cf8" }
              }
              onMouseEnter={(e) => {
                if (!shareCopied) { e.currentTarget.style.background="rgba(99,102,241,0.16)"; e.currentTarget.style.color="#a5b4fc"; }
              }}
              onMouseLeave={(e) => {
                if (!shareCopied) { e.currentTarget.style.background="rgba(99,102,241,0.08)"; e.currentTarget.style.color="#818cf8"; }
              }}
            >
              {shareCopied ? <FiCheck size={12} /> : <FiShare2 size={12} />}
              {shareCopied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {showComments && post?.id && (
        <Comments
          postId={post.id}
          postType="project"
          post={post}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
};

export default ProjectCard;
// Feed PostCard
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-jsx";

import { supabase } from "../../../services/supabaseClient";
import { toggleFeedLike, getFeedLikedPosts } from "../../../services/likeService";
import { FaRegHeart, FaHeart, FaRegComment } from "react-icons/fa";
import { FiShare2, FiCheck, FiMoreHorizontal } from "react-icons/fi";
import Comments from "../../../components/Comments";

// ── constants ─────────────────────────────────────────────────────────────────

const LANG_MAP = {
  jsx:  { label: "JSX",  color: "#61AFEF", bg: "rgba(97,175,239,0.12)"  },
  js:   { label: "JS",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  ts:   { label: "TS",   color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  tsx:  { label: "TSX",  color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  py:   { label: "PY",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  java: { label: "JAVA", color: "#f89820", bg: "rgba(248,152,32,0.12)"  },
  css:  { label: "CSS",  color: "#D4537E", bg: "rgba(212,83,126,0.12)"  },
};

const TAG_TO_LANG = {
  react: "jsx", javascript: "js", js: "js",
  typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx",
  python: "py", py: "py", java: "java", css: "css",
};

const TAG_COLORS = {
  react:      { color: "#61AFEF", bg: "rgba(97,175,239,0.08)",  border: "rgba(97,175,239,0.2)"  },
  typescript: { color: "#3178C6", bg: "rgba(49,120,198,0.08)",  border: "rgba(49,120,198,0.2)"  },
  python:     { color: "#FFD43B", bg: "rgba(255,212,59,0.08)",  border: "rgba(255,212,59,0.2)"  },
  javascript: { color: "#FFD43B", bg: "rgba(255,212,59,0.08)",  border: "rgba(255,212,59,0.2)"  },
  css:        { color: "#D4537E", bg: "rgba(212,83,126,0.08)",  border: "rgba(212,83,126,0.2)"  },
  java:       { color: "#f89820", bg: "rgba(248,152,32,0.08)",  border: "rgba(248,152,32,0.2)"  },
  nextjs:     { color: "#888780", bg: "rgba(136,135,128,0.08)", border: "rgba(136,135,128,0.2)" },
};

const TRENDING_THRESHOLD = 20;

// ── helpers ───────────────────────────────────────────────────────────────────

function getLang(fileName, tag) {
  if (fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    if (LANG_MAP[ext]) return LANG_MAP[ext];
  }
  if (tag) {
    const key = TAG_TO_LANG[tag.toLowerCase().replace(/[.\s]/g, "")];
    if (key && LANG_MAP[key]) return LANG_MAP[key];
  }
  return null;
}

function getPrismLang(fileName, tag) {
  if (fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const m = { js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", py: "python", java: "java", css: "css" };
    if (m[ext]) return m[ext];
  }
  if (tag) {
    const key = TAG_TO_LANG[tag.toLowerCase().replace(/[.\s]/g, "")];
    const m = { js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", py: "python", java: "java", css: "css" };
    if (key && m[key]) return m[key];
  }
  return "javascript";
}

function getTagStyle(tag = "") {
  const key = tag.toLowerCase().replace(/[.\s]/g, "");
  return TAG_COLORS[key] || { color: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)" };
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(raw) {
  if (!raw) return "Just now";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return "Just now";
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function sharePost(id, type = "code", onCopied) {
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

// ── overflow menu ─────────────────────────────────────────────────────────────

function OverflowMenu({ postId, onClose }) {
  const menuRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleCopyLink = () => {
    sharePost(postId, "code", () => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    });
  };

  return (
    <div ref={menuRef}
      className="absolute right-0 top-8 z-50 w-44 rounded-xl overflow-hidden border border-[#252523] bg-[#161615] shadow-xl">
      {[
        { label: copied ? "Copied!" : "Copy link", icon: copied ? "✓" : "🔗", action: handleCopyLink },
        { label: "Report content", icon: "🚩", danger: true, action: onClose },
      ].map(({ label, icon, danger, action }) => (
        <button key={label} onClick={action}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-left transition-colors cursor-pointer bg-transparent border-none
            ${danger ? "text-red-400 hover:bg-red-500/10" : "text-[#8891b2] hover:bg-white/5 hover:text-white"}`}>
          <span>{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}

// ── CodePanel — community-style with line numbers + per-line hover ────────────

function CodePanel({ code, fileName, tag }) {
  const lang      = getLang(fileName, tag);
  const prismLang = getPrismLang(fileName, tag);
  const lines     = (code || "// No code provided").split("\n");

  const highlightLine = (line) => {
    try {
      const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
      return Prism.highlight(line || " ", grammar, prismLang);
    } catch { return line || " "; }
  };

  return (
    <div className="mx-4 mt-2 rounded-[14px] overflow-hidden border border-[#252523]">
      {/* rainbow accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#121211", borderBottom: "1px solid #252523" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block", flexShrink: 0 }} />
      </div>

      {/* code body with line numbers */}
      <div style={{ background: "#0d0d10", overflowX: "auto", overflowY: "auto", maxHeight: "340px" }}>
        <pre style={{
          margin: 0, padding: "12px 0",
          fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code','Space Mono',monospace",
          lineHeight: 1.7, color: "#abb2bf",
          background: "transparent", whiteSpace: "pre", minWidth: "max-content",
        }}>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "stretch", minHeight: "1.7em" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* line number gutter */}
              <span style={{
                display: "inline-block", width: 38, flexShrink: 0,
                textAlign: "right", paddingRight: 10,
                color: "#2a3a4a", fontSize: 11,
                fontFamily: "'Space Mono',monospace",
                userSelect: "none",
                borderRight: "1px solid #131e2e",
                lineHeight: "1.7em",
              }}>
                {i + 1}
              </span>
              {/* highlighted line */}
              <span
                style={{ paddingLeft: 14, flex: 1 }}
                dangerouslySetInnerHTML={{ __html: highlightLine(line) }}
              />
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

const PostCard = ({ post, currentUser }) => {
  const [likes,        setLikes]        = useState(post.likes || 0);
  const [liked,        setLiked]        = useState(null);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [shareCopied,  setShareCopied]  = useState(false);

  const channelRef = useRef(null);
  const navigate   = useNavigate();

  const author       = post.author || {};
  const authorName   = author.name     || post.author_name    || "Unknown User";
  const authorAvatar = author.avatar   || post.author_avatar  || null;
  const authorTime   = post.created_at || author.time         || post.author_time;
  const fileName     = post.fileName   || post.file_name      || null;
  const tag          = post.tag        || "";
  const tagStyle     = getTagStyle(tag);
  const lang         = getLang(fileName, tag);
  const isTrending   = likes >= TRENDING_THRESHOLD;
  const postId       = String(post.id);

  // ── restore liked state ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!currentUser) { setLiked(false); return; }
      const likedSet = await getFeedLikedPosts(currentUser.id, [postId], "code");
      if (!cancelled) setLiked(likedSet.has(postId));
    };
    init();
    return () => { cancelled = true; };
  }, [postId, currentUser]);

  // ── accurate comment count ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    supabase.from("feed_comments").select("id", { count: "exact", head: true })
      .eq("post_id", postId).eq("post_type", "code")
      .then(({ count }) => { if (!cancelled && count !== null) setCommentCount(count); });
    return () => { cancelled = true; };
  }, [postId]);

  // ── realtime comment count ────────────────────────────────────────────────
  useEffect(() => {
    const channelName = `postcard-cmt-${postId}`;
    supabase.getChannels().forEach(ch => {
      if (ch.topic === `realtime:${channelName}`) supabase.removeChannel(ch);
    });
    const ch = supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_comments", filter: `post_id=eq.${postId}` },
        () => setCommentCount(n => n + 1))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_comments", filter: `post_id=eq.${postId}` },
        () => setCommentCount(n => Math.max(0, n - 1)))
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [postId]);

  // ── like toggle ───────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (liked === null || !currentUser) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(n => wasLiked ? Math.max(0, n - 1) : n + 1);
    const { error } = await toggleFeedLike(postId, "code", currentUser.id, wasLiked);
    if (error) {
      setLiked(wasLiked);
      setLikes(n => wasLiked ? n + 1 : Math.max(0, n - 1));
    }
  }, [liked, postId, currentUser]);

  const handleShare = () => {
    sharePost(post.id, "code", () => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const likeLoading = liked === null;

  return (
    <>
      <div className="w-full max-w-2xl mx-auto mb-8 rounded-2xl overflow-hidden bg-[#161615] border border-[#252523] text-white"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)" }}>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-[#131312] to-[#131312]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {authorAvatar ? (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: "2px solid transparent", background: "linear-gradient(#0f1320,#0f1320) padding-box, linear-gradient(135deg,#f472b6,#a78bfa) border-box" }}>
                  <img src={authorAvatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg,#E8435A,#7F77DD)", color: "white" }}>
                  {getInitials(authorName)}
                </div>
              )}
              <div>
                <p className="font-semibold text-[15px] text-[#f0f4ff] cursor-pointer hover:text-pink-400 transition-colors"
                  onClick={() => post.user_id && navigate(`/user/id/${post.user_id}`)}>
                  {authorName}
                </p>
                <p className="text-[12px] text-[#6b7a99] font-mono mt-0.5">{formatTime(authorTime)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              {lang && (
                <span className="text-[11px] px-2.5 py-1 rounded-md font-mono font-medium border"
                  style={{ color: lang.color, background: lang.bg, borderColor: `${lang.color}30` }}>
                  {lang.label}
                </span>
              )}
              {tag && (
                <span className="text-[11px] px-2.5 py-1 rounded-md font-medium border"
                  style={{ color: tagStyle.color, background: tagStyle.bg, borderColor: tagStyle.border }}>
                  {tag}
                </span>
              )}
              {isTrending && (
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-pink-500/90 text-white tracking-wide">
                  Trending
                </span>
              )}
              <button onClick={() => setShowMenu(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3d4560] hover:text-white hover:bg-white/5 transition-all cursor-pointer bg-transparent border-none ml-1">
                <FiMoreHorizontal size={15} />
              </button>
              {showMenu && <OverflowMenu postId={post.id} onClose={() => setShowMenu(false)} />}
            </div>
          </div>
        </div>

        {/* Community attribution strip */}
        {post.community_id && post.community_name && (
          <div
            onClick={() => navigate(`/community/${post.community_id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              margin: "8px 16px 0", padding: "5px 10px",
              background: "#121211", border: "1px solid #2e2e2b",
              borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(129,140,248,0.4)"; e.currentTarget.style.background = "rgba(129,140,248,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e2e2b"; e.currentTarget.style.background = "#121211"; }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8" }}>
              {post.community_name.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "#aab4cc", fontFamily: "'Space Mono',monospace" }}>from community</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", fontFamily: "'Space Mono',monospace" }}>{post.community_name}</span>
            <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3d4a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        )}

        {/* ── Code Panel (community-style) ────────────────────────────────── */}
        <CodePanel code={post.code} fileName={fileName} tag={tag} />

        {/* Caption */}
        {post.caption && (
          <p className="mt-3 mx-6 text-[14px] text-[#c6cedf] leading-relaxed">{post.caption}</p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 mt-3 px-4 pb-3 pt-2.5 border-t border-[#1e1e1c]">
          <button onClick={handleLike} disabled={likeLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer bg-transparent border-none
              ${liked === true ? "text-red-400" : "text-[#3d4560] hover:text-[#8891b2] hover:bg-white/[0.04]"}
              ${likeLoading ? "opacity-40 cursor-default" : ""}`}>
            {liked === true ? <FaHeart size={13} className="text-red-400" /> : <FaRegHeart size={13} />}
            <span>{likes}</span>
          </button>

          <div className="w-px h-[16px] bg-[#252523] mx-1" />

          <button onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[#3d4560] hover:text-[#8891b2] hover:bg-white/[0.04] transition-all cursor-pointer bg-transparent border-none">
            <FaRegComment size={13} /><span>{commentCount}</span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border"
              style={shareCopied
                ? { background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.3)", color: "#34d399" }
                : { background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)", color: "#818cf8" }
              }
              onMouseEnter={e => { if (!shareCopied) { e.currentTarget.style.background = "rgba(99,102,241,0.16)"; e.currentTarget.style.color = "#a5b4fc"; } }}
              onMouseLeave={e => { if (!shareCopied) { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; e.currentTarget.style.color = "#818cf8"; } }}>
              {shareCopied ? <FiCheck size={12} /> : <FiShare2 size={12} />}
              {shareCopied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <Comments postId={post.id} postType="code" post={post} onClose={() => setShowComments(false)} />
      )}
    </>
  );
};

export default PostCard;
// src/features/feed/components/SpotlightBanner.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-jsx";
import { FaRegHeart, FaRegComment } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getInitials } from "../../../services/userService";
import { timeAgo as formatTime } from "../../../utils/helpers";

// ── language badge map ────────────────────────────────────────────────────────
const LANG_MAP = {
  jsx:  { label: "JSX",  color: "#61AFEF", bg: "rgba(97,175,239,0.12)"  },
  js:   { label: "JS",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  ts:   { label: "TS",   color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  tsx:  { label: "TSX",  color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  py:   { label: "PY",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  java: { label: "JAVA", color: "#f89820", bg: "rgba(248,152,32,0.12)"  },
  css:  { label: "CSS",  color: "#D4537E", bg: "rgba(212,83,126,0.12)"  },
};

function getLang(fileName = "") {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  return LANG_MAP[ext] || { label: ext.toUpperCase() || "CODE", color: "#888780", bg: "rgba(136,135,128,0.12)" };
}

// ── CodePane ──────────────────────────────────────────────────────────────────
function CodePane({ code, fileName }) {
  const codeRef = useRef(null);
  const lang    = getLang(fileName);

  useEffect(() => {
    if (codeRef.current) Prism.highlightAllUnder(codeRef.current);
  }, [code]);

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ borderRadius: "10px", border: "1px solid rgba(255,0,180,0.12)" }}>

      <div className="flex-shrink-0"
        style={{ height: "2.5px", background: "linear-gradient(to right, #f472b6, #a78bfa, #38bdf8)" }} />

      <div className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{ height: "28px", background: "#0e0e0d", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#FF5F57", flexShrink:0 }} />
        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#FFBD2E", flexShrink:0 }} />
        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#28C840", flexShrink:0 }} />

        
      </div>

      <pre ref={codeRef}
        className="flex-1 overflow-hidden m-0 font-['JetBrains_Mono','Fira_Code',monospace]"
        style={{ padding:"10px 14px", fontSize:"11px", lineHeight:"1.65", background:"#0f0f0e", color:"#c4cad8" }}>
        <code className={`language-${(fileName || "").split(".").pop() || "jsx"}`}>
          {code || "// No code provided"}
        </code>
      </pre>
    </div>
  );
}

// ── NavDot ────────────────────────────────────────────────────────────────────
function NavDot({ active, onClick }) {
  return (
    <button onClick={onClick} aria-label="Go to slide" style={{
      width: active ? "20px" : "6px", height: "6px", borderRadius: "3px",
      background: active ? "#ec4899" : "#252523",
      border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
      transition: "width 0.25s ease, background 0.25s ease",
    }} />
  );
}

// ── SpotlightBanner ───────────────────────────────────────────────────────────
const BODY_HEIGHT = 240;
const AUTO_DELAY  = 8000;

// FIX 1: accept profileMap so author info can be resolved
const SpotlightBanner = ({ posts = [], profileMap = {} }) => {
  const navigate = useNavigate();

  const spotlightPosts = React.useMemo(
    () =>
      [...posts]
        .filter((p) => p.type === "code")
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5),
    [posts]
  );

  const [current, setCurrent] = useState(0);
  const [fading,  setFading]  = useState(false);

  const currentRef  = useRef(0);
  const totalRef    = useRef(spotlightPosts.length);
  const intervalRef = useRef(null);
  const pausedRef   = useRef(false);
  // FIX 3: store advance in a ref so the interval never holds a stale closure
  const advanceRef  = useRef(null);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { totalRef.current = spotlightPosts.length; }, [spotlightPosts.length]);

  // FIX 4: clamp current to valid range when post list shrinks
  useEffect(() => {
    if (spotlightPosts.length > 0 && current >= spotlightPosts.length) {
      setCurrent(0);
      currentRef.current = 0;
    }
  }, [spotlightPosts.length, current]);

  const goTo = (nextIndex) => {
    if (nextIndex === currentRef.current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(nextIndex);
      currentRef.current = nextIndex;
      setFading(false);
    }, 160);
  };

  // FIX 3: keep advanceRef current on every render so interval always calls latest
  advanceRef.current = () => {
    if (pausedRef.current) return;
    goTo((currentRef.current + 1) % totalRef.current);
  };

  useEffect(() => {
    if (spotlightPosts.length < 2) return;
    // Interval calls through the ref — always the latest advance function
    intervalRef.current = setInterval(() => advanceRef.current(), AUTO_DELAY);
    return () => clearInterval(intervalRef.current);
  }, [spotlightPosts.length]);

  const resetAndGo = (nextIndex) => {
    goTo(nextIndex);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => advanceRef.current(), AUTO_DELAY);
  };

  if (spotlightPosts.length < 2) return null;

  // FIX 4: guard against out-of-bounds index
  const safeIndex = Math.min(current, spotlightPosts.length - 1);
  const post      = spotlightPosts[safeIndex];
  if (!post) return null;

  const profileEntry = profileMap[post.user_id];
  const authorName   = profileEntry?.full_name  ?? post.author_name     ?? "Unknown";
  const authorHandle = profileEntry?.username   ?? post.github_username  ?? null;
  const authorAv     = profileEntry?.avatar_url ?? post.author_avatar    ?? null;
  const fileName     = post.fileName || post.file_name || "untitled.jsx";
  const lang         = getLang(fileName);

  return (
    <div
      className="w-full max-w-2xl mx-auto mb-6 rounded-2xl overflow-hidden border border-[#252523] bg-[#0e0e0d] text-white"
      onMouseEnter={() => { pausedRef.current = true;  }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* eyebrow */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[#252523] bg-[#161615]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500" />
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#6b7a99]">
            Post of the day
          </span>
        </div>
        <span className="text-[11px] text-[#6b7a99] font-mono tabular-nums">
          {safeIndex + 1} / {spotlightPosts.length}
        </span>
      </div>

      {/* body — FIX 2: clicking the card body opens the post */}
      <div
        className="flex cursor-pointer"
        style={{ height:`${BODY_HEIGHT}px`, opacity:fading ? 0 : 1, transition:"opacity 0.16s ease" }}
        onClick={() => navigate(`/post/code/${post.id}`)}
        title="Click to open post"
      >
        {/* LEFT — info */}
        <div className="flex flex-col justify-between p-4 border-r border-[#252523] min-w-0"
          style={{ width: "44%" }}>

          {/* author */}
          <div className="flex items-center gap-2 mb-2">
            {authorAv ? (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                style={{ border:"1.5px solid transparent",
                  background:"linear-gradient(#121211,#121211) padding-box, linear-gradient(135deg,#f472b6,#a78bfa) border-box" }}>
                <img src={authorAv} alt="avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold"
                style={{ background:"linear-gradient(135deg,#E8435A,#7F77DD)", color:"white" }}>
                {getInitials(authorName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#f0f4ff] truncate">{authorName}</p>
              {authorHandle && (
                <p className="text-[10px] text-[#4a5878] font-mono truncate">@{authorHandle}</p>
              )}
              <p className="text-[11px] text-[#6b7a99] font-mono">{formatTime(post.created_at)}</p>
            </div>
          </div>

          {/* caption */}
          <p className="text-[13px] font-semibold text-[#f0f4ff] leading-snug line-clamp-3 mb-2 flex-1">
            {post.caption}
          </p>

          {/* tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {post.tag && (
              <span className="text-[10px] px-2 py-0.5 rounded font-medium border"
                style={{ color:"#f472b6", background:"rgba(244,114,182,0.08)", borderColor:"rgba(244,114,182,0.2)" }}>
                {post.tag}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded font-mono border"
              style={{ color:lang.color, background:lang.bg, borderColor:`${lang.color}30` }}>
              {lang.label}
            </span>
          </div>

          {/* stats */}
          <div className="flex items-center gap-4 text-[11px] text-[#6b7a99]">
            <span className="flex items-center gap-1"><FaRegHeart size={10} />{post.likes || 0}</span>
            <span className="flex items-center gap-1"><FaRegComment size={10} />{post.comments || 0}</span>
          </div>
        </div>

        {/* RIGHT — code */}
        <div className="flex-1 min-w-0 p-3 bg-[#0f0f0e]">
          <CodePane code={post.code} fileName={fileName} />
        </div>
      </div>

      {/* nav footer */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-[#252523] bg-[#161615]">
        <div className="flex items-center gap-1.5">
          {spotlightPosts.map((_, i) => (
            <NavDot key={i} active={i === safeIndex}
              onClick={(e) => { e.stopPropagation(); resetAndGo(i); }} />
          ))}
        </div>

        <span className="text-[11px] text-[#6b7a99]">
          Top {spotlightPosts.length} posts today
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); resetAndGo((safeIndex - 1 + spotlightPosts.length) % spotlightPosts.length); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6b7a99] hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-[#252523] bg-transparent">
            <FiChevronLeft size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resetAndGo((safeIndex + 1) % spotlightPosts.length); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6b7a99] hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-[#252523] bg-transparent">
            <FiChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpotlightBanner;
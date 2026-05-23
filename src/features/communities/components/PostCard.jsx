// Community Postcard

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import { timeAgo } from "../../../utils/helpers";

// LANG_MAP for badge display — local to this component (display metadata, not Prism keys)
const LANG_MAP = {
  jsx:  { label: "JSX",  color: "#61AFEF", bg: "rgba(97,175,239,0.12)"  },
  js:   { label: "JS",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  ts:   { label: "TS",   color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  tsx:  { label: "TSX",  color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  py:   { label: "PY",   color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  java: { label: "JAVA", color: "#f89820", bg: "rgba(248,152,32,0.12)"  },
  css:  { label: "CSS",  color: "#D4537E", bg: "rgba(212,83,126,0.12)"  },
};
function getLang(f = "") {
  const ext = (f.split(".").pop() || "").toLowerCase();
  return LANG_MAP[ext] || { label: ext.toUpperCase() || "CODE", color: "#888780", bg: "rgba(136,135,128,0.12)" };
}
function getPrismLang(f = "") {
  const ext = (f.split(".").pop() || "").toLowerCase();
  return ({ js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", py: "python", java: "java", css: "css" })[ext] || "javascript";
}

const TAG_META = {
  frontend:       { color: "#00d4ff", bg: "rgba(0,212,255,0.09)"    },
  backend:        { color: "#00e676", bg: "rgba(0,230,118,0.09)"    },
  dsa:            { color: "#f5a623", bg: "rgba(245,166,35,0.09)"   },
  devops:         { color: "#9c6fff", bg: "rgba(156,111,255,0.09)"  },
  "system design":{ color: "#ff4c6a", bg: "rgba(255,76,106,0.09)"   },
  general:        { color: "#8b95ae", bg: "rgba(139,149,174,0.09)"  },
};
const getTag = (t) => TAG_META[(t || "").toLowerCase()] || { color: "#8b95ae", bg: "rgba(139,149,174,0.09)" };

const TYPE_META = {
  text:  { icon: "✦", label: "Text",  color: "#8b95ae" },
  code:  { icon: "⌥", label: "Code",  color: "#61AFEF" },
  image: { icon: "⬡", label: "Image", color: "#9c6fff" },
  pdf:   { icon: "⊞", label: "PDF",   color: "#f5a623" },
};

const Divider = () => <div style={{ width: 1, height: 16, background: "#252523", margin: "0 4px" }} />;

const ActionBtn = ({ icon, label, onClick, active, activeColor, isShareBtn, sharecopied }) => {
  if (isShareBtn) return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: "pointer", transition: "all 0.2s", background: sharecopied ? "rgba(0,230,118,0.12)" : "rgba(99,102,241,0.09)", border: sharecopied ? "1px solid rgba(0,230,118,0.35)" : "1px solid rgba(99,102,241,0.22)", color: sharecopied ? "#00e676" : "#818cf8" }}
      onMouseEnter={e => { if (!sharecopied) { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; e.currentTarget.style.color = "#a5b4fc"; } }}
      onMouseLeave={e => { if (!sharecopied) { e.currentTarget.style.background = "rgba(99,102,241,0.09)"; e.currentTarget.style.color = "#818cf8"; } }}
    >{icon}<span>{sharecopied ? "copied!" : label}</span></button>
  );
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, border: "none", background: active ? `${activeColor}18` : "transparent", color: active ? activeColor : "#6b7a99", fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = `${activeColor}18`; e.currentTarget.style.color = activeColor; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7a99"; } }}
    >{icon}{label !== "" && label !== undefined && <span>{label}</span>}</button>
  );
};

function PostAvatar({ avatarUrl, initials, typeMeta, size = 40 }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (avatarUrl && !imgFailed) {
    return (
      <img src={avatarUrl} alt="" onError={() => setImgFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid transparent", outline: `2px solid ${typeMeta.color}44`, flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#E8435A,#7F77DD)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", border: "2px solid transparent", outline: `2px solid ${typeMeta.color}44`, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

const PostCard = ({
  post, currentUserId, displayName, avatarUrl, githubUsername,
  communityId, likeCount, liked, commentCount, onLike, onDelete, onOpenComments,
}) => {
  const navigate = useNavigate();
  const [imgExpanded, setImgExpanded] = useState(false);
  useEffect(() => {
    if (!imgExpanded) return;
    const h = (e) => { if (e.key === "Escape") setImgExpanded(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [imgExpanded]);
  const [shareCopied, setShareCopied] = useState(false);

  const isOwner = currentUserId && currentUserId === post.user_id;
  const tag = getTag(post.tag);
  const typeMeta = TYPE_META[post.type] || TYPE_META.text;
  const bodyText = post.caption || post.text || "";
  const dispCount = commentCount ?? post.comments ?? 0;
  const fileName = post.file_name || "untitled.jsx";
  const lang = getLang(fileName);
  const prismLang = getPrismLang(fileName);

  const userName = displayName || `User ${(post.user_id || "").slice(0, 8)}`;
  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (post.user_id || "").slice(0, 2).toUpperCase();

  const allLines = (post.code || "").split("\n");

  const highlightLine = (line) => {
    try {
      const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
      return Prism.highlight(line || " ", grammar, prismLang);
    } catch { return line || " "; }
  };

  const handleShare = () => {
    const cid = communityId || post.community_id;
    const url = `${window.location.origin}/community/${cid}/post/${post.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <article
      style={{ background: "#161615", border: "1px solid #252523", borderRadius: 20, overflow: "hidden", marginBottom: 20, transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s", boxShadow: "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "#2e2e2b"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#252523"; }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 13px", background: "linear-gradient(135deg,#131312,#0e0e0d)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <PostAvatar avatarUrl={avatarUrl} initials={initials} typeMeta={typeMeta} size={40} />
            <span style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, background: "#00e676", borderRadius: "50%", border: "2px solid #161615" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#eef2ff", margin: 0, lineHeight: 1.2 }}>
              <span
                style={{ color: typeMeta.color, cursor: "pointer", transition: "opacity 0.15s" }}
                onClick={() => navigate(`/user/id/${post.user_id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {userName}
              </span>
            </p>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#6b7a99", margin: "3px 0 0" }}>{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: `${typeMeta.color}12`, border: `1px solid ${typeMeta.color}30`, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: typeMeta.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {typeMeta.icon} {typeMeta.label}
          </span>
          {post.tag && (
            <span style={{ padding: "4px 10px", borderRadius: 20, background: tag.bg, border: `1px solid ${tag.color}30`, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: tag.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {post.tag}
            </span>
          )}
          {isOwner && (
            <button onClick={() => onDelete(post.id)} title="Delete post"
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #252523", background: "transparent", color: "#6b7a99", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,76,106,0.4)"; e.currentTarget.style.color = "#ff4c6a"; e.currentTarget.style.background = "rgba(255,76,106,0.09)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#252523"; e.currentTarget.style.color = "#6b7a99"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* CAPTION (non-text posts) */}
      {bodyText && post.type !== "text" && (
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, color: "#b0b9ce", lineHeight: 1.65, margin: 0, padding: "2px 18px 10px" }}>{bodyText}</p>
      )}

      {/* TEXT POST */}
      {post.type === "text" && bodyText && (
        <div style={{ margin: "4px 18px 0", padding: "16px 20px", background: "rgba(255,255,255,0.025)", borderLeft: "3px solid #8b95ae", borderRadius: "0 12px 12px 0" }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, color: "#e8eeff", lineHeight: 1.78, margin: 0 }}>{bodyText}</p>
        </div>
      )}

      {/* CODE POST */}
      {post.type === "code" && post.code && (
        <div style={{ margin: "4px 16px 0", borderRadius: 14, overflow: "hidden", border: "1px solid #252523" }}>
          <div style={{ height: 2, background: "linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#121211", borderBottom: "1px solid #252523" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block", flexShrink: 0 }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block", flexShrink: 0 }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block", flexShrink: 0 }} />
            <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: lang.color, background: lang.bg, border: `1px solid ${lang.color}30` }}>{lang.label}</span>
            {post.project_link && <a href={post.project_link} target="_blank" rel="noreferrer" style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#38bdf8", textDecoration: "none", marginLeft: 8 }}>GitHub ↗</a>}
          </div>
          <div style={{ background: "#0d0d10", overflowX: "auto", overflowY: "auto", maxHeight: "340px" }}>
            <pre style={{ margin: 0, padding: "12px 0", fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code','Space Mono',monospace", lineHeight: 1.7, color: "#abb2bf", background: "transparent", whiteSpace: "pre", minWidth: "max-content" }}>
              {allLines.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "stretch", minHeight: "1.7em" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ display: "inline-block", width: 38, flexShrink: 0, textAlign: "right", paddingRight: 10, color: "#2a3a4a", fontSize: 11, fontFamily: "'Space Mono',monospace", userSelect: "none", borderRight: "1px solid #131e2e", lineHeight: "1.7em" }}>{i + 1}</span>
                  <span style={{ paddingLeft: 14, flex: 1 }} dangerouslySetInnerHTML={{ __html: highlightLine(line) }} />
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}

      {/* IMAGE POST */}
      {post.type === "image" && post.file_url && (
        <div style={{ margin: "4px 16px 0", borderRadius: 14, overflow: "hidden", border: "1px solid #252523", cursor: "zoom-in", position: "relative" }}
          onClick={(e) => { e.stopPropagation(); setImgExpanded(true); }}
        >
          <img src={post.file_url} alt="post"
            style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block", transition: "transform 0.3s" }}
            onMouseEnter={e => (e.target.style.transform = "scale(1.015)")}
            onMouseLeave={e => (e.target.style.transform = "scale(1)")}
          />
          <div style={{ position: "absolute", bottom: 10, right: 10, padding: "3px 10px", background: "rgba(0,0,0,0.7)", borderRadius: 20, fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#8b95ae", backdropFilter: "blur(4px)" }}>
            click to expand
          </div>
        </div>
      )}
      {imgExpanded && ReactDOM.createPortal(
        <div onClick={() => setImgExpanded(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
        >
          <img src={post.file_url} alt="expanded" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "88vw", maxHeight: "88vh", borderRadius: 12, objectFit: "contain", cursor: "default", userSelect: "none" }}
          />
          <button onClick={(e) => { e.stopPropagation(); setImgExpanded(false); }}
            style={{ position: "absolute", top: 20, right: 20, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          >✕</button>
        </div>,
        document.body
      )}

      {/* PDF POST */}
      {post.type === "pdf" && post.file_url && (
        <div style={{ margin: "4px 16px 0" }}>
          <a href={post.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", background: "linear-gradient(135deg,#0d1520,#111c2e)", border: "1px solid rgba(245,166,35,0.22)", borderRadius: 14, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.5)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(245,166,35,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.22)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 52, height: 60, background: "linear-gradient(135deg,#1a1000,#2a1f00)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, gap: 4 }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 7, color: "#f5a623", fontWeight: 700, letterSpacing: "0.1em" }}>PDF</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#f0e8d0", margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.file_name || "document.pdf"}</p>
                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#6a5a30", margin: 0 }}>Click to open document ↗</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5a623", fontSize: 14, flexShrink: 0 }}>→</div>
            </div>
          </a>
        </div>
      )}

      {/* ACTION BAR */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 12, padding: "8px 14px 13px", borderTop: "1px solid #1e1e1c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ActionBtn onClick={() => onLike(post.id)} active={liked} activeColor="#f87171"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
            label={likeCount ?? 0}
          />
          <Divider />
          <ActionBtn onClick={() => onOpenComments?.(post.id)} active={false} activeColor="#38bdf8"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
            label={dispCount || 0}
          />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {(communityId || post.community_id) && post.community_name && (
            <div
              onClick={() => navigate(`/community/${communityId || post.community_id}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "rgba(129,140,248,0.09)", border: "1px solid rgba(129,140,248,0.22)", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#818cf8" }}
            >
              {post.community_icon ? (
                <img src={post.community_icon} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(129,140,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
                  {post.community_name[0]}
                </div>
              )}
              <span>{post.community_name}</span>
            </div>
          )}

          <ActionBtn
            onClick={handleShare} activeColor="#818cf8"
            isShareBtn sharecopied={shareCopied}
            icon={
              shareCopied
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /></svg>
            }
            label="Share"
          />
        </div>
      </div>
    </article>
  );
};

export default PostCard;
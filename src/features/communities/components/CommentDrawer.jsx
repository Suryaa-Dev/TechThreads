import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import CommentsSection from "./CommentsSection";
import { timeAgo } from "../../../utils/helpers";
import { avatarGradient } from "../../../services/userService";

// LANG_MAP for badge display — local display metadata
const LANG_MAP = {
  jsx:{label:"JSX",color:"#61AFEF",bg:"rgba(97,175,239,0.12)"},
  js:{label:"JS",color:"#FFD43B",bg:"rgba(255,212,59,0.12)"},
  ts:{label:"TS",color:"#3178C6",bg:"rgba(49,120,198,0.12)"},
  tsx:{label:"TSX",color:"#3178C6",bg:"rgba(49,120,198,0.12)"},
  py:{label:"PY",color:"#FFD43B",bg:"rgba(255,212,59,0.12)"},
  java:{label:"JAVA",color:"#f89820",bg:"rgba(248,152,32,0.12)"},
  css:{label:"CSS",color:"#D4537E",bg:"rgba(212,83,126,0.12)"},
};
const getLang = (f="") => { const e=(f.split(".").pop()||"").toLowerCase(); return LANG_MAP[e]||{label:e.toUpperCase()||"CODE",color:"#888780",bg:"rgba(136,135,128,0.12)"}; };
const getPrismLang = (f="") => { const e=(f.split(".").pop()||"").toLowerCase(); return ({js:"javascript",jsx:"jsx",ts:"typescript",tsx:"tsx",py:"python",java:"java",css:"css"})[e]||"javascript"; };

const T = {
  overlay:    "rgba(2,2,2,0.82)",
  panel:      "#0e0e0d",
  postPanel:  "#161615",
  border:     "#252523",
  borderHov:  "#2e2e2b",
  cyan:       "#00d4ff",
  cyanDim:    "rgba(0,212,255,0.1)",
  cyanBorder: "rgba(0,212,255,0.3)",
  amber:      "#f5a623",
  purple:     "#9c6fff",
  green:      "#00e676",
  text:       "#f0f4ff",
  textMid:    "#d0d8ee",
  textMuted:  "#8b95ae",
  textDim:    "#6b7a99",
  codeBg:     "#0d0d10",
  mono:       "'Space Mono',monospace",
  sans:       "'Syne',sans-serif",
};

const TYPE_META = {
  text:{icon:"✦",label:"Text",color:"#7a8499"},
  code:{icon:"⌥",label:"Code",color:"#61AFEF"},
  image:{icon:"⬡",label:"Image",color:"#9c6fff"},
  pdf:{icon:"⊞",label:"PDF",color:"#f5a623"},
};

// ── Avatar: real image with initials fallback ──────────────────
function DrawerAvatar({ userId, avatarUrl, name, size = 38 }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (userId || "").slice(0, 2).toUpperCase();

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl} alt={name || userId}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${T.border}` }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: avatarGradient(userId || ""),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.mono, fontSize: size < 30 ? 9 : 12, fontWeight: 700, color: "#fff",
      border: `1.5px solid ${T.border}`,
    }}>{initials}</div>
  );
}

function CloseBtn({ onClick, label }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} aria-label={label}
      style={{ width:30, height:30, borderRadius:8, background:"transparent", border:`1px solid ${hov?T.borderHov:T.border}`, color:hov?T.text:T.textDim, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
      </svg>
    </button>
  );
}

// ── PostPanel: left floating card with real author name + avatar ─
function PostPanel({ post, open, onClose, profileMap = {} }) {
  const codeRef = useRef(null);
  const [imgExpanded, setImgExpanded] = useState(false);

  // We render lines manually with dangerouslySetInnerHTML so Prism is called per-line
  const highlightLine = (line, lang) => {
    try {
      const grammar = Prism.languages[lang] || Prism.languages.javascript;
      return Prism.highlight(line || " ", grammar, lang);
    } catch {
      return line || " ";
    }
  };


  if (!post) return null;

  const typeMeta = TYPE_META[post.type] || TYPE_META.text;
  const bodyText = post.caption || post.text || "";
  const fileName = post.file_name || "untitled.jsx";
  const lang     = getLang(fileName);
  const prismLang = getPrismLang(fileName);

  // Resolve author from profileMap
  const profile    = profileMap[post.user_id] || {};
  const authorName = profile.full_name || `User ${(post.user_id || "").slice(0, 8)}`;
  const avatarUrl  = profile.avatar_url || null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        right: "calc(min(480px, 44vw) + 20px)",
        top: "50%",
        transform: open ? "translateY(-50%) scale(1)" : "translateY(-50%) scale(0.94)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        zIndex: 1002,
        width: "min(520px, calc(100vw - min(480px,44vw) - 60px))",
        transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease",
      }}
    >
      <div style={{
        background: "#000",
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: 16,
        boxShadow: open ? "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)" : "none",
      }}>
        <div style={{
          background: T.postPanel,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: "hidden",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:typeMeta.color }} />
              <span style={{ fontFamily:T.mono, fontSize:12, color:typeMeta.color, fontWeight:700, letterSpacing:"0.05em" }}>
                {typeMeta.icon} // post
              </span>
            </div>
            <CloseBtn onClick={onClose} label="Close post panel" />
          </div>

          <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>

            {/* Author row — real name + avatar */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px 12px", background:"linear-gradient(135deg,#131312,#131312)", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <DrawerAvatar userId={post.user_id} avatarUrl={avatarUrl} name={authorName} size={38} />
                <span style={{ position:"absolute", bottom:1, right:1, width:8, height:8, background:T.green, borderRadius:"50%", border:`2px solid ${T.postPanel}` }} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:T.sans, fontWeight:700, fontSize:15, color:"#f0f4ff", margin:0 }}>
                  <span style={{ color:typeMeta.color }}>{authorName}</span>
                </p>
                <p style={{ fontFamily:T.mono, fontSize:11, color:"#6b7a99", margin:"3px 0 0" }}>{timeAgo(post.created_at)}</p>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                <span style={{ padding:"2px 8px", borderRadius:20, background:`${typeMeta.color}12`, border:`1px solid ${typeMeta.color}30`, fontFamily:T.mono, fontSize:10, fontWeight:700, color:typeMeta.color, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  {typeMeta.label}
                </span>
                {post.tag && (
                  <span style={{ padding:"2px 8px", borderRadius:20, background:"rgba(122,132,153,0.08)", border:"1px solid rgba(122,132,153,0.2)", fontFamily:T.mono, fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    {post.tag}
                  </span>
                )}
              </div>
            </div>

            {/* Caption (non-text) */}
            {bodyText && post.type !== "text" && (
              <p style={{ fontFamily:T.sans, fontSize:15, color:"#b0b9ce", lineHeight:1.65, margin:0, padding:"14px 20px 10px" }}>{bodyText}</p>
            )}

            {/* TEXT */}
            {post.type === "text" && bodyText && (
              <div style={{ margin:"14px 20px 0", padding:"16px 20px", background:"rgba(255,255,255,0.02)", borderLeft:"3px solid #7a8499", borderRadius:"0 12px 12px 0" }}>
                <p style={{ fontFamily:T.sans, fontSize:15, color:"#eef2ff", lineHeight:1.75, margin:0 }}>{bodyText}</p>
              </div>
            )}

            {/* CODE */}
            {post.type === "code" && post.code && (
              <div style={{ margin:"14px 16px 0", borderRadius:14, overflow:"hidden", border:`1px solid ${T.border}` }}>
                <div style={{ height:2, background:"linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8)" }} />
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#121211", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#ff5f57", display:"inline-block" }} />
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#febc2e", display:"inline-block" }} />
                  <span style={{ width:10, height:10, borderRadius:"50%", background:"#28c840", display:"inline-block" }} />
                  <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:6, fontFamily:T.mono, fontSize:11, fontWeight:700, color:lang.color, background:lang.bg, border:`1px solid ${lang.color}30` }}>{lang.label}</span>
                </div>
                <div ref={codeRef} style={{ background:T.codeBg, minHeight:"calc(15 * 1.7em)", maxHeight:"60vh", overflowY:"auto", overflowX:"auto" }}>
                  <pre style={{ margin:0, padding:"12px 0", fontSize:13, fontFamily:"'JetBrains Mono','Space Mono',monospace", lineHeight:1.7, color:"#abb2bf", background:"transparent", whiteSpace:"pre", minWidth:"max-content" }}>
                    {post.code.split("\n").map((line, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"stretch", minHeight:"1.7em" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ display:"inline-block", width:38, flexShrink:0, textAlign:"right", paddingRight:10, color:"#2e2e2b", fontSize:12, fontFamily:"'Space Mono',monospace", userSelect:"none", borderRight:"1px solid #131e2e", lineHeight:"1.7em" }}>{i + 1}</span>
                        <span style={{ paddingLeft:14, flex:1, whiteSpace:"pre" }} dangerouslySetInnerHTML={{ __html: highlightLine(line, prismLang) }} />
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            )}

            {/* IMAGE */}
            {post.type === "image" && post.file_url && (
              <div style={{ margin:"14px 16px 0", borderRadius:14, overflow:"hidden", border:`1px solid ${T.border}`, cursor:"zoom-in" }} onClick={()=>setImgExpanded(true)}>
                <img src={post.file_url} alt="post" style={{ width:"100%", maxHeight:320, objectFit:"cover", display:"block" }} />
              </div>
            )}
            {imgExpanded && (
              <div onClick={()=>setImgExpanded(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
                <img src={post.file_url} alt="expanded" style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:12, objectFit:"contain" }} />
              </div>
            )}

            {/* PDF */}
            {post.type === "pdf" && post.file_url && (
              <div style={{ margin:"14px 16px 0" }}>
                <a href={post.file_url} target="_blank" rel="noreferrer" style={{ textDecoration:"none", display:"block" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", background:"linear-gradient(135deg,#0d1520,#111c2e)", border:"1px solid rgba(245,166,35,0.2)", borderRadius:14 }}>
                    <div style={{ width:46, height:54, background:"linear-gradient(135deg,#1a1000,#2a1f00)", border:"1px solid rgba(245,166,35,0.3)", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0, gap:3 }}>
                      <span style={{ fontSize:18 }}>📄</span>
                      <span style={{ fontFamily:T.mono, fontSize:7, color:T.amber, fontWeight:700 }}>PDF</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:T.sans, fontWeight:700, fontSize:15, color:"#e8dfc0", margin:"0 0 4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.file_name||"document.pdf"}</p>
                      <p style={{ fontFamily:T.mono, fontSize:11, color:"#7a6a3a", margin:0 }}>Click to open ↗</p>
                    </div>
                  </div>
                </a>
              </div>
            )}

            <div style={{ height:32 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CommentPanel: right drawer ─────────────────────────────────
function CommentPanel({ open, onClose, post, currentUserId, comments, onRefresh, onCommentPosted, profileMap }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position:"fixed", top:0, right:0, bottom:0,
        zIndex:1002,
        width:"min(480px,44vw)",
        background:T.panel,
        borderLeft:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition:"transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: open ? "-24px 0 60px rgba(0,0,0,0.5)" : "none",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:3, height:16, borderRadius:2, background:T.cyan }} />
          <span style={{ fontFamily:T.mono, fontSize:12, color:T.cyan, fontWeight:700, letterSpacing:"0.05em" }}>// comments</span>
        </div>
        <CloseBtn onClick={onClose} label="Close comments" />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", scrollbarWidth:"thin", scrollbarColor:`${T.border} transparent` }}>
        <CommentsSection
          postId={post?.id}
          postOwnerId={post?.user_id}
          currentUserId={currentUserId}
          comments={comments}
          onRefresh={onRefresh}
          onCommentPosted={onCommentPosted}
          profileMap={profileMap}
        />
      </div>
    </div>
  );
}

// ── MAIN EXPORT ─────────────────────────────────────────────────
const CommentDrawer = ({ open, onClose, post, currentUserId, comments, onRefresh, onCommentPosted, profileMap = {} }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!post) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:1001,
        background:T.overlay,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition:"opacity 0.25s ease",
        backdropFilter: open ? "blur(2px)" : "none",
      }} />

      <PostPanel post={post} open={open} onClose={onClose} profileMap={profileMap} />

      <CommentPanel
        open={open} onClose={onClose} post={post}
        currentUserId={currentUserId} comments={comments}
        onRefresh={onRefresh} onCommentPosted={onCommentPosted}
        profileMap={profileMap}
      />
    </>
  );
};

export default CommentDrawer;
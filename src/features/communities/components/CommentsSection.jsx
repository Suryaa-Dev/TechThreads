import { useState, useCallback } from "react";
import {
  createCommunityComment,
  deleteCommunityComment,
  toggleCommentStar,
  toggleCommentFlag,
  toggleAcceptedSolution,
  createCommentReply,
  uploadCommunityFile,
} from "../../../services/postService";

// ─── THEME TOKENS ──────────────────────────────────────────────────────────────
const T = {
  card:        "#161615",
  cardHover:   "#13171f",
  border:      "#252523",
  borderHover: "#2e2e2b",
  bg:          "#0e0e0d",
  codeBg:      "#0d0d10",
  cyan:        "#00d4ff",
  cyanDim:     "rgba(0,212,255,0.12)",
  cyanBorder:  "rgba(0,212,255,0.3)",
  amber:       "#f5a623",
  amberDim:    "rgba(245,166,35,0.12)",
  red:         "#ff4c6a",
  redDim:      "rgba(255,76,106,0.12)",
  green:       "#00e676",
  greenDim:    "rgba(0,230,118,0.12)",
  greenBorder: "rgba(0,230,118,0.35)",
  text:        "#f0f4ff",
  textMid:     "#d0d8ee",
  textMuted:   "#8b95ae",
  textDim:     "#6b7a99",
  mono:        "'Space Mono', monospace",
  sans:        "'Syne', sans-serif",
};

// ─── GRADIENT PALETTE
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#00d4ff,#0099cc)",
  "linear-gradient(135deg,#9c6fff,#6b3fd4)",
  "linear-gradient(135deg,#00e676,#00a854)",
  "linear-gradient(135deg,#f5a623,#c97d00)",
  "linear-gradient(135deg,#ff4c6a,#c0003a)",
  "linear-gradient(135deg,#00d4ff,#9c6fff)",
];
const avatarGradient = (uid = "") =>
  AVATAR_GRADIENTS[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];

// ─── ICONS
const StarIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
    <path d="M8 1.5l1.8 3.65 4.02.58-2.91 2.84.69 4L8 10.52l-3.6 1.85.69-4L2.2 5.73l4.02-.58z" />
  </svg>
);
const FlagIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
    <path d="M3 2v12M3 2h8l-2 3.5 2 3.5H3" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const ReplyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6h8a4 4 0 0 1 4 4v1M2 6l4-4M2 6l4 4" />
  </svg>
);
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 11V3h8" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l4 4 6-6" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
  </svg>
);
const ChevronIcon = ({ up }) => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);
const SolutionIcon = ({ accepted }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill={accepted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={accepted ? "0" : "1.6"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="7" fill={accepted ? T.green : "none"} stroke={accepted ? T.green : "currentColor"} strokeWidth="1.4" />
    <path d="M5 8l2.5 2.5L11 5.5" stroke={accepted ? "#0e0e0d" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// ─── AVATAR
function Avatar({ userId, size = 28, profileMap = {} }) {
  const [failed, setFailed] = useState(false);
  const profile  = profileMap[userId] || {};
  const name     = profile.full_name || "";
  const avatar   = profile.avatar_url || null;
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : `U${(userId || "").slice(0, 2).toUpperCase()}`;

  if (avatar && !failed) {
    return (
      <img src={avatar} alt={name || userId} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${T.border}` }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: avatarGradient(userId), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#fff", border: `1.5px solid ${T.border}` }}>{initials}</div>
  );
}

// ─── ICON BUTTON
function Btn({ onClick, active, activeStyle, title, children, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = { display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, border: "none", background: hov && !active ? "rgba(255,255,255,0.04)" : "transparent", color: T.textDim, cursor: "pointer", fontFamily: T.mono, fontSize: 12, transition: "all 0.15s", ...style };
  return (
    <button onClick={onClick} title={title} style={active ? { ...base, ...activeStyle } : { ...base, color: hov ? T.textMuted : T.textDim }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</button>
  );
}

// ─── CODE BLOCK
function CodeBlock({ content, stepId, onStepReply }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(content).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ marginTop: 8, borderRadius: 8, background: T.codeBg, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <pre style={{ margin: 0, padding: "10px 14px", fontSize: 12, fontFamily: T.mono, color: "#d0d8ee", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre" }}>{content}</pre>
      <div style={{ display: "flex", gap: 4, padding: "4px 8px 6px", borderTop: `1px solid ${T.border}` }}>
        <Btn onClick={copy} active={copied} activeStyle={{ color: T.green }} title="Copy">{copied ? <CheckIcon /> : <CopyIcon />}<span>{copied ? "copied" : "copy"}</span></Btn>
        <div style={{ width: 1, height: 12, background: T.border, alignSelf: "center", margin: "0 2px" }} />
        <Btn onClick={() => onStepReply(stepId)} title={`Reply to step ${stepId}`}><ReplyIcon /><span>step {stepId}</span></Btn>
      </div>
    </div>
  );
}

// ─── STEP ITEM
function StepItem({ step, onStepReply }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.textMuted, marginTop: 2 }}>{step.id}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", fontFamily: T.sans, fontSize: 14, color: T.textMid, lineHeight: 1.6 }}>{step.caption}</p>
        {step.type === "code" && step.content && <CodeBlock content={step.content} stepId={step.id} onStepReply={onStepReply} />}
        {step.type === "image" && (
          step.content ? (
            <div style={{ marginTop: 6, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <img src={step.content} alt="step attachment" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ marginTop: 6, height: 56, borderRadius: 8, background: T.bg, border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>image attachment</span>
            </div>
          )
        )}
        {(step.type === "none" || (!step.content && step.type !== "image")) && (
          <Btn onClick={() => onStepReply(step.id)} style={{ marginTop: 4 }}><ReplyIcon /><span>step {step.id}</span></Btn>
        )}
      </div>
    </div>
  );
}

// ─── REPLY BOX
function ReplyBox({ stepRef, onSubmit, onCancel }) {
  const [text, setText]     = useState("");
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${T.border}` }}>
      {stepRef != null && <p style={{ margin: "0 0 6px", fontFamily: T.mono, fontSize: 11, color: T.cyan }}>re: step {stepRef}</p>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply..." rows={2}
        style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${focused ? T.cyanBorder : T.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: T.sans, fontSize: 14, color: T.text, resize: "none", outline: "none", lineHeight: 1.6, transition: "border-color 0.2s" }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: T.textDim, fontFamily: T.mono, fontSize: 12, cursor: "pointer" }}>cancel</button>
        <button onClick={() => { if (text.trim()) { onSubmit(text); setText(""); } }} disabled={!text.trim()}
          style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${T.cyanBorder}`, background: T.cyanDim, color: T.cyan, fontFamily: T.mono, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: text.trim() ? 1 : 0.35 }}
        >post reply</button>
      </div>
    </div>
  );
}

// ─── COMMENT CARD
function CommentCard({ comment, currentUserId, postOwnerId, onUpdate, onDelete, onAcceptSolution, profileMap = {} }) {
  const [showReplies, setShowReplies] = useState(true);
  const [replyingTo,  setReplyingTo]  = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);
  const [hovCard,     setHovCard]     = useState(false);
  const [acceptHov,   setAcceptHov]   = useState(false);

  const isOwn      = currentUserId === comment.user_id;
  const isPostOwner = currentUserId && postOwnerId && currentUserId === postOwnerId;
  const starred    = comment._starred  ?? false;
  const flagged    = comment._flagged  ?? false;
  const replies    = comment._replies  ?? [];
  const accepted   = comment._accepted ?? comment.is_accepted_solution ?? false;

  const handleStepReply    = (stepId) => setReplyingTo({ type: "step", stepId });
  const handleCommentReply = ()       => setReplyingTo({ type: "comment" });

  const handleSubmitReply = (text) => {
    const newReply = { id: `local_${Date.now()}`, comment_id: comment.id, user_id: currentUserId, text, step_ref: replyingTo?.type === "step" ? replyingTo.stepId : null, created_at: new Date().toISOString(), _local: true };
    onUpdate({ ...comment, _replies: [...replies, newReply] });
    setReplyingTo(null);
  };

  const timeStr = (iso) => {
    const d = new Date(iso);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      onMouseEnter={() => setHovCard(true)} onMouseLeave={() => setHovCard(false)}
      style={{ background: accepted ? "rgba(0,230,118,0.04)" : T.card, border: `1px solid ${accepted ? T.greenBorder : (hovCard ? T.borderHover : T.border)}`, borderRadius: 14, padding: 16, marginBottom: 12, transition: "border-color 0.2s, background 0.2s", position: "relative" }}
    >
      {accepted && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "5px 10px", background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: 8 }}>
          <SolutionIcon accepted />
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.green, fontWeight: 700, letterSpacing: "0.05em" }}>ACCEPTED SOLUTION</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar userId={comment.user_id} size={30} profileMap={profileMap} />
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.cyan, fontWeight: 700 }}>
            {profileMap[comment.user_id]?.full_name || `User ${(comment.user_id || "").slice(0, 8)}`}
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, marginLeft: 8 }}>{timeStr(comment.created_at)}</span>
        </div>

        {isPostOwner && comment.user_id !== postOwnerId && (
          <button onClick={() => onAcceptSolution(comment.id, comment.user_id, accepted)} title={accepted ? "Unmark as accepted solution" : "Mark as accepted solution"}
            onMouseEnter={() => setAcceptHov(true)} onMouseLeave={() => setAcceptHov(false)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${accepted ? T.greenBorder : (acceptHov ? T.greenBorder : T.border)}`, background: accepted ? T.greenDim : (acceptHov ? "rgba(0,230,118,0.06)" : "transparent"), color: accepted ? T.green : (acceptHov ? T.green : T.textDim), fontFamily: T.mono, fontSize: 11, fontWeight: 700, transition: "all 0.15s" }}
          >
            <SolutionIcon accepted={accepted} />
            <span>{accepted ? "accepted" : "accept"}</span>
          </button>
        )}

        {isOwn && (
          <button onClick={() => onDelete(comment.id)} title="Delete comment"
            style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textDim)}
          ><XIcon /></button>
        )}
      </div>

      <p style={{ margin: "0 0 10px", fontFamily: T.sans, fontSize: 14, color: T.textMid, lineHeight: 1.7 }}>{comment.caption}</p>

      {comment.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {comment.tags.map((tag) => (
            <span key={tag} style={{ fontFamily: T.mono, fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(0,212,255,0.06)", border: `1px solid rgba(0,212,255,0.15)`, color: T.textMuted }}>{tag}</span>
          ))}
        </div>
      )}

      {comment.steps?.length > 0 && (
        <div style={{ marginBottom: 12, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(255,255,255,0.02)", borderBottom: collapsed ? "none" : `1px solid ${T.border}` }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.06em", textTransform: "uppercase", marginRight: 4 }}>steps</span>
            {comment.steps.map((s) => (
              <button key={s.id} onClick={() => setCollapsed(false)}
                style={{ width: 22, height: 22, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.cyan; e.currentTarget.style.color = T.cyan; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
              >{s.id}</button>
            ))}
            <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: "auto", background: "none", border: "none", color: T.textDim, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <ChevronIcon up={!collapsed} />
            </button>
          </div>
          {!collapsed && (
            <div style={{ padding: "0 12px" }}>
              {comment.steps.map((step, i) => (
                <div key={step.id} style={{ borderBottom: i === comment.steps.length - 1 ? "none" : undefined }}>
                  <StepItem step={step} onStepReply={handleStepReply} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 4 }}>
        <Btn onClick={() => onUpdate({ ...comment, _starred: !starred, stars: starred ? comment.stars - 1 : comment.stars + 1 })} active={starred} activeStyle={{ color: T.amber, background: T.amberDim }} title="Star this answer">
          <StarIcon filled={starred} /><span>{comment.stars}</span>
        </Btn>
        <Btn onClick={() => onUpdate({ ...comment, _flagged: !flagged, flags: flagged ? comment.flags - 1 : comment.flags + 1 })} active={flagged} activeStyle={{ color: T.red, background: T.redDim }} title="Flag as incorrect">
          <FlagIcon filled={flagged} />
          {comment.flags > 0 && <span>{comment.flags}</span>}
        </Btn>
        <div style={{ flex: 1 }} />
        {replies.length > 0 && (
          <button onClick={() => setShowReplies(!showReplies)} style={{ background: "none", border: "none", fontFamily: T.mono, fontSize: 11, color: T.textDim, cursor: "pointer", marginRight: 4 }}>
            {showReplies ? "hide replies" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </button>
        )}
        <Btn onClick={handleCommentReply} title="Reply"><ReplyIcon /><span>reply</span></Btn>
      </div>

      {replyingTo && (
        <ReplyBox stepRef={replyingTo.type === "step" ? replyingTo.stepId : null} onSubmit={handleSubmitReply} onCancel={() => setReplyingTo(null)} />
      )}

      {showReplies && replies.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: `2px solid ${T.border}` }}>
          {replies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <Avatar userId={r.user_id} size={24} profileMap={profileMap} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, fontWeight: 700 }}>
                    {profileMap[r.user_id]?.full_name || `User ${(r.user_id || "").slice(0, 8)}`}
                  </span>
                  {r.step_ref != null && (
                    <span style={{ fontFamily: T.mono, fontSize: 10, padding: "1px 7px", borderRadius: 20, background: T.cyanDim, color: T.cyan, border: `1px solid ${T.cyanBorder}` }}>re: step {r.step_ref}</span>
                  )}
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p style={{ margin: 0, fontFamily: T.sans, fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STEP COMPOSER ROW
const TYPE_OPTS = [
  { v: "code",  label: "code" },
  { v: "image", label: "image" },
  { v: "none",  label: "text only" },
];

function NewStepRow({ step, index, onRemove, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const handleImageClick = () => { const input = document.getElementById(`step-img-input-${step.id}`); if (input) input.click(); };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(""); setUploading(true);

    // Use uploadCommunityFile from postService — bucket "community" handled internally
    const { url, error: upErr } = await uploadCommunityFile("comment-steps", file);
    if (upErr) { setUploadErr("Upload failed: " + upErr.message); setUploading(false); return; }

    onUpdate({ ...step, content: url });
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", gap: 10, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 8 }}>
      <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.textMuted, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>{index + 1}</div>
      <div style={{ flex: 1 }}>
        <input type="text" value={step.caption} onChange={(e) => onUpdate({ ...step, caption: e.target.value })} placeholder="Step caption (required)"
          style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontFamily: T.sans, fontSize: 13, color: T.text, outline: "none", marginBottom: 8 }}
          onFocus={(e) => (e.target.style.borderColor = T.cyanBorder)} onBlur={(e) => (e.target.style.borderColor = T.border)}
        />
        <div style={{ display: "flex", gap: 6, marginBottom: step.type === "code" ? 8 : 0 }}>
          {TYPE_OPTS.map(({ v, label }) => (
            <button key={v} onClick={() => onUpdate({ ...step, type: v, content: "" })}
              style={{ padding: "4px 12px", borderRadius: 8, fontFamily: T.mono, fontSize: 11, border: `1px solid ${step.type === v ? T.cyan : T.border}`, background: step.type === v ? T.cyanDim : "transparent", color: step.type === v ? T.cyan : T.textMuted, cursor: "pointer", transition: "all 0.15s" }}
            >{label}</button>
          ))}
        </div>
        {step.type === "code" && (
          <textarea value={step.content} onChange={(e) => onUpdate({ ...step, content: e.target.value })} placeholder="Paste code here..." rows={3}
            style={{ width: "100%", boxSizing: "border-box", background: T.codeBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: T.mono, fontSize: 12, color: "#d0d8ee", resize: "none", outline: "none", lineHeight: 1.7 }}
            onFocus={(e) => (e.target.style.borderColor = T.cyanBorder)} onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        )}
        {step.type === "image" && (
          <div style={{ marginTop: 4 }}>
            <input id={`step-img-input-${step.id}`} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
            {!step.content && (
              <div onClick={handleImageClick}
                style={{ height: 72, borderRadius: 8, background: T.bg, border: `1px dashed ${uploading ? T.cyan : T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: uploading ? "wait" : "pointer" }}
                onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.borderColor = T.cyanBorder; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = uploading ? T.cyan : T.border; }}
              >
                {uploading ? <span style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan }}>uploading...</span> : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>click to attach image</span></>
                )}
              </div>
            )}
            {step.content && (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
                <img src={step.content} alt="step attachment" style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block" }} />
                <button onClick={handleImageClick}
                  style={{ position: "absolute", bottom: 8, right: 8, padding: "4px 10px", borderRadius: 6, background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, color: T.textMuted, fontFamily: T.mono, fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border; }}
                >replace</button>
              </div>
            )}
            {uploadErr && <p style={{ fontFamily: T.mono, fontSize: 11, color: T.red, margin: "4px 0 0" }}>{uploadErr}</p>}
          </div>
        )}
      </div>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", alignSelf: "flex-start", padding: 2 }} onMouseEnter={(e) => (e.currentTarget.style.color = T.red)} onMouseLeave={(e) => (e.currentTarget.style.color = T.textDim)}><XIcon /></button>
    </div>
  );
}

// ─── COMMENT COMPOSER
function CommentComposer({ currentUserId, onPost, profileMap = {} }) {
  const [caption,    setCaption]    = useState("");
  const [tags,       setTags]       = useState("");
  const [steps,      setSteps]      = useState([]);
  const [focused,    setFocused]    = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addStep    = () => setSteps((s) => [...s, { id: Date.now(), caption: "", type: "code", content: "" }]);
  const removeStep = (id) => setSteps((s) => s.filter((x) => x.id !== id));
  const updateStep = (id, updated) => setSteps((s) => s.map((x) => (x.id === id ? updated : x)));

  const handlePost = async () => {
    if (!caption.trim() || submitting) return;
    setSubmitting(true);
    const parsedTags = tags.split(/\s+/).filter((t) => t.startsWith("#") && t.length > 1);
    const cleanSteps = steps.filter((s) => s.caption.trim()).map((s, i) => ({ id: i + 1, caption: s.caption, type: s.type, content: s.content || "" }));
    await onPost({ caption: caption.trim(), tags: parsedTags, steps: cleanSteps });
    setCaption(""); setTags(""); setSteps([]);
    setSubmitting(false);
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${focused ? T.borderHover : T.border}`, borderRadius: 14, padding: 16, marginBottom: 20, transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar userId={currentUserId} size={30} profileMap={profileMap} />
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>// add a comment</span>
      </div>
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Share your solution, insight, or question..." rows={3}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${focused ? T.cyanBorder : T.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: T.sans, fontSize: 14, color: T.text, resize: "none", outline: "none", lineHeight: 1.7, marginBottom: 10, transition: "border-color 0.2s" }}
      />
      <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#python #fix #error (space-separated)"
        style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 14px", fontFamily: T.mono, fontSize: 12, color: T.textMuted, outline: "none", marginBottom: 12 }}
        onFocus={(e) => (e.target.style.borderColor = T.cyanBorder)} onBlur={(e) => (e.target.style.borderColor = T.border)}
      />
      {steps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {steps.map((s, i) => <NewStepRow key={s.id} step={s} index={i} onRemove={() => removeStep(s.id)} onUpdate={(u) => updateStep(s.id, u)} />)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={addStep} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${T.border}`, background: "transparent", fontFamily: T.mono, fontSize: 12, color: T.textMuted, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.color = T.textMid; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}>
          <PlusIcon />add step
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handlePost} disabled={!caption.trim() || submitting}
          style={{ padding: "7px 20px", borderRadius: 8, border: `1px solid ${T.cyanBorder}`, background: caption.trim() ? T.cyanDim : "transparent", color: T.cyan, fontFamily: T.mono, fontSize: 12, fontWeight: 700, cursor: caption.trim() ? "pointer" : "not-allowed", opacity: caption.trim() ? 1 : 0.35, transition: "all 0.15s" }}
        >{submitting ? "posting..." : "post comment"}</button>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT
const CommentsSection = ({
  postId,
  postOwnerId,
  currentUserId,
  comments,
  onRefresh,
  onCommentPosted,
  profileMap = {},
}) => {
  const [localState, setLocalState] = useState({});

  const merged = (comments || []).map((c) => ({ ...c, ...(localState[c.id] || {}) }));

  // ── PERSIST STAR — use toggleCommentStar from postService
  const handleStar = useCallback(async (commentId, currentlyStarred) => {
    if (!currentUserId) return;
    setLocalState((s) => ({
      ...s,
      [commentId]: {
        ...s[commentId],
        _starred: !currentlyStarred,
        stars: (s[commentId]?.stars ?? (comments?.find((c) => c.id === commentId)?.stars ?? 0)) + (currentlyStarred ? -1 : 1),
      },
    }));
    await toggleCommentStar(commentId, currentUserId, currentlyStarred);
  }, [currentUserId, comments]);

  // ── PERSIST FLAG — use toggleCommentFlag from postService
  const handleFlag = useCallback(async (commentId, currentlyFlagged) => {
    if (!currentUserId) return;
    setLocalState((s) => ({
      ...s,
      [commentId]: {
        ...s[commentId],
        _flagged: !currentlyFlagged,
        flags: (s[commentId]?.flags ?? (comments?.find((c) => c.id === commentId)?.flags ?? 0)) + (currentlyFlagged ? -1 : 1),
      },
    }));
    await toggleCommentFlag(commentId, currentUserId, currentlyFlagged);
  }, [currentUserId, comments]);

  // ── PERSIST REPLY — use createCommentReply from postService
  const handleReply = useCallback(async (commentId, text, stepRef) => {
    if (!currentUserId || !text.trim()) return;
    const { data, error } = await createCommentReply(commentId, currentUserId, text.trim(), stepRef ?? null);
    if (!error && data) {
      setLocalState((s) => ({
        ...s,
        [commentId]: {
          ...s[commentId],
          _replies: [...(s[commentId]?._replies ?? (comments?.find((c) => c.id === commentId)?._replies ?? [])), data],
        },
      }));
    }
  }, [currentUserId, comments]);

  // ── ACCEPT SOLUTION — use toggleAcceptedSolution from postService
  const handleAcceptSolution = useCallback(async (commentId, commentUserId, currentlyAccepted) => {
    if (!currentUserId || currentUserId !== postOwnerId) return;

    // Optimistic update
    setLocalState((s) => {
      const next = { ...s };
      (comments || []).forEach((c) => {
        if (c.id !== commentId && (s[c.id]?._accepted ?? c.is_accepted_solution)) {
          next[c.id] = { ...next[c.id], _accepted: false };
        }
      });
      next[commentId] = { ...next[commentId], _accepted: !currentlyAccepted };
      return next;
    });

    await toggleAcceptedSolution(commentId, commentUserId, currentlyAccepted);
  }, [currentUserId, postOwnerId, comments]);

  // ── POST NEW COMMENT — use createCommunityComment from postService
  const handlePost = useCallback(async ({ caption, tags, steps }) => {
    if (!currentUserId) return;
    const { error } = await createCommunityComment(postId, currentUserId, { caption, tags, steps });
    if (!error) {
      onCommentPosted?.();
      onRefresh();
    }
  }, [currentUserId, postId, onRefresh, onCommentPosted]);

  // ── DELETE COMMENT — use deleteCommunityComment from postService
  const handleDelete = useCallback(async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    await deleteCommunityComment(commentId, currentUserId);
    onRefresh();
  }, [currentUserId, onRefresh]);

  // ── UPDATE (optimistic star/flag from CommentCard)
  const handleCommentUpdate = useCallback((updated) => {
    const prev = comments?.find((c) => c.id === updated.id);
    if (!prev) return;
    const newReplies = updated._replies?.filter((r) => r._local) ?? [];
    newReplies.forEach((r) => { handleReply(updated.id, r.text, r.step_ref); });
    if (updated._starred !== prev._starred) handleStar(updated.id, !updated._starred);
    if (updated._flagged !== prev._flagged) handleFlag(updated.id, !updated._flagged);
    setLocalState((s) => ({ ...s, [updated.id]: updated }));
  }, [comments, handleReply, handleStar, handleFlag]);

  if (comments === null) {
    return <p style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, margin: "12px 0" }}>// loading comments...</p>;
  }

  return (
    <div style={{ marginTop: 4 }}>
      <p style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, margin: "0 0 14px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        // {merged.length} comment{merged.length !== 1 ? "s" : ""}
      </p>

      {currentUserId && <CommentComposer currentUserId={currentUserId} onPost={handlePost} profileMap={profileMap} />}
      {!currentUserId && <p style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim, margin: "0 0 14px" }}>// login to leave a comment</p>}

      {merged.length === 0 && <p style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>// no comments yet — be the first!</p>}

      {merged.map((c) => (
        <CommentCard
          key={c.id}
          comment={c}
          currentUserId={currentUserId}
          postOwnerId={postOwnerId}
          onUpdate={handleCommentUpdate}
          onDelete={handleDelete}
          onAcceptSolution={handleAcceptSolution}
          profileMap={profileMap}
        />
      ))}
    </div>
  );
};

export default CommentsSection;

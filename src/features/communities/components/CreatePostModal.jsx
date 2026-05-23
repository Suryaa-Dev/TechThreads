import React, { useState, useEffect } from "react";

const MAX_CODE_LINES = 21;

const POST_TYPES = [
  { value: "text",  label: "Text",  icon: "✦", desc: "Share thoughts"  },
  { value: "code",  label: "Code",  icon: "⌥", desc: "Share a snippet" },
  { value: "image", label: "Image", icon: "⬡", desc: "Upload photo"    },
  { value: "pdf",   label: "PDF",   icon: "⊞", desc: "Upload document" },
];

const TAGS = ["Frontend", "Backend", "DSA", "System Design", "DevOps", "General"];

const TAG_COLORS = {
  Frontend: "#00d4ff", Backend: "#00e676", DSA: "#f5a623",
  "System Design": "#ff4c6a", DevOps: "#9c6fff", General: "#8b95ae",
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "#0e0e0d", border: "1px solid #252523",
  borderRadius: 10, padding: "11px 14px",
  color: "#f0f4ff", fontFamily: "'Syne', sans-serif",
  fontSize: 14, outline: "none",
  transition: "border-color 0.2s", display: "block",
};

const labelStyle = {
  fontSize: 11, color: "#6b7a99",
  fontFamily: "'Space Mono', monospace",
  textTransform: "uppercase", letterSpacing: "0.1em",
  display: "block", marginBottom: 8, fontWeight: 700,
};

const CreatePostModal = ({
  showModal, closeModal,
  text, setText,
  type, setType,
  file, handleFile,
  code, setCode,
  handlePost,
  posting = false,
  postError = "",
  codeRef,
}) => {
  const [selectedTag, setSelectedTag] = useState("");
  const [fileName,    setFileName]    = useState("");
  const [title,       setTitle]       = useState("");
  const [githubUrl,   setGithubUrl]   = useState("");
  const [pasteBlocked, setPasteBlocked] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setSelectedTag(""); setFileName(""); setTitle(""); setGithubUrl("");
      setText?.(""); setCode?.(""); setType?.("text");
    }
  }, [showModal]);

  if (!showModal) return null;

  const submit = () => handlePost?.({ tag: selectedTag, fileName, title, githubUrl });
  const handleClose = () => {
    closeModal();
    setSelectedTag(""); setFileName(""); setTitle(""); setGithubUrl("");
  };

  const codeLines      = (code || "").split("\n").length;
  const linesRemaining = MAX_CODE_LINES - codeLines;
  const atLimit        = codeLines >= MAX_CODE_LINES;
  const nearLimit      = linesRemaining <= 3 && !atLimit;

  const handleCodeChange = (e) => {
    const incoming = e.target.value;
    if (incoming.split("\n").length > MAX_CODE_LINES) {
      setPasteBlocked(true);
      setTimeout(() => setPasteBlocked(false), 2500);
      return;
    }
    setPasteBlocked(false);
    setCode?.(incoming);
  };

  const counterColor = (atLimit || pasteBlocked) ? "#ff4c6a" : nearLimit ? "#f5a623" : "#6b7a99";
  const currentType = POST_TYPES.find(p => p.value === type) || POST_TYPES[0];

  return (
    <div onClick={handleClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.84)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "linear-gradient(160deg, #0e0e0d 0%, #0d1220 100%)", border: "1px solid #252523", borderRadius: 24, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.85)", position: "relative" }}>

        {/* TOP ACCENT */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${TAG_COLORS[selectedTag] || "#00d4ff"}, ${currentType.value === "code" ? "#9c6fff" : currentType.value === "pdf" ? "#f5a623" : "#00d4ff"}, transparent)`, borderRadius: "24px 24px 0 0" }} />

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 26px 18px", borderBottom: "1px solid #1e1e1c" }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#f0f4ff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              Create Post
            </h2>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6b7a99", margin: 0 }}>
              // {currentType.desc}
            </p>
          </div>
          <button onClick={handleClose}
            style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #252523", color: "#6b7a99", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,76,106,0.1)"; e.currentTarget.style.color = "#ff4c6a"; e.currentTarget.style.borderColor = "rgba(255,76,106,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#6b7a99"; e.currentTarget.style.borderColor = "#252523"; }}
          >✕</button>
        </div>

        <div style={{ padding: "22px 26px" }}>

          {/* POST TYPE */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Post Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {POST_TYPES.map((pt) => {
                const active = type === pt.value;
                return (
                  <button key={pt.value} onClick={() => setType?.(pt.value)}
                    style={{ padding: "13px 4px", borderRadius: 12, border: active ? "1.5px solid #00d4ff" : "1.5px solid #252523", background: active ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.025)", color: active ? "#00d4ff" : "#6b7a99", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "#2e2e2b"; e.currentTarget.style.color = "#8b95ae"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "#252523"; e.currentTarget.style.color = "#6b7a99"; }}}
                  >
                    <span style={{ fontSize: 18 }}>{pt.icon}</span>
                    <span style={{ letterSpacing: "0.05em" }}>{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAG */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Tag</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TAGS.map(tag => {
                const c = TAG_COLORS[tag];
                const sel = selectedTag === tag;
                return (
                  <button key={tag} onClick={() => setSelectedTag(sel ? "" : tag)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: sel ? `1.5px solid ${c}` : "1.5px solid #252523", background: sel ? `${c}12` : "transparent", color: sel ? c : "#6b7a99", fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.15s" }}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAPTION */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              {type === "text" ? "Your post" : "Caption"}
              {type === "text" && <span style={{ color: "#ff4c6a", marginLeft: 4 }}>*</span>}
            </label>
            <textarea value={text} onChange={e => setText?.(e.target.value)}
              placeholder={
                type === "text"  ? "What's on your mind? Share a thought, tip, or question..." :
                type === "code"  ? "Briefly describe what this code does..." :
                type === "image" ? "Add context to your image..." :
                                   "Describe this document..."
              }
              rows={type === "text" ? 5 : 3}
              style={{ ...inputStyle, resize: "vertical", minHeight: type === "text" ? 110 : 70 }}
              onFocus={e => (e.target.style.borderColor = "rgba(0,212,255,0.45)")}
              onBlur={e => (e.target.style.borderColor = "#252523")}
            />
          </div>

          {/* CODE EDITOR */}
          {type === "code" && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Code</label>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: counterColor, transition: "color 0.2s" }}>
                  {atLimit ? `⚠ limit reached` : `${codeLines} / ${MAX_CODE_LINES} lines`}
                </span>
              </div>
              <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${atLimit ? "rgba(255,76,106,0.4)" : "#252523"}`, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#0f0f0e", borderBottom: "1px solid #0f1820" }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
                  <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="filename.jsx"
                    style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#6b7a99", fontSize: 11, fontFamily: "'Space Mono', monospace", outline: "none", width: 140, textAlign: "right" }} />
                </div>
                <textarea
                  ref={codeRef} value={code} onChange={handleCodeChange}
                  placeholder={"// paste or write your code here...\n\n"}
                  rows={9}
                  style={{ width: "100%", boxSizing: "border-box", background: "#0d0d10", border: "none", outline: "none", color: "#8ab0cc", fontFamily: "'Space Mono', monospace", fontSize: 12, lineHeight: 1.75, padding: "14px 18px", resize: "vertical", minHeight: 180, display: "block" }}
                />
              </div>
              {pasteBlocked && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#ff4c6a", margin: "6px 0 0" }}>⚠ pasted code exceeds {MAX_CODE_LINES} lines — trim it down</p>}
              {atLimit && !pasteBlocked && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#ff4c6a", margin: "6px 0 0" }}>⚠ {MAX_CODE_LINES}-line limit reached</p>}
              {nearLimit && !pasteBlocked && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#f5a623", margin: "6px 0 0" }}>{linesRemaining} line{linesRemaining !== 1 ? "s" : ""} remaining</p>}
            </div>
          )}

          {/* GITHUB URL */}
          {type === "code" && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>GitHub URL <span style={{ color: "#2e2e2b", textTransform: "none" }}>(optional)</span></label>
              <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..."
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(0,212,255,0.45)")}
                onBlur={e => (e.target.style.borderColor = "#252523")} />
            </div>
          )}

          {/* FILE UPLOAD */}
          {(type === "image" || type === "pdf") && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                Upload {type === "image" ? "Image" : "PDF"}
                <span style={{ color: "#ff4c6a", marginLeft: 4 }}>*</span>
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 20px", background: file ? "rgba(0,230,118,0.04)" : "rgba(255,255,255,0.02)", border: file ? "2px dashed rgba(0,230,118,0.4)" : "2px dashed #252523", borderRadius: 14, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = "rgba(0,212,255,0.35)"; e.currentTarget.style.background = "rgba(0,212,255,0.04)"; }}}
                onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = "#252523"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}}
              >
                <span style={{ fontSize: 36 }}>{file ? "✅" : type === "image" ? "🖼️" : "📄"}</span>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: file ? "#00e676" : "#6b7a99", margin: 0, textAlign: "center" }}>
                  {file ? `${file.name}` : `Click to upload ${type === "image" ? "image (jpg, png, gif, webp)" : "PDF file"}`}
                </p>
                {file && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#2e2e2b", margin: 0 }}>click to change file</p>}
                <input type="file" accept={type === "image" ? "image/*" : "application/pdf"} onChange={handleFile} style={{ display: "none" }} />
              </label>
            </div>
          )}

          {/* ERROR */}
          {postError && (
            <div style={{ padding: "10px 14px", background: "rgba(255,76,106,0.09)", border: "1px solid rgba(255,76,106,0.28)", borderRadius: 10, marginBottom: 18 }}>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#ff4c6a", margin: 0 }}>⚠ {postError}</p>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 18, borderTop: "1px solid #1e1e1c" }}>
            <button onClick={handleClose}
              style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid #252523", background: "transparent", color: "#6b7a99", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2e2e2b"; e.currentTarget.style.color = "#8b95ae"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#252523"; e.currentTarget.style.color = "#6b7a99"; }}
            >Cancel</button>

            <button onClick={submit} disabled={posting}
              style={{ padding: "11px 30px", borderRadius: 12, border: posting ? "1px solid #252523" : "1px solid rgba(0,212,255,0.5)", background: posting ? "rgba(255,255,255,0.03)" : "rgba(0,212,255,0.12)", color: posting ? "#6b7a99" : "#00d4ff", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, cursor: posting ? "not-allowed" : "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => { if (!posting) { e.currentTarget.style.background = "rgba(0,212,255,0.22)"; e.currentTarget.style.boxShadow = "0 0 22px rgba(0,212,255,0.22)"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = posting ? "rgba(255,255,255,0.03)" : "rgba(0,212,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {posting ? (
                <>
                  <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #6b7a99", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Posting...
                </>
              ) : "// Publish Post"}
            </button>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CreatePostModal;
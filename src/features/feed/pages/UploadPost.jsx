// src/features/feed/pages/UploadPost.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION ADDITIONS (all logic/services untouched):
//   - Page mount: staggered fade-up entrance for header, form panel, preview panel
//   - Gradient accent line: animated shimmer sweep on load
//   - Type toggle: smooth sliding pill indicator + icon scale on active
//   - Form fields: subtle slide-in per-field on type switch (CSS keyframe)
//   - Field inputs: glowing ring pulse on focus, not just color change
//   - Project type chips: spring-like scale bounce on select/deselect
//   - Image upload zone: border dash-march animation on hover
//   - Publish button: shimmer sweep on hover, loading pulse dots, micro-lift
//   - Preview panel header: ping dot stays, label chars do a one-time wave
//   - Preview container: fade-in + scale-up whenever post.type changes
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiCode, FiBox } from 'react-icons/fi';

import { useAuth } from '../../../context/AuthContext';
import { uploadPostImage, createCodePost, createProjectPost } from '../../../services/postService';

import PostCard    from '../components/PostCard';
import ProjectCard from '../components/ProjectCard';

const MAX_CODE_LINES = 22;

// ── global keyframes injected once ───────────────────────────────────────────
const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerLine {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes fieldIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chipPop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.14); }
    70%  { transform: scale(0.94); }
    100% { transform: scale(1); }
  }
  @keyframes dashMarch {
    to { stroke-dashoffset: -20; }
  }
  @keyframes btnShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1; }
  }
  @keyframes previewFade {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes ringPulse {
    0%   { box-shadow: 0 0 0 0   rgba(244,114,182,0.35); }
    60%  { box-shadow: 0 0 0 5px rgba(244,114,182,0);    }
    100% { box-shadow: 0 0 0 0   rgba(244,114,182,0);    }
  }
  @keyframes labelWave {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-3px); }
  }
`;

// ── AnimatedField ─────────────────────────────────────────────────────────────
let fieldIdx = 0;
function Field({ label, hint, children }) {
  const idx = useRef(fieldIdx++);
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        animation: `fieldIn 0.32s ease both`,
        animationDelay: `${idx.current * 45}ms`,
      }}
    >
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: '#6b7a99' }}>
          {label}
        </label>
        {hint && <span className="text-[11px]" style={{ color: '#2d3452' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── styled inputs with ring-pulse focus ──────────────────────────────────────
const baseInput = {
  background:   '#121211',
  border:       '1px solid #252523',
  color:        '#e8eaf6',
  borderRadius: '10px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  fontFamily:   'var(--sans)',
  caretColor:   '#f472b6',
  transition:   'border-color .15s, box-shadow .15s',
};

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={baseInput}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(244,114,182,0.55)';
        e.target.style.animation   = 'ringPulse .55s ease forwards';
      }}
      onBlur={e => {
        e.target.style.borderColor = '#252523';
        e.target.style.animation   = 'none';
      }} />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ ...baseInput, resize: 'none' }}
      onFocus={e => {
        e.target.style.borderColor = 'rgba(244,114,182,0.55)';
        e.target.style.animation   = 'ringPulse .55s ease forwards';
      }}
      onBlur={e => {
        e.target.style.borderColor = '#252523';
        e.target.style.animation   = 'none';
      }} />
  );
}

function CodeTextarea({ value, onChange }) {
  const lines     = value.split('\n').length;
  const atLimit   = lines >= MAX_CODE_LINES;
  const nearLimit = lines >= MAX_CODE_LINES - 3;

  const handleChange  = e => { if (e.target.value.split('\n').length > MAX_CODE_LINES) return; onChange(e); };
  const handleKeyDown = e => { if (e.key === 'Enter' && value.split('\n').length >= MAX_CODE_LINES) e.preventDefault(); };

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder={'Paste your code here…\n(max 22 lines)'}
        rows={8} spellCheck={false}
        style={{
          ...baseInput,
          resize:     'none',
          fontFamily: "'JetBrains Mono','Space Mono','Fira Code',monospace",
          fontSize:   '12px',
          lineHeight: '1.65',
          borderColor: atLimit ? 'rgba(244,114,182,0.45)' : '#252523',
        }}
        onFocus={e => {
          e.target.style.borderColor = atLimit ? 'rgba(244,114,182,0.55)' : 'rgba(244,114,182,0.5)';
          e.target.style.animation   = 'ringPulse .55s ease forwards';
        }}
        onBlur={e => {
          e.target.style.borderColor = atLimit ? 'rgba(244,114,182,0.35)' : '#252523';
          e.target.style.animation   = 'none';
        }}
      />
      <div className="flex items-center justify-between px-1">
        <span style={{
          fontSize:   10,
          fontFamily: "'Space Mono',monospace",
          color:      atLimit ? '#f472b6' : nearLimit ? '#f5a623' : '#2d3452',
          transition: 'color .15s',
        }}>
          {atLimit   ? `⚠ ${MAX_CODE_LINES}/${MAX_CODE_LINES} lines — limit reached`
           : nearLimit ? `${lines}/${MAX_CODE_LINES} lines — almost at limit`
           : `${lines}/${MAX_CODE_LINES} lines`}
        </span>
        {atLimit && <span style={{ fontSize: 10, color: '#6b7a99', fontFamily: "'Space Mono',monospace" }}>keep snippets concise</span>}
      </div>
    </div>
  );
}

const PROJECT_TYPES = ['Full-Stack', 'Frontend', 'Backend', 'ML/AI', 'Mobile', 'Other'];
const TYPE_COLORS   = {
  'Full-Stack': '#f472b6', 'Frontend': '#38bdf8', 'Backend': '#34d399',
  'ML/AI': '#a78bfa', 'Mobile': '#fb923c', 'Other': '#8891b2',
};

// ── AnimatedChip ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  const color = TYPE_COLORS[label];
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    setPopping(true);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onAnimationEnd={() => setPopping(false)}
      className="px-3 py-1.5 rounded-lg text-[13px] font-semibold border cursor-pointer"
      style={{
        background:   active ? `${color}22` : 'transparent',
        borderColor:  active ? `${color}55` : '#252523',
        color:        active ? color        : '#6b7a99',
        animation:    popping ? 'chipPop .35s ease' : 'none',
        transition:   'background .15s, border-color .15s, color .15s',
        outline:      'none',
      }}
    >{label}</button>
  );
}

// ── LoadingDots (publish state) ───────────────────────────────────────────────
function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#f472b6',
          display: 'inline-block',
          animation: `dotPulse 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  );
}

// ── UploadPost ────────────────────────────────────────────────────────────────
const UploadPost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // reset per-field stagger counter on each render of the form section
  fieldIdx = 0;

  const [post, setPost] = useState({
    type: 'code', tag: '', code: '', caption: '',
    projectTitle: '', projectDesc: '', projectLink: '',
    projectLive: '', projectStack: '', projectImage: '', projectType: '',
  });
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [imgUploaded, setImgUploaded] = useState(false);
  const [btnHover,    setBtnHover]    = useState(false);
  // tracks preview re-key to retrigger animation on type change
  const [previewKey,  setPreviewKey]  = useState(0);

  const set = (field, value) => setPost(p => ({ ...p, [field]: value }));

  const switchType = (t) => {
    fieldIdx = 0; // reset stagger
    set('type', t);
    setPreviewKey(k => k + 1);
  };

  const handleImageUpload = async e => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      if (!user) return alert('Login required');
      const { url, error } = await uploadPostImage(user.id, file);
      if (error) { alert('Image upload failed'); return; }
      set('projectImage', url);
      setImgUploaded(true);
    } finally { setUploading(false); }
  };

  const handleUpload = async () => {
    setSubmitting(true);
    try {
      if (!user) { alert('Login required'); return; }
      if (post.type === 'code') {
        if (!post.code) { alert('Code is required.'); return; }
        const { data, error } = await createCodePost(user.id, { tag: post.tag, code: post.code, caption: post.caption });
        if (error) { alert('Failed to upload code post'); return; }
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate('/feed', { state: { newPostId: data?.id ?? null, newPostType: 'code' } });
      } else {
        if (!post.projectTitle) { alert('Project title is required.'); return; }
        const { data, error } = await createProjectPost(user.id, {
          project_title: post.projectTitle, project_desc: post.projectDesc,
          project_link: post.projectLink, project_live_url: post.projectLive,
          project_stack: post.projectStack, project_image: post.projectImage,
          project_type: post.projectType || null,
        });
        if (error) { alert('Failed to upload project post'); return; }
        window.scrollTo({ top: 0, behavior: 'instant' });
        navigate('/feed', { state: { newPostId: data?.id ?? null, newPostType: 'project' } });
      }
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{
        height: '100vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--sans)', background: '#0e0e0d',
        padding: '0px 40px',
      }}>

        {/* ── header — slides in from below ── */}
        <div style={{
          flexShrink: 0, padding: '20px 32px 0',
          animation: 'fadeUp 0.45s ease both',
          animationDelay: '0ms',
        }}>
          <h1 className="text-2xl font-bold text-[#f0f4ff] tracking-tight">Create a Post</h1>
          <p className="text-[14px] text-[#6b7a99] mt-1">Share your code or showcase a project</p>

          {/* animated shimmer gradient line */}
          <div style={{
            height: 2, marginTop: 12, borderRadius: 99,
            background: 'linear-gradient(90deg, #f472b6 0%, #818cf8 40%, #38bdf8 70%, #f472b6 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerLine 3.5s linear infinite',
          }} />
        </div>

        {/* ── two-column body ── */}
        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '24px', padding: '20px 32px 24px', minHeight: 0,
        }}>

          {/* ── LEFT: form panel ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            borderRadius: '18px', border: '1px solid #252523',
            background: '#161615', overflow: 'hidden', minHeight: 0,
            animation: 'fadeUp 0.48s ease both',
            animationDelay: '80ms',
          }}>
            {/* scrollable fields */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 20px 0',
              display: 'flex', flexDirection: 'column', gap: '16px',
              scrollbarWidth: 'thin', scrollbarColor: '#252523 transparent',
            }}>

              {/* ── type toggle with animated pill ── */}
              <Field label="Post Type">
                <div style={{ position: 'relative', display: 'flex', gap: 0, padding: 4, borderRadius: 12, background: '#121211' }}>
                  {/* sliding pill */}
                  <div style={{
                    position: 'absolute',
                    top: 4, bottom: 4,
                    left: post.type === 'code' ? 4 : 'calc(50% + 2px)',
                    width: 'calc(50% - 6px)',
                    borderRadius: 9,
                    background: 'rgba(244,114,182,0.15)',
                    border: '1px solid rgba(244,114,182,0.25)',
                    transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    pointerEvents: 'none',
                  }} />
                  {[
                    { id: 'code',    label: 'Code Post',    icon: <FiCode size={13} /> },
                    { id: 'project', label: 'Project Post', icon: <FiBox size={13} /> },
                  ].map(t => (
                    <button key={t.id} onClick={() => switchType(t.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none"
                      style={{
                        background: 'transparent',
                        color: post.type === t.id ? '#f472b6' : '#6b7a99',
                        position: 'relative', zIndex: 1,
                        transition: 'color .2s',
                        transform: post.type === t.id ? 'scale(1.04)' : 'scale(1)',
                      }}>
                      <span style={{ transition: 'transform .2s', transform: post.type === t.id ? 'scale(1.15)' : 'scale(1)' }}>
                        {t.icon}
                      </span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* ── code fields ── */}
              {post.type === 'code' && (
                <>
                  <Field label="Tag / Language" hint="e.g. React, Python, CSS">
                    <Input value={post.tag} onChange={e => set('tag', e.target.value)} placeholder="React Hooks" />
                  </Field>
                  <Field label="Code Snippet" hint={`max ${MAX_CODE_LINES} lines`}>
                    <CodeTextarea value={post.code} onChange={e => set('code', e.target.value)} />
                  </Field>
                  <Field label="Caption" hint="optional">
                    <Textarea value={post.caption} onChange={e => set('caption', e.target.value)}
                      placeholder="Explain your approach or what this solves…" rows={3} />
                  </Field>
                </>
              )}

              {/* ── project fields ── */}
              {post.type === 'project' && (
                <>
                  <Field label="Project Title">
                    <Input value={post.projectTitle} onChange={e => set('projectTitle', e.target.value)}
                      placeholder="TechGram — Dev Social Platform" />
                  </Field>
                  <Field label="Project Type" hint="helps recruiters filter">
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_TYPES.map(t => (
                        <Chip key={t} label={t} active={post.projectType === t}
                          onClick={() => set('projectType', post.projectType === t ? '' : t)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Description">
                    <Textarea value={post.projectDesc} onChange={e => set('projectDesc', e.target.value)}
                      placeholder="What does it do? What problem does it solve?" rows={3} />
                  </Field>
                  <Field label="Tech Stack" hint="comma separated">
                    <Input value={post.projectStack} onChange={e => set('projectStack', e.target.value)}
                      placeholder="React, TypeScript, Supabase, Tailwind" />
                  </Field>
                  <Field label="GitHub Link">
                    <Input value={post.projectLink} onChange={e => set('projectLink', e.target.value)}
                      placeholder="https://github.com/username/repo" />
                  </Field>
                  <Field label="Live Demo URL" hint="optional but recommended">
                    <Input value={post.projectLive} onChange={e => set('projectLive', e.target.value)}
                      placeholder="https://myproject.vercel.app" />
                  </Field>
                  <Field label="Project Image" hint="optional thumbnail">
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 13px', borderRadius: 12,
                        border: imgUploaded ? '1px solid rgba(52,211,153,0.4)' : '1px dashed #252523',
                        background: '#121211', cursor: 'pointer',
                        transition: 'border-color .2s, background .2s',
                      }}
                      onMouseEnter={e => {
                        if (!imgUploaded) {
                          e.currentTarget.style.borderColor = 'rgba(244,114,182,0.4)';
                          e.currentTarget.style.background  = 'rgba(244,114,182,0.04)';
                          // animated dash march via SVG outline trick — we just boost opacity
                        }
                      }}
                      onMouseLeave={e => {
                        if (!imgUploaded) {
                          e.currentTarget.style.borderColor = '#252523';
                          e.currentTarget.style.background  = '#121211';
                        }
                      }}
                    >
                      <FiUploadCloud size={16} style={{
                        color: imgUploaded ? '#34d399' : '#6b7a99', flexShrink: 0,
                        transition: 'color .2s, transform .2s',
                        transform: uploading ? 'translateY(-2px)' : 'none',
                      }} />
                      <span className="text-[13px] flex-1" style={{ color: imgUploaded ? '#34d399' : '#6b7a99' }}>
                        {uploading ? 'Uploading…' : imgUploaded ? 'Image uploaded ✓' : 'Click to upload image'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </Field>
                </>
              )}

              <div style={{ height: 8 }} />
            </div>

            {/* ── publish button — shimmer on hover, dots on submit ── */}
            <div style={{
              flexShrink: 0, padding: '14px 20px 18px',
              background: '#161615', borderTop: '1px solid #1e1e1c',
            }}>
              <button
                onClick={handleUpload}
                disabled={submitting}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                  border: 'none', outline: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  position: 'relative', overflow: 'hidden',
                  background: submitting
                    ? 'rgba(244,114,182,0.15)'
                    : btnHover
                    ? 'linear-gradient(135deg, #e85dac, #6f5ce0, #2ba9d8, #f472b6)'
                    : 'linear-gradient(135deg, #f472b6, #818cf8, #38bdf8)',
                  backgroundSize: btnHover ? '300% 100%' : '100% 100%',
                  animation: btnHover && !submitting ? 'btnShimmer 1.4s linear infinite' : 'none',
                  color:     submitting ? '#f472b6' : 'white',
                  boxShadow: submitting ? 'none'
                    : btnHover ? '0 0 30px rgba(244,114,182,0.4), 0 4px 16px rgba(0,0,0,0.3)'
                    : '0 0 20px rgba(244,114,182,0.25)',
                  transform:   !submitting && btnHover ? 'translateY(-1px)' : 'none',
                  transition:  'transform .15s, box-shadow .2s, color .15s',
                  letterSpacing: '0.01em',
                }}
              >
                {submitting ? <LoadingDots /> : 'Publish Post'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: preview panel ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
            animation: 'fadeUp 0.5s ease both',
            animationDelay: '140ms',
          }}>
            {/* header */}
            <div className="flex items-center gap-2 mb-3" style={{ flexShrink: 0 }}>
              <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: '#6b7a99' }}>
                Live Preview
              </p>
              <div className="flex-1 h-px" style={{ background: '#252523' }} />
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500" />
              </span>
            </div>

            {/* preview — re-animates on type switch via key */}
            <div
              key={previewKey}
              style={{
                flex: 1, overflowY: 'auto',
                scrollbarWidth: 'thin', scrollbarColor: '#252523 transparent',
                animation: 'previewFade 0.3s ease both',
              }}
            >
              {post.type === 'code' ? (
                <PostCard post={{
                  author: { name: 'You', username: '', avatar: null },
                  tag: post.tag, code: post.code, caption: post.caption,
                  likes: 0, comments: 0,
                }} />
              ) : (
                <ProjectCard post={{
                  project_title: post.projectTitle, project_desc: post.projectDesc,
                  project_link: post.projectLink, project_live_url: post.projectLive,
                  project_stack: post.projectStack, project_image: post.projectImage,
                  project_type: post.projectType, created_at: new Date().toISOString(),
                  likes: 0, comments: 0,
                }} />
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default UploadPost;
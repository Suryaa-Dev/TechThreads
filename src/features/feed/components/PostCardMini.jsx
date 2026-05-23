// src/features/feed/components/PostCardMini.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   REPLACED: inline LANG_MAP + getLang()   → getLangLabel() from helpers.js
//   REPLACED: supabase.auth.getUser()       → useAuth() from AuthContext
//   REMOVED:  delete button from card grid  — delete lives in the PostModal only
//   FIXED:    uniform card height — all cards are the same height regardless
//             of content. Code preview fills remaining space with flex:1.
//             Caption is clamped to 1 line, never expands the card.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth }         from '../../../context/AuthContext';
import { getLangLabel }    from '../../../utils/helpers';

// ── design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#0e0e0d',
  card:    '#161615',
  border:  '#252523',
  borderH: '#343430',
  text:    '#f0f4ff',
  mid:     '#d0d8ee',
  muted:   '#8b95ae',
  faint:   '#6b7a99',
  fainter: '#4a5878',
  pink:    '#f472b6',
  indigo:  '#818cf8',
  green:   '#34d399',
};

// ── PostCardMini ──────────────────────────────────────────────────────────────
const PostCardMini = ({ post, onClick }) => {
  const [hov, setHov] = useState(false);
  const { user } = useAuth();

  const langLabel = getLangLabel(post.fileName || post.tag || '');

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        // ── FIXED HEIGHT: every card is exactly 220px tall ──────────────────
        // The card is a flex column. The code preview (flex:1) absorbs all
        // leftover space so the footer is always pinned to the bottom.
        height:       220,
        display:      'flex',
        flexDirection:'column',
        background:   C.card,
        border:       `1px solid ${hov ? C.borderH : C.border}`,
        borderRadius: 16,
        overflow:     'hidden',
        cursor:       'pointer',
        transition:   'border-color .15s, transform .2s cubic-bezier(0.34,1.56,0.64,1), box-shadow .15s',
        transform:    hov ? 'translateY(-3px) scale(1.01)' : 'none',
        boxShadow:    hov ? '0 12px 36px rgba(0,0,0,0.55)' : '0 2px 12px rgba(0,0,0,0.3)',
        position:     'relative',
      }}
    >
      {/* top colour bar */}
      <div style={{ height:2, flexShrink:0,
        background:`linear-gradient(90deg,${C.pink},${C.indigo})` }} />

      {/* ── code preview — flex:1 fills all remaining height ── */}
      <div style={{
        flex:       1,          // ← takes all space between top bar and footer
        minHeight:  0,          // ← required for flex children to shrink properly
        background: '#0d0d10',
        padding:    '10px 14px 0',
        overflow:   'hidden',
        position:   'relative',
      }}>
        {/* mac-style dots */}
        <div style={{ display:'flex', gap:5, marginBottom:8, flexShrink:0 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff5f57', display:'block' }} />
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#febc2e', display:'block' }} />
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#28c840', display:'block' }} />
        </div>

        {/* code lines — show as many as fit, overflow hidden */}
        {(post.code || '// no preview').split('\n').slice(0, 8).map((line, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:2 }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10,
              color:C.fainter, width:14, textAlign:'right', flexShrink:0,
              userSelect:'none' }}>{i + 1}</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10,
              color:'#abb2bf', overflow:'hidden', textOverflow:'ellipsis',
              whiteSpace:'nowrap', flex:1 }}>{line || ' '}</span>
          </div>
        ))}

        {/* bottom fade so truncated code looks intentional */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:44,
          background:'linear-gradient(transparent,#0d0d10)', pointerEvents:'none' }} />
      </div>

      {/* ── footer — fixed height, never grows ── */}
      <div style={{ flexShrink:0, padding:'9px 14px 11px',
        borderTop:`1px solid ${C.border}`,
        display:'flex', flexDirection:'column', gap:5 }}>

        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', gap:8 }}>

          {/* language badge */}
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700,
            padding:'2px 8px', borderRadius:6,
            background:'rgba(244,114,182,0.1)',
            border:'1px solid rgba(244,114,182,0.25)', color:C.pink,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            maxWidth:100 }}>
            {langLabel}
          </span>

          {/* like + comment counts */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <span style={{ display:'flex', alignItems:'center', gap:4,
              fontFamily:"'Space Mono',monospace", fontSize:10, color:C.fainter }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {post.likes ?? 0}
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4,
              fontFamily:"'Space Mono',monospace", fontSize:10, color:C.fainter }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {post.comments ?? 0}
            </span>
          </div>
        </div>

        {/* caption — clamped to 1 line, never expands the card */}
        {post.caption && (
          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:C.muted,
            margin:0, lineHeight:1.4, overflow:'hidden',
            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default PostCardMini;
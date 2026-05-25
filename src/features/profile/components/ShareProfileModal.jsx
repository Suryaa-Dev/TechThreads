// src/features/profile/components/ShareProfileModal.jsx
import React, { useState } from 'react';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';

const T = {
  bg: '#0a0a09', card: '#161615', border: '#1f1f1d', borderH: '#2e2e2b',
  pink: '#f472b6', indigo: '#818cf8', cyan: '#38bdf8', purple: '#a78bfa',
  text: '#f0f4ff', mid: '#c8d0e4', muted: '#7a8399', faint: '#454e66',
  green: '#34d399',
  mono: "'Space Mono', monospace", sans: "'Syne', sans-serif",
};

const KEYFRAMES = `
  @keyframes backdropIn { from { opacity:0; } to { opacity:1; } }
  @keyframes modalIn {
    from { opacity:0; transform:scale(0.94) translateY(24px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes glintSweep {
    0%   { background-position:-200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes checkPop {
    0%   { transform:scale(0.5); opacity:0; }
    60%  { transform:scale(1.2); }
    100% { transform:scale(1);   opacity:1; }
  }
`;

function buildShareUrl(userId) {
  return `https://tech-threads-eta.vercel.app/user/id/${userId}`;
}

const COOL_MESSAGES = [
  (name, url) =>
    `🧵 TechThreads — where devs post real code, not takes.\n\nfind ${name ? `@${name}` : 'me'} there 👇\n${url}`,
  (name, url) =>
    `⚡ dark mode. real code. no noise.\n\nTechThreads is the feed you actually want.\ncheck out ${name ? `@${name}` : 'my profile'} 👇\n${url}`,
  (name, url) =>
    `🖤 code lives on TechThreads.\n\n${name ? `@${name} is` : "i'm"} already on it — are you?\n${url}`,
];

export default function ShareProfileModal({ userId, userName, onClose }) {
  const [copied, setCopied] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  const shareUrl = buildShareUrl(userId);
  const message = COOL_MESSAGES[msgIdx](userName, shareUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTwitter = () => {
    const tweet = encodeURIComponent(
      `⚡ TechThreads is the dev social network that actually gets it — real code, real projects.\nfind me there 👇\n${shareUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
  };

  const handleLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const handleNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName || 'a dev'} on TechThreads`,
          text: `🧵 TechThreads — where devs post real code. check it out.\n`,
          url: shareUrl,
        });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        animation: 'backdropIn 0.2s ease both',
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{
        width: '100%', maxWidth: 440,
        background: T.card, border: `1px solid ${T.borderH}`,
        borderRadius: 22, overflow: 'hidden',
        boxShadow: `0 0 0 1px rgba(244,114,182,0.07), 0 48px 100px rgba(0,0,0,0.85)`,
        animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* shimmer top bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg,${T.pink},${T.purple},${T.indigo},${T.cyan},${T.pink})`,
          backgroundSize: '200% 100%',
          animation: 'glintSweep 3s linear infinite',
        }} />

        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <p style={{
              fontFamily: T.mono, fontSize: 8, color: T.pink,
              letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px',
            }}>
              share_profile.jsx
            </p>
            <h2 style={{
              fontFamily: T.sans, fontWeight: 800, fontSize: 19,
              color: T.text, margin: 0, letterSpacing: '-0.01em',
            }}>
              Share your profile
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
              color: T.muted, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = T.pink;
              e.currentTarget.style.borderColor = `${T.pink}44`;
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = T.muted;
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* message preview */}
          <div style={{
            background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '14px 16px',
            fontFamily: T.sans, fontSize: 13, color: T.mid,
            lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {COOL_MESSAGES[msgIdx](userName, '').trim()}
            <span style={{
              display: 'block', marginTop: 10, padding: '5px 10px', borderRadius: 8,
              background: 'rgba(129,140,248,0.08)', border: `1px solid rgba(129,140,248,0.2)`,
              fontFamily: T.mono, fontSize: 10, color: T.indigo,
              wordBreak: 'break-all',
            }}>
              {shareUrl}
            </span>
          </div>

          {/* cycle message */}
          <button
            onClick={() => { setCopied(false); setMsgIdx(i => (i + 1) % COOL_MESSAGES.length); }}
            style={{
              alignSelf: 'flex-start', padding: '5px 12px', borderRadius: 20,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.faint, fontFamily: T.mono, fontSize: 9,
              cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.mid; e.currentTarget.style.borderColor = T.borderH; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.faint; e.currentTarget.style.borderColor = T.border; }}
          >
            ↻ try another message
          </button>

          {/* copy button */}
          <button
            onClick={handleCopy}
            style={{
              width: '100%', padding: 11, borderRadius: 12,
              background: copied ? 'rgba(52,211,153,0.1)' : `${T.pink}12`,
              border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : `${T.pink}45`}`,
              color: copied ? T.green : T.pink,
              fontFamily: T.mono, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.25s',
            }}
          >
            {copied
              ? <><FiCheck size={13} style={{ animation: 'checkPop 0.3s ease' }} /> copied!</>
              : <><FiCopy size={13} /> copy message + link</>
            }
          </button>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{
              fontFamily: T.mono, fontSize: 9, color: T.faint,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              or share to
            </span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* platform buttons */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            {[
              { label: '𝕏 twitter', fn: handleTwitter, color: T.text },
              { label: 'in linkedin', fn: handleLinkedIn, color: '#60a5fa' },
              { label: '↑ share', fn: handleNative, color: T.indigo },
            ].map(({ label, fn, color }) => (
              <button key={label} onClick={fn}
                style={{
                  flex: 1, padding: '9px 8px', borderRadius: 10,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  color: T.faint, fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = color;
                  e.currentTarget.style.borderColor = `${color}45`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = T.faint;
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

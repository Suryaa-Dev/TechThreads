// src/features/profile/components/BadgesTab.jsx
// Redesigned to match the two-column profile aesthetic.
// Same data / loadBadgeProgress call — only UI changed.

import React, { useEffect, useState, useCallback } from 'react';
import { loadBadgeProgress } from '../../../services/badgeEngine';

// ─── Tokens (same as Profile.jsx) ─────────────────────────────────────────────
const T = {
  bg:      '#0a0a09',
  panel:   '#111110',
  card:    '#161615',
  cardH:   '#1a1918',
  border:  '#1f1f1d',
  borderH: '#2e2e2b',
  pink:    '#f472b6',
  indigo:  '#818cf8',
  cyan:    '#38bdf8',
  green:   '#34d399',
  amber:   '#f5a623',
  purple:  '#a78bfa',
  text:    '#f0f4ff',
  mid:     '#c8d0e4',
  muted:   '#7a8399',
  faint:   '#454e66',
  mono:    "'Space Mono', monospace",
  sans:    "'Syne', sans-serif",
};

const TIER_CFG = {
  bronze: { color: '#cd7f32', bg: 'rgba(205,127,50,0.1)',  border: 'rgba(205,127,50,0.3)' },
  silver: { color: '#c0c0c0', bg: 'rgba(192,192,192,0.1)', border: 'rgba(192,192,192,0.3)' },
  gold:   { color: '#ffd700', bg: 'rgba(255,215,0,0.1)',   border: 'rgba(255,215,0,0.3)'   },
};

// ─── Hex SVG ──────────────────────────────────────────────────────────────────
function Hex({ size = 52, color = '#818cf8', bg = '#111', strokeWidth = 1.2 }) {
  const cx = size / 2;
  const pts = r => {
    return [90, 30, -30, -90, -150, 150].map(a => {
      const rad = (a * Math.PI) / 180;
      return `${cx + r * Math.cos(rad)},${cx - r * Math.sin(rad)}`;
    }).join(' ');
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <polygon points={pts(cx * 0.88)} fill={bg} stroke={color} strokeWidth={strokeWidth} />
      <polygon points={pts(cx * 0.70)} fill={bg} stroke={color + '30'} strokeWidth={0.5} />
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 3, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 2, background: color,
        width: `${pct}%`, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ─── Badge grid card ──────────────────────────────────────────────────────────
function BadgeCard({ badge, selected, onClick }) {
  const [hov, setHov] = useState(false);
  const locked = !badge.isEarned && badge.progressPct === 0;
  const color  = locked ? T.faint : (badge.hex_color ?? T.indigo);
  const bgHex  = locked ? T.bg    : (badge.hex_bg    ?? T.panel);

  return (
    <div onClick={() => !locked && onClick(badge)}
      onMouseEnter={() => !locked && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 10px 14px',
        background: selected ? color + '0e' : hov ? T.cardH : T.card,
        border: `1px solid ${selected ? color + '55' : hov ? T.borderH : T.border}`,
        borderRadius: 14, cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.35 : 1,
        transition: 'all 0.15s', position: 'relative',
        transform: hov && !selected ? 'translateY(-2px)' : 'none' }}>

      {/* earned glow dot */}
      {badge.isEarned && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6,
          borderRadius: '50%', background: T.green,
          boxShadow: `0 0 6px ${T.green}` }} />
      )}

      {/* hex icon */}
      <div style={{ width: 52, height: 52, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Hex size={52} color={color} bg={bgHex} />
        <span style={{ fontSize: 20, position: 'relative', zIndex: 1, lineHeight: 1 }}>
          {badge.is_secret && !badge.isEarned ? '?' : badge.icon}
        </span>
      </div>

      {/* source label */}
      <span style={{ fontFamily: T.mono, fontSize: 8, color: T.faint,
        letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {badge.source}
      </span>

      {/* name */}
      <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 11,
        color: locked ? T.faint : T.mid, textAlign: 'center', lineHeight: 1.3 }}>
        {badge.is_secret && !badge.isEarned ? '???' : badge.name}
      </span>

      {/* progress bar */}
      <div style={{ width: '100%' }}>
        <ProgressBar pct={badge.progressPct} color={color} />
      </div>

      {/* progress label */}
      <span style={{ fontFamily: T.mono, fontSize: 9, color: badge.isEarned ? color : T.faint }}>
        {badge.isEarned ? '✓ complete' : `${badge.currentValue} / ${badge.totalValue}`}
      </span>
    </div>
  );
}

// ─── Detail panel (right side when badge selected) ───────────────────────────
function DetailPanel({ badge, userName, userInitials }) {
  if (!badge) return (
    <div style={{ flex: '0 0 240px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 0' }}>
      <p style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, letterSpacing: '0.08em' }}>
        select a badge
      </p>
    </div>
  );

  const color  = badge.hex_color ?? T.indigo;
  const bgHex  = badge.hex_bg    ?? T.panel;
  const tier   = TIER_CFG[badge.tier] ?? TIER_CFG.bronze;

  return (
    <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 0,
      animation: 'bd-in 0.2s ease both' }}>
      <style>{`@keyframes bd-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* card */}
      <div style={{ borderRadius: 18, border: `1px solid ${color}30`,
        background: T.card, overflow: 'hidden' }}>

        {/* top accent */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}00)` }} />

        <div style={{ padding: '32px 20px 24px', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 12 }}>

          {/* large hex */}
          <div style={{ position: 'relative', paddingTop: 44, marginBottom: 4, width: '100%',
            display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none',
              background: `radial-gradient(circle, ${color}18 0%, transparent 65%)` }} />
            <div style={{ width: 88, height: 88, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <Hex size={88} color={color} bg={bgHex} strokeWidth={1.6} />
              <span style={{ fontSize: 32, position: 'relative', zIndex: 1 }}>
                {badge.icon}
              </span>
            </div>
          </div>

          {/* user chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%',
              background: 'linear-gradient(135deg,#f472b6,#818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {userInitials}
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>{userName ?? 'You'}</span>
          </div>

          {/* name */}
          <h3 style={{ fontFamily: T.sans, fontWeight: 800, fontSize: 17, color: T.text,
            margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
            {badge.name}
          </h3>

          {/* tier pill */}
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700,
            padding: '3px 10px', borderRadius: 20,
            background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
            letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {badge.tier}
          </span>

          <div style={{ width: '100%', height: 1, background: T.border }} />

          {/* progress */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontFamily: T.mono, fontSize: 9, color: T.faint }}>
              <span>progress</span>
              <span style={{ color }}>{badge.currentValue} / {badge.totalValue}</span>
            </div>
            <ProgressBar pct={badge.progressPct} color={color} />
          </div>

          {/* description */}
          {badge.description && (
            <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted,
              textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
              {badge.description}
            </p>
          )}

          {/* earned date */}
          {badge.isEarned && badge.earnedAt && (
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint }}>
              earned {new Date(badge.earnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}

          {/* xp reward */}
          {(badge.xp_reward ?? 0) > 0 && (
            <span style={{ fontFamily: T.mono, fontSize: 9,
              padding: '2px 8px', borderRadius: 20,
              background: `${T.amber}10`, border: `1px solid ${T.amber}28`, color: T.amber }}>
              +{badge.xp_reward} XP
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BadgesTab({ userId, userName, userInitials }) {
  const [badges,   setBadges]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await loadBadgeProgress(userId);
    setBadges(data);
    setSelected(data.find(b => b.isEarned) ?? data[0] ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const filtered = badges.filter(b => {
    if (filter === 'earned') return b.isEarned;
    if (filter === 'locked') return !b.isEarned;
    return true;
  });

  const earnedCount = badges.filter(b => b.isEarned).length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <style>{`@keyframes bspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%',
        border: `2px solid ${T.border}`, borderTopColor: T.pink,
        animation: 'bspin 0.8s linear infinite' }} />
    </div>
  );

  if (!badges.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px',
      border: `1px dashed ${T.border}`, borderRadius: 20 }}>
      <span style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>🏅</span>
      <p style={{ fontFamily: T.mono, fontSize: 11, color: T.faint, margin: 0,
        letterSpacing: '0.06em' }}>no badges yet — start completing levels</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── left: grid + filters ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10 }}>
          {/* filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all',    label: 'show all' },
              { id: 'earned', label: 'earned'   },
              { id: 'locked', label: 'locked'   },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{ padding: '5px 12px', borderRadius: 20,
                  fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f.id ? T.purple : 'transparent',
                  color: filter === f.id ? '#fff' : T.faint,
                  border: `1px solid ${filter === f.id ? T.purple : T.border}` }}>
                {f.label}
              </button>
            ))}
          </div>

          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint }}>
            {earnedCount} / {badges.length} earned
          </span>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <p style={{ fontFamily: T.mono, fontSize: 11, color: T.faint, padding: '32px 0',
            textAlign: 'center' }}>nothing here yet</p>
        ) : (
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {filtered.map(badge => (
              <BadgeCard key={badge.id} badge={badge}
                selected={selected?.id === badge.id}
                onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* ── right: detail panel ───────────────────────────────────────────── */}
      <DetailPanel badge={selected} userName={userName} userInitials={userInitials} />
    </div>
  );
}
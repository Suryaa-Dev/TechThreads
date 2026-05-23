// src/features/profile/components/BadgeToast.jsx
// Shows a stacked toast notification when one or more badges are earned.
// Usage: <BadgeToast badges={newBadges} onDismiss={() => setNewBadges([])} />

import React, { useEffect } from 'react';

const TIER_ICON = { bronze: '🥉', silver: '🥈', gold: '🥇' };

function SingleToast({ badge, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#0d1117',
        border: `0.5px solid ${badge.hex_color ?? '#00d4ff'}55`,
        borderRadius: 14, padding: '12px 14px',
        minWidth: 280, maxWidth: 320,
        animation: 'slideIn .3s ease-out',
        cursor: 'pointer',
      }}
      onClick={onDismiss}
    >
      {/* Mini hex icon */}
      <div style={{ width: 44, height: 44, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 44 44" fill="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <polygon
            points="22,2 40,11 40,33 22,42 4,33 4,11"
            fill={badge.hex_bg ?? '#0d1a2a'}
            stroke={badge.hex_color ?? '#00d4ff'}
            strokeWidth={1.2}
          />
        </svg>
        <span style={{ fontSize: 16, position: 'relative', zIndex: 1 }}>{badge.icon}</span>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'var(--font-mono)', letterSpacing: '.08em', marginBottom: 2 }}>
          Badge unlocked!
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 }}>
          {badge.name}
        </div>
        <div style={{ fontSize: 10, color: badge.hex_color ?? '#00d4ff', fontFamily: 'var(--font-mono)' }}>
          +{badge.xp_reward ?? 0} XP · {badge.source} · {badge.tier}
        </div>
      </div>

      <span style={{ fontSize: 18 }}>{TIER_ICON[badge.tier] ?? '🏅'}</span>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function BadgeToast({ badges = [], onDismiss }) {
  if (!badges.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'auto',
    }}>
      {badges.map((badge, i) => (
        <SingleToast
          key={badge.id ?? i}
          badge={badge}
          onDismiss={() => onDismiss(badge.id ?? i)}
        />
      ))}
    </div>
  );
}
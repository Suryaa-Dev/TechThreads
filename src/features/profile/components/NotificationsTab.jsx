// src/features/profile/components/NotificationsTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Notification tab for the Profile page.
// Displays all notifications grouped by date, with:
//   - unread badge counts
//   - type-specific icons + messages
//   - actor avatar + name
//   - click-to-navigate to the relevant content
//   - mark all read button
//   - realtime new notification insertion
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import { supabase }     from '../../../services/supabaseClient';
import {
  getNotifications,
  markAllRead,
  markOneRead,
  subscribeToNotifications,
} from '../../../services/notificationService';
import { getInitials, avatarGradient } from '../../../services/userService';
import { timeAgo }      from '../../../utils/helpers';

// ── design tokens (same as Profile.jsx) ──────────────────────────────────────
const C = {
  bg:      '#0e0e0d',
  card:    '#161615',
  cardL:   '#1a1918',
  border:  '#252523',
  borderH: '#343430',
  text:    '#f0f4ff',
  mid:     '#d0d8ee',
  muted:   '#8b95ae',
  faint:   '#6b7a99',
  fainter: '#4a5878',
  pink:    '#f472b6',
  indigo:  '#818cf8',
  cyan:    '#38bdf8',
  green:   '#34d399',
  amber:   '#f5a623',
};

// ── notification type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  follow: {
    icon: '👤',
    accent: C.indigo,
    label: (n) => `${actorName(n)} followed you`,
    path: (n) => `/user/id/${n.actor_id}`,
  },
  post_like: {
    icon: '❤️',
    accent: C.pink,
    label: (n) => `${actorName(n)} liked your post`,
    path: (n) => n.entity_type === 'project'
      ? `/post/project/${n.entity_id}`
      : `/post/code/${n.entity_id}`,
  },
  comment: {
    icon: '💬',
    accent: C.cyan,
    label: (n) => `${actorName(n)} commented on your post`,
    path: (n) => n.entity_type === 'project'
      ? `/post/project/${n.entity_id}`
      : `/post/code/${n.entity_id}`,
  },
  comment_like: {
    icon: '⭐',
    accent: C.amber,
    label: (n) => `${actorName(n)} liked your comment`,
    path: () => null,
  },
  accepted_solution: {
    icon: '✅',
    accent: C.green,
    label: () => 'Your comment was marked as an accepted solution',
    path: () => null,
  },
  community_post: {
    icon: '📢',
    accent: '#a78bfa',
    label: (n) => `New post in a community you joined`,
    path: (n) => `/community/${n.entity_id}`,
  },
};

function actorName(n) {
  return n.actor?.full_name || n.actor?.username || 'Someone';
}

function getConfig(type) {
  return TYPE_CONFIG[type] || {
    icon: '🔔',
    accent: C.faint,
    label: () => 'You have a new notification',
    path: () => null,
  };
}

// ── date grouping ─────────────────────────────────────────────────────────────
function groupByDate(notifications) {
  const groups = {};
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest   = today - 86400000;
  const week   = today - 7 * 86400000;

  notifications.forEach(n => {
    const d = new Date(n.created_at).getTime();
    let label;
    if (d >= today)    label = 'Today';
    else if (d >= yest) label = 'Yesterday';
    else if (d >= week) label = 'This week';
    else                label = 'Earlier';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  // ordered sections
  const ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'];
  return ORDER.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }));
}

// ── NotificationRow ───────────────────────────────────────────────────────────
function NotificationRow({ notification: n, onRead, onNavigate }) {
  const cfg    = getConfig(n.type);
  const name   = actorName(n);
  const avatar = n.actor?.avatar_url ?? null;
  const grad   = avatarGradient(n.actor_id ?? '');
  const ini    = getInitials(name);
  const path   = cfg.path(n);

  const handleClick = () => {
    if (!n.is_read) onRead(n.id);
    if (path) onNavigate(path);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display:     'flex',
        alignItems:  'flex-start',
        gap:         12,
        padding:     '12px 16px',
        borderRadius: 12,
        cursor:      path ? 'pointer' : 'default',
        background:  n.is_read ? 'transparent' : `${cfg.accent}08`,
        border:      `1px solid ${n.is_read ? 'transparent' : `${cfg.accent}20`}`,
        transition:  'all .15s',
        position:    'relative',
      }}
      onMouseEnter={e => {
        if (path) {
          e.currentTarget.style.background = n.is_read ? 'rgba(255,255,255,.025)' : `${cfg.accent}12`;
          e.currentTarget.style.borderColor = n.is_read ? C.border : `${cfg.accent}35`;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = n.is_read ? 'transparent' : `${cfg.accent}08`;
        e.currentTarget.style.borderColor = n.is_read ? 'transparent' : `${cfg.accent}20`;
      }}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <div style={{
          position:    'absolute',
          top:         14,
          right:       14,
          width:       7,
          height:      7,
          borderRadius:'50%',
          background:  cfg.accent,
          boxShadow:   `0 0 6px ${cfg.accent}`,
          flexShrink:  0,
        }} />
      )}

      {/* Actor avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatar ? (
          <img src={avatar} alt="" style={{
            width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
            border: `2px solid ${cfg.accent}40`,
          }} />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#fff',
            border: `2px solid ${cfg.accent}40`,
          }}>{ini}</div>
        )}
        {/* Type icon badge */}
        <div style={{
          position:    'absolute',
          bottom:      -3,
          right:       -3,
          width:       18,
          height:      18,
          borderRadius:'50%',
          background:  C.card,
          border:      `1.5px solid ${C.border}`,
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          fontSize:    9,
        }}>
          {cfg.icon}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Syne',sans-serif",
          fontSize:   13,
          fontWeight: n.is_read ? 400 : 600,
          color:      n.is_read ? C.muted : C.text,
          margin:     '0 0 3px',
          lineHeight: 1.45,
          paddingRight: 16,
        }}>
          {cfg.label(n)}
        </p>
        <p style={{
          fontFamily: "'Space Mono',monospace",
          fontSize:   10,
          color:      C.fainter,
          margin:     0,
        }}>
          {timeAgo(n.created_at)}
        </p>
      </div>
    </div>
  );
}

// ── NotificationsTab ──────────────────────────────────────────────────────────

const NotificationsTab = ({ userId, onOpen }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [marking,       setMarking]       = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getNotifications(userId, 60);
    setNotifications(data);
    setLoading(false);
    // Tell parent to clear its unread badge since user is now viewing
    onOpen?.();
  }, [userId, onOpen]);

  useEffect(() => { load(); }, [load]);

  // ── realtime: prepend new notifications as they arrive ───────────────────
  useEffect(() => {
    if (!userId) return;
    const channel = subscribeToNotifications(userId, async (newNotif) => {
      // Fetch actor profile for the new notification
      const { data: actor } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .eq('id', newNotif.actor_id)
        .maybeSingle();
      setNotifications(prev => [{ ...newNotif, actor }, ...prev]);
    });
    return () => supabase.removeChannel(channel);
  }, [userId]);

  // ── mark all read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (!userId || marking || unreadCount === 0) return;
    setMarking(true);
    await markAllRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarking(false);
  };

  // ── mark one read ─────────────────────────────────────────────────────────
  const handleReadOne = async (id) => {
    await markOneRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const groups = groupByDate(notifications);

  // ── loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            height: 66,
            borderRadius: 12,
            background: C.card,
            border: `1px solid ${C.border}`,
            animation: 'ntf-pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.07}s`,
          }} />
        ))}
        <style>{`@keyframes ntf-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  // ── empty state ───────────────────────────────────────────────────────────
  if (notifications.length === 0) {
    return (
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        paddingTop:    64,
        paddingBottom: 64,
        gap:           14,
      }}>
        <div style={{
          width:          56,
          height:         56,
          borderRadius:   '50%',
          background:     'rgba(129,140,248,.07)',
          border:         '1px solid rgba(129,140,248,.15)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       24,
        }}>🔔</div>
        <p style={{
          fontFamily: "'Syne',sans-serif",
          fontSize:   14,
          fontWeight: 600,
          color:      C.text,
          margin:     0,
        }}>
          No notifications yet
        </p>
        <p style={{
          fontFamily: "'Space Mono',monospace",
          fontSize:   11,
          color:      C.fainter,
          margin:     0,
          textAlign:  'center',
          maxWidth:   260,
          lineHeight: 1.6,
        }}>
          When someone follows you, likes your post, or comments, it'll show up here.
        </p>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes ntf-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header row: unread count + mark all read */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{
            fontFamily: "'Syne',sans-serif",
            fontSize:   14,
            fontWeight: 700,
            color:      C.text,
            margin:     0,
          }}>
            Notifications
          </p>
          {unreadCount > 0 && (
            <span style={{
              fontFamily:   "'Space Mono',monospace",
              fontSize:     10,
              fontWeight:   700,
              padding:      '2px 8px',
              borderRadius: 20,
              background:   `${C.pink}15`,
              border:       `1px solid ${C.pink}40`,
              color:        C.pink,
            }}>
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={marking}
            style={{
              fontFamily:   "'Space Mono',monospace",
              fontSize:     10,
              color:        marking ? C.fainter : C.faint,
              background:   'none',
              border:       'none',
              cursor:       marking ? 'not-allowed' : 'pointer',
              padding:      '4px 8px',
              borderRadius: 7,
              transition:   'color .15s',
            }}
            onMouseEnter={e => { if (!marking) e.currentTarget.style.color = C.cyan; }}
            onMouseLeave={e => { e.currentTarget.style.color = marking ? C.fainter : C.faint; }}
          >
            {marking ? 'marking…' : 'mark all read'}
          </button>
        )}
      </div>

      {/* Grouped notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.map(group => (
          <div key={group.label}>
            {/* Date group header */}
            <div style={{
              display:     'flex',
              alignItems:  'center',
              gap:         10,
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily:    "'Space Mono',monospace",
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color:         C.fainter,
                flexShrink:    0,
              }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Notifications in this group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.items.map(n => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={handleReadOne}
                  onNavigate={path => navigate(path)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        fontFamily: "'Space Mono',monospace",
        fontSize:   9,
        color:      C.fainter,
        textAlign:  'center',
        margin:     '24px 0 0',
        letterSpacing: '.04em',
      }}>
        // showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
      </p>
    </>
  );
};

export default NotificationsTab;
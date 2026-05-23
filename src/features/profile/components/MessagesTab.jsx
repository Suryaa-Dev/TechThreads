// src/features/profile/components/MessagesTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown on Profile.jsx (own profile) as the Messages tab.
// Displays all incoming conversations grouped by unread/read.
// Clicking a thread expands it inline with full message history + reply.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { FiSend, FiInbox, FiMapPin, FiWifi, FiChevronDown, FiChevronUp } from 'react-icons/fi';

import { useAuth }               from '../../../context/AuthContext';
import { getInitials, avatarGradient } from '../../../services/userService';
import {
  getDeveloperConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
} from '../../../services/messageService';
import { supabase } from '../../../services/supabaseClient';
import { timeAgo }  from '../../../utils/helpers';

// ── design tokens ─────────────────────────────────────────────────────────────
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

const MAX_CHARS = 250;

// ── helpers ───────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 38 }) {
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${C.border}` }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: avatarGradient(profile?.id || ''),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Mono',monospace", fontSize: size * 0.3, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {getInitials(profile?.full_name || profile?.username || '?')}
      </div>;
}

function IntroBanner({ conv }) {
  return (
    <div style={{ background: `${C.indigo}08`, border: `1px solid ${C.indigo}20`, borderRadius: 10,
      padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.indigo, margin: 0,
        letterSpacing: '.1em', textTransform: 'uppercase' }}>// opportunity</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
        {[
          ['Role',     conv.role_title],
          ['Company',  conv.company],
          ['Location', conv.is_remote ? 'Remote' : (conv.location || '—')],
          ['Salary',   conv.salary || '—'],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.fainter }}>{k} </span>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, color: C.mid }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg, isMe }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
      <div style={{
        maxWidth: '82%',
        background:   isMe ? `${C.pink}14`    : '#1a1c28',
        border:       isMe ? `1px solid ${C.pink}30` : `1px solid ${C.border}`,
        borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        padding: '8px 12px',
      }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.text, margin: '0 0 3px',
          lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.content}
        </p>
        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter, margin: 0,
          textAlign: isMe ? 'right' : 'left' }}>
          {timeAgo(msg.created_at)}
          {isMe && <span style={{ marginLeft: 5, color: msg.is_read ? C.cyan : C.fainter }}>
            {msg.is_read ? '✓✓' : '✓'}
          </span>}
        </p>
      </div>
    </div>
  );
}

// ── ThreadPanel ───────────────────────────────────────────────────────────────

function ThreadPanel({ conv, me }) {
  const [messages, setMessages] = useState(null);
  const [reply,    setReply]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);
  const replyRef  = useRef(null);

  useEffect(() => {
    let mounted = true;
    getMessages(conv.id).then(msgs => {
      if (mounted) setMessages(msgs);
    });
    markConversationRead(conv.id, me.id);
    const ch = subscribeToMessages(conv.id, (newMsg) => {
      setMessages(prev => prev ? (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]) : [newMsg]);
      if (newMsg.sender_id !== me.id) markConversationRead(conv.id, me.id);
    });
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [conv.id, me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  const handleSend = async () => {
    const t = reply.trim();
    if (!t || sending) return;
    setSending(true);
    const { error } = await sendMessage(conv.id, me.id, t);
    if (!error) {
      setReply('');
      if (replyRef.current) replyRef.current.style.height = 'auto';
    }
    setSending(false);
  };

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: '#0d0d0c' }}>
      <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
        <IntroBanner conv={conv} />
        {messages === null ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.border}`,
              borderTopColor: C.pink, animation: 'mt-spin .7s linear infinite', display: 'inline-block' }} />
          </div>
        ) : messages.map(msg => (
          <Bubble key={msg.id} msg={msg} isMe={msg.sender_id === me.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* reply */}
      <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea ref={replyRef} value={reply}
            onChange={e => {
              setReply(e.target.value.slice(0, MAX_CHARS));
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Reply… (⌘↵ to send)"
            rows={1}
            style={{ flex: 1, background: '#111110', border: `1px solid ${C.border}`, borderRadius: 9,
              color: C.text, fontFamily: "'Syne',sans-serif", fontSize: 13, padding: '7px 11px',
              outline: 'none', resize: 'none', overflow: 'hidden', lineHeight: 1.5,
              caretColor: C.pink, transition: 'border-color .15s' }}
            onFocus={e => (e.target.style.borderColor = `${C.pink}50`)}
            onBlur={e  => (e.target.style.borderColor = C.border)}
          />
          <button onClick={handleSend} disabled={!reply.trim() || sending}
            style={{ padding: '7px 13px', borderRadius: 9, cursor: !reply.trim() ? 'not-allowed' : 'pointer',
              border: `1px solid ${!reply.trim() ? C.border : `${C.pink}45`}`,
              background: !reply.trim() ? 'transparent' : `${C.pink}10`,
              color: !reply.trim() ? C.fainter : C.pink,
              fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s', flexShrink: 0 }}>
            <FiSend size={11} />
          </button>
        </div>
        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: reply.length >= MAX_CHARS ? C.pink : C.fainter,
          margin: '4px 0 0', textAlign: 'right' }}>
          {reply.length}/{MAX_CHARS}
        </p>
      </div>
    </div>
  );
}

// ── ConversationRow ───────────────────────────────────────────────────────────

function ConversationRow({ conv, me, unreadIds, onRead }) {
  const [open, setOpen] = useState(false);
  const hasUnread = unreadIds.has(conv.id);
  const recruiter = conv.recruiter;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && hasUnread) {
      markConversationRead(conv.id, me.id);
      onRead(conv.id);
    }
  };

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${hasUnread ? `${C.pink}35` : C.border}`,
      background: hasUnread ? `${C.pink}06` : C.card, overflow: 'hidden',
      transition: 'border-color .2s, background .2s' }}>

      {/* row header */}
      <div onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          cursor: 'pointer', transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.025)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar profile={recruiter} size={40} />
          {hasUnread && (
            <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10,
              borderRadius: '50%', background: C.pink, border: `2px solid ${C.bg}` }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: hasUnread ? 700 : 500,
              color: hasUnread ? C.text : C.mid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {recruiter?.full_name || recruiter?.username || 'Recruiter'}
            </span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter, flexShrink: 0 }}>
              {timeAgo(conv.last_message_at)}
            </span>
          </div>

          {/* opportunity summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {conv.role_title && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10,
                padding: '1px 7px', borderRadius: 20,
                background: `${C.pink}10`, border: `1px solid ${C.pink}28`, color: C.pink }}>
                {conv.role_title}
              </span>
            )}
            {conv.company && (
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, color: C.faint }}>
                @ {conv.company}
              </span>
            )}
            {conv.salary && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.green }}>
                {conv.salary}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono',monospace",
              fontSize: 9, color: C.fainter }}>
              {conv.is_remote ? <FiWifi size={9} /> : <FiMapPin size={9} />}
              {conv.is_remote ? 'Remote' : conv.location}
            </span>
          </div>
        </div>

        <div style={{ color: C.fainter, flexShrink: 0 }}>
          {open ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
        </div>
      </div>

      {/* expanded thread */}
      {open && <ThreadPanel conv={conv} me={me} />}
    </div>
  );
}

// ── MessagesTab ───────────────────────────────────────────────────────────────

const MessagesTab = ({ userId }) => {
  const { user: me } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [unreadIds,     setUnreadIds]     = useState(new Set());

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const convs = await getDeveloperConversations(userId);
      if (!mounted) return;
      setConversations(convs);

      // determine which conversations have unread messages
      const ids = new Set();
      await Promise.all(convs.map(async (c) => {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('is_read', false)
          .neq('sender_id', userId);
        if ((count ?? 0) > 0) ids.add(c.id);
      }));
      if (mounted) setUnreadIds(ids);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [userId]);

  const handleRead = (convId) => {
    setUnreadIds(prev => { const n = new Set(prev); n.delete(convId); return n; });
  };

  const unread  = conversations.filter(c => unreadIds.has(c.id));
  const read    = conversations.filter(c => !unreadIds.has(c.id));

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 74, borderRadius: 14, background: C.card,
            border: `1px solid ${C.border}`, animation: 'mt-pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s` }} />
        ))}
        <style>{`@keyframes mt-pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes mt-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── empty ─────────────────────────────────────────────────────────────────
  if (conversations.length === 0) {
    return (
      <>
        <style>{`@keyframes mt-pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes mt-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', paddingTop: 64, paddingBottom: 64, gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(244,114,182,.06)', border: '1px solid rgba(244,114,182,.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            <FiInbox size={22} style={{ color: 'rgba(244,114,182,.35)' }} />
          </div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
            No messages yet
          </p>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: C.fainter,
            margin: 0, textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
            When recruiters reach out through your profile, their messages will appear here.
          </p>
        </div>
      </>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes mt-pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes mt-spin{to{transform:rotate(360deg)}}`}</style>

      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
            Messages
          </p>
          {unread.length > 0 && (
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 20, background: `${C.pink}15`,
              border: `1px solid ${C.pink}40`, color: C.pink }}>
              {unread.length} new
            </span>
          )}
        </div>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter }}>
          {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* unread first */}
        {unread.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '.1em', textTransform: 'uppercase', color: C.fainter }}>New</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            {unread.map(c => (
              <ConversationRow key={c.id} conv={c} me={me} unreadIds={unreadIds} onRead={handleRead} />
            ))}
          </>
        )}

        {/* read */}
        {read.length > 0 && (
          <>
            {unread.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase', color: C.fainter }}>Earlier</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            )}
            {read.map(c => (
              <ConversationRow key={c.id} conv={c} me={me} unreadIds={unreadIds} onRead={handleRead} />
            ))}
          </>
        )}
      </div>

      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter,
        textAlign: 'center', margin: '24px 0 0', letterSpacing: '.04em' }}>
        // showing all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
      </p>
    </>
  );
};

export default MessagesTab;
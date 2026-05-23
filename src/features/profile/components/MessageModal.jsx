// src/features/profile/components/MessageModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Opens from UserProfile.jsx when clicking the Message button.
//
// FIRST MESSAGE → structured intake form:
//   Role Title | Company | Remote toggle or Location | Salary | Note (≤ 250)
//
// RETURNING CONVERSATION → normal chat thread with reply input
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { FiX, FiSend, FiMapPin, FiWifi }      from 'react-icons/fi';
import { MdWorkOutline }                       from 'react-icons/md';

import { useAuth }                  from '../../../context/AuthContext';
import { getInitials, avatarGradient } from '../../../services/userService';
import {
  getExistingConversation,
  startConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
} from '../../../services/messageService';
import { supabase } from '../../../services/supabaseClient';
import { timeAgo }  from '../../../utils/helpers';

// ── design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#111318',
  card:    '#161615',
  input:   '#0f0f0e',
  border:  '#1e2235',
  borderH: '#2d3452',
  text:    '#f0f4ff',
  mid:     '#d0d8ee',
  muted:   '#8b95ae',
  faint:   '#6b7a99',
  fainter: '#3d4560',
  pink:    '#f472b6',
  indigo:  '#818cf8',
  cyan:    '#38bdf8',
  green:   '#34d399',
};

const MAX_CHARS = 250;

// ── small shared components ───────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase', color: C.faint }}>
        {label}{required && <span style={{ color: C.pink }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: C.input,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  fontFamily: "'Syne',sans-serif",
  fontSize: 13,
  padding: '9px 13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  caretColor: C.pink,
  transition: 'border-color .15s',
};

function TextInput({ value, onChange, placeholder, ...rest }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle}
      onFocus={e => (e.target.style.borderColor = `${C.pink}60`)}
      onBlur={e  => (e.target.style.borderColor = C.border)}
      {...rest}
    />
  );
}

// ── avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ profile, size = 36 }) {
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: avatarGradient(profile?.id || ''),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Mono',monospace", fontSize: size * 0.3, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {getInitials(profile?.full_name || profile?.username || '')}
      </div>;
}

// ── structured intro banner (shown at top of thread once sent) ────────────────

function IntroBanner({ conv }) {
  return (
    <div style={{ background: `${C.indigo}08`, border: `1px solid ${C.indigo}25`, borderRadius: 12,
      padding: '12px 14px', margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.indigo, margin: 0,
        letterSpacing: '.1em', textTransform: 'uppercase' }}>// opportunity details</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {[
          ['Role',     conv.role_title],
          ['Company',  conv.company],
          ['Location', conv.is_remote ? 'Remote' : (conv.location || '—')],
          ['Salary',   conv.salary || '—'],
        ].map(([k, v]) => v && (
          <div key={k}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.fainter }}>{k} </span>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, color: C.mid }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── message bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg, isMe }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '80%',
        background:   isMe ? `${C.pink}18`    : '#1a1c28',
        border:       isMe ? `1px solid ${C.pink}35` : `1px solid ${C.border}`,
        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding: '9px 13px',
      }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.text, margin: '0 0 4px',
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

// ── MessageModal ──────────────────────────────────────────────────────────────

const MessageModal = ({ developer, onClose }) => {
  const { user: me, profile: myProfile } = useAuth();

  // conversation state
  const [conv,     setConv]     = useState(null);   // null = not yet loaded
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);  // first-message success flash

  // first-message form
  const [roleTitle, setRoleTitle] = useState('');
  const [company,   setCompany]   = useState('');
  const [isRemote,  setIsRemote]  = useState(true);
  const [location,  setLocation]  = useState('');
  const [salary,    setSalary]    = useState('');
  const [note,      setNote]      = useState('');

  // reply input (ongoing thread)
  const [reply, setReply] = useState('');

  const bottomRef = useRef(null);
  const replyRef  = useRef(null);

  // ── load existing conversation if any ──────────────────────────────────────
  useEffect(() => {
    if (!me?.id || !developer?.id) return;
    let mounted = true;
    const init = async () => {
      setLoading(true);
      const existing = await getExistingConversation(me.id, developer.id);
      if (!mounted) return;
      if (existing) {
        setConv(existing);
        const msgs = await getMessages(existing.id);
        if (mounted) setMessages(msgs);
        await markConversationRead(existing.id, me.id);
      }
      setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, [me?.id, developer?.id]);

  // ── realtime subscription once conversation exists ────────────────────────
  useEffect(() => {
    if (!conv?.id) return;
    const ch = subscribeToMessages(conv.id, (newMsg) => {
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      if (newMsg.sender_id !== me?.id) markConversationRead(conv.id, me.id);
    });
    return () => supabase.removeChannel(ch);
  }, [conv?.id, me?.id]);

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── send first message ────────────────────────────────────────────────────
  const handleSendFirst = async () => {
    if (!roleTitle.trim() || !company.trim() || !note.trim()) return;
    if (!me?.id || !developer?.id) return;
    setSending(true);
    const { conversation, error } = await startConversation(me.id, developer.id, {
      roleTitle, company, isRemote, location, salary, note,
    });
    if (!error && conversation) {
      setConv(conversation);
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
    setSending(false);
  };

  // ── send reply ────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    const trimmed = reply.trim();
    if (!trimmed || !conv?.id || !me?.id || sending) return;
    setSending(true);
    const { error } = await sendMessage(conv.id, me.id, trimmed);
    if (!error) {
      setReply('');
      if (replyRef.current) replyRef.current.style.height = 'auto';
    }
    setSending(false);
  };

  const handleReplyKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSendReply(); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  const isFirstTime = !loading && !conv;
  const isThread    = !loading &&  conv;

  return (
    <>
      <style>{`@keyframes mm-spin{to{transform:rotate(360deg)}} @keyframes mm-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* backdrop */}
      <div onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

        <div style={{ width: '100%', maxWidth: 500, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)', animation: 'mm-in .22s ease',
          display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

          {/* rainbow bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#00e676)', flexShrink: 0 }} />

          {/* header */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Avatar profile={developer} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {developer?.full_name || developer?.username || 'Developer'}
              </p>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.faint, margin: '2px 0 0' }}>
                {isThread ? 'Conversation' : 'Send opportunity'}
              </p>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.05)',
                border: `1px solid ${C.border}`, color: C.faint, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,76,106,.1)'; e.currentTarget.style.color = '#ff4c6a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = C.faint; }}>
              <FiX size={13} />
            </button>
          </div>

          {/* body */}
          {loading ? (
            <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`,
                borderTopColor: C.pink, animation: 'mm-spin .7s linear infinite', display: 'inline-block' }} />
            </div>

          ) : isFirstTime ? (
            /* ── FIRST MESSAGE FORM ── */
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter, margin: 0,
                  letterSpacing: '.06em', lineHeight: 1.7 }}>
                  First messages must include the opportunity details below.<br/>
                  Keep your note specific — generic messages get ignored.
                </p>

                <Field label="Role Title" required>
                  <TextInput value={roleTitle} onChange={setRoleTitle} placeholder="Senior React Developer" />
                </Field>

                <Field label="Company" required>
                  <TextInput value={company} onChange={setCompany} placeholder="Anthropic" />
                </Field>

                {/* Remote toggle */}
                <Field label="Work Type" required>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { val: true,  label: 'Remote',   icon: <FiWifi size={12} /> },
                      { val: false, label: 'On-site',  icon: <FiMapPin size={12} /> },
                    ].map(opt => (
                      <button key={String(opt.val)} onClick={() => setIsRemote(opt.val)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 7, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${isRemote === opt.val ? `${C.cyan}55` : C.border}`,
                          background: isRemote === opt.val ? `${C.cyan}10` : 'transparent',
                          color: isRemote === opt.val ? C.cyan : C.faint,
                          fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600,
                          transition: 'all .15s' }}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                  {!isRemote && (
                    <TextInput value={location} onChange={setLocation}
                      placeholder="San Francisco, CA" style={{ marginTop: 8 }} />
                  )}
                </Field>

                <Field label="Salary / Compensation" >
                  <TextInput value={salary} onChange={setSalary} placeholder="$120k – $150k / year" />
                </Field>

                <Field label={`Your Message (${note.length}/${MAX_CHARS})`} required>
                  <textarea value={note}
                    onChange={e => setNote(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Tell them specifically why you're reaching out and what makes this role a fit for their skills."
                    rows={4}
                    style={{ ...inputStyle, resize: 'none', lineHeight: 1.6,
                      borderColor: note.length >= MAX_CHARS * 0.9
                        ? (note.length >= MAX_CHARS ? C.pink : '#f5a623') : C.border }}
                    onFocus={e => (e.target.style.borderColor = `${C.pink}60`)}
                    onBlur={e  => (e.target.style.borderColor = C.border)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9,
                      color: note.length >= MAX_CHARS ? C.pink : C.fainter }}>
                      {MAX_CHARS - note.length} remaining
                    </span>
                  </div>
                </Field>

                <button onClick={handleSendFirst}
                  disabled={sending || !roleTitle.trim() || !company.trim() || !note.trim()}
                  style={{ padding: '12px 20px', borderRadius: 12, cursor: sending || !roleTitle.trim() || !company.trim() || !note.trim() ? 'not-allowed' : 'pointer',
                    border: `1px solid ${C.pink}45`,
                    background: !roleTitle.trim() || !company.trim() || !note.trim() ? 'rgba(255,255,255,.03)' : `${C.pink}14`,
                    color: !roleTitle.trim() || !company.trim() || !note.trim() ? C.fainter : C.pink,
                    fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all .15s' }}
                  onMouseEnter={e => { if (roleTitle.trim() && company.trim() && note.trim()) e.currentTarget.style.background = `${C.pink}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = !roleTitle.trim() || !company.trim() || !note.trim() ? 'rgba(255,255,255,.03)' : `${C.pink}14`; }}>
                  {sending
                    ? <><span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.fainter}`, borderTopColor: C.pink, animation: 'mm-spin .7s linear infinite', display: 'inline-block' }} /> Sending…</>
                    : sent
                    ? '✓ Sent!'
                    : <><FiSend size={14} /> Send Opportunity</>
                  }
                </button>
              </div>
            </div>

          ) : (
            /* ── ONGOING THREAD ── */
            <>
              <div style={{ overflowY: 'auto', flex: 1, padding: '4px 16px' }}>
                <IntroBanner conv={conv} />
                {messages.map(msg => (
                  <Bubble key={msg.id} msg={msg} isMe={msg.sender_id === me?.id} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* reply composer */}
              <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <Avatar profile={myProfile} size={28} />
                  <div style={{ flex: 1 }}>
                    <textarea ref={replyRef} value={reply}
                      onChange={e => {
                        setReply(e.target.value.slice(0, MAX_CHARS));
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                      }}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Reply… (⌘↵ to send)"
                      rows={1}
                      style={{ ...inputStyle, resize: 'none', overflow: 'hidden', lineHeight: 1.55 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: reply.length >= MAX_CHARS ? C.pink : C.fainter }}>
                        {reply.length}/{MAX_CHARS}
                      </span>
                      <button onClick={handleSendReply} disabled={!reply.trim() || sending}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8,
                          border: `1px solid ${!reply.trim() ? C.border : `${C.pink}50`}`,
                          background: !reply.trim() ? 'transparent' : `${C.pink}12`,
                          color: !reply.trim() ? C.fainter : C.pink,
                          fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700,
                          cursor: !reply.trim() ? 'not-allowed' : 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => { if (reply.trim()) e.currentTarget.style.background = `${C.pink}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = !reply.trim() ? 'transparent' : `${C.pink}12`; }}>
                        {sending
                          ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${C.fainter}`, borderTopColor: C.pink, animation: 'mm-spin .7s linear infinite', display: 'inline-block' }} />
                          : <FiSend size={11} />
                        }
                        {sending ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageModal;
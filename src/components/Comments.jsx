// src/components/Comments.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   REPLACED: supabase.auth.getUser()               → useAuth() from AuthContext
//   REPLACED: inline feed_comments query             → getFeedComments() from postService
//   REPLACED: inline feed_comments insert            → createFeedComment() from postService
//   REPLACED: inline feed_comments delete            → deleteFeedComment() from postService
//   REPLACED: inline feed_comment_likes logic        → toggleCommentLike() from likeService
//   REPLACED: inline author_name / author_avatar     → profile resolved via userService
//   REMOVED:  author_name, author_avatar from insert (new schema has no these columns)
//   KEPT: ALL UI — drawer layout, split panel, reply threading, realtime subscription
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { FaRegHeart, FaHeart, FaRegComment } from 'react-icons/fa';
import { FiX, FiSend, FiCornerDownRight } from 'react-icons/fi';

import { useAuth }                                         from '../context/AuthContext';
import { getProfile, displayName, displayAvatar,
         getInitials, avatarGradient }                    from '../services/userService';
import { getFeedComments, createFeedComment,
         deleteFeedComment }                              from '../services/postService';
import { toggleCommentLike, getLikedComments }            from '../services/likeService';

// ─── tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0e0e0d',
  card:    '#161615',
  input:   '#0f0f0e',
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
};

const DRAWER_PX = 480;
const MAX_CHARS = 500;

// ─── helpers (delegated to userService) ──────────────────────────────────────
function formatAge(raw) {
  if (!raw) return 'just now';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return 'just now';
  const d = Math.floor((Date.now() - date) / 1000);
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
function drawerWidth() { return Math.min(DRAWER_PX, window.innerWidth * 0.44); }

// ─── CommentItem ─────────────────────────────────────────────────────────────
function CommentItem({ comment, myLikes, currentUserId, onLike, onDelete, onReply, profileMap }) {
  const [hov, setHov] = useState(false);

  const authorProfile = profileMap?.[comment.user_id] ?? null;
  const name   = displayName(authorProfile) || 'Anonymous';
  const avatar = displayAvatar(authorProfile);
  const grad   = avatarGradient(comment.user_id ?? '');
  const ini    = getInitials(name);

  const liked = myLikes.has(comment.id);
  const isOwn = comment.user_id === currentUserId;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', gap: 10, padding: '10px 0',
        borderBottom: `1px solid ${C.border}`,
        position: 'relative',
      }}
    >
      {/* avatar */}
      <div style={{ flexShrink: 0 }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, color: '#fff' }}>{ini}</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{name}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.fainter }}>{formatAge(comment.created_at)}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.mid, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {comment.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => onLike(comment.id, !liked)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? C.pink : C.fainter, transition: 'color .15s', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>
            {liked ? <FaHeart size={11} /> : <FaRegHeart size={11} />}
            <span>{comment.likes || 0}</span>
          </button>
          <button onClick={() => onReply(comment)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.fainter, transition: 'color .15s', fontFamily: "'Space Mono',monospace", fontSize: 11 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.indigo)}
            onMouseLeave={e => (e.currentTarget.style.color = C.fainter)}>
            <FiCornerDownRight size={11} /><span>reply</span>
          </button>
          {isOwn && hov && (
            <button onClick={() => onDelete(comment.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ff4c6a55', transition: 'color .15s', fontFamily: "'Space Mono',monospace", fontSize: 10, marginLeft: 'auto' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff4c6a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#ff4c6a55')}>
              <FiX size={10} /> delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────────
function Comments({ postId, postType = 'code', post, onClose }) {
  const strPostId = String(postId);

  // ── auth from context ─────────────────────────────────────────────────────
  const { user: currentUser, profile: currentProfile } = useAuth();

  const [comments,    setComments]    = useState([]);
  const [myLikes,     setMyLikes]     = useState(new Set());
  const [text,        setText]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [replyTo,     setReplyTo]     = useState(null);
  const [profileMap,  setProfileMap]  = useState({});

  // responsive sizing
  const [drawerW, setDrawerW] = useState(drawerWidth());

  const textareaRef = useRef(null);
  const listEndRef  = useRef(null);
  const handleClose = useCallback(() => onClose?.(), [onClose]);

  // ── load profile map for comment authors ─────────────────────────────────
  const enrichProfiles = useCallback(async (commentList) => {
    const uids = [...new Set([
      ...(commentList || []).map(c => c.user_id),
      currentUser?.id,
    ].filter(Boolean))];
    const missing = uids.filter(id => !profileMap[id]);
    if (!missing.length) return;
    // Use getProfile in parallel (cached after first fetch)
    const results = await Promise.all(missing.map(id => getProfile(id)));
    const additions = {};
    results.forEach((p, i) => { if (p) additions[missing[i]] = p; });
    setProfileMap(prev => ({ ...prev, ...additions }));
  }, [currentUser?.id, profileMap]);

  // ── load comments using postService ──────────────────────────────────────
  const loadComments = useCallback(async () => {
    const data = await getFeedComments(strPostId, postType);
    setComments(data);
    await enrichProfiles(data);
  }, [strPostId, postType, enrichProfiles]);

  // ── load liked comment ids using likeService ──────────────────────────────
  useEffect(() => {
    if (!currentUser || !comments.length) return;
    getLikedComments(currentUser.id, comments.map(c => c.id))
      .then(set => setMyLikes(set));
  }, [currentUser, comments.length]);

  // ── realtime subscription (unchanged) ────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`feed_cmt_${strPostId}_${postType}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${strPostId}` },
        (p) => setComments(prev => prev.some(c => c.id === p.new.id) ? prev : [...prev, p.new])
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${strPostId}` },
        (p) => setComments(prev => prev.filter(c => c.id !== p.old.id))
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${strPostId}` },
        (p) => setComments(prev => prev.map(c => c.id === p.new.id ? p.new : c))
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [strPostId, postType]);

  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => { listEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments.length]);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && handleClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleClose]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const onResize = () => {
      setDrawerW(drawerWidth());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── submit comment using postService ─────────────────────────────────────
  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting || !currentUser) return;
    setSubmitting(true);

    // Prepend @reply prefix if replying
    const replyName = replyTo ? (displayName(profileMap[replyTo.userId]) || 'User') : null;
    const content   = replyTo ? `@${replyName} ${trimmed}` : trimmed;

    const { error } = await createFeedComment(strPostId, postType, currentUser.id, content);
    if (!error) {
      setText('');
      setReplyTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
    setSubmitting(false);
  }, [text, submitting, currentUser, strPostId, postType, replyTo, profileMap]);

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
  };
  const handleTextChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── like comment using likeService ────────────────────────────────────────
  const handleLike = useCallback(async (commentId, wantLiked) => {
    if (!currentUser) return;
    const cur = comments.find(c => c.id === commentId);
    const currentlyLiked = myLikes.has(commentId);
    const currentCount   = cur?.likes ?? 0;

    // optimistic update
    if (wantLiked) {
      setMyLikes(prev => new Set([...prev, commentId]));
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: currentCount + 1 } : c));
    } else {
      setMyLikes(prev => { const n = new Set(prev); n.delete(commentId); return n; });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: Math.max(0, currentCount - 1) } : c));
    }

    const { error } = await toggleCommentLike(commentId, currentUser.id, currentlyLiked, currentCount);
    if (error) {
      // revert
      if (wantLiked) {
        setMyLikes(prev => { const n = new Set(prev); n.delete(commentId); return n; });
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: currentCount } : c));
      } else {
        setMyLikes(prev => new Set([...prev, commentId]));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: currentCount } : c));
      }
    }
  }, [currentUser, comments, myLikes]);

  // ── delete comment using postService ─────────────────────────────────────
  const handleDelete = useCallback(async (commentId) => {
    if (!currentUser) return;
    setComments(prev => prev.filter(c => c.id !== commentId));
    const { error } = await deleteFeedComment(commentId, currentUser.id);
    if (error) { console.error('Delete failed:', error); loadComments(); }
  }, [currentUser, loadComments]);

  const handleReplyClick = useCallback((comment) => {
    setReplyTo({ userId: comment.user_id, id: comment.id });
    textareaRef.current?.focus();
  }, []);

  // ── current user display ──────────────────────────────────────────────────
  const myName   = displayName(currentProfile);
  const myAvatar = displayAvatar(currentProfile);
  const myGrad   = avatarGradient(currentUser?.id ?? '');
  const myIni    = getInitials(myName);

  // ── reply display name ────────────────────────────────────────────────────
  const replyDisplayName = replyTo
    ? (displayName(profileMap[replyTo.userId]) || 'User')
    : null;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes cmt-slide { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
        @keyframes cmt-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cmt-spin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          background: 'rgba(0,0,0,0.55)',
          animation: 'cmt-fade .2s ease',
        }}
      />

      {/* content layer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 8001,
        display: 'flex', alignItems: 'stretch',
        animation: 'cmt-slide .25s cubic-bezier(.32,0,.67,0) reverse, cmt-slide .25s cubic-bezier(.33,1,.68,1)',
        pointerEvents: 'none',
      }}>

        {/* drawer */}
        <div style={{
          width: drawerW, background: C.card, borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          pointerEvents: 'all',
        }}>

          {/* header */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaRegComment size={13} style={{ color: C.faint }} />
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text }}>
                Comments
              </span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.fainter }}>
                ({comments.length})
              </span>
            </div>
            <button onClick={handleClose}
              style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.05)', border: `1px solid ${C.border}`, color: C.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,76,106,.1)'; e.currentTarget.style.borderColor = 'rgba(255,76,106,.35)'; e.currentTarget.style.color = '#ff4c6a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.faint; }}>
              <FiX size={13} />
            </button>
          </div>

          {/* comment list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px' }}>
            {comments.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <FaRegComment size={24} style={{ color: C.fainter, marginBottom: 10 }} />
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.fainter, margin: 0 }}>
                  No comments yet. Be the first!
                </p>
              </div>
            )}
            {comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                myLikes={myLikes}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onReply={handleReplyClick}
                profileMap={profileMap}
              />
            ))}
            <div ref={listEndRef} />
          </div>

          {/* composer */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {replyTo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '5px 10px', background: `${C.indigo}12`, border: `1px solid ${C.indigo}30`, borderRadius: 8 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.indigo }}>
                  ↩ replying to @{replyDisplayName}
                </span>
                <button onClick={() => setReplyTo(null)}
                  style={{ background: 'none', border: 'none', color: C.fainter, cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* current user avatar */}
              {myAvatar
                ? <img src={myAvatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0, marginTop: 2 }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: myGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>{myIni}</div>
              }

              <div style={{ flex: 1 }}>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={replyTo ? `Reply to @${replyDisplayName}…` : 'Add a comment… (⌘↵ to send)'}
                  rows={1}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: C.input, border: `1px solid ${C.border}`, borderRadius: 10,
                    color: C.text, fontSize: 13, fontFamily: "'Syne',sans-serif",
                    padding: '8px 12px', outline: 'none', resize: 'none', overflow: 'hidden',
                    lineHeight: 1.55, caretColor: C.pink, transition: 'border-color .15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = `${C.pink}55`)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: text.length > MAX_CHARS * 0.9 ? (text.length >= MAX_CHARS ? C.pink : '#f5a623') : C.fainter }}>
                    {text.length}/{MAX_CHARS}
                  </span>
                  <button onClick={submit} disabled={!text.trim() || submitting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 8,
                      border: `1px solid ${!text.trim() ? C.border : `${C.pink}50`}`,
                      background: !text.trim() ? 'transparent' : `${C.pink}12`,
                      color: !text.trim() ? C.fainter : C.pink,
                      fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700,
                      cursor: !text.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (text.trim()) { e.currentTarget.style.background = `${C.pink}22`; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = !text.trim() ? 'transparent' : `${C.pink}12`; }}
                  >
                    {submitting
                      ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${C.pink}30`, borderTopColor: C.pink, animation: 'cmt-spin .7s linear infinite', display: 'inline-block' }} />
                      : <FiSend size={11} />
                    }
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Comments;
// src/features/communities/components/CommunityCard.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate }                  from 'react-router-dom';
import { supabase }                           from '../../../services/supabaseClient';
import { useAuth }                            from '../../../context/AuthContext';

const ACCENTS = ['#00d4ff','#9c6fff','#00e676','#f5a623','#f472b6','#38bdf8'];
const accentFor = (id = '') =>
  ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length];

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#0c1520 0%,#0a1a2e 100%)',
  'linear-gradient(135deg,#130c20 0%,#1a0a2e 100%)',
  'linear-gradient(135deg,#0c200f 0%,#0a2e14 100%)',
  'linear-gradient(135deg,#20150c 0%,#2e1a0a 100%)',
  'linear-gradient(135deg,#200c18 0%,#2e0a1e 100%)',
  'linear-gradient(135deg,#0c1a20 0%,#0a222e 100%)',
];
const coverBgFor = (id = '') =>
  COVER_GRADIENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COVER_GRADIENTS.length];

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ community, onCancel, onConfirm, deleting }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCancel()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
      <div style={{
        background: '#161615', border: '1px solid #2a2a28',
        borderRadius: 16, width: '100%', maxWidth: 380, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#ff4c6a,#f472b6,transparent)' }} />
        <div style={{ padding: '22px 22px 20px' }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: '#f0f4ff', margin: '0 0 8px' }}>
            Delete "{community.name}"?
          </p>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#6b7a99', margin: '0 0 18px', lineHeight: 1.7 }}>
            This will permanently delete the community and all its posts, comments, and member data. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #252523', background: 'transparent', color: '#8b95ae', fontFamily: "'Space Mono',monospace", fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#343430'; e.currentTarget.style.color = '#f0f4ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#252523'; e.currentTarget.style.color = '#8b95ae'; }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: '1px solid rgba(255,76,106,0.5)',
                background: deleting ? 'rgba(255,76,106,0.06)' : 'rgba(255,76,106,0.15)',
                color: deleting ? '#6b7a99' : '#ff4c6a',
                fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700,
                cursor: deleting ? 'not-allowed' : 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
              onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = 'rgba(255,76,106,0.25)'; }}
              onMouseLeave={e => { if (!deleting) e.currentTarget.style.background = 'rgba(255,76,106,0.15)'; }}>
              {deleting
                ? <><span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,76,106,0.3)', borderTopColor: '#ff4c6a', animation: 'cc-spin .7s linear infinite', display: 'inline-block' }} /> Deleting…</>
                : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CommunityCard ─────────────────────────────────────────────────────────────

const CommunityCard = ({ community, joined, onJoin, onLeave, onDeleted }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [memberCount, setMemberCount] = useState(null);
  const [postCount,   setPostCount]   = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [joinState,   setJoinState]   = useState(joined ? 'joined' : 'idle');
  const menuRef = useRef(null);

  const accent  = accentFor(community.id);
  const isOwner = !!(user?.id && community.created_by === user.id);

  useEffect(() => { setJoinState(joined ? 'joined' : 'idle'); }, [joined]);

  useEffect(() => {
    let ok = true;
    Promise.all([
      supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', community.id),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('community_id', community.id),
    ]).then(([{ count: m }, { count: p }]) => {
      if (ok) { setMemberCount(m ?? 0); setPostCount(p ?? 0); }
    });
    return () => { ok = false; };
  }, [community.id]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  // ── Join/Leave ────────────────────────────────────────────────────────────
  const handleJoin = async e => {
    e.stopPropagation();
    setJoinState('joining');
    await onJoin();
    setJoinState('joined');
  };

  const handleLeave = async e => {
    e.stopPropagation();
    setJoinState('leaving');
    await onLeave();
    setJoinState('idle');
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = e => {
    e.stopPropagation();
    const url = `${window.location.origin}/community/${community.id}`;
    navigator.clipboard?.writeText(url).catch(() => {
      const ta = Object.assign(document.createElement('textarea'), { value: url, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    // Optimistically remove first — prevents re-appear if parent re-renders
    onDeleted?.(community.id);

    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', community.id);

    if (error) {
      console.error('Delete error:', error);
      // If delete truly failed, alert — parent already removed card but
      // user can refresh to see it reappear. In practice RLS is the only
      // reason this fails so alert is appropriate.
      alert(`Delete failed: ${error.message}\n\nMake sure the RLS delete policy is added in Supabase.`);
    }
    // Don't reset deleting — component is already unmounted by onDeleted
  };

  // ── Join button ───────────────────────────────────────────────────────────
  const JoinBtn = () => {
    const isJoined  = joinState === 'joined'  || joinState === 'leaving';
    const isLoading = joinState === 'joining' || joinState === 'leaving';
    if (isJoined) return (
      <button onClick={handleLeave} disabled={isLoading}
        style={{ padding: '5px 14px', borderRadius: 8, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', border: '1px solid rgba(0,230,118,0.35)', background: 'rgba(0,230,118,0.09)', color: '#00e676', transition: 'all .15s', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { if (!isLoading) { Object.assign(e.currentTarget.style, { background: 'rgba(255,76,106,0.1)', borderColor: 'rgba(255,76,106,0.35)', color: '#ff4c6a' }); e.currentTarget.textContent = 'Leave'; }}}
        onMouseLeave={e => { Object.assign(e.currentTarget.style, { background: 'rgba(0,230,118,0.09)', borderColor: 'rgba(0,230,118,0.35)', color: '#00e676' }); e.currentTarget.textContent = isLoading ? '…' : '✓ Joined'; }}>
        {isLoading ? '…' : '✓ Joined'}
      </button>
    );
    return (
      <button onClick={handleJoin} disabled={joinState === 'joining'}
        style={{ padding: '5px 14px', borderRadius: 8, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, cursor: joinState === 'joining' ? 'not-allowed' : 'pointer', border: `1px solid ${accent}50`, background: `${accent}12`, color: accent, transition: 'all .15s', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { if (joinState === 'idle') e.currentTarget.style.background = `${accent}24`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${accent}12`; }}>
        {joinState === 'joining' ? '…' : '+ Join'}
      </button>
    );
  };

  return (
    <>
      <style>{`
        @keyframes cc-spin { to { transform: rotate(360deg); } }
        @keyframes cc-menu { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{
        background: '#161615', border: '1px solid #252523', borderRadius: 14,
        overflow: 'hidden', transition: 'border-color .18s, box-shadow .18s, transform .18s',
        display: 'flex', flexDirection: 'column',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.5)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#252523'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>

        {/* ── cover image (compact) ── */}
        <div style={{ position: 'relative', height: 90, overflow: 'hidden', flexShrink: 0 }}>
          {community.cover_url
            ? <img src={community.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: coverBgFor(community.id), position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 50%, ${accent}20 0%, transparent 65%)` }} />
              </div>
          }
          {/* fade to card bg */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #161615 100%)' }} />

          {/* owner 3-dot */}
          {isOwner && (
            <div ref={menuRef} style={{ position: 'absolute', top: 8, right: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
                style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b95ae', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f0f4ff'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b95ae'; }}>
                ⋯
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: 30, right: 0, zIndex: 50, background: '#1c1c1a', border: '1px solid #2a2a28', borderRadius: 10, padding: '4px', minWidth: 156, boxShadow: '0 10px 28px rgba(0,0,0,0.6)', animation: 'cc-menu .14s ease' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); setShowConfirm(true); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'transparent', border: 'none', color: '#ff4c6a', fontFamily: "'Space Mono',monospace", fontSize: 11, cursor: 'pointer', transition: 'background .12s', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,76,106,.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── body ── */}
        <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* name + slug row */}
          <div>
            <Link to={`/community/${community.id}`} style={{ textDecoration: 'none' }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#f0f4ff', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = accent}
                onMouseLeave={e => e.target.style.color = '#f0f4ff'}>
                {community.name}
              </h3>
            </Link>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#3d4560', margin: '2px 0 0', letterSpacing: '.05em', textTransform: 'uppercase' }}>
              {community.slug || 'public'}
            </p>
          </div>

          {/* description */}
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, color: '#6b7a99', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
            {community.description || 'No description yet.'}
          </p>

          {/* ── horizontal footer: stats + actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #1e1e1c', gap: 8 }}>

            {/* stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: accent }}>
                  {memberCount !== null ? memberCount : '–'}
                </span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: '#3d4560', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  members
                </span>
              </div>
              <div style={{ width: 1, height: 12, background: '#252523' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#818cf8' }}>
                  {postCount !== null ? postCount : '–'}
                </span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: '#3d4560', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  posts
                </span>
              </div>
            </div>

            {/* actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* share */}
              <button onClick={handleShare}
                style={{ width: 28, height: 28, borderRadius: 7, border: shareCopied ? '1px solid rgba(0,230,118,0.4)' : '1px solid #252523', background: shareCopied ? 'rgba(0,230,118,0.1)' : 'transparent', color: shareCopied ? '#00e676' : '#4a5878', cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { if (!shareCopied) { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.color = accent; e.currentTarget.style.background = `${accent}0e`; }}}
                onMouseLeave={e => { if (!shareCopied) { e.currentTarget.style.borderColor = '#252523'; e.currentTarget.style.color = '#4a5878'; e.currentTarget.style.background = 'transparent'; }}}>
                {shareCopied
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                }
              </button>

              <JoinBtn />
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <DeleteConfirmModal
          community={community}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </>
  );
};

export default CommunityCard;
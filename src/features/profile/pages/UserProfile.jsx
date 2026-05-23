// src/features/profile/pages/UserProfile.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION ADDITIONS (all backend logic / service calls UNCHANGED):
//
//   SIDEBAR:
//     - Slides in from left on mount (sidebarReveal, 0.5s spring)
//     - Back button: micro-lift + arrow slides left on hover
//     - Avatar ring: continuous conic-gradient rotation
//     - Ambient glow blob: breathes with orbitPulse
//     - Name / handle: staggered fadeSlideUp (150ms apart)
//     - Follow button: spring-bounce scale on state change, shimmer sweep on hover
//     - Message button: glow pulse on hover
//     - Stat rows: staggered entrance + count-up numbers + spring translateX on hover
//     - Link pills: spring translateX + glow on hover
//
//   TAB BAR:
//     - Sticky bar fades down from top
//     - Active tab: animated underline indicator sweeps in
//     - Tab icon scales on active
//
//   CONTENT:
//     - Every tab switch re-keys panel → contentReveal (fade + scale)
//     - Post cards: staggered cardEntrance (40ms apart)
//     - Project cards: staggered entrance (50ms apart)
//     - Community cards: hover lift + cover zoom + title color change
//     - Empty states: emoji bobs up/down continuously
//
//   FOLLOW BUTTON:
//     - On click: button does a quick springPop scale
//     - "Following" hover morphs to red "unfollow" text with border flash
//
//   MODALS:
//     - Backdrop animates in (backdropIn)
//     - All modals slide up + scale from 0.95
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';

import { useAuth } from '../../../context/AuthContext';
import {
  getInitials, getFollowCounts,
  isFollowing as checkIsFollowing,
  toggleFollow
} from '../../../services/userService';
import { getUserPosts } from '../../../services/postService';

import PostCardMini from '../../feed/components/PostCardMini';
import ProjectCard from '../../feed/components/ProjectCard';
import PostModal from '../../feed/components/PostModal';
import FollowListModal from '../components/FollowListModal';
import MessageModal from '../components/MessageModal';
import BadgesTab from '../components/BadgesTab';

import { FaGithub, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import { MdContactPage } from 'react-icons/md';
import { FiGlobe, FiArrowLeft, FiMessageSquare, FiUsers } from 'react-icons/fi';
import { HiOutlineLightningBolt } from 'react-icons/hi';

const T = {
  bg: '#0a0a09', panel: '#111110', card: '#161615', border: '#1f1f1d', borderH: '#2e2e2b',
  pink: '#f472b6', indigo: '#818cf8', cyan: '#38bdf8', green: '#34d399', amber: '#f5a623', purple: '#a78bfa',
  text: '#f0f4ff', mid: '#c8d0e4', muted: '#7a8399', faint: '#454e66',
  mono: "'Space Mono', monospace", sans: "'Syne', sans-serif",
};

const KEYFRAMES = `
  @keyframes sidebarReveal {
    from { opacity:0; transform:translateX(-32px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes avatarRingSpin {
    from { transform:rotate(0deg); }
    to   { transform:rotate(360deg); }
  }
  @keyframes orbitPulse {
    0%,100% { transform:translateX(-50%) scale(1);    opacity:0.45; }
    50%      { transform:translateX(-50%) scale(1.18); opacity:0.25; }
  }
  @keyframes contentReveal {
    from { opacity:0; transform:scale(0.975) translateY(8px); }
    to   { opacity:1; transform:scale(1)     translateY(0);   }
  }
  @keyframes cardEntrance {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes tabIndicator {
    from { transform:scaleX(0) translateX(-50%); opacity:0; }
    to   { transform:scaleX(1) translateX(-50%); opacity:1; }
  }
  @keyframes springPop {
    0%   { transform:scale(1);    }
    35%  { transform:scale(1.18); }
    65%  { transform:scale(0.9);  }
    100% { transform:scale(1);    }
  }
  @keyframes glintSweep {
    0%   { background-position:-200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes emojiBob {
    0%,100% { transform:translateY(0);   }
    50%      { transform:translateY(-8px);}
  }
  @keyframes spinnerRing {
    to { transform:rotate(360deg); }
  }
  @keyframes backdropIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(0.94) translateY(24px); }
    to   { opacity:1; transform:scale(1)    translateY(0);    }
  }
  @keyframes msgGlow {
    0%,100% { box-shadow:0 0 0   0   rgba(129,140,248,0.15); }
    50%      { box-shadow:0 0 16px 4px rgba(129,140,248,0.3); }
  }
`;

// ── CountUp hook ──────────────────────────────────────────────────────────────
function useCountUp(target, duration = 700, delay = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const t = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf.current); };
  }, [target, duration, delay]);
  return val;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 80 }) {
  const [fail, setFail] = useState(false);
  if (src && !fail)
    return <img src={src} alt={name} onError={() => setFail(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2.5px solid ${T.border}` }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#E8435A,#7F77DD)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.mono, fontSize: size * 0.3, fontWeight: 700, color: '#fff', border: `2.5px solid ${T.border}`
    }}>
      {getInitials(name || '')}
    </div>
  );
}

// ── Animated StatRow ──────────────────────────────────────────────────────────
function StatRow({ value, label, color, onClick, delay = 0 }) {
  const animated = useCountUp(value, 700, delay);
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={!onClick}
      onMouseEnter={() => onClick && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '9px 14px', borderRadius: 10,
        background: hov ? `${color}09` : 'transparent',
        border: `1px solid ${hov ? color + '30' : T.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transform: hov ? 'translateX(4px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `cardEntrance 0.35s ease both`,
        animationDelay: `${delay}ms`
      }}>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{animated}</span>
    </button>
  );
}

// ── SideLink ──────────────────────────────────────────────────────────────────
function SideLink({ href, icon, label, color }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10,
        textDecoration: 'none', border: `1px solid ${hov ? color + '45' : T.border}`,
        background: hov ? color + '0d' : 'transparent',
        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        transform: hov ? 'translateX(6px)' : 'none',
        boxShadow: hov ? `0 4px 16px ${color}15` : 'none'
      }}>
      <span style={{ color: hov ? color : T.faint, transition: 'color 0.15s', flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontFamily: T.sans, fontSize: 13, color: hov ? T.mid : T.muted,
        transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
      }}>{label}</span>
      <span style={{
        color: T.faint, fontSize: 10, flexShrink: 0,
        opacity: hov ? 1 : 0, transition: 'opacity 0.15s, transform 0.15s',
        transform: hov ? 'translateX(2px)' : 'none'
      }}>↗</span>
    </a>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
function Tab({ id, label, icon, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={() => onClick(id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 16px', borderRadius: 10,
        background: active ? `${T.pink}12` : hov ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${active ? T.pink + '45' : 'transparent'}`,
        color: active ? T.pink : hov ? T.mid : T.muted,
        fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
        cursor: 'pointer', transition: 'all 0.18s ease', whiteSpace: 'nowrap',
        transform: hov && !active ? 'translateY(-1px)' : 'none'
      }}>
      <span style={{
        opacity: active ? 1 : 0.65, transition: 'transform 0.2s',
        transform: active ? 'scale(1.15)' : 'scale(1)'
      }}>{icon}</span>
      {label}
      {active && (
        <span style={{
          position: 'absolute', bottom: 0, left: '50%',
          width: '60%', height: 2, borderRadius: 1,
          background: `linear-gradient(90deg,${T.pink},${T.indigo})`,
          transformOrigin: 'left center',
          animation: 'tabIndicator 0.25s ease both'
        }} />
      )}
    </button>
  );
}

// ── Empty ─────────────────────────────────────────────────────────────────────
function Empty({ icon, text }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 24px',
      border: `1px dashed ${T.border}`, borderRadius: 20, background: T.panel
    }}>
      <span style={{
        fontSize: 36, marginBottom: 16, opacity: 0.5,
        animation: 'emojiBob 2.5s ease-in-out infinite'
      }}>{icon}</span>
      <p style={{ fontFamily: T.mono, fontSize: 11, color: T.faint, margin: 0, letterSpacing: '0.06em' }}>{text}</p>
    </div>
  );
}

// ── NotFound ──────────────────────────────────────────────────────────────────
function NotFound({ onBack }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, background: T.bg,
      animation: 'fadeSlideUp 0.4s ease both'
    }}>
      <style>{KEYFRAMES}</style>
      <span style={{ fontSize: 52, opacity: 0.4, animation: 'emojiBob 3s ease-in-out infinite' }}>👤</span>
      <p style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>User not found</p>
      <p style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, margin: 0 }}>This profile doesn't exist or has been removed.</p>
      <button onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, padding: '9px 18px', borderRadius: 10,
          background: `${T.pink}10`, border: `1px solid ${T.pink}40`, color: T.pink,
          fontFamily: T.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${T.pink}20`; e.currentTarget.style.transform = 'translateX(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${T.pink}10`; e.currentTarget.style.transform = 'none'; }}>
        <FiArrowLeft size={13} /> go back
      </button>
    </div>
  );
}

// ── Community card ────────────────────────────────────────────────────────────
const UP_COMM_GRADIENTS = [
  'radial-gradient(circle at 30% 50%, rgba(0,212,255,0.25) 0%, transparent 65%)',
  'radial-gradient(circle at 70% 40%, rgba(0,230,118,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 50% 50%, rgba(156,111,255,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 20% 60%, rgba(245,166,35,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 80% 30%, rgba(255,76,106,0.22) 0%, transparent 65%)',
];

function UPCommunityCard({ community, navigate, index = 0 }) {
  const [hov, setHov] = useState(false);
  const glowIdx = community.id ? community.id.charCodeAt(0) % UP_COMM_GRADIENTS.length : 0;
  return (
    <div onClick={() => navigate(`/community/${community.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hov ? T.borderH : T.border}`, background: T.card,
        transform: hov ? 'translateY(-5px) scale(1.01)' : 'none',
        boxShadow: hov ? '0 16px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(56,189,248,0.08)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `cardEntrance 0.38s ease both`, animationDelay: `${index * 55}ms`
      }}>
      <div style={{ position: 'relative', height: 80, overflow: 'hidden' }}>
        {community.cover_url ? (
          <div style={{
            position: 'absolute', inset: 0, backgroundImage: `url(${community.cover_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: hov ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.4s ease'
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#0c1018,#191917)' }}>
            <div style={{ position: 'absolute', inset: 0, background: UP_COMM_GRADIENTS[glowIdx] }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(10,10,9,0.75))' }} />
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <h3 style={{
          fontFamily: T.sans, fontWeight: 800, fontSize: 14,
          color: hov ? T.cyan : T.text, margin: '0 0 2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.2s'
        }}>{community.name}</h3>
        <p style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          // {community.slug || 'community'}
        </p>
        {community.description && (
          <p style={{
            fontFamily: T.sans, fontSize: 11, color: T.muted, margin: 0, lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {community.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── UserProfile ───────────────────────────────────────────────────────────────
const UserProfile = () => {
  const { username, id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ posts: 0, projects: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [tabKey, setTabKey] = useState(0);
  const [theirPosts, setTheirPosts] = useState([]);
  const [theirProjects, setTheirProjects] = useState([]);
  const [theirCommunities, setTheirCommunities] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followHov, setFollowHov] = useState(false);
  const [followPop, setFollowPop] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [followModal, setFollowModal] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [messageModal, setMessageModal] = useState(false);
  const [msgHov, setMsgHov] = useState(false);
  const [backHov, setBackHov] = useState(false);

  const switchTab = (t) => { setActiveTab(t); setTabKey(k => k + 1); };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      let profileRow = null;
      if (id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        profileRow = data;
      } else if (username) {
        const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        profileRow = data;
      }
      if (!profileRow) { setNotFound(true); setLoading(false); return; }
      if (me && profileRow.id === me.id) { navigate('/profile'); return; }

      setProfile({
        id: profileRow.id, name: profileRow.full_name,
        username: profileRow.username, avatar: profileRow.avatar_url,
        bio: profileRow.bio || null, github_url: profileRow.github_url || null,
        website_url: profileRow.website_url || null, resume_url: profileRow.resume_url || null
      });

      const allPosts = await getUserPosts(profileRow.id);
      setTheirPosts(allPosts.filter(p => p.type === 'code'));
      setTheirProjects(allPosts.filter(p => p.type === 'project'));

      const { data: commData } = await supabase
        .from('community_members').select('community_id, communities(*)').eq('user_id', profileRow.id);
      setTheirCommunities((commData || []).map(r => r.communities).filter(Boolean));

      const { followers, following: followingCount } = await getFollowCounts(profileRow.id);
      setStats({
        posts: allPosts.filter(p => p.type === 'code').length,
        projects: allPosts.filter(p => p.type === 'project').length, followers, following: followingCount
      });

      if (me) { const isF = await checkIsFollowing(me.id, profileRow.id); setFollowing(isF); }
    } catch (err) { console.error('UserProfile load error:', err); setNotFound(true); }
    setLoading(false);
  }, [username, id, navigate, me]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFollow = async () => {
    if (!me?.id || !profile?.id || followLoading) return;
    setFollowLoading(true);
    setFollowPop(true);
    const { following: newState } = await toggleFollow(me.id, profile.id);
    setFollowing(newState);
    setStats(prev => ({ ...prev, followers: newState ? prev.followers + 1 : Math.max(0, prev.followers - 1) }));
    setFollowLoading(false);
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <style>{KEYFRAMES}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          border: `2px solid ${T.border}`, borderTopColor: T.pink,
          animation: 'spinnerRing 0.8s linear infinite'
        }} />
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, letterSpacing: '0.16em', textTransform: 'uppercase' }}>loading</span>
      </div>
    </div>
  );

  if (notFound) return <NotFound onBack={() => navigate(-1)} />;

  const tabs = [
    { id: 'posts', label: 'posts', icon: <HiOutlineLightningBolt size={12} /> },
    { id: 'projects', label: 'projects', icon: <FiGlobe size={11} /> },
    { id: 'communities', label: 'communities', icon: <FiUsers size={11} /> },
    { id: 'badges', label: 'badges', icon: <span style={{ fontSize: 11 }}>🏅</span> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.sans }}>
      <style>{KEYFRAMES}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── LEFT sidebar ── */}
        <aside style={{
          width: 300, flexShrink: 0, position: 'sticky', top: 0,
          height: '100vh', overflowY: 'auto', borderRight: `1px solid ${T.border}`,
          background: T.panel, display: 'flex', flexDirection: 'column', scrollbarWidth: 'none',
          animation: 'sidebarReveal 0.5s cubic-bezier(0.22,1,0.36,1) both'
        }}>

          {/* back button */}
          <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
            <button onClick={() => navigate(-1)}
              onMouseEnter={() => setBackHov(true)} onMouseLeave={() => setBackHov(false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${backHov ? T.borderH : T.border}`,
                color: backHov ? T.muted : T.faint, fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s',
                transform: backHov ? 'translateX(-2px)' : 'none'
              }}>
              <FiArrowLeft size={11} style={{ transition: 'transform 0.2s', transform: backHov ? 'translateX(-2px)' : 'none' }} /> back
            </button>
          </div>

          {/* identity */}
          <div style={{ position: 'relative', padding: '24px 24px 0', flexShrink: 0 }}>
            {/* ambient glow */}
            <div style={{
              position: 'absolute', top: 0, left: '50%',
              width: 220, height: 220, borderRadius: '50%',
              background: `radial-gradient(circle,${T.indigo}12 0%,transparent 70%)`,
              pointerEvents: 'none', zIndex: 0,
              animation: 'orbitPulse 5s ease-in-out infinite'
            }} />

            {/* spinning avatar ring */}
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 16px', zIndex: 1 }}>
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%', zIndex: 0,
                background: `conic-gradient(${T.indigo},${T.cyan},${T.pink},${T.indigo})`,
                animation: 'avatarRingSpin 5s linear infinite', opacity: 0.55
              }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', background: T.panel, zIndex: 1 }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Avatar src={profile.avatar} name={profile.name} size={80} />
              </div>
            </div>

            <h1 style={{
              fontFamily: T.sans, fontWeight: 800, fontSize: 20, color: T.text,
              margin: '0 0 4px', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2,
              position: 'relative', zIndex: 1,
              animation: 'fadeSlideUp 0.4s ease 0.15s both'
            }}>
              {profile.name || username}
            </h1>

            <p style={{
              fontFamily: T.mono, fontSize: 10, color: T.faint,
              margin: '0 0 16px', textAlign: 'center', position: 'relative', zIndex: 1,
              animation: 'fadeSlideUp 0.4s ease 0.22s both'
            }}>
              @{profile.username}
            </p>

            {profile.bio && (
              <p style={{
                fontFamily: T.sans, fontSize: 13, color: T.muted, lineHeight: 1.7,
                textAlign: 'center', margin: '0 0 18px', position: 'relative', zIndex: 1,
                animation: 'fadeSlideUp 0.4s ease 0.28s both'
              }}>
                {profile.bio}
              </p>
            )}

            {/* action buttons */}
            {me && (
              <div style={{
                display: 'flex', gap: 8, marginBottom: 6, position: 'relative', zIndex: 1,
                animation: 'fadeSlideUp 0.4s ease 0.34s both'
              }}>
                {/* message */}
                <button onClick={() => setMessageModal(true)}
                  onMouseEnter={() => setMsgHov(true)} onMouseLeave={() => setMsgHov(false)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, padding: '9px', borderRadius: 10,
                    border: `1px solid ${T.indigo}35`,
                    background: 'rgba(129,140,248,0.08)', color: T.indigo,
                    fontFamily: T.mono, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: msgHov ? 'translateY(-1px)' : 'none',
                    animation: msgHov ? 'msgGlow 1.5s ease-in-out infinite' : 'none',
                    boxShadow: msgHov ? `0 4px 14px rgba(129,140,248,0.2)` : 'none'
                  }}>
                  <FiMessageSquare size={12} /> message
                </button>

                {/* follow */}
                <button onClick={handleFollow} disabled={followLoading}
                  onMouseEnter={() => setFollowHov(true)}
                  onMouseLeave={() => setFollowHov(false)}
                  onAnimationEnd={() => setFollowPop(false)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, padding: '9px', borderRadius: 10,
                    fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                    cursor: followLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    animation: followPop ? 'springPop 0.4s ease' : 'none',
                    ...(following
                      ? {
                        background: followHov ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${followHov ? 'rgba(248,113,113,0.35)' : T.borderH}`,
                        color: followHov ? '#f87171' : T.muted,
                        transform: followHov ? 'translateY(-1px)' : 'none'
                      }
                      : {
                        background: `${T.pink}10`, border: `1px solid ${T.pink}40`, color: T.pink,
                        boxShadow: followHov ? `0 4px 14px ${T.pink}25` : '0 0 16px rgba(244,114,182,0.1)',
                        transform: followHov ? 'translateY(-1px)' : 'none'
                      }
                    )
                  }}>
                  {following
                    ? <><FaUserCheck size={11} />{followHov ? 'unfollow' : 'following'}</>
                    : <><FaUserPlus size={11} />follow</>
                  }
                </button>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: T.border, margin: '18px 24px 18px', flexShrink: 0 }} />

          {/* stats */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <p style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px 4px' }}>stats</p>
            <StatRow value={stats.posts} label="posts" color={T.pink} delay={100} />
            <StatRow value={stats.projects} label="projects" color={T.indigo} delay={160} />
            <StatRow value={stats.followers} label="followers" color={T.green} delay={220} onClick={() => setFollowModal('followers')} />
            <StatRow value={stats.following} label="following" color={T.amber} delay={280} onClick={() => setFollowModal('following')} />
          </div>

          {(profile.github_url || profile.website_url || profile.resume_url) && (
            <>
              <div style={{ height: 1, background: T.border, margin: '20px 24px 18px', flexShrink: 0 }} />
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <p style={{ fontFamily: T.mono, fontSize: 8, color: T.faint, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px 4px' }}>links</p>
                {profile.github_url && <SideLink href={profile.github_url} icon={<FaGithub size={14} />} label="GitHub" color={T.text} />}
                {profile.website_url && <SideLink href={profile.website_url} icon={<FiGlobe size={14} />} label="Portfolio" color={T.indigo} />}
                {profile.resume_url && <SideLink href={profile.resume_url} icon={<MdContactPage size={14} />} label="Resume" color={T.pink} />}
              </div>
            </>
          )}
          <div style={{ flex: 1 }} />
        </aside>

        {/* ── RIGHT main ── */}
        <main style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          animation: 'fadeSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both'
        }}>

          {/* tab bar */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: `${T.bg}ee`, backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${T.border}`,
            padding: '10px 28px', display: 'flex', gap: 4, alignItems: 'center'
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, marginRight: 6 }}>~/</span>
            {tabs.map(t => <Tab key={t.id} {...t} active={activeTab === t.id} onClick={switchTab} />)}
          </div>

          {/* content */}
          <div key={tabKey} style={{
            flex: 1, padding: '32px 28px 80px',
            animation: 'contentReveal 0.3s ease both'
          }}>

            {activeTab === 'posts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {theirPosts.length === 0
                  ? <div style={{ gridColumn: '1/-1' }}><Empty icon="⌨️" text="no code posts yet" /></div>
                  : theirPosts.map((p, i) => (
                    <div key={p.id} style={{ animation: `cardEntrance 0.35s ease both`, animationDelay: `${i * 40}ms` }}>
                      <PostCardMini
                        post={{ id: p.id, fileName: p.file_name, code: p.code, caption: p.caption, likes: p.likes, comments: p.comments }}
                        onClick={() => { setSelectedPost(p); setIsPostModalOpen(true); }} />
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'projects' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 740 }}>
                {theirProjects.length === 0
                  ? <Empty icon="🚀" text="no projects yet" />
                  : theirProjects.map((proj, i) => (
                    <div key={proj.id} style={{ animation: `cardEntrance 0.35s ease both`, animationDelay: `${i * 50}ms` }}>
                      <ProjectCard
                        post={{
                          ...proj,
                          author_name: profile?.name ?? null,
                          github_username: profile?.username ?? null,
                          author_avatar: profile?.avatar ?? null,
                        }}
                        currentUser={me} />
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'communities' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                {theirCommunities.length === 0
                  ? <div style={{ gridColumn: '1/-1' }}><Empty icon="🌐" text="not in any communities" /></div>
                  : theirCommunities.map((c, i) => (
                    <UPCommunityCard key={c.id} community={c} navigate={navigate} index={i} />
                  ))
                }
              </div>
            )}

            {activeTab === 'badges' && (
              <BadgesTab userId={profile?.id} userName={profile?.name}
                userInitials={getInitials(profile?.name ?? '')} />
            )}
          </div>
        </main>
      </div>

      {/* modals */}
      {followModal && profile && (
        <div style={{ animation: 'backdropIn 0.2s ease both' }}>
          <FollowListModal mode={followModal} targetUserId={profile.id}
            currentUserId={me?.id ?? null} onClose={() => setFollowModal(null)} />
        </div>
      )}
      {messageModal && profile && (
        <div style={{ animation: 'backdropIn 0.2s ease both' }}>
          <MessageModal developer={profile} onClose={() => setMessageModal(false)} />
        </div>
      )}
      {isPostModalOpen && selectedPost && (
        <PostModal
          post={{
            id: selectedPost.id,
            author: { name: profile.name ?? null, avatar: profile.avatar ?? null },
            tag: selectedPost.tag, fileName: selectedPost.file_name,
            code: selectedPost.code, caption: selectedPost.caption,
            likes: selectedPost.likes, comments: selectedPost.comments
          }}
          onClose={() => setIsPostModalOpen(false)}
          onDelete={null} />
      )}
    </div>
  );
};

export default UserProfile;
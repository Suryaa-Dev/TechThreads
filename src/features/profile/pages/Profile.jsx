// src/features/profile/pages/Profile.jsx
// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODAL EXPANDED:
//   NEW — Avatar upload
//     - Click the avatar ring in the modal to pick an image
//     - Live preview replaces the current avatar immediately
//     - On save: uploads to Supabase storage bucket "avatars",
//       writes public URL to profiles.avatar_url via updateProfile()
//     - Upload progress ring animates around the preview
//   NEW — Full name field (was missing, maps to profiles.full_name)
//   NEW — Username field  (maps to profiles.username, uniqueness hint shown)
//   EXISTING — Bio, GitHub URL, Portfolio URL, Resume PDF, Open to Work (all unchanged)
//
// All backend logic / service calls UNCHANGED except:
//   uploadAvatar() helper added below (uses supabase.storage "avatars" bucket,
//   same pattern as uploadResume in userService.js)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import {
  getProfile as fetchProfile, getInitials,
  updateProfile, uploadResume,
  getFollowCounts
} from '../../../services/userService';
import { getUserPosts } from '../../../services/postService';
import { supabase } from '../../../services/supabaseClient';

import BadgesTab from '../components/BadgesTab';
import NotificationsTab from '../components/NotificationsTab';
import MessagesTab from '../components/MessagesTab';
import PostCardMini from '../../feed/components/PostCardMini';
import ProjectCard from '../../feed/components/ProjectCard';
import PostModal from '../../feed/components/PostModal';
import FollowListModal from '../components/FollowListModal';

import { getUnreadCount, subscribeToNotifications } from '../../../services/notificationService';
import { getUnreadMessageCount } from '../../../services/messageService';

import { FaGithub } from 'react-icons/fa';
import { MdContactPage, MdWorkOutline } from 'react-icons/md';
import {
  FiEdit2, FiGlobe, FiX, FiBell,
  FiMessageSquare, FiUsers, FiCamera
} from 'react-icons/fi';
import { HiOutlineLightningBolt } from 'react-icons/hi';

const T = {
  bg: '#0a0a09', panel: '#111110', card: '#161615', border: '#1f1f1d', borderH: '#2e2e2b',
  pink: '#f472b6', indigo: '#818cf8', cyan: '#38bdf8', green: '#34d399', amber: '#f5a623', purple: '#a78bfa',
  text: '#f0f4ff', mid: '#c8d0e4', muted: '#7a8399', faint: '#454e66',
  mono: "'Space Mono', monospace", sans: "'Syne', sans-serif",
};

// ── Avatar upload helper ──────────────────────────────────────────────────────
// Mirrors uploadResume() in userService.js but targets the "avatars" bucket.
async function uploadAvatar(userId, file) {
  if (!file) return { url: null, error: null };
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (upErr) return { url: null, error: upErr };

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

// ── Keyframes ────────────────────────────────────────────────────────────────
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
    0%,100% { transform:translateX(-50%) scale(1);    opacity:0.55; }
    50%      { transform:translateX(-50%) scale(1.18); opacity:0.3;  }
  }
  @keyframes onlinePing {
    0%   { transform:scale(1);   opacity:0.7; }
    70%  { transform:scale(2.4); opacity:0; }
    100% { transform:scale(1);   opacity:0; }
  }
  @keyframes onlinePing2 {
    0%   { transform:scale(1);   opacity:0.4; }
    70%  { transform:scale(3.2); opacity:0; }
    100% { transform:scale(1);   opacity:0; }
  }
  @keyframes glintSweep {
    0%   { background-position:-200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes contentReveal {
    from { opacity:0; transform:scale(0.975) translateY(8px); }
    to   { opacity:1; transform:scale(1)     translateY(0);   }
  }
  @keyframes cardEntrance {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes badgeBounce {
    0%,100% { transform:scale(1);    }
    30%      { transform:scale(1.35); }
    60%      { transform:scale(0.88); }
  }
  @keyframes emojiBob {
    0%,100% { transform:translateY(0);    }
    50%      { transform:translateY(-8px); }
  }
  @keyframes spinnerRing {
    to { transform:rotate(360deg); }
  }
  @keyframes modalIn {
    from { opacity:0; transform:scale(0.94) translateY(24px); }
    to   { opacity:1; transform:scale(1)    translateY(0);    }
  }
  @keyframes backdropIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes tabIndicator {
    from { transform:scaleX(0); opacity:0; }
    to   { transform:scaleX(1); opacity:1; }
  }
  @keyframes pointsGlint {
    0%   { background-position:-200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes uploadSpin {
    to { transform:rotate(360deg); }
  }
  @keyframes avatarPreviewIn {
    from { opacity:0; transform:scale(0.88); }
    to   { opacity:1; transform:scale(1); }
  }
`;

// ── CountUp ───────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 800, delay = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const t = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
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
      style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        flexShrink: 0, border: `2.5px solid ${T.border}`
      }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#E8435A,#7F77DD)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.mono, fontSize: size * 0.3, fontWeight: 700, color: '#fff',
      border: `2.5px solid ${T.border}`
    }}>
      {getInitials(name || '')}
    </div>
  );
}

// ── StatRow ───────────────────────────────────────────────────────────────────
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
        animation: `cardEntrance 0.35s ease both`, animationDelay: `${delay}ms`
      }}>
      <span style={{
        fontFamily: T.mono, fontSize: 10, color: T.faint,
        letterSpacing: '0.1em', textTransform: 'uppercase'
      }}>{label}</span>
      <span style={{
        fontFamily: T.mono, fontSize: 18, fontWeight: 700,
        color, lineHeight: 1
      }}>{animated}</span>
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
        transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', flex: 1
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
function Tab({ id, label, icon, active, badge, onClick }) {
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
          position: 'absolute', bottom: 0, left: '50%', width: '60%', height: 2,
          borderRadius: 1, background: `linear-gradient(90deg,${T.pink},${T.indigo})`,
          transform: 'translateX(-50%)', animation: 'tabIndicator 0.25s ease both',
          transformOrigin: 'left center'
        }} />
      )}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15,
          borderRadius: 8, background: T.pink, color: '#fff', fontFamily: T.mono,
          fontSize: 8, fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '0 3px', animation: 'badgeBounce 0.4s ease'
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
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
      <p style={{
        fontFamily: T.mono, fontSize: 11, color: T.faint, margin: 0,
        letterSpacing: '0.06em'
      }}>{text}</p>
    </div>
  );
}

// ── ModalField ────────────────────────────────────────────────────────────────
function ModalField({ label, value, onChange, placeholder, multiline, hint }) {
  const [foc, setFoc] = useState(false);
  const base = {
    width: '100%', boxSizing: 'border-box', background: '#0a0a09',
    border: `1px solid ${foc ? T.pink + '55' : T.border}`, borderRadius: 10,
    padding: '9px 13px', color: T.text, fontFamily: T.sans, fontSize: 13,
    outline: 'none', caretColor: T.pink,
    transition: 'border-color 0.15s, box-shadow 0.2s',
    boxShadow: foc ? `0 0 0 3px ${T.pink}12` : 'none', resize: 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{
          fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: T.faint,
          letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>{label}</label>
        {hint && <span style={{ fontFamily: T.mono, fontSize: 9, color: T.faint + '99' }}>{hint}</span>}
      </div>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3} style={base}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)} />
        : <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={base}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)} />
      }
    </div>
  );
}

// ── AvatarUploadZone ──────────────────────────────────────────────────────────
// Renders the clickable avatar preview inside the edit modal.
function AvatarUploadZone({ currentSrc, name, previewUrl, uploading, onChange }) {
  const [hov, setHov] = useState(false);
  const displaySrc = previewUrl || currentSrc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <label
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          position: 'relative', width: 88, height: 88, cursor: 'pointer',
          display: 'block', flexShrink: 0
        }}>

        {/* spinning upload ring (visible while uploading) */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: '50%', zIndex: 3,
            border: `2px solid transparent`,
            borderTopColor: T.pink,
            animation: 'uploadSpin 0.8s linear infinite'
          }} />
        )}

        {/* hover ring */}
        {!uploading && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%', zIndex: 2,
            border: `2px solid ${hov ? T.pink + '80' : 'transparent'}`,
            transition: 'border-color 0.2s'
          }} />
        )}

        {/* avatar */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
          position: 'relative', zIndex: 1,
          animation: previewUrl ? 'avatarPreviewIn 0.25s ease both' : 'none'
        }}>
          {displaySrc ? (
            <img src={displaySrc} alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg,#E8435A,#7F77DD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 26, fontWeight: 700, color: '#fff'
            }}>
              {getInitials(name || '')}
            </div>
          )}

          {/* hover overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: hov ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', borderRadius: '50%'
          }}>
            {hov && !uploading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <FiCamera size={18} color="#fff" />
                <span style={{
                  fontFamily: T.mono, fontSize: 8, color: '#fff',
                  letterSpacing: '0.08em'
                }}>CHANGE</span>
              </div>
            )}
            {uploading && (
              <span style={{
                fontFamily: T.mono, fontSize: 8, color: T.pink,
                letterSpacing: '0.06em'
              }}>uploading…</span>
            )}
          </div>
        </div>

        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files[0]; if (f) onChange(f); }} />
      </label>

      <p style={{
        fontFamily: T.mono, fontSize: 9, color: T.faint, margin: 0,
        letterSpacing: '0.06em', textAlign: 'center'
      }}>
        {previewUrl ? '✓ new photo ready' : 'click to change photo'}
      </p>
    </div>
  );
}

// ── Community card ────────────────────────────────────────────────────────────
const COMM_GRADIENTS = [
  'radial-gradient(circle at 30% 50%, rgba(0,212,255,0.25) 0%, transparent 65%)',
  'radial-gradient(circle at 70% 40%, rgba(0,230,118,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 50% 50%, rgba(156,111,255,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 20% 60%, rgba(245,166,35,0.22) 0%, transparent 65%)',
  'radial-gradient(circle at 80% 30%, rgba(255,76,106,0.22) 0%, transparent 65%)',
];

function CommunityCard({ community, onNavigate, index = 0 }) {
  const [hov, setHov] = useState(false);
  const glowIdx = community.id ? community.id.charCodeAt(0) % COMM_GRADIENTS.length : 0;
  return (
    <div onClick={onNavigate}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hov ? T.borderH : T.border}`, background: T.card,
        transform: hov ? 'translateY(-5px) scale(1.01)' : 'none',
        boxShadow: hov ? '0 16px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(56,189,248,0.08)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        animation: `cardEntrance 0.38s ease both`, animationDelay: `${index * 55}ms`
      }}>
      <div style={{ position: 'relative', height: 96, overflow: 'hidden' }}>
        {community.cover_url ? (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${community.cover_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            transition: 'transform 0.4s ease', transform: hov ? 'scale(1.08)' : 'scale(1)'
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(145deg,#0c1018,#191917)'
          }}>
            <div style={{ position: 'absolute', inset: 0, background: COMM_GRADIENTS[glowIdx] }} />
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(10,10,9,0.75))'
        }} />
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <h3 style={{
          fontFamily: T.sans, fontWeight: 800, fontSize: 15,
          margin: '0 0 3px', lineHeight: 1.2, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: hov ? T.cyan : T.text, transition: 'color 0.2s'
        }}>{community.name}</h3>
        <p style={{
          fontFamily: T.mono, fontSize: 9, color: T.faint,
          margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
          // {community.slug || 'community'}
        </p>
        {community.description && (
          <p style={{
            fontFamily: T.sans, fontSize: 12, color: T.muted, margin: 0,
            lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {community.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ posts: 0, projects: 0, communities: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [tabKey, setTabKey] = useState(0);
  const [myPosts, setMyPosts] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [followModal, setFollowModal] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [btnHov, setBtnHov] = useState(false);

  // ── edit modal fields ──────────────────────────────────────────────────────
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editOpenToWork, setEditOpenToWork] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const switchTab = (t) => { setActiveTab(t); setTabKey(k => k + 1); };

  // ── open modal: seed fields from current profile ──────────────────────────
  const openModal = () => {
    setEditFullName(profile?.name || '');
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setEditWebsite(profile?.website_url || '');
    setEditGithub(profile?.github_url || '');
    setEditOpenToWork(profile?.open_to_work || false);
    setResumeFile(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  // ── handle avatar file pick — show local preview immediately ─────────────
  const handleAvatarPick = (file) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchProfile(user.id, true);
      if (!data) return;
      setProfile({
        id: user.id, email: user.email,
        avatar: data.avatar_url || user.user_metadata?.avatar_url,
        name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
        username: data.username || user.user_metadata?.user_name,
        bio: data.bio,
        open_to_work: data.open_to_work || false,
        github_url: data.github_url,
        website_url: data.website_url,
        resume_url: data.resume_url,
        points: data.points ?? 0,
        accepted_solutions_count: data.accepted_solutions_count ?? 0,
      });
      const [
        { count: postsCount }, { count: projectsCount },
        { count: commCount }, { followers, following },
      ] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('project_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        getFollowCounts(user.id),
      ]);
      setStats({
        posts: postsCount || 0, projects: projectsCount || 0,
        communities: commCount || 0, followers, following
      });
      const allPosts = await getUserPosts(user.id);
      setMyPosts(allPosts.filter(p => p.type === 'code'));
      setMyProjects(allPosts.filter(p => p.type === 'project'));
      const { data: commData } = await supabase
        .from('community_members').select('community_id,communities(*)').eq('user_id', user.id);
      setMyCommunities((commData || []).map(r => r.communities));
    } catch (err) { console.error('Profile fetch error:', err); }
    setLoading(false);
  };

  // ── save changes ──────────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let avatarUrl = profile.avatar;
      let resumeUrl = profile.resume_url;

      // 1. Upload avatar if a new file was picked
      if (avatarFile) {
        setAvatarUploading(true);
        const { url, error } = await uploadAvatar(user.id, avatarFile);
        setAvatarUploading(false);
        if (error) { setSaveError('Avatar upload failed — try a smaller image.'); setSaving(false); return; }
        avatarUrl = url;
      }

      // 2. Upload resume if a new file was picked
      if (resumeFile) {
        const { url, error } = await uploadResume(user.id, resumeFile);
        if (!error && url) resumeUrl = url;
      }

      // 3. Check username uniqueness (only if changed)
      if (editUsername !== profile?.username && editUsername.trim()) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', editUsername.trim())
          .neq('id', user.id)
          .maybeSingle();
        if (existing) {
          setSaveError('That username is already taken — try another.');
          setSaving(false);
          return;
        }
      }

      // 4. Persist all fields
      await updateProfile(user.id, {
        full_name: editFullName.trim() || null,
        username: editUsername.trim() || null,
        bio: editBio.trim() || null,
        github_url: editGithub.trim() || null,
        website_url: editWebsite.trim() || null,
        resume_url: resumeUrl || null,
        avatar_url: avatarUrl || null,
        open_to_work: editOpenToWork,
      });

      await refreshProfile();
      setIsModalOpen(false);
      loadProfile();
    } catch (err) {
      setSaveError('Something went wrong — please try again.');
      console.error(err);
    }
    setSaving(false);
  };

  useEffect(() => { loadProfile(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    getUnreadCount(user.id).then(setUnreadCount);
    const ch = subscribeToNotifications(user.id, () => setUnreadCount(c => c + 1));
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    getUnreadMessageCount(user.id).then(setUnreadMessages);
  }, [user?.id]);

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: T.bg
    }}>
      <style>{KEYFRAMES}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          border: `2px solid ${T.border}`, borderTopColor: T.pink,
          animation: 'spinnerRing 0.8s linear infinite'
        }} />
        <span style={{
          fontFamily: T.mono, fontSize: 9, color: T.faint,
          letterSpacing: '0.16em', textTransform: 'uppercase'
        }}>loading</span>
      </div>
    </div>
  );

  const tabs = [
    { id: 'posts', label: 'posts', icon: <HiOutlineLightningBolt size={12} />, badge: 0 },
    { id: 'projects', label: 'projects', icon: <FiGlobe size={11} />, badge: 0 },
    { id: 'communities', label: 'communities', icon: <FiUsers size={11} />, badge: 0 },
    { id: 'badges', label: 'badges', icon: <span style={{ fontSize: 11 }}>🏅</span>, badge: 0 },
    { id: 'notifications', label: 'notifications', icon: <FiBell size={11} />, badge: unreadCount },
    { id: 'messages', label: 'messages', icon: <FiMessageSquare size={11} />, badge: unreadMessages },
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

          <div style={{ position: 'relative', padding: '36px 24px 0', flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', width: 220, height: 220,
              borderRadius: '50%',
              background: `radial-gradient(circle,${T.pink}1a 0%,transparent 70%)`,
              pointerEvents: 'none', zIndex: 0,
              animation: 'orbitPulse 4s ease-in-out infinite'
            }} />

            <div style={{
              position: 'relative', width: 80, height: 80,
              margin: '0 auto 16px', zIndex: 1
            }}>
              <div style={{
                position: 'absolute', inset: -5, borderRadius: '50%', zIndex: 0,
                background: `conic-gradient(${T.pink},${T.indigo},${T.cyan},${T.pink})`,
                animation: 'avatarRingSpin 5s linear infinite', opacity: 0.65
              }} />
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                background: T.panel, zIndex: 1
              }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Avatar src={profile?.avatar} name={profile?.name} size={80} />
              </div>
              <div style={{
                position: 'absolute', bottom: 2, right: 2, zIndex: 10,
                width: 13, height: 13, borderRadius: '50%'
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: T.green, animation: 'onlinePing 2s ease-out infinite'
                }} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: T.green, animation: 'onlinePing2 2s ease-out 0.4s infinite'
                }} />
                <div style={{
                  position: 'absolute', inset: 2, borderRadius: '50%',
                  background: T.green, border: `2.5px solid ${T.panel}`
                }} />
              </div>
            </div>

            <h1 style={{
              fontFamily: T.sans, fontWeight: 800, fontSize: 20, color: T.text,
              margin: '0 0 4px', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2,
              position: 'relative', zIndex: 1, animation: 'fadeSlideUp 0.4s ease 0.15s both'
            }}>
              {profile?.name || 'Unknown User'}
            </h1>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginBottom: 10, position: 'relative', zIndex: 1,
              animation: 'fadeSlideUp 0.4s ease 0.22s both'
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint }}>
                @{profile?.username}
              </span>
              {profile?.open_to_work && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 7px', borderRadius: 20,
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.28)',
                  fontFamily: T.mono, fontSize: 8, fontWeight: 700,
                  color: T.green, letterSpacing: '0.08em'
                }}>
                  <MdWorkOutline size={9} /> OPEN
                </span>
              )}
            </div>

            <div style={{
              display: 'flex', justifyContent: 'center', gap: 6,
              marginBottom: 18, flexWrap: 'wrap', position: 'relative', zIndex: 1,
              animation: 'fadeSlideUp 0.4s ease 0.3s both'
            }}>
              <span style={{
                fontFamily: T.mono, fontSize: 10, padding: '3px 10px',
                borderRadius: 20,
                background: `linear-gradient(90deg,${T.pink}10,${T.pink}18,${T.pink}10)`,
                backgroundSize: '200% 100%', border: `1px solid ${T.pink}28`, color: T.pink,
                animation: 'pointsGlint 3s ease 0.8s both'
              }}>
                ◆ {profile?.points ?? 0} pts
              </span>
              {(profile?.accepted_solutions_count ?? 0) > 0 && (
                <span style={{
                  fontFamily: T.mono, fontSize: 10, padding: '3px 10px',
                  borderRadius: 20, background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.25)', color: T.green
                }}>
                  ✓ {profile.accepted_solutions_count} solved
                </span>
              )}
            </div>

            {profile?.bio && (
              <p style={{
                fontFamily: T.sans, fontSize: 13, color: T.muted, lineHeight: 1.7,
                textAlign: 'center', margin: '0 0 22px', position: 'relative', zIndex: 1,
                animation: 'fadeSlideUp 0.4s ease 0.35s both'
              }}>
                {profile.bio}
              </p>
            )}
          </div>

          <div style={{ height: 1, background: T.border, margin: '0 24px 18px', flexShrink: 0 }} />

          <div style={{
            padding: '0 16px', display: 'flex', flexDirection: 'column',
            gap: 6, flexShrink: 0
          }}>
            <p style={{
              fontFamily: T.mono, fontSize: 8, color: T.faint,
              letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px 4px'
            }}>stats</p>
            <StatRow value={stats.posts} label="posts" color={T.pink} delay={80} />
            <StatRow value={stats.projects} label="projects" color={T.indigo} delay={140} />
            <StatRow value={stats.communities} label="communities" color={T.cyan} delay={200} />
            <StatRow value={stats.followers} label="followers" color={T.green} delay={260}
              onClick={() => setFollowModal('followers')} />
            <StatRow value={stats.following} label="following" color={T.amber} delay={320}
              onClick={() => setFollowModal('following')} />
          </div>

          <div style={{ height: 1, background: T.border, margin: '20px 24px 18px', flexShrink: 0 }} />

          {(profile?.github_url || profile?.website_url || profile?.resume_url) && (
            <div style={{
              padding: '0 16px', display: 'flex', flexDirection: 'column',
              gap: 6, flexShrink: 0
            }}>
              <p style={{
                fontFamily: T.mono, fontSize: 8, color: T.faint,
                letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px 4px'
              }}>links</p>
              {profile.github_url && (
                <SideLink href={profile.github_url} icon={<FaGithub size={14} />}
                  label="GitHub" color={T.text} />
              )}
              {profile.website_url && (
                <SideLink href={profile.website_url} icon={<FiGlobe size={14} />}
                  label="Portfolio" color={T.indigo} />
              )}
              {profile.resume_url && (
                <SideLink href={profile.resume_url} icon={<MdContactPage size={14} />}
                  label="Resume" color={T.pink} />
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ padding: '20px 16px', flexShrink: 0 }}>
            <button onClick={openModal}
              onMouseEnter={() => setBtnHov(true)} onMouseLeave={() => setBtnHov(false)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 12,
                border: `1px solid ${btnHov ? T.pink + '55' : T.borderH}`,
                background: btnHov
                  ? `linear-gradient(90deg,${T.pink}12,${T.indigo}12,${T.pink}12)`
                  : 'transparent',
                backgroundSize: '200% 100%', color: btnHov ? T.pink : T.muted,
                fontFamily: T.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.05em', transition: 'all 0.2s ease',
                transform: btnHov ? 'translateY(-1px)' : 'none',
                boxShadow: btnHov ? `0 4px 16px ${T.pink}15` : 'none',
                animation: btnHov ? 'glintSweep 1.2s linear infinite' : 'none'
              }}>
              <FiEdit2 size={13} /> edit profile
            </button>
          </div>
        </aside>

        {/* ── RIGHT main ── */}
        <main style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          animation: 'fadeSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both'
        }}>

          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: `${T.bg}ee`, backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${T.border}`,
            padding: '10px 28px', display: 'flex', gap: 4,
            flexWrap: 'wrap', alignItems: 'center'
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, marginRight: 6 }}>~/</span>
            {tabs.map(t => (
              <Tab key={t.id} {...t} active={activeTab === t.id} onClick={switchTab} />
            ))}
          </div>

          <div key={tabKey} style={{
            flex: 1, padding: '32px 28px 80px',
            animation: 'contentReveal 0.3s ease both'
          }}>

            {activeTab === 'posts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {myPosts.length === 0
                  ? <div style={{ gridColumn: '1/-1' }}><Empty icon="⌨️" text="no code posts yet" /></div>
                  : myPosts.map((p, i) => (
                    <div key={p.id} style={{ animation: `cardEntrance 0.35s ease both`, animationDelay: `${i * 40}ms` }}>
                      <PostCardMini
                        post={{ id: p.id, fileName: p.file_name, code: p.code, caption: p.caption, tag: p.tag, likes: p.likes, comments: p.comments }}
                        onClick={() => { setSelectedPost(p); setIsPostModalOpen(true); }}
                        onDelete={id => setMyPosts(prev => prev.filter(x => x.id !== id))}
                        canDelete />
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'projects' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 740 }}>
                {myProjects.length === 0
                  ? <Empty icon="🚀" text="no projects yet" />
                  : myProjects.map((proj, i) => (
                    <div key={proj.id} style={{ animation: `cardEntrance 0.35s ease both`, animationDelay: `${i * 50}ms` }}>
                      <ProjectCard
                        post={{
                          ...proj,
                          author_name: profile?.name ?? null,
                          github_username: profile?.username ?? null,
                          author_avatar: profile?.avatar ?? null,
                        }}
                        currentUser={user}
                        onDelete={id => setMyProjects(prev => prev.filter(p => p.id !== id))} />
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'communities' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                {myCommunities.length === 0
                  ? <div style={{ gridColumn: '1/-1' }}><Empty icon="🌐" text="not in any communities yet" /></div>
                  : myCommunities.map((c, i) => (
                    <CommunityCard key={c.id} community={c} index={i}
                      onNavigate={() => navigate(`/community/${c.id}`)} />
                  ))
                }
              </div>
            )}

            {activeTab === 'badges' && (
              <BadgesTab userId={profile?.id} userName={profile?.name}
                userInitials={getInitials(profile?.name ?? '')} />
            )}
            {activeTab === 'notifications' && (
              <div style={{ maxWidth: 680 }}>
                <NotificationsTab userId={user?.id} onOpen={() => setUnreadCount(0)} />
              </div>
            )}
            {activeTab === 'messages' && (
              <div style={{ maxWidth: 680 }}>
                <MessagesTab userId={user?.id}
                  onRead={() => setUnreadMessages(c => Math.max(0, c - 1))} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── EDIT MODAL ── */}
      {isModalOpen && (
        <div onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px', overflowY: 'auto',
            animation: 'backdropIn 0.2s ease both'
          }}>

          <div style={{
            width: '100%', maxWidth: 500, borderRadius: 22,
            background: T.card, border: `1px solid ${T.borderH}`,
            boxShadow: `0 0 0 1px rgba(244,114,182,0.07),0 48px 100px rgba(0,0,0,0.85)`,
            overflow: 'hidden',
            animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1)'
          }}>

            {/* shimmer top bar */}
            <div style={{
              height: 3,
              background: `linear-gradient(90deg,${T.pink},${T.purple},${T.indigo},${T.cyan},${T.pink})`,
              backgroundSize: '200% 100%', animation: 'glintSweep 3s linear infinite'
            }} />

            {/* header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`
            }}>
              <div>
                <p style={{
                  fontFamily: T.mono, fontSize: 8, color: T.pink,
                  letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px'
                }}>
                  edit_profile.jsx
                </p>
                <h2 style={{
                  fontFamily: T.sans, fontWeight: 800, fontSize: 19,
                  color: T.text, margin: 0, letterSpacing: '-0.01em'
                }}>
                  Update your profile
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                  color: T.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.pink; e.currentTarget.style.borderColor = `${T.pink}44`; e.currentTarget.style.transform = 'rotate(90deg)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'rotate(0deg)'; }}>
                <FiX size={14} />
              </button>
            </div>

            {/* scrollable body */}
            <div style={{
              padding: '20px 24px', display: 'flex', flexDirection: 'column',
              gap: 18, overflowY: 'auto', maxHeight: '70vh',
              scrollbarWidth: 'thin', scrollbarColor: `${T.border} transparent`
            }}>

              {/* ── AVATAR UPLOAD ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{
                  fontFamily: T.mono, fontSize: 9, fontWeight: 700,
                  color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase'
                }}>
                  Profile photo
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '16px 18px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${avatarPreview ? T.pink + '40' : T.border}`,
                  transition: 'border-color 0.2s'
                }}>
                  <AvatarUploadZone
                    currentSrc={profile?.avatar}
                    name={profile?.name}
                    previewUrl={avatarPreview}
                    uploading={avatarUploading}
                    onChange={handleAvatarPick}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: T.sans, fontSize: 13, color: T.mid,
                      margin: '0 0 5px', fontWeight: 600
                    }}>
                      {avatarPreview ? 'New photo selected' : 'Change your avatar'}
                    </p>
                    <p style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, margin: 0, lineHeight: 1.6 }}>
                      JPG, PNG or WebP · max 5MB<br />
                      Click the photo to pick a file
                    </p>
                    {avatarPreview && (
                      <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                        style={{
                          marginTop: 8, fontFamily: T.mono, fontSize: 9,
                          color: T.faint, background: 'none', border: 'none',
                          cursor: 'pointer', padding: 0, letterSpacing: '0.06em'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.pink}
                        onMouseLeave={e => e.currentTarget.style.color = T.faint}>
                        ✕ remove selection
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* divider */}
              <div style={{ height: 1, background: T.border, margin: '0 -2px' }} />

              {/* ── IDENTITY ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ModalField
                  label="Display name"
                  value={editFullName}
                  onChange={setEditFullName}
                  placeholder="Your full name"
                />
                <ModalField
                  label="Username"
                  value={editUsername}
                  onChange={v => setEditUsername(v.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  placeholder="handle"
                  hint="a–z, 0–9, _ -"
                />
              </div>

              {/* ── BIO ── */}
              <ModalField
                label="Bio"
                value={editBio}
                onChange={setEditBio}
                placeholder="Tell the world what you build…"
                multiline
              />

              {/* divider */}
              <div style={{ height: 1, background: T.border, margin: '0 -2px' }} />

              {/* ── LINKS ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ModalField
                  label="GitHub URL"
                  value={editGithub}
                  onChange={setEditGithub}
                  placeholder="https://github.com/…"
                />
                <ModalField
                  label="Portfolio"
                  value={editWebsite}
                  onChange={setEditWebsite}
                  placeholder="https://yoursite.com"
                />
              </div>

              {/* ── RESUME ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{
                  fontFamily: T.mono, fontSize: 9, fontWeight: 700,
                  color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase'
                }}>
                  Resume (PDF)
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 13px', background: T.bg,
                  border: `1px solid ${resumeFile ? 'rgba(52,211,153,0.4)' : T.border}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => { if (!resumeFile) e.currentTarget.style.borderColor = `${T.pink}45`; }}
                  onMouseLeave={e => { if (!resumeFile) e.currentTarget.style.borderColor = T.border; }}>
                  <MdContactPage size={15} style={{ color: T.faint, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: T.sans, fontSize: 13,
                    color: resumeFile ? T.green : T.muted, flex: 1
                  }}>
                    {resumeFile ? resumeFile.name : 'Upload PDF…'}
                  </span>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }}
                    onChange={e => setResumeFile(e.target.files[0])} />
                </label>
              </div>

              {/* ── OPEN TO WORK ── */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12,
                border: `1px solid ${editOpenToWork ? 'rgba(52,211,153,0.28)' : T.border}`,
                background: editOpenToWork ? 'rgba(52,211,153,0.06)' : 'transparent',
                transition: 'all 0.2s'
              }}>
                <div>
                  <p style={{
                    fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                    color: T.text, margin: '0 0 3px',
                    display: 'flex', alignItems: 'center', gap: 7
                  }}>
                    <MdWorkOutline size={14} style={{ color: T.green }} /> Open to Work
                  </p>
                  <p style={{ fontFamily: T.mono, fontSize: 9, color: T.faint, margin: 0 }}>
                    Shows a badge on your profile and posts
                  </p>
                </div>
                <button onClick={() => setEditOpenToWork(v => !v)}
                  style={{
                    position: 'relative', width: 46, height: 26, borderRadius: 13,
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: editOpenToWork ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.2s'
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, width: 20, height: 20,
                    borderRadius: '50%',
                    transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
                    left: editOpenToWork ? 'calc(100% - 23px)' : '3px',
                    background: editOpenToWork ? T.green : '#4a5370',
                    boxShadow: editOpenToWork ? `0 0 10px ${T.green}80` : 'none'
                  }} />
                </button>
              </div>

              {/* error */}
              {saveError && (
                <p style={{
                  fontFamily: T.mono, fontSize: 11, color: T.pink,
                  margin: 0, padding: '10px 14px', borderRadius: 9,
                  background: `${T.pink}0a`, border: `1px solid ${T.pink}30`
                }}>
                  {saveError}
                </p>
              )}
            </div>

            {/* footer actions */}
            <div style={{
              display: 'flex', gap: 10, padding: '16px 24px 22px',
              borderTop: `1px solid ${T.border}`
            }}>
              <button onClick={handleSaveChanges} disabled={saving}
                style={{
                  flex: 1, padding: '11px', borderRadius: 12,
                  background: saving ? `${T.pink}08` : `${T.pink}12`,
                  border: `1px solid ${T.pink}45`,
                  color: T.pink, fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                  opacity: saving ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = `${T.pink}22`; e.currentTarget.style.boxShadow = `0 0 20px ${T.pink}20`; } }}
                onMouseLeave={e => { e.currentTarget.style.background = `${T.pink}12`; e.currentTarget.style.boxShadow = 'none'; }}>
                {saving ? '// saving…' : 'save changes'}
              </button>
              <button onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '11px 20px', borderRadius: 12, background: 'transparent',
                  border: `1px solid ${T.border}`, color: T.faint,
                  fontFamily: T.mono, fontSize: 12, cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.borderH}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {followModal && profile && (
        <FollowListModal mode={followModal} targetUserId={profile.id}
          currentUserId={profile.id} onClose={() => setFollowModal(null)} />
      )}
      {isPostModalOpen && selectedPost && (
        <PostModal
          post={{
            id: selectedPost.id,
            user_id: selectedPost.user_id,
            author: {
              name: profile?.name || "Unknown User",
              avatar: profile?.avatar || null
            },
            created_at: selectedPost.created_at, tag: selectedPost.tag,
            fileName: selectedPost.file_name, code: selectedPost.code,
            caption: selectedPost.caption, likes: selectedPost.likes,
            comments: selectedPost.comments, shares: selectedPost.shares
          }}
          onClose={() => setIsPostModalOpen(false)}
          onDelete={id => setMyPosts(prev => prev.filter(p => p.id !== id))} />
      )}
    </div>
  );
};

export default Profile;
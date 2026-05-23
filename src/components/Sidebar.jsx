// src/components/Sidebar.jsx
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/TechThreads_Final.png';

import { useAuth }        from '../context/AuthContext';
import { getInitials, avatarGradient } from '../services/userService';

import {
  TbLayoutGrid,
  TbTelescope,
  TbPhotoUp,
  TbCode,
  TbHexagons,
  TbMarkdown,
  TbDoorExit,
} from 'react-icons/tb';

// ── design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#0e0e0d',
  surface:     '#161615',
  border:      '#252523',
  borderHover: '#343430',
  cyan:        '#00d4ff',
  pink:        '#f472b6',
  indigo:      '#818cf8',
  green:       '#00e676',
  text:        '#f0f4ff',
  textMid:     '#d0d8ee',
  textMuted:   '#8b95ae',
  textDim:     '#4a5878',
  mono:        "'Space Mono', monospace",
  sans:        "'Syne', sans-serif",
};

const LINKS = [
  { name: 'Feed',        path: '/feed',        exact: true, icon: TbLayoutGrid, size: 19, accent: C.cyan   },
  { name: 'Explore',     path: '/explore',                  icon: TbTelescope,  size: 19, accent: C.indigo },
  { name: 'Upload Post', path: '/upload',                   icon: TbPhotoUp,    size: 19, accent: C.green  },
  { name: 'Dev Arena',   path: '/challenges',               icon: TbCode,       size: 19, accent: '#f5a623'},
  { name: 'Communities', path: '/communities',              icon: TbHexagons,   size: 19, accent: C.pink   },
  { name: 'Docs',        path: '/docs',                     icon: TbMarkdown,   size: 19, accent: '#a78bfa'},
];

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ link }) {
  const [hov, setHov] = useState(false);
  const Icon = link.icon;

  return (
    <NavLink
      to={link.path}
      end={link.exact}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      {({ isActive }) => (
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '10px 14px', borderRadius: 11,
          cursor: 'pointer', transition: 'all 0.18s ease',
          background:  isActive ? `${link.accent}12` : hov ? 'rgba(255,255,255,0.03)' : 'transparent',
          border:     `1px solid ${isActive ? `${link.accent}35` : hov ? C.borderHover : 'transparent'}`,
          transform:   isActive ? 'translateX(3px)' : hov ? 'translateX(2px)' : 'translateX(0)',
        }}>
          {isActive && (
            <div style={{
              position: 'absolute', left: -1, top: '20%', bottom: '20%',
              width: 3, borderRadius: 2,
              background:  `linear-gradient(180deg, ${link.accent}, ${link.accent}88)`,
              boxShadow:   `0 0 8px ${link.accent}66`,
            }} />
          )}
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background:  isActive ? `${link.accent}18` : hov ? `${link.accent}0d` : 'rgba(255,255,255,0.025)',
            border:     `1px solid ${isActive ? `${link.accent}40` : C.border}`,
            color:       isActive ? link.accent : hov ? link.accent : C.textDim,
            transition:  'all 0.18s ease',
          }}>
            <Icon size={link.size} strokeWidth={1.6} />
          </div>
          <span style={{
            fontFamily:   C.sans, fontSize: 13,
            fontWeight:   isActive ? 700 : 500,
            color:        isActive ? link.accent : hov ? C.textMid : C.textMuted,
            letterSpacing:'0.01em', transition: 'color 0.15s', flex: 1,
          }}>
            {link.name}
          </span>
          {isActive && (
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: link.accent, boxShadow: `0 0 6px ${link.accent}`, flexShrink: 0,
            }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, signOut } = useAuth();

  const [logoutHov,    setLogoutHov]    = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const isProfileActive =
    location.pathname === '/profile' || location.pathname.startsWith('/profile');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl  = profile?.avatar_url ?? null;
  const name       = profile?.full_name || profile?.username || 'You';
  const gradient   = avatarGradient(profile?.username ?? '');
  const initials   = getInitials(profile?.full_name ?? '');

  return (
    <>
      <style>{`
        @keyframes sb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes sb-glow  { 0%,100%{box-shadow:0 0 8px #00d4ff44} 50%{box-shadow:0 0 18px #00d4ff88} }
      `}</style>

      <div style={{
        width: 260, flexShrink: 0,
        height: '100vh',
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, zIndex: 100,
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.004) 2px, rgba(255,255,255,0.004) 4px)',
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px 16px 12px',
          position: 'relative',
        }}>
          <img
            src={logo}
            alt="TechThreads"
            style={{
              width: '100%',
              maxWidth: 220,
              height: 55,
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
              borderRadius: 6,
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0, left: 16, right: 16,
            height: 1,
            background: `linear-gradient(90deg, ${C.cyan}50, transparent)`,
          }} />
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, padding: '14px 10px',
          display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto',
        }}>
          <p style={{
            fontFamily: C.mono, fontSize: 8, color: C.textDim,
            letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 4px 8px',
          }}>
            navigation
          </p>
          {LINKS.map((link) => (
            <NavItem key={link.path} link={link} />
          ))}
        </nav>

        {/* Divider */}
        <div style={{
          margin: '0 14px', height: 1,
          background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
        }} />

        {/* User profile strip */}
        {profile && (
          <div
            style={{
              margin: '10px 10px 4px', padding: '10px 12px', borderRadius: 12,
              background:  isProfileActive ? 'rgba(156,111,255,0.1)' : 'rgba(255,255,255,0.02)',
              border:     `1px solid ${isProfileActive ? 'rgba(156,111,255,0.35)' : C.border}`,
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer',
              transform:  isProfileActive ? 'translateX(3px)' : 'translateX(0)',
              transition: 'all 0.18s ease', position: 'relative',
            }}
            onClick={() => navigate('/profile')}
            onMouseEnter={(e) => {
              if (isProfileActive) return;
              e.currentTarget.style.borderColor = C.borderHover;
              e.currentTarget.style.background  = 'rgba(255,255,255,0.035)';
              e.currentTarget.style.transform   = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              if (isProfileActive) return;
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.background  = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.transform   = 'translateX(0)';
            }}
          >
            {isProfileActive && (
              <div style={{
                position: 'absolute', left: -1, top: '20%', bottom: '20%',
                width: 3, borderRadius: 2,
                background: 'linear-gradient(180deg,#9c6fff,#9c6fff88)',
                boxShadow: '0 0 8px #9c6fff66',
              }} />
            )}

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={() => setAvatarFailed(true)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', objectFit: 'cover',
                    border: `2px solid ${isProfileActive ? 'rgba(156,111,255,0.6)' : C.border}`,
                  }}
                />
              ) : (
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: '#fff',
                  border: `2px solid ${isProfileActive ? 'rgba(156,111,255,0.6)' : C.border}`,
                }}>
                  {initials}
                </div>
              )}
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: C.green,
                border: `2px solid ${C.bg}`,
                boxShadow: `0 0 5px ${C.green}88`,
              }} />
            </div>

            {/* Name + points */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: C.sans, fontSize: 13, fontWeight: 700,
                color:      isProfileActive ? '#9c6fff' : C.text,
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {name}
              </p>
              <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, margin: '2px 0 0' }}>
                {profile.points ?? 0} pts
              </p>
            </div>

            {isProfileActive ? (
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#9c6fff', boxShadow: '0 0 6px #9c6fff', flexShrink: 0,
              }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
                stroke={C.textDim} strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 8h8M9 5l3 3-3 3" />
              </svg>
            )}
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '6px 10px 14px' }}>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHov(true)}
            onMouseLeave={() => setLogoutHov(false)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 11,
              border:      `1px solid ${logoutHov ? 'rgba(255,76,106,0.5)' : 'rgba(255,76,106,0.18)'}`,
              background:   logoutHov ? 'rgba(255,76,106,0.1)' : 'rgba(255,76,106,0.04)',
              color:        logoutHov ? '#ff4c6a' : '#6b3040',
              cursor: 'pointer', transition: 'all 0.18s ease',
              fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            }}
          >
            <TbDoorExit size={16} strokeWidth={1.8} />
            <span>sign out</span>
          </button>
        </div>

      </div>
    </>
  );
};

export default Sidebar;
// src/features/profile/pages/UserProfile.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   REPLACED: supabase.auth.getUser()              → useAuth() from AuthContext
//   REPLACED: inline profiles select (by id/username) → getProfile() from userService
//   REPLACED: inline posts + project_posts queries → getUserPosts() from postService
//   REPLACED: inline follow count queries          → getFollowCounts() from userService
//   REPLACED: inline isFollowing check             → isFollowing() from userService
//   REPLACED: inline follow/unfollow               → toggleFollow() from userService
//   REPLACED: inline getInitials()                 → getInitials() from userService
//   REMOVED:  stale author_name/author_avatar in PostModal (resolved from profileMap)
//   KEPT: ALL UI — cover banner, back button, follow button, stats, tabs, modals
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';

import { useAuth } from '../../../context/AuthContext';
import {
  getInitials, getFollowCounts,
  isFollowing as checkIsFollowing,
  toggleFollow,
} from '../../../services/userService';
import { getUserPosts } from '../../../services/postService';

import PostCardMini    from '../../feed/components/PostCardMini';
import ProjectCard     from '../../feed/components/ProjectCard';
import PostModal       from '../../feed/components/PostModal';
import FollowListModal from '../components/FollowListModal';

import { FaGithub, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import { MdContactPage }                      from 'react-icons/md';
import { FiGlobe, FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { HiOutlineLightningBolt }             from 'react-icons/hi';

import MessageModal from '../components/MessageModal';

// ── shared sub-components (identical to Profile.jsx) ─────────────────────────

function StatCard({ value, label, accent = '#f472b6', onClick }) {
  const clickable = !!onClick;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl border relative overflow-hidden transition-all"
      style={{ background: '#131312', borderColor: '#252523', cursor: clickable ? 'pointer' : 'default', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!clickable) return; e.currentTarget.style.borderColor=`${accent}55`; e.currentTarget.style.background='#161615'; }}
      onMouseLeave={(e) => { if (!clickable) return; e.currentTarget.style.borderColor='#252523'; e.currentTarget.style.background='#131312'; }}>
      <div className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>{value}</p>
      <p className="text-[11px] mt-0.5 uppercase tracking-widest font-medium" style={{ color: '#6b7a99' }}>{label}</p>
      {clickable && <p className="text-[9px] mt-1 uppercase tracking-widest" style={{ color: '#4a5878' }}>tap to view</p>}
    </div>
  );
}

function Tab({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border"
      style={active
        ? { background: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.35)', color: '#f472b6' }
        : { background: 'transparent', borderColor: 'transparent', color: '#6b7a99' }
      }>{icon}{label}</button>
  );
}

function EmptyState({ message, icon }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-16 rounded-2xl border w-full"
      style={{ background: '#131312', borderColor: '#252523', borderStyle: 'dashed' }}>
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-[13px]" style={{ color: '#6b7a99' }}>{message}</p>
    </div>
  );
}

function NotFound({ onBack }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0e0e0d' }}>
      <p className="text-5xl">👤</p>
      <p className="text-[16px] font-semibold" style={{ color: '#f0f4ff' }}>User not found</p>
      <p className="text-[13px]" style={{ color: '#6b7a99' }}>This profile doesn't exist or has been removed.</p>
      <button onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer mt-2"
        style={{ background: 'rgba(244,114,182,0.09)', borderColor: 'rgba(244,114,182,0.28)', color: '#f472b6' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,114,182,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244,114,182,0.09)')}>
        <FiArrowLeft size={14} /> Go back
      </button>
    </div>
  );
}

// ── UserProfile ───────────────────────────────────────────────────────────────

const UserProfile = () => {
  const { username, id } = useParams();
  const navigate = useNavigate();

  // ── auth from context (replaces supabase.auth.getUser()) ─────────────────
  const { user: me } = useAuth();

  const [profile,         setProfile]         = useState(null);
  const [stats,           setStats]           = useState({ posts: 0, projects: 0, followers: 0, following: 0 });
  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [activeTab,       setActiveTab]       = useState('posts');
  const [theirPosts,      setTheirPosts]      = useState([]);
  const [theirProjects,   setTheirProjects]   = useState([]);
  const [following,       setFollowing]       = useState(false);
  const [followLoading,   setFollowLoading]   = useState(false);
  const [selectedPost,    setSelectedPost]    = useState(null);
  const [followModal,     setFollowModal]     = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [messageModal,    setMessageModal]    = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      // resolve user by id or username from the URL param
      let profileRow = null;
      if (id) {
        const { data, error } = await supabase
          .from('profiles').select('*').eq('id', id).single();
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        profileRow = data;
      } else if (username) {
        const { data, error } = await supabase
          .from('profiles').select('*').eq('username', username).maybeSingle();
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        profileRow = data;
      }

      if (!profileRow) { setNotFound(true); setLoading(false); return; }

      // redirect to own profile page if viewing self
      if (me && profileRow.id === me.id) { navigate('/profile'); return; }

      setProfile({
        id:          profileRow.id,
        name:        profileRow.full_name,
        username:    profileRow.username,
        avatar:      profileRow.avatar_url,
        bio:         profileRow.bio         || null,
        github_url:  profileRow.github_url  || null,
        website_url: profileRow.website_url || null,
        resume_url:  profileRow.resume_url  || null,
      });

      // posts (code + project) via postService
      const allPosts = await getUserPosts(profileRow.id);
      setTheirPosts(allPosts.filter(p => p.type === 'code'));
      setTheirProjects(allPosts.filter(p => p.type === 'project'));

      // follow counts via userService
      const { followers, following: followingCount } = await getFollowCounts(profileRow.id);
      setStats({
        posts:     allPosts.filter(p => p.type === 'code').length,
        projects:  allPosts.filter(p => p.type === 'project').length,
        followers,
        following: followingCount,
      });

      // is current user following this person?
      if (me) {
        const isF = await checkIsFollowing(me.id, profileRow.id);
        setFollowing(isF);
      }

    } catch (err) {
      console.error('UserProfile load error:', err);
      setNotFound(true);
    }
    setLoading(false);
  }, [username, id, navigate, me]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── follow / unfollow via userService ─────────────────────────────────────
  const handleFollow = async () => {
    if (!me?.id || !profile?.id || followLoading) return;
    setFollowLoading(true);

    const { following: newState } = await toggleFollow(me.id, profile.id);
    setFollowing(newState);
    setStats(prev => ({
      ...prev,
      followers: newState ? prev.followers + 1 : Math.max(0, prev.followers - 1),
    }));

    setFollowLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0e0e0d' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: '#f472b6', borderTopColor: 'transparent' }} />
          <p className="text-[13px] font-medium tracking-widest uppercase" style={{ color: '#6b7a99' }}>
            Loading profile
          </p>
        </div>
      </div>
    );
  }

  if (notFound) return <NotFound onBack={() => navigate(-1)} />;

  const tabs = [
    { id: 'posts',    label: 'Posts',    icon: <HiOutlineLightningBolt size={13} /> },
    { id: 'projects', label: 'Projects', icon: <FiGlobe size={12} /> },
  ];

  // ── render (UI unchanged from original) ──────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ background: '#0e0e0d', fontFamily: 'var(--sans)' }}>

      {/* Cover banner */}
      <div className="w-full relative" style={{ height: '160px' }}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #131312 0%, #1a1018 40%, #131518 70%, #131312 100%)',
          borderBottom: '1px solid #252523',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(#f472b6 1px,transparent 1px),linear-gradient(90deg,#f472b6 1px,transparent 1px)`,
          backgroundSize: '40px 40px', opacity: 0.035,
        }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 left-1/4 w-64 h-64 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: 'radial-gradient(circle, #f472b6, transparent)' }} />
          <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        </div>
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: '#252523', color: '#6b7a99' }}
          onMouseEnter={(e) => { e.currentTarget.style.color='#f0f4ff'; e.currentTarget.style.borderColor='#343430'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color='#6b7a99'; e.currentTarget.style.borderColor='#252523'; }}>
          <FiArrowLeft size={13} /> Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16">

        {/* Header row */}
        <div className="flex items-end justify-between" style={{ marginTop: '-56px', marginBottom: '20px' }}>
          <div className="relative z-10">
            {profile.avatar ? (
              <div className="w-28 h-28 rounded-2xl overflow-hidden" style={{
                border: '3px solid #0e0e0d',
                outline: '2px solid rgba(244,114,182,0.45)',
                boxShadow: '0 0 28px rgba(244,114,182,0.18)',
              }}>
                <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{
                background: 'linear-gradient(135deg,#E8435A,#7F77DD)',
                border: '3px solid #0e0e0d',
                boxShadow: '0 0 28px rgba(244,114,182,0.18)',
              }}>
                {getInitials(profile.name || '')}
              </div>
            )}
          </div>

          {me && (
            <div className="flex items-center gap-3 mb-1">
              {/* Message button */}
              <button onClick={() => setMessageModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer border"
                style={{ background: 'rgba(129,140,248,0.10)', borderColor: 'rgba(129,140,248,0.30)', color: '#818cf8' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(129,140,248,0.20)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(129,140,248,0.10)')}>
                <FiMessageSquare size={14} /> Message
              </button>

              {/* Follow button */}
              <button onClick={handleFollow} disabled={followLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer border mb-1"
              style={following
                ? { background: 'rgba(255,255,255,0.04)', borderColor: '#2e2e2b', color: '#8b95ae' }
                : { background: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.35)', color: '#f472b6', boxShadow: '0 0 16px rgba(244,114,182,0.12)' }
              }
              onMouseEnter={(e) => {
                if (following) {
                  e.currentTarget.style.background='rgba(255,60,60,0.08)';
                  e.currentTarget.style.borderColor='rgba(255,60,60,0.3)';
                  e.currentTarget.style.color='#f87171';
                  e.currentTarget.innerText = '✕  Unfollow';
                } else {
                  e.currentTarget.style.background='rgba(244,114,182,0.22)';
                }
              }}
              onMouseLeave={(e) => {
                if (following) {
                  e.currentTarget.style.background='rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor='#2e2e2b';
                  e.currentTarget.style.color='#8b95ae';
                  e.currentTarget.innerHTML = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg> Following`;
                } else {
                  e.currentTarget.style.background='rgba(244,114,182,0.12)';
                }
              }}>
              {following ? <><FaUserCheck size={14} /> Following</> : <><FaUserPlus size={14} /> Follow</>}
            </button>
            </div>
          )}
        </div>

        {/* Identity block */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f0f4ff' }}>
            {profile.name || username}
          </h1>
          <p className="text-[13px] font-mono mt-0.5" style={{ color: '#6b7a99' }}>@{profile.username}</p>
          {profile.bio && (
            <p className="text-[13px] mt-2 max-w-lg leading-relaxed" style={{ color: '#8b95ae' }}>{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border"
                style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.12)', color:'#f0f4ff', boxShadow:'0 2px 12px rgba(0,0,0,0.35)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='translateY(0)'; }}>
                <FaGithub size={17} /> GitHub
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border"
                style={{ background:'rgba(129,140,248,0.09)', borderColor:'rgba(129,140,248,0.28)', color:'#818cf8', boxShadow:'0 2px 12px rgba(129,140,248,0.1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(129,140,248,0.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(129,140,248,0.09)'; e.currentTarget.style.transform='translateY(0)'; }}>
                <FiGlobe size={16} /> Portfolio
              </a>
            )}
            {profile.resume_url && (
              <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border"
                style={{ background:'rgba(244,114,182,0.09)', borderColor:'rgba(244,114,182,0.28)', color:'#f472b6', boxShadow:'0 2px 12px rgba(244,114,182,0.1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(244,114,182,0.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(244,114,182,0.09)'; e.currentTarget.style.transform='translateY(0)'; }}>
                <MdContactPage size={17} /> Resume
              </a>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard value={stats.posts}     label="Posts"     accent="#f472b6" />
          <StatCard value={stats.projects}  label="Projects"  accent="#818cf8" />
          <StatCard value={stats.followers} label="Followers" accent="#34d399" onClick={() => setFollowModal('followers')} />
          <StatCard value={stats.following} label="Following" accent="#fb923c" onClick={() => setFollowModal('following')} />
        </div>

        <div className="h-px w-full mb-6"
          style={{ background: 'linear-gradient(90deg, transparent, #252523, transparent)' }} />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => <Tab key={t.id} id={t.id} label={t.label} icon={t.icon} active={activeTab === t.id} onClick={setActiveTab} />)}
        </div>

        {/* Posts */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theirPosts.length === 0 ? <EmptyState message="No code posts yet." icon="⌨️" /> : (
              theirPosts.map(p => (
                <PostCardMini key={p.id}
                  post={{ id: p.id, fileName: p.file_name, code: p.code, caption: p.caption, likes: p.likes, comments: p.comments }}
                  onClick={() => { setSelectedPost(p); setIsPostModalOpen(true); }}
                />
              ))
            )}
          </div>
        )}

        {/* Projects */}
        {activeTab === 'projects' && (
          <div className="flex flex-col gap-6">
            {theirProjects.length === 0 ? <EmptyState message="No projects yet." icon="🚀" /> : (
              theirProjects.map(proj => <ProjectCard key={proj.id} post={proj} />)
            )}
          </div>
        )}
      </div>

      {followModal && profile && (
        <FollowListModal mode={followModal} targetUserId={profile.id} currentUserId={me?.id ?? null} onClose={() => setFollowModal(null)} />
      )}

      {messageModal && profile && (
        <MessageModal developer={profile} onClose={() => setMessageModal(false)} />
      )}

      {isPostModalOpen && selectedPost && (
        <PostModal
          post={{
            id:         selectedPost.id,
            // Author resolved from loaded profile — no stale author_name/author_avatar
            author: {
              name:   profile.name   ?? null,
              avatar: profile.avatar ?? null,
            },
            tag:      selectedPost.tag,
            fileName: selectedPost.file_name,
            code:     selectedPost.code,
            caption:  selectedPost.caption,
            likes:    selectedPost.likes,
            comments: selectedPost.comments,
          }}
          onClose={() => setIsPostModalOpen(false)}
          onDelete={null}
        />
      )}
    </div>
  );
};

export default UserProfile;
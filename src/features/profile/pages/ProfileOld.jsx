import React, { useEffect, useState } from 'react';

import { useAuth }                                   from '../../../context/AuthContext';
import { getProfile as fetchProfile, getInitials,
         updateProfile, uploadResume,
         getFollowCounts }                           from '../../../services/userService';
import { getUserPosts }                              from '../../../services/postService';
import { supabase }                                  from '../../../services/supabaseClient';

import BadgesTab         from '../components/BadgesTab';
import NotificationsTab  from '../components/NotificationsTab';
import MessagesTab       from '../components/MessagesTab';
import PostCardMini      from '../../feed/components/PostCardMini';
import ProjectCard       from '../../feed/components/ProjectCard';
import PostModal         from '../../feed/components/PostModal';
import FollowListModal   from '../components/FollowListModal';

import { FaGithub }                                           from 'react-icons/fa';
import { MdContactPage, MdWorkOutline }                       from 'react-icons/md';
import { FiEdit2, FiGlobe, FiX, FiUser, FiBell,
         FiMessageSquare }                                    from 'react-icons/fi';
import { HiOutlineLightningBolt }                             from 'react-icons/hi';

import { getUnreadCount, subscribeToNotifications }  from '../../../services/notificationService';
import { getUnreadMessageCount }                      from '../../../services/messageService';

function StatCard({ value, label, accent = '#f472b6', onClick }) {
  const clickable = !!onClick;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl border relative overflow-hidden transition-all"
      style={{ background: '#131312', borderColor: '#252523', cursor: clickable ? 'pointer' : 'default', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!clickable) return; e.currentTarget.style.borderColor=`${accent}55`; e.currentTarget.style.background='#161615'; }}
      onMouseLeave={(e) => { if (!clickable) return; e.currentTarget.style.borderColor='#252523'; e.currentTarget.style.background='#131312'; }}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
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

function InputField({ label, value, onChange, placeholder, multiline = false }) {
  const base = { background: '#0f0f0e', border: '1px solid #252523', color: '#f0f4ff', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'var(--sans)', caretColor: '#f472b6', resize: 'none' };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#6b7a99' }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={base} onFocus={(e) => (e.target.style.borderColor = 'rgba(244,114,182,0.5)')} onBlur={(e) => (e.target.style.borderColor = '#252523')} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={base} onFocus={(e) => (e.target.style.borderColor = 'rgba(244,114,182,0.5)')} onBlur={(e) => (e.target.style.borderColor = '#252523')} />
      }
    </div>
  );
}

function EmptyState({ message, icon }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-16 rounded-2xl border w-full" style={{ background: '#131312', borderColor: '#252523', borderStyle: 'dashed' }}>
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-[13px]" style={{ color: '#6b7a99' }}>{message}</p>
    </div>
  );
}

// Badge icon with unread count overlay
function BadgeIcon({ icon, count, color }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {icon}
      {count > 0 && (
        <span style={{ position: 'absolute', top: -4, right: -5, minWidth: 14, height: 14, borderRadius: 7,
          background: color, color: '#fff', fontFamily: "'Space Mono',monospace", fontSize: 8, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
}

const Profile = () => {
  const { user, refreshProfile } = useAuth();

  const [profile,         setProfile]         = useState(null);
  const [stats,           setStats]           = useState({ posts: 0, projects: 0, communities: 0, followers: 0, following: 0 });
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState('posts');
  const [myPosts,         setMyPosts]         = useState([]);
  const [myProjects,      setMyProjects]      = useState([]);
  const [myCommunities,   setMyCommunities]   = useState([]);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [bio,             setBio]             = useState('');
  const [website,         setWebsite]         = useState('');
  const [github,          setGithub]          = useState('');
  const [resume,          setResume]          = useState(null);
  const [openToWork,      setOpenToWork]      = useState(false);
  const [selectedPost,    setSelectedPost]    = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [followModal,     setFollowModal]     = useState(null);
  const [unreadCount,     setUnreadCount]     = useState(0);
  const [unreadMessages,  setUnreadMessages]  = useState(0);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchProfile(user.id, true);
      if (!data) return;
      setProfile({ id: user.id, email: user.email, avatar: data.avatar_url || user.user_metadata?.avatar_url, name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name, username: data.username || user.user_metadata?.user_name, bio: data.bio, open_to_work: data.open_to_work || false, github_url: data.github_url, website_url: data.website_url, resume_url: data.resume_url, points: data.points ?? 0, accepted_solutions_count: data.accepted_solutions_count ?? 0 });
      setBio(data.bio || ''); setWebsite(data.website_url || ''); setGithub(data.github_url || ''); setOpenToWork(data.open_to_work || false);
      const [{ count: postsCount }, { count: projectsCount }, { count: commCount }, { followers, following }] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('project_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        getFollowCounts(user.id),
      ]);
      setStats({ posts: postsCount||0, projects: projectsCount||0, communities: commCount||0, followers, following });
      const allPosts = await getUserPosts(user.id);
      setMyPosts(allPosts.filter(p => p.type === 'code'));
      setMyProjects(allPosts.filter(p => p.type === 'project'));
      const { data: commData } = await supabase.from('community_members').select('community_id, communities(*)').eq('user_id', user.id);
      setMyCommunities((commData || []).map(r => r.communities));
    } catch (err) { console.error('Profile fetch error:', err); }
    setLoading(false);
  };

  const handleSaveChanges = async () => {
    if (!user?.id) return;
    let resumeUrl = profile.resume_url;
    if (resume) { const { url, error } = await uploadResume(user.id, resume); if (!error && url) resumeUrl = url; }
    await updateProfile(user.id, { bio, github_url: github, website_url: website, resume_url: resumeUrl, open_to_work: openToWork });
    await refreshProfile();
    setIsModalOpen(false);
    loadProfile();
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
    <div className="h-screen flex items-center justify-center" style={{ background: '#0e0e0d' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: '#f472b6', borderTopColor: 'transparent' }} />
        <p className="text-[13px] font-medium tracking-widest uppercase" style={{ color: '#6b7a99' }}>Loading profile</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'posts',         label: 'Posts',         icon: <HiOutlineLightningBolt size={13} /> },
    { id: 'projects',      label: 'Projects',       icon: <FiGlobe size={12} /> },
    { id: 'communities',   label: 'Communities',    icon: <FiUser size={12} /> },
    { id: 'badges',        label: 'Badges',         icon: <span className="text-[11px]">🏅</span> },
    { id: 'notifications', label: 'Notifications',  icon: <BadgeIcon icon={<FiBell size={12}/>}          count={unreadCount}    color="#f472b6" /> },
    { id: 'messages',      label: 'Messages',       icon: <BadgeIcon icon={<FiMessageSquare size={12}/>} count={unreadMessages} color="#818cf8" /> },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: '#0e0e0d', fontFamily: 'var(--sans)' }}>
      <div className="w-full relative" style={{ height: '160px' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #131312 0%, #1a1018 40%, #131518 70%, #131312 100%)', borderBottom: '1px solid #252523' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(#f472b6 1px,transparent 1px),linear-gradient(90deg,#f472b6 1px,transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.035 }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 left-1/4 w-64 h-64 rounded-full opacity-[0.08] blur-3xl" style={{ background: 'radial-gradient(circle, #f472b6, transparent)' }} />
          <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full opacity-[0.08] blur-3xl" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between" style={{ marginTop: '-56px', marginBottom: '20px' }}>
          <div className="relative z-10">
            {profile?.avatar
              ? <div className="w-28 h-28 rounded-2xl overflow-hidden" style={{ border: '3px solid #0e0e0d', outline: '2px solid rgba(244,114,182,0.45)', boxShadow: '0 0 28px rgba(244,114,182,0.18)' }}><img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" /></div>
              : <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#E8435A,#7F77DD)', border: '3px solid #0e0e0d', boxShadow: '0 0 28px rgba(244,114,182,0.18)' }}>{getInitials(profile?.name || '')}</div>
            }
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer border mb-1" style={{ background: 'rgba(244,114,182,0.09)', borderColor: 'rgba(244,114,182,0.28)', color: '#f472b6' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244,114,182,0.18)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244,114,182,0.09)')}><FiEdit2 size={13} /> Edit Profile</button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f0f4ff' }}>{profile?.name || 'Unknown User'}</h1>
            {profile?.open_to_work && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}><MdWorkOutline size={10} /> Open to Work</span>}
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#6b7a99' }}><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" /></span>online</span>
          </div>
          <p className="text-[13px] font-mono mt-0.5" style={{ color: '#6b7a99' }}>@{profile?.username}</p>
          {profile?.bio && <p className="text-[13px] mt-2 max-w-lg leading-relaxed" style={{ color: '#8b95ae' }}>{profile.bio}</p>}
          <div className="flex flex-wrap gap-3 mt-4">
            {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border" style={{ background:'rgba(255,255,255,0.05)',borderColor:'rgba(255,255,255,0.12)',color:'#f0f4ff',boxShadow:'0 2px 12px rgba(0,0,0,0.35)' }} onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={(e)=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.transform='translateY(0)';}}><FaGithub size={17} /> GitHub</a>}
            {profile?.website_url && <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border" style={{ background:'rgba(129,140,248,0.09)',borderColor:'rgba(129,140,248,0.28)',color:'#818cf8',boxShadow:'0 2px 12px rgba(129,140,248,0.1)' }} onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(129,140,248,0.18)';e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={(e)=>{e.currentTarget.style.background='rgba(129,140,248,0.09)';e.currentTarget.style.transform='translateY(0)';}}><FiGlobe size={16} /> Portfolio</a>}
            {profile?.resume_url && <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all border" style={{ background:'rgba(244,114,182,0.09)',borderColor:'rgba(244,114,182,0.28)',color:'#f472b6',boxShadow:'0 2px 12px rgba(244,114,182,0.1)' }} onMouseEnter={(e)=>{e.currentTarget.style.background='rgba(244,114,182,0.18)';e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={(e)=>{e.currentTarget.style.background='rgba(244,114,182,0.09)';e.currentTarget.style.transform='translateY(0)';}}><MdContactPage size={17} /> Resume</a>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard value={stats.posts}       label="Posts"       accent="#f472b6" />
          <StatCard value={stats.projects}    label="Projects"    accent="#818cf8" />
          <StatCard value={stats.communities} label="Communities" accent="#38bdf8" />
          <StatCard value={stats.followers}   label="Followers"   accent="#34d399" onClick={() => setFollowModal('followers')} />
          <StatCard value={stats.following}   label="Following"   accent="#fb923c" onClick={() => setFollowModal('following')} />
        </div>

        <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, #252523, transparent)' }} />

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => <Tab key={t.id} id={t.id} label={t.label} icon={t.icon} active={activeTab === t.id} onClick={setActiveTab} />)}
        </div>

        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPosts.length === 0 ? <EmptyState message="No code posts yet." icon="⌨️" /> : myPosts.map(p => (
              <PostCardMini key={p.id} post={{ id: p.id, fileName: p.file_name, code: p.code, caption: p.caption, tag: p.tag, likes: p.likes, comments: p.comments }}
                onClick={() => { setSelectedPost(p); setIsPostModalOpen(true); }}
                onDelete={(deletedId) => setMyPosts(prev => prev.filter(x => x.id !== deletedId))} canDelete />
            ))}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="flex flex-col gap-6">
            {myProjects.length === 0 ? <EmptyState message="No projects yet." icon="🚀" /> : myProjects.map(proj => <ProjectCard key={proj.id} post={proj} />)}
          </div>
        )}

        {activeTab === 'communities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCommunities.length === 0 ? <EmptyState message="Not part of any communities yet." icon="🌐" /> : myCommunities.map(c => (
              <div key={c.id} className="p-4 rounded-2xl border text-[13px]" style={{ background: '#161615', borderColor: '#252523', color: '#8b95ae', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{c.name}</div>
            ))}
          </div>
        )}

        {activeTab === 'badges' && <BadgesTab userId={profile?.id} userName={profile?.name} userInitials={getInitials(profile?.name ?? '')} />}
        {activeTab === 'notifications' && <NotificationsTab userId={user?.id} onOpen={() => setUnreadCount(0)} />}
        {activeTab === 'messages' && <MessagesTab userId={user?.id} onRead={() => setUnreadMessages(c => Math.max(0, c - 1))} />}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#161615', border: '1px solid #252523', boxShadow: '0 0 60px rgba(244,114,182,0.08), 0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#252523' }}>
              <div><h2 className="text-[15px] font-bold" style={{ color: '#f0f4ff' }}>Edit Profile</h2><p className="text-[11px] mt-0.5" style={{ color: '#6b7a99' }}>Update your public info</p></div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer border-none bg-transparent" style={{ color: '#6b7a99' }} onMouseEnter={(e)=>{e.currentTarget.style.color='#f0f4ff';e.currentTarget.style.background='rgba(255,255,255,0.05)';}} onMouseLeave={(e)=>{e.currentTarget.style.color='#6b7a99';e.currentTarget.style.background='transparent';}}><FiX size={15} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <InputField label="Bio" value={bio} onChange={setBio} placeholder="Tell the world what you build..." multiline />
              <InputField label="GitHub URL" value={github} onChange={setGithub} placeholder="https://github.com/username" />
              <InputField label="Portfolio / Website" value={website} onChange={setWebsite} placeholder="https://yoursite.com" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#6b7a99' }}>Resume (PDF)</label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all" style={{ background: '#0f0f0e', borderColor: '#252523' }} onMouseEnter={(e)=>(e.currentTarget.style.borderColor='rgba(244,114,182,0.35)')} onMouseLeave={(e)=>(e.currentTarget.style.borderColor='#252523')}>
                  <MdContactPage size={16} style={{ color: '#6b7a99' }} />
                  <span className="text-[12px] flex-1" style={{ color: '#6b7a99' }}>{resume ? resume.name : 'Upload PDF…'}</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setResume(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 pb-4">
              <div><p className="text-[13px] font-semibold flex items-center gap-2" style={{ color: '#f0f4ff' }}><MdWorkOutline size={15} className="text-[#34d399]" /> Open to Work</p><p className="text-[11px] mt-0.5" style={{ color: '#6b7a99' }}>Shows a badge on your project posts so recruiters notice you</p></div>
              <button onClick={() => setOpenToWork(v => !v)} className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all cursor-pointer border-none" style={{ background: openToWork ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: openToWork ? 'calc(100% - 22px)' : '2px', background: openToWork ? '#34d399' : '#4a5878', boxShadow: openToWork ? '0 0 8px rgba(52,211,153,0.5)' : 'none' }} />
              </button>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={handleSaveChanges} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border" style={{ background: 'rgba(244,114,182,0.12)', borderColor: 'rgba(244,114,182,0.35)', color: '#f472b6' }} onMouseEnter={(e)=>(e.currentTarget.style.background='rgba(244,114,182,0.22)')} onMouseLeave={(e)=>(e.currentTarget.style.background='rgba(244,114,182,0.12)')}>Save Changes</button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border" style={{ background: 'transparent', borderColor: '#252523', color: '#6b7a99' }} onMouseEnter={(e)=>(e.currentTarget.style.borderColor='#343430')} onMouseLeave={(e)=>(e.currentTarget.style.borderColor='#252523')}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {followModal && profile && <FollowListModal mode={followModal} targetUserId={profile.id} currentUserId={profile.id} onClose={() => setFollowModal(null)} />}
      {isPostModalOpen && selectedPost && (
        <PostModal post={{ id: selectedPost.id, author: { name: profile?.name ?? null, avatar: profile?.avatar ?? null }, created_at: selectedPost.created_at, tag: selectedPost.tag, fileName: selectedPost.file_name, code: selectedPost.code, caption: selectedPost.caption, likes: selectedPost.likes, comments: selectedPost.comments, shares: selectedPost.shares }} onClose={() => setIsPostModalOpen(false)} onDelete={(id) => setMyPosts(prev => prev.filter(p => p.id !== id))} />
      )}
    </div>
  );
};

export default Profile;
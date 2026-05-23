// src/features/feed/pages/Feed.jsx
// Community posts removed from feed — they live in Explore only.
//
// ── SEARCH FIX ────────────────────────────────────────────────────────────────
// Root cause: postMatchesQuery only checks fields on the post row itself
// (tag, caption, project_title, etc). Author name/username live in profileMap,
// NOT on the post row, so searching "Suraj" returned nothing even though
// Suraj's posts were in the feed.
//
// Fix: filteredPosts now additionally checks profileMap[p.user_id] for
// full_name and username against the search query, so searching by author
// name works alongside content search.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

import { getFollowingIds, getProfileMap } from '../../../services/userService';
import { getFollowingFeed }               from '../../../services/postService';
import { postMatchesQuery }               from '../../../utils/helpers';

import PostCard          from '../components/PostCard';
import ProjectCard       from '../components/ProjectCard';
import SpotlightBanner   from '../components/SpotlightBanner';
import RightSidebar      from '../components/RightSidebar';
import ActivityStreamBar from '../components/ActivityStreamBar';

const SPOTLIGHT_AFTER    = 3;
const SCROLL_TOP_PADDING = 100;

// ── particle burst ────────────────────────────────────────────────────────────
const TECH_COLORS = ['#818cf8','#38bdf8','#34d399','#f472b6','#a78bfa','#fbbf24','#60a5fa'];
const TECH_SYMBOLS = [
  '{}','()','[]','=>','//','/**','01','10','101','010','compile','11',
  'fn','let','const','if','&&','||','!=','===','++','break','</','/>',
  'git','npm','::','debug',';','0','1','loops','stack','sort','binary',
];

function spawnParticleBurst(targetEl) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 48 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2.0 + Math.random() * 3.2) * dpr;
    return {
      x: (rect.left + Math.random() * rect.width) * dpr,
      y: (rect.top  + Math.random() * rect.height) * dpr,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      ay: 0.04 * dpr,
      color: TECH_COLORS[i % TECH_COLORS.length],
      symbol: TECH_SYMBOLS[Math.floor(Math.random() * TECH_SYMBOLS.length)],
      kind: Math.random(),
      fontSize: (16 + Math.random() * 14) * dpr,
      maxLife: 1.0 + Math.random() * 0.7,
      alpha: 1, elapsed: 0,
    };
  });
  const start = performance.now();
  let raf;
  (function draw(now) {
    const dt = Math.min((now - (draw._prev ?? start)) / 1000, 0.05);
    draw._prev = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.elapsed += dt; p.vx *= 0.964; p.vy += p.ay; p.x += p.vx; p.y += p.vy;
      const t = Math.min(p.elapsed / p.maxLife, 1);
      p.alpha = t < 0.6 ? 1 : 1 - ((t - 0.6) / 0.4) ** 1.6;
      if (p.alpha > 0.01) alive = true;
      ctx.save(); ctx.globalAlpha = p.alpha;
      if (p.kind < 0.44) {
        ctx.font = `700 ${p.fontSize}px 'Space Mono','Courier New',monospace`;
        ctx.fillStyle = p.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        ctx.shadowColor = p.color; ctx.shadowBlur = 14 * dpr;
        ctx.fillText(p.symbol, p.x, p.y);
      } else if (p.kind < 0.64) {
        const s = p.fontSize * 0.65;
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16 * dpr;
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
      } else if (p.kind < 0.80) {
        const w = p.fontSize * 1.6, h = Math.max(3 * dpr, p.fontSize * 0.18);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10 * dpr;
        ctx.fillRect(p.x - w/2, p.y - h/2, w, h);
      } else {
        const len = p.fontSize * (2.5 + Math.random() * 2.5);
        ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2.5 * dpr, p.fontSize * 0.14);
        ctx.shadowColor = p.color; ctx.shadowBlur = 8 * dpr;
        ctx.beginPath(); ctx.moveTo(p.x - len/2, p.y); ctx.lineTo(p.x + len/2, p.y); ctx.stroke();
      }
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(draw);
    else { cancelAnimationFrame(raf); canvas.remove(); }
  })(performance.now());
}

// ── renderPost ────────────────────────────────────────────────────────────────
function renderPost(post, currentUser, profileMap) {
  if (post.type === 'project') {
    const profile = profileMap[post.user_id];
    return (
      <ProjectCard
        key={`project-${post.id}`}
        post={{
          ...post,
          author_name:     profile?.full_name  ?? post.author_name    ?? null,
          github_username: profile?.username   ?? post.github_username ?? null,
          author_avatar:   profile?.avatar_url ?? post.author_avatar  ?? null,
        }}
        currentUser={currentUser}
      />
    );
  }
  return (
    <PostCard
      key={`feed-${post.id}`}
      post={{
        id:      post.id,
        author: {
          name:     profileMap[post.user_id]?.full_name  ?? post.author_name    ?? null,
          username: profileMap[post.user_id]?.username   ?? post.github_username ?? null,
          avatar:   profileMap[post.user_id]?.avatar_url ?? post.author_avatar  ?? null,
        },
        user_id:    post.user_id,
        tag:        post.tag,
        fileName:   post.file_name,
        code:       post.code,
        caption:    post.caption,
        likes:      post.likes,
        comments:   post.comments,
        created_at: post.created_at,
      }}
      currentUser={currentUser}
    />
  );
}

// ── empty state ───────────────────────────────────────────────────────────────
function EmptyFollowingState() {
  return (
    <div className="flex flex-col items-center mt-20 gap-4 max-w-sm mx-auto text-center">
      <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(244,114,182,0.07)', border:'1px solid rgba(244,114,182,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(244,114,182,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-[#f0f4ff]">Your feed is empty</p>
      <p className="text-[13px] text-[#6b7a99] leading-relaxed">
        Follow other developers to see their posts here. Visit a profile and hit Follow to get started.
      </p>
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────
const Feed = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const location = useLocation();

  const [newPostId,   setNewPostId]   = useState(() => location.state?.newPostId   ?? null);
  const [newPostType, setNewPostType] = useState(() => location.state?.newPostType ?? null);
  const newPostRef = useRef(null);

  useEffect(() => {
    if (location.state?.newPostId) window.history.replaceState({}, '', window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMap,  setProfileMap]  = useState({});

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const followedIds = currentUser ? await getFollowingIds(currentUser.id) : [];
      const shaped      = await getFollowingFeed(followedIds, currentUser?.id ?? null);
      setPosts(shaped);
      const userIds = [...new Set(shaped.map(p => p.user_id).filter(Boolean))];
      if (userIds.length) setProfileMap(await getProfileMap(userIds));
    } catch (err) { console.error('Feed load error:', err); }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) return;
    loadPosts();
    const channels = [
      supabase.channel('feed-posts-rt').on('postgres_changes',{event:'*',schema:'public',table:'posts'},loadPosts).subscribe(),
      supabase.channel('feed-projects-rt').on('postgres_changes',{event:'*',schema:'public',table:'project_posts'},loadPosts).subscribe(),
    ];
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [currentUser, authLoading, loadPosts]);

  useEffect(() => {
    if (!newPostId || loading) return;
    let attempts = 0; const MAX = 20; let pollId;
    const tryScroll = () => {
      const el = newPostRef.current;
      if (!el && attempts < MAX) { attempts++; pollId = setTimeout(tryScroll, 100); return; }
      if (!el) return;
      const cardTop = el.getBoundingClientRect().top + window.pageYOffset;
      const targetY = cardTop <= SCROLL_TOP_PADDING ? 0 : cardTop - SCROLL_TOP_PADDING;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      setTimeout(() => spawnParticleBurst(newPostRef.current), 420);
    };
    pollId = setTimeout(tryScroll, 80);
    const clearTimer = setTimeout(() => { setNewPostId(null); setNewPostType(null); }, 5500);
    return () => { clearTimeout(pollId); clearTimeout(clearTimer); };
  }, [newPostId, loading]);

  // ── SEARCH FIX: check both post content AND author name from profileMap ───
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter(p =>
        activeTab === 'code'    ? p.type === 'code'    :
        activeTab === 'project' ? p.type === 'project' : true
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => {
        // 1. Check all post content fields via helper
        if (postMatchesQuery(p, searchQuery)) return true;

        // 2. FIX: also check author name/username from profileMap
        //    This is what was missing — post rows don't have author fields,
        //    they live in profileMap, so "search Suraj" was returning nothing.
        const profile = profileMap[p.user_id];
        if (profile?.full_name  && profile.full_name.toLowerCase().includes(q))  return true;
        if (profile?.username   && profile.username.toLowerCase().includes(q))   return true;

        return false;
      });
    }

    return result;
  }, [posts, activeTab, searchQuery, profileMap]);

  const spotlightEligible = useMemo(
    () => posts.filter(p => p.type === 'code' && p._source === 'feed').length >= 2,
    [posts]
  );

  const renderFeedPost = (p) => {
    const isNew = newPostId && String(p.id) === String(newPostId);
    if (isNew) return (
      <div key={`feed-${p.id}`} ref={newPostRef} className="feed-new-post">
        {renderPost(p, currentUser, profileMap)}
      </div>
    );
    return renderPost(p, currentUser, profileMap);
  };

  return (
    <div className="flex w-full min-h-screen">
      <div className="flex flex-col py-10 text-white flex-1 min-w-0 px-4 items-center">

        <ActivityStreamBar />

        {/* Search result count */}
        {searchQuery.trim() && (
          <div className="w-full max-w-[680px] mb-4 flex items-center justify-between">
            <p className="text-[13px] text-[#6b7a99]">
              {filteredPosts.length === 0
                ? 'No results'
                : `${filteredPosts.length} result${filteredPosts.length !== 1 ? 's' : ''}`}{' '}
              for <span className="text-pink-400 font-semibold">"{searchQuery}"</span>
            </p>
            <button onClick={() => setSearchQuery('')}
              className="text-[12px] text-[#6b7a99] hover:text-[#aab4cc] transition-colors cursor-pointer bg-transparent border-none">
              Clear
            </button>
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="w-full max-w-[680px] flex flex-col gap-6 mt-4">
            {[1,2,3].map(i => (
              <div key={i} className="w-full rounded-2xl border border-[#252523] bg-[#161615] overflow-hidden animate-pulse">
                <div className="h-[2px] w-full bg-[#252523]"/>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#252523]"/>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-3 w-32 rounded bg-[#252523]"/>
                    <div className="h-2 w-20 rounded bg-[#1e1e1c]"/>
                  </div>
                </div>
                <div className="mx-4 h-32 rounded-xl bg-[#0e0e0d] mb-4"/>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredPosts.length === 0 && (
          searchQuery.trim() ? (
            <div className="flex flex-col items-center mt-20 gap-3">
              <p className="text-[#6b7a99] text-sm">No posts found for "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')}
                className="text-[13px] px-4 py-1.5 rounded-lg cursor-pointer transition-all border"
                style={{ background:'rgba(236,72,153,0.08)', borderColor:'rgba(236,72,153,0.25)', color:'#f472b6' }}>
                Clear search
              </button>
            </div>
          ) : <EmptyFollowingState />
        )}

        {!loading && filteredPosts.length > 0 && (
          <>
            <style>{`
              @keyframes feed-card-in {
                0%   { opacity:0; transform:translateY(-18px) scale(0.95); }
                65%  { opacity:1; transform:translateY(3px)   scale(1.008); }
                100% { opacity:1; transform:translateY(0)     scale(1); }
              }
              @keyframes feed-ring-pulse {
                0%   { box-shadow:0 0 0 2px #818cf8, 0 0 28px rgba(129,140,248,0.4); }
                40%  { box-shadow:0 0 0 2px rgba(129,140,248,0.5), 0 0 44px rgba(129,140,248,0.22); }
                100% { box-shadow:0 0 0 1px rgba(129,140,248,0), 0 0 0 rgba(129,140,248,0); }
              }
              .feed-new-post {
                animation:
                  feed-card-in    0.5s cubic-bezier(0.34,1.4,0.64,1) both,
                  feed-ring-pulse 2.8s ease-out 0.3s both;
                border-radius:16px; position:relative; z-index:1; overflow:visible !important;
              }
              .feed-post-list { padding-top:28px; }
            `}</style>

            <div className="feed-post-list w-full max-w-[680px] flex flex-col gap-5 mx-auto">
              {filteredPosts.slice(0, SPOTLIGHT_AFTER).map(p => renderFeedPost(p))}

              {spotlightEligible && filteredPosts.length > SPOTLIGHT_AFTER && (
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <div className="flex-1 h-px bg-[#252523]"/>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6b7a99]">✦ spotlight</span>
                    <div className="flex-1 h-px bg-[#252523]"/>
                  </div>
                  <SpotlightBanner posts={posts.filter(p => p._source === 'feed')} profileMap={profileMap} />
                </div>
              )}

              {filteredPosts.slice(SPOTLIGHT_AFTER).map(p => renderFeedPost(p))}
            </div>
          </>
        )}
      </div>

      <RightSidebar
        posts={posts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
};

export default Feed;
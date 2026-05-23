// src/features/feed/pages/Explore.jsx
// ─────────────────────────────────────────────────────────────────────────────
// IMPROVEMENTS in this version (based on screenshot review):
//
// RIGHT SIDEBAR:
//   • Filter by type — redesigned as proper pill buttons with colored icons,
//     filled count badges, and an active state that uses the type's accent color
//     (not just pink for everything)
//   • Search — glowing focus ring, result count shown inline below input
//   • Top Contributors — gold/silver/bronze medal rings on top 3 avatars,
//     points shown as a mini bar graph, "open to work" badge repositioned
//   • Hot Right Now — richer cards with gradient accent, tag badge aligned,
//     likes + comments inline, clickable author name
//   • Platform Stats — new micro-widget: total posts / people / communities
//   • Recently Active Communities — cleaner layout, last-post time more visible
//   • Trending Topics — score bar added beside each tag for visual weight
//   • All section headers get a colored left-border accent matching their theme
//
// MAIN GRID:
//   • Code cards: faded gradient at bottom of code block (not abrupt cutoff)
//   • Grid batches animate in on scroll via IntersectionObserver
//   • DevRadar stat box: compacted, better spacing
//   • TweetCard: slightly wider padding, better font sizing on mobile widths
//
// ALL SEARCH / BUG FIXES PRESERVED from previous version.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import { useAuth }  from '../../../context/AuthContext';

import { getProfileMap, getInitials, avatarGradient } from '../../../services/userService';
import { getExploreFeed }                              from '../../../services/postService';
import { toggleCommunityLike, getCommunityLikedPosts } from '../../../services/likeService';
import { getCommunityComments }                        from '../../../services/postService';
import { postMatchesQuery }                            from '../../../utils/helpers';

import PostCard          from '../components/PostCard';
import ProjectCard       from '../components/ProjectCard';
import CommunityPostCard from '../../communities/components/PostCard';
import CommentDrawer     from '../../communities/components/CommentDrawer';

// ── design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:'#0e0e0d', card:'#161615', card2:'#111110', border:'#252523', border2:'#1e1e1c',
  pink:'#f472b6', indigo:'#818cf8', cyan:'#38bdf8', green:'#34d399', amber:'#f5a623', purple:'#a78bfa',
  text:'#e8eaf6', mid:'#c8d0e4', muted:'#8891b2', faint:'#6b7a99', fainter:'#2d3452',
  mono:"'Space Mono', monospace", sans:"'Syne', sans-serif",
};

// ── tag colours ───────────────────────────────────────────────────────────────
const TAG_C = {
  react:      {color:'#61AFEF',border:'rgba(97,175,239,.3)', bg:'rgba(97,175,239,.1)' },
  typescript: {color:'#4EC9B0',border:'rgba(78,201,176,.3)', bg:'rgba(78,201,176,.1)' },
  javascript: {color:'#FFD43B',border:'rgba(255,212,59,.3)', bg:'rgba(255,212,59,.1)' },
  python:     {color:'#FFD43B',border:'rgba(255,212,59,.3)', bg:'rgba(255,212,59,.1)' },
  java:       {color:'#f89820',border:'rgba(248,152,32,.3)', bg:'rgba(248,152,32,.1)' },
  css:        {color:'#D4537E',border:'rgba(212,83,126,.3)', bg:'rgba(212,83,126,.1)' },
  tailwind:   {color:'#38bdf8',border:'rgba(56,189,248,.3)', bg:'rgba(56,189,248,.1)' },
  supabase:   {color:'#3ECF8E',border:'rgba(62,207,142,.3)', bg:'rgba(62,207,142,.1)' },
  nextjs:     {color:'#c0c0ba',border:'rgba(192,192,186,.3)',bg:'rgba(192,192,186,.08)'},
  rust:       {color:'#f0744d',border:'rgba(240,116,77,.3)', bg:'rgba(240,116,77,.1)' },
  go:         {color:'#00add8',border:'rgba(0,173,216,.3)',  bg:'rgba(0,173,216,.1)'  },
  devops:     {color:'#9c6fff',border:'rgba(156,111,255,.3)',bg:'rgba(156,111,255,.1)'},
  frontend:   {color:'#00d4ff',border:'rgba(0,212,255,.3)',  bg:'rgba(0,212,255,.1)'  },
  backend:    {color:'#00e676',border:'rgba(0,230,118,.3)',  bg:'rgba(0,230,118,.1)'  },
};
const tagC = (t) => TAG_C[(t||'').toLowerCase().replace(/[\.\s]/g,'')] ||
  {color:C.pink, border:'rgba(244,114,182,.3)', bg:'rgba(244,114,182,.1)'};

// Type filter config — each type has its own accent color
const TYPE_FILTERS = [
  { id:'all',       label:'All posts',  icon:'◈', color:C.pink,   bg:'rgba(244,114,182,.08)',  border:'rgba(244,114,182,.3)'  },
  { id:'code',      label:'Code',       icon:'⌥', color:C.cyan,   bg:'rgba(56,189,248,.08)',   border:'rgba(56,189,248,.3)'   },
  { id:'project',   label:'Projects',   icon:'⚙', color:C.indigo, bg:'rgba(129,140,248,.08)',  border:'rgba(129,140,248,.3)'  },
  { id:'community', label:'Community',  icon:'⬡', color:C.green,  bg:'rgba(52,211,153,.08)',   border:'rgba(52,211,153,.3)'   },
];

const PAGE_SIZE = 12;

// ── search helper ─────────────────────────────────────────────────────────────
function postMatchesSearch(post, query, pm) {
  if (!query?.trim()) return true;
  const q = query.trim().toLowerCase();
  if (postMatchesQuery(post, query)) return true;
  if (post.author_name && post.author_name.toLowerCase().includes(q)) return true;
  if (post.text && post.text.toLowerCase().includes(q)) return true;
  const profile = pm?.[post.user_id];
  if (profile?.full_name  && profile.full_name.toLowerCase().includes(q))  return true;
  if (profile?.username   && profile.username.toLowerCase().includes(q))   return true;
  return false;
}

// ── author resolution ─────────────────────────────────────────────────────────
const resolveName     = (post, pm) => post.author_name     || pm[post.user_id]?.full_name  || pm[post.user_id]?.username || 'Unknown';
const resolveAvatar   = (post, pm) => post.author_avatar   || pm[post.user_id]?.avatar_url || null;
const resolveUsername = (post, pm) => post.github_username || pm[post.user_id]?.username   || null;

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => `#${r+r}${g+g}${b+b}`)
  );
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '200,200,200';
}

// ── animated grid batch ───────────────────────────────────────────────────────
// Wraps each grid batch in an IntersectionObserver so cards animate in on scroll
function AnimatedBatch({ children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(14px)', transition:'opacity 0.4s ease, transform 0.4s ease' }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID CARD
// ─────────────────────────────────────────────────────────────────────────────
function GridCard({ post, pm, onClick }) {
  const name     = resolveName(post, pm);
  const avatar   = resolveAvatar(post, pm);
  const initials = getInitials(name);
  const tc       = tagC(post.tag);

  const hasProjectImage = post.type === 'project' && post.project_image;
  const isImagePost     = post.type === 'image'   && post.file_url;
  const isCode          = !hasProjectImage && !isImagePost && (post.type === 'code' || (post._source === 'community' && post.type === 'code'));
  const isProject       = post.type === 'project' && !hasProjectImage;
  const caption         = post.caption || post.text || post.project_desc || null;

  return (
    <div onClick={onClick} className="xgc"
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        overflow:'hidden', cursor:'pointer', position:'relative', aspectRatio:'1/1',
        transition:'transform .18s cubic-bezier(.34,1.56,.64,1), border-color .15s, box-shadow .15s',
        display:'flex', flexDirection:'column' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px) scale(1.01)';e.currentTarget.style.borderColor=C.pink+'66';e.currentTarget.style.boxShadow=`0 12px 36px rgba(0,0,0,.6), 0 0 0 1px ${C.pink}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none';}}
    >
      <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,${C.pink},${C.indigo},${C.cyan})`}}/>
      <div style={{flex:1,minHeight:0,overflow:'hidden',position:'relative'}}>
        {(isImagePost || hasProjectImage) && (
          <img src={isImagePost ? post.file_url : post.project_image} alt=""
            style={{width:'100%',height:'100%',objectFit:'cover',display:'block',transition:'transform .4s ease'}}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          />
        )}
        {isCode && (
          <div style={{width:'100%',height:'100%',background:'#0d0d10',overflow:'hidden',padding:'10px 12px',boxSizing:'border-box',position:'relative'}}>
            <div style={{display:'flex',gap:4,marginBottom:8}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#ff5f57',flexShrink:0}}/>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#febc2e',flexShrink:0}}/>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#28c840',flexShrink:0}}/>
              {post.tag&&<span style={{marginLeft:'auto',fontFamily:C.mono,fontSize:8,color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`,padding:'0 5px',borderRadius:4}}>{post.tag}</span>}
            </div>
            {(post.code||'// no preview').split('\n').slice(0,14).map((line,i)=>(
              <div key={i} style={{display:'flex',gap:8,minHeight:'1.35em'}}>
                <span style={{fontFamily:C.mono,fontSize:8,color:'#2a3a4a',flexShrink:0,width:14,textAlign:'right',userSelect:'none'}}>{i+1}</span>
                <span style={{fontFamily:C.mono,fontSize:8,color:'#abb2bf',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{line||' '}</span>
              </div>
            ))}
            {/* fade-out gradient so code doesn't hard-clip */}
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:32,background:'linear-gradient(to bottom, transparent, #0d0d10)',pointerEvents:'none'}}/>
          </div>
        )}
        {isProject && (
          <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,boxSizing:'border-box',background:'linear-gradient(135deg,#0d1520,#111c2e)',textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:10,filter:'drop-shadow(0 0 12px rgba(129,140,248,.4))'}}>⚙️</div>
            <p style={{fontFamily:C.sans,fontWeight:700,fontSize:13,color:C.text,margin:'0 0 5px',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',lineHeight:1.4}}>{post.project_title||'Untitled Project'}</p>
            {post.project_stack&&<p style={{fontFamily:C.mono,fontSize:8,color:C.faint,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{post.project_stack}</p>}
          </div>
        )}
        {/* hover overlay */}
        <div className="xgc-ov" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'10px',transition:'background .18s,opacity .18s',opacity:0}}>
          {caption&&<p style={{fontFamily:C.sans,fontSize:10,color:'rgba(255,255,255,.9)',margin:'0 0 7px',lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',textShadow:'0 1px 4px rgba(0,0,0,.8)'}}>{caption}</p>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              {avatar?<img src={avatar} alt="" style={{width:20,height:20,borderRadius:'50%',objectFit:'cover',border:`1.5px solid rgba(255,255,255,.3)`}}/>
                :<div style={{width:20,height:20,borderRadius:'50%',background:avatarGradient(post.user_id||''),display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:700,color:'#fff'}}>{initials}</div>}
              <span style={{fontFamily:C.sans,fontSize:10,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80,textShadow:'0 1px 4px rgba(0,0,0,.8)'}}>{name}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
              <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:C.pink,fontFamily:C.mono}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes||0}
              </span>
              <span style={{fontSize:10,color:C.muted,fontFamily:C.mono}}>{post.comments||0}</span>
            </div>
          </div>
        </div>
      </div>
      {post.community_name&&(
        <div style={{flexShrink:0,padding:'4px 10px',background:'rgba(129,140,248,.07)',borderTop:`1px solid rgba(129,140,248,.14)`,display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:10,height:10,borderRadius:3,background:'rgba(129,140,248,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,color:C.indigo,flexShrink:0}}>{(post.community_name[0]||'').toUpperCase()}</div>
          <span style={{fontFamily:C.mono,fontSize:8,color:C.indigo,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.community_name}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TWEET CARD
// ─────────────────────────────────────────────────────────────────────────────
function TweetCard({ post, pm, onClick }) {
  const name     = resolveName(post, pm);
  const avatar   = resolveAvatar(post, pm);
  const initials = getInitials(name);
  const isPdf    = post.type === 'pdf';
  const text     = post.caption || post.text || '';
  const tag      = post.tag ? tagC(post.tag) : null;
  const accentColor = isPdf ? C.amber : C.indigo;

  const timeAgoShort = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso.endsWith('Z')?iso:iso+'Z')) / 1000);
    if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
  };

  return (
    <div onClick={onClick}
      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'border-color .15s,box-shadow .15s,transform .15s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor+'55';e.currentTarget.style.boxShadow=`0 6px 24px rgba(0,0,0,.45)`;e.currentTarget.style.transform='translateY(-1px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}
    >
      <div style={{height:2,background:`linear-gradient(90deg,${accentColor},${accentColor}00)`}}/>
      <div style={{padding:'14px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          {avatar?<img src={avatar} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`2px solid ${accentColor}33`}}/>
            :<div style={{width:36,height:36,borderRadius:'50%',background:avatarGradient(post.user_id||''),display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0,border:`2px solid ${accentColor}33`}}>{initials}</div>}
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontFamily:C.sans,fontWeight:700,fontSize:14,color:C.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</p>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:1}}>
              {post.community_name&&<span style={{fontFamily:C.mono,fontSize:9,color:C.indigo,background:'rgba(129,140,248,.08)',border:'1px solid rgba(129,140,248,.2)',padding:'1px 6px',borderRadius:10}}>/{post.community_name}</span>}
              <span style={{fontFamily:C.mono,fontSize:9,color:C.fainter}}>{timeAgoShort(post.created_at)}</span>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
            {tag&&post.tag&&<span style={{fontFamily:C.mono,fontSize:9,padding:'2px 8px',borderRadius:20,color:tag.color,background:tag.bg,border:`1px solid ${tag.border}`}}>#{post.tag}</span>}
            {isPdf&&<span style={{fontFamily:C.mono,fontSize:9,padding:'2px 8px',borderRadius:20,color:C.amber,background:'rgba(245,166,35,.09)',border:'1px solid rgba(245,166,35,.25)'}}>PDF</span>}
          </div>
        </div>
        {isPdf ? (
          <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(245,166,35,.05)',border:'1px solid rgba(245,166,35,.2)',borderRadius:12}}>
            <div style={{width:42,height:48,background:'rgba(245,166,35,.1)',border:'1px solid rgba(245,166,35,.25)',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,gap:3}}>
              <span style={{fontSize:18}}>📄</span>
              <span style={{fontFamily:C.mono,fontSize:7,color:C.amber,fontWeight:700,letterSpacing:'.08em'}}>PDF</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontFamily:C.sans,fontWeight:700,fontSize:14,color:'#f0e8d0',margin:'0 0 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.file_name||'document.pdf'}</p>
              {text&&<p style={{fontFamily:C.sans,fontSize:13,color:C.muted,margin:0,lineHeight:1.55,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{text}</p>}
              <p style={{fontFamily:C.mono,fontSize:9,color:C.fainter,margin:'5px 0 0'}}>Click to open ↗</p>
            </div>
          </div>
        ) : text ? (
          <p style={{fontFamily:C.sans,fontSize:14,color:C.mid,lineHeight:1.75,margin:0,display:'-webkit-box',WebkitLineClamp:4,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{text}</p>
        ) : (
          <p style={{fontFamily:C.mono,fontSize:11,color:C.fainter,margin:0,fontStyle:'italic'}}>// no content preview</p>
        )}
        <div style={{display:'flex',alignItems:'center',gap:14,marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border2}`}}>
          <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.faint,fontFamily:C.mono}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{color:C.pink}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {post.likes||0}
          </span>
          <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.faint,fontFamily:C.mono}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {post.comments||0}
          </span>
          <span style={{marginLeft:'auto',fontFamily:C.mono,fontSize:9,color:C.fainter}}>tap to expand →</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PostDetailModal({ post, me, pm, onClose, likedPosts={}, localLikes={}, onLike, onOpenComments }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const enriched = { ...post, author_name:resolveName(post,pm), author_avatar:resolveAvatar(post,pm), github_username:resolveUsername(post,pm) };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',borderRadius:20,scrollbarWidth:'thin',scrollbarColor:`${C.border} transparent`}}>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
          <button onClick={onClose}
            style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.18)';e.currentTarget.style.transform='scale(1.08)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.transform='none';}}
          >✕</button>
        </div>
        {post._source==='community'
          ?<CommunityPostCard post={enriched} currentUserId={me?.id??null} displayName={enriched.author_name} avatarUrl={enriched.author_avatar} githubUsername={enriched.github_username} communityId={post.community_id} likeCount={likedPosts[post.id]!==undefined?(localLikes[post.id]??post.likes??0):(post.likes??0)} liked={likedPosts[post.id]??false} onLike={onLike} onOpenComments={onOpenComments}/>
          :post.type==='project'
          ?<ProjectCard post={enriched} currentUser={me}/>
          :<PostCard currentUser={me} post={{id:post.id,author:{name:enriched.author_name,username:enriched.github_username,avatar:enriched.author_avatar},user_id:post.user_id,tag:post.tag,fileName:post.file_name,code:post.code,caption:post.caption,likes:post.likes,comments:post.comments,created_at:post.created_at}}/>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG CLOUD
// ─────────────────────────────────────────────────────────────────────────────
function TagCloud({ posts, activeTag, onTagClick }) {
  const tagScores = useMemo(() => {
    const sc = {};
    posts.forEach(p => {
      const tags = [];
      if (p.tag) tags.push(p.tag.toLowerCase());
      if (p.project_stack) p.project_stack.split(',').forEach(t => tags.push(t.trim().toLowerCase()));
      tags.forEach(t => { if (t) sc[t]=(sc[t]||0)+(p.likes||0)+1; });
    });
    return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,14);
  }, [posts]);
  if (!tagScores.length) return null;
  const max=tagScores[0][1], min=tagScores[tagScores.length-1][1], range=max-min||1;
  const fs=(score)=>Math.round(11+((score-min)/range)*8);
  const op=(score)=>+(0.55+((score-min)/range)*0.45).toFixed(2);
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'14px 16px',marginBottom:8}}>
      <p style={{fontFamily:C.mono,fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:C.fainter,margin:'0 0 12px'}}>trending tags — size &amp; colour = activity</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:9,alignItems:'center'}}>
        {tagScores.map(([tag,score])=>{
          const tc=tagC(tag),on=activeTag===tag,opa=op(score),rgb=hexToRgb(tc.color);
          return(
            <button key={tag} onClick={()=>onTagClick(on?null:tag)}
              style={{fontFamily:C.mono,fontSize:fs(score),padding:'3px 11px',borderRadius:20,cursor:'pointer',transition:'all .15s',
                border:`1px solid ${on?tc.color:`rgba(${rgb},${opa*0.6})`}`,
                background:on?tc.bg:`rgba(${rgb},${opa*0.06})`,
                color:`rgba(${rgb},${on?1:opa})`,transform:on?'translateY(-1px)':'none'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=tc.color;e.currentTarget.style.boxShadow=`0 4px 12px rgba(${rgb},.2)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform=on?'translateY(-1px)':'none';e.currentTarget.style.borderColor=on?tc.color:`rgba(${rgb},${opa*0.6})`;e.currentTarget.style.boxShadow='none';}}
            >#{tag}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEV RADAR
// ─────────────────────────────────────────────────────────────────────────────
function DevRadar({ currentUser, allPosts }) {
  const navigate=useNavigate();
  const [devs,setDevs]=useState([]);
  const [followState,setFollowState]=useState({});
  const scrollRef=useRef(null);
  useEffect(()=>{
    if(!allPosts.length)return;
    let mounted=true;
    const build=async()=>{
      const byUser={};
      allPosts.forEach(p=>{
        if(!p.user_id)return;
        if(!byUser[p.user_id])byUser[p.user_id]={userId:p.user_id,likes:0,posts:0,topTag:null,name:null,avatar:null,tagCounts:{}};
        byUser[p.user_id].likes+=(p.likes||0); byUser[p.user_id].posts+=1;
        if(p.tag){const k=p.tag.toLowerCase();byUser[p.user_id].tagCounts[k]=(byUser[p.user_id].tagCounts[k]||0)+1;}
      });
      Object.values(byUser).forEach(u=>{const e=Object.entries(u.tagCounts);if(e.length)u.topTag=e.sort((a,b)=>b[1]-a[1])[0][0];});
      const others=Object.values(byUser).filter(u=>u.userId!==currentUser?.id);
      let followedSet=new Set();
      if(currentUser?.id){const{data:fr}=await supabase.from('follows').select('following_id').eq('follower_id',currentUser.id);followedSet=new Set((fr||[]).map(r=>r.following_id));}
      const top=others.filter(u=>!followedSet.has(u.userId)).sort((a,b)=>b.likes-a.likes).slice(0,10);
      const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uids=top.map(u=>u.userId).filter(id=>id&&UUID_RE.test(id));
      if(uids.length){try{const{data:profs}=await supabase.from('profiles').select('id,full_name,avatar_url,username,open_to_work').in('id',uids);if(profs){const pm={};profs.forEach(p=>{pm[p.id]=p;});top.forEach(u=>{if(pm[u.userId]){u.name=pm[u.userId].full_name||pm[u.userId].username||null;u.avatar=pm[u.userId].avatar_url||null;u.username=pm[u.userId].username||null;u.openToWork=pm[u.userId].open_to_work||false;}});}}catch(e){}}
      if(mounted)setDevs(top);
    };
    build();
    return()=>{mounted=false;};
  },[allPosts,currentUser]);
  const handleFollow=async(userId)=>{
    if(!currentUser?.id||followState[userId])return;
    setFollowState(prev=>({...prev,[userId]:'following'}));
    await supabase.from('follows').insert({follower_id:currentUser.id,following_id:userId});
    setFollowState(prev=>({...prev,[userId]:'done'}));
  };
  const scroll=(dir)=>{if(scrollRef.current)scrollRef.current.scrollBy({left:dir*300,behavior:'smooth'});};
  if(!devs.length)return null;
  return(
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontFamily:C.mono,fontSize:11,color:C.cyan}}>▍</span>
          <p style={{fontFamily:C.mono,fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',color:C.faint,margin:0}}>dev_radar — developers to follow</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['‹','›'].map((ch,i)=>(
            <button key={ch} onClick={()=>scroll(i===0?-1:1)} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.faint,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',fontSize:12}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.cyan+'60';e.currentTarget.style.color=C.cyan;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.faint;}}
            >{ch}</button>
          ))}
        </div>
      </div>
      <div ref={scrollRef} style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {devs.map((dev,idx)=>{
          const tc=tagC(dev.topTag),grad=avatarGradient(dev.userId),state=followState[dev.userId]||'idle',ini=getInitials(dev.name||'');
          return(
            <div key={dev.userId} style={{flexShrink:0,width:162,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',transition:'border-color .15s,transform .18s',display:'flex',flexDirection:'column'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=tc.color+'55';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none';}}
            >
              <div style={{height:2,background:`linear-gradient(90deg,${tc.color},${tc.color}00)`}}/>
              <div style={{padding:'10px 11px 10px',display:'flex',flexDirection:'column',flex:1,gap:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontFamily:C.mono,fontSize:8,color:C.fainter}}>// dev_{String(idx+1).padStart(2,'0')}</span>
                  {dev.openToWork&&<span style={{fontSize:7,padding:'1px 5px',borderRadius:10,background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',color:C.green}}>hire</span>}
                </div>
                <div style={{display:'flex',justifyContent:'center',marginBottom:8}}>
                  {dev.avatar
                    ?<img src={dev.avatar} alt="" onClick={()=>navigate(`/user/id/${dev.userId}`)} style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:`2px solid ${tc.color}40`,cursor:'pointer',transition:'border-color .15s,transform .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=tc.color;e.currentTarget.style.transform='scale(1.06)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${tc.color}40`;e.currentTarget.style.transform='none';}}/>
                    :<div onClick={()=>navigate(`/user/id/${dev.userId}`)} style={{width:44,height:44,borderRadius:'50%',background:grad,border:`2px solid ${tc.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>{ini}</div>
                  }
                </div>
                <p style={{fontFamily:C.sans,fontWeight:700,fontSize:12,color:C.text,margin:'0 0 1px',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dev.name||'Developer'}</p>
                {dev.username&&<p style={{fontFamily:C.mono,fontSize:9,color:C.faint,margin:'0 0 8px',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{dev.username}</p>}
                {/* compact stat row */}
                <div style={{display:'flex',justifyContent:'space-around',background:C.card2,borderRadius:8,padding:'6px 4px',marginBottom:8}}>
                  <div style={{textAlign:'center'}}>
                    <p style={{fontFamily:C.mono,fontSize:11,fontWeight:700,color:C.cyan,margin:0}}>{dev.posts}</p>
                    <p style={{fontFamily:C.mono,fontSize:7,color:C.fainter,margin:0}}>posts</p>
                  </div>
                  <div style={{width:1,background:C.border}}/>
                  <div style={{textAlign:'center'}}>
                    <p style={{fontFamily:C.mono,fontSize:11,fontWeight:700,color:C.pink,margin:0}}>{dev.likes}</p>
                    <p style={{fontFamily:C.mono,fontSize:7,color:C.fainter,margin:0}}>likes</p>
                  </div>
                  {dev.topTag&&<><div style={{width:1,background:C.border}}/><div style={{textAlign:'center'}}>
                    <p style={{fontFamily:C.mono,fontSize:9,fontWeight:700,color:tc.color,margin:0}}>#{dev.topTag.slice(0,4)}</p>
                    <p style={{fontFamily:C.mono,fontSize:7,color:C.fainter,margin:0}}>tag</p>
                  </div></>}
                </div>
                <button onClick={()=>handleFollow(dev.userId)} disabled={state!=='idle'}
                  style={{marginTop:'auto',width:'100%',padding:'6px 0',borderRadius:8,fontSize:9,cursor:state==='idle'?'pointer':'default',fontFamily:C.mono,transition:'all .15s',
                    border:state==='done'?`1px solid ${C.green}40`:`1px solid ${tc.color}40`,
                    background:state==='done'?`rgba(52,211,153,.08)`:state==='following'?`${tc.color}06`:`${tc.color}10`,
                    color:state==='done'?C.green:state==='following'?tc.color+'80':tc.color,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5}}
                  onMouseEnter={e=>{if(state==='idle'){e.currentTarget.style.background=`${tc.color}22`;e.currentTarget.style.borderColor=tc.color+'80';}}}
                  onMouseLeave={e=>{if(state==='idle'){e.currentTarget.style.background=`${tc.color}10`;e.currentTarget.style.borderColor=tc.color+'40';}}}
                >
                  {state==='done'?(<><span style={{fontSize:11}}>✓</span> following</>):state==='following'?(<><span style={{width:8,height:8,borderRadius:'50%',border:`1.5px solid ${tc.color}50`,borderTopColor:tc.color,animation:'xspin .7s linear infinite',display:'inline-block'}}/>following</>):(<>+ follow</>)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE COMMUNITY CARD
// ─────────────────────────────────────────────────────────────────────────────
function InlineCommunityCard({ community, memberCount, avatars, onJoin }) {
  const navigate=useNavigate();
  const accents=[C.cyan,C.indigo,C.green,C.pink,C.amber,'#a78bfa'];
  const accent=accents[(community.id?.charCodeAt(0)??0)%accents.length];
  const [joinState,setJoinState]=useState('idle');
  const handleJoinClick=async()=>{if(joinState!=='idle')return;setJoinState('joining');await onJoin(community.id);setJoinState('welcome');setTimeout(()=>navigate(`/community/${community.id}`),1800);};
  return(
    <div style={{background:C.card,border:`1px solid ${joinState==='welcome'?accent+'90':C.border}`,borderRadius:14,overflow:'hidden',transition:'border-color .3s,transform .15s',display:'flex',flexDirection:'column',minHeight:148}}
      onMouseEnter={e=>{if(joinState==='idle'){e.currentTarget.style.borderColor=accent+'55';e.currentTarget.style.transform='translateY(-1px)';}}}
      onMouseLeave={e=>{if(joinState==='idle'){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none';}}}
    >
      <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,${accent},${accent}00)`}}/>
      {joinState==='welcome'?(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'14px',textAlign:'center',background:`linear-gradient(135deg,${accent}08,${accent}14)`,animation:'xwelcome .3s ease-out'}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}70`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,marginBottom:10,color:accent,animation:'xpop .4s cubic-bezier(.175,.885,.32,1.275)'}}>✓</div>
          <p style={{fontFamily:C.sans,fontWeight:700,fontSize:12,color:C.text,margin:'0 0 3px',lineHeight:1.3}}>Welcome to {community.name}!</p>
          <p style={{fontFamily:C.mono,fontSize:9,color:C.faint,margin:'0 0 10px'}}>taking you there…</p>
          <div style={{width:'80%',height:2,borderRadius:2,background:`${accent}20`,overflow:'hidden'}}><div style={{height:'100%',background:accent,borderRadius:2,animation:'xload 1.8s linear forwards'}}/></div>
        </div>
      ):(
        <div style={{flex:1,padding:'12px 14px',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}>
            <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:`${accent}18`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:accent,fontFamily:C.mono}}>{community.name.slice(0,2).toUpperCase()}</div>
            <div style={{minWidth:0}}>
              <Link to={`/community/${community.id}`} style={{textDecoration:'none'}}>
                <p style={{fontFamily:C.sans,fontWeight:700,fontSize:13,color:C.text,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{community.name}</p>
              </Link>
              <p style={{fontFamily:C.mono,fontSize:9,color:C.faint,margin:'1px 0 0'}}>{memberCount??'-'} members</p>
            </div>
          </div>
          <p style={{fontFamily:C.sans,fontSize:12,color:C.muted,lineHeight:1.55,flex:1,margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{community.description||'No description yet.'}</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto'}}>
            <div style={{display:'flex'}}>
              {(avatars||[]).map((a,i)=>(
                a.avatar_url?<img key={a.id} src={a.avatar_url} alt="" style={{width:18,height:18,borderRadius:'50%',objectFit:'cover',marginLeft:i?-5:0,border:`1.5px solid ${C.card}`,flexShrink:0}}/>
                  :<div key={a.id} style={{width:18,height:18,borderRadius:'50%',marginLeft:i?-5:0,flexShrink:0,background:avatarGradient(a.full_name||''),border:`1.5px solid ${C.card}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff'}}>{getInitials(a.full_name||'')}</div>
              ))}
            </div>
            <button onClick={handleJoinClick} disabled={joinState==='joining'}
              style={{padding:'5px 13px',borderRadius:8,fontSize:10,fontFamily:C.mono,cursor:joinState==='joining'?'default':'pointer',border:`1px solid ${accent}45`,background:joinState==='joining'?`${accent}06`:`${accent}12`,color:joinState==='joining'?accent+'70':accent,transition:'all .15s',display:'flex',alignItems:'center',gap:5,flexShrink:0}}
              onMouseEnter={e=>{if(joinState==='idle')e.currentTarget.style.background=`${accent}24`;}}
              onMouseLeave={e=>{if(joinState==='idle')e.currentTarget.style.background=`${accent}12`;}}
            >{joinState==='joining'?(<><span style={{width:8,height:8,borderRadius:'50%',border:`1.5px solid ${accent}50`,borderTopColor:accent,animation:'xspin .7s linear infinite',display:'inline-block',flexShrink:0}}/>Joining</>):'+ Join'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE SIDEBAR — completely overhauled
// ─────────────────────────────────────────────────────────────────────────────
function ExploreSidebar({ allPosts, pm, searchQuery, setSearchQuery, activeTag, onTagClick, onHotPostClick, activeType, onTypeChange, searchResultCount }) {
  const navigate=useNavigate();
  const [topContributors,   setTopContributors]   = useState([]);
  const [activeCommunities, setActiveCommunities] = useState([]);
  const [platformStats,     setPlatformStats]     = useState(null);
  const [searchFocused,     setSearchFocused]     = useState(false);

  useEffect(()=>{
    let mounted=true;
    // Top contributors
    supabase.from('profiles').select('id,full_name,username,avatar_url,points,accepted_solutions_count,open_to_work').order('points',{ascending:false}).limit(5).then(({data})=>{if(mounted&&data)setTopContributors(data);});
    // Platform stats
    Promise.all([
      supabase.from('posts').select('id',{count:'exact',head:true}),
      supabase.from('project_posts').select('id',{count:'exact',head:true}),
      supabase.from('profiles').select('id',{count:'exact',head:true}),
      supabase.from('communities').select('id',{count:'exact',head:true}),
    ]).then(([posts,projects,profiles,communities])=>{
      if(mounted)setPlatformStats({
        posts:(posts.count||0)+(projects.count||0),
        people:profiles.count||0,
        communities:communities.count||0,
      });
    });
    return()=>{mounted=false;};
  },[]);

  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      const{data:recentPosts}=await supabase.from('community_posts').select('community_id,created_at,communities(id,name)').order('created_at',{ascending:false}).limit(50);
      if(!mounted||!recentPosts)return;
      const seen=new Map();
      recentPosts.forEach(p=>{const cid=p.community_id;if(!seen.has(cid))seen.set(cid,{id:cid,name:p.communities?.name||'Unknown',lastPost:p.created_at});});
      const list=[...seen.values()].slice(0,5);
      await Promise.all(list.map(async c=>{const{count}=await supabase.from('community_members').select('id',{count:'exact',head:true}).eq('community_id',c.id);c.memberCount=count||0;}));
      if(mounted)setActiveCommunities(list);
    };
    load();
    return()=>{mounted=false;};
  },[]);

  const hotPosts=useMemo(()=>[...allPosts].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,4),[allPosts]);
  const trendTopics=useMemo(()=>{
    const sc={};
    allPosts.forEach(p=>{
      if(p.tag)sc[p.tag.toLowerCase()]=(sc[p.tag.toLowerCase()]||0)+(p.likes||0)+1;
      if(p.project_stack)p.project_stack.split(',').forEach(t=>{const k=t.trim().toLowerCase();if(k)sc[k]=(sc[k]||0)+(p.likes||0)+1;});
    });
    return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,8);
  },[allPosts]);

  const timeAgoShort=(iso)=>{
    if(!iso)return'';
    const s=Math.floor((Date.now()-new Date(iso.endsWith('Z')?iso:iso+'Z'))/1000);
    if(s<3600)return`${Math.floor(s/60)}m ago`;
    if(s<86400)return`${Math.floor(s/3600)}h ago`;
    return`${Math.floor(s/86400)}d ago`;
  };

  // Section header with colored left accent
  const SH=({label,live,accent=C.faint})=>(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderBottom:`1px solid ${C.border}`,borderLeft:`3px solid ${accent}`,background:`linear-gradient(90deg,${accent}08,transparent)`}}>
      {live&&(<span style={{position:'relative',display:'inline-flex',width:6,height:6,flexShrink:0}}>
        <span style={{position:'absolute',inset:0,borderRadius:'50%',background:C.pink,opacity:.5,animation:'xping 1.5s cubic-bezier(0,0,.2,1) infinite'}}/>
        <span style={{position:'relative',width:6,height:6,borderRadius:'50%',background:C.pink}}/>
      </span>)}
      <p style={{fontFamily:C.mono,fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:accent,margin:0}}>{label}</p>
    </div>
  );

  const maxTopicScore = trendTopics[0]?.[1] || 1;

  return (
    <>
      <style>{`.xgc:hover .xgc-ov{opacity:1!important;background:rgba(0,0,0,.75)!important;}`}</style>
      <div style={{width:260,flexShrink:0,height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',gap:10,padding:'32px 14px 40px 0',borderLeft:`1px solid ${C.border}`,scrollbarWidth:'thin',scrollbarColor:`${C.border} transparent`}}>
        <div style={{paddingLeft:12,display:'flex',flexDirection:'column',gap:10}}>

          {/* ── FILTER BY TYPE — redesigned with per-type accent colors ── */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <SH label="Filter by type" accent={C.pink}/>
            <div style={{padding:'10px 10px',display:'flex',flexDirection:'column',gap:3}}>
              {TYPE_FILTERS.map(t=>{
                const on=activeType===t.id;
                const count=t.id==='all'?allPosts.length
                  :t.id==='code'?allPosts.filter(p=>p.type==='code'&&p._source!=='community').length
                  :t.id==='project'?allPosts.filter(p=>p.type==='project').length
                  :allPosts.filter(p=>p._source==='community').length;
                return(
                  <button key={t.id} onClick={()=>onTypeChange(t.id)}
                    style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:10,cursor:'pointer',width:'100%',textAlign:'left',transition:'all .15s',
                      border:`1px solid ${on?t.border:C.border}`,
                      background:on?t.bg:'transparent',
                      boxShadow:on?`0 2px 8px ${t.color}18`:''}}
                    onMouseEnter={e=>{if(!on){e.currentTarget.style.background=`${t.color}08`;e.currentTarget.style.borderColor=`${t.color}30`;}}}
                    onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=C.border;}}}
                  >
                    {/* colored icon circle */}
                    <div style={{width:24,height:24,borderRadius:7,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,
                      background:on?`${t.color}25`:`${t.color}10`,
                      border:`1px solid ${on?t.color+'60':t.color+'25'}`,
                      color:t.color,transition:'all .15s'}}>
                      {t.icon}
                    </div>
                    <span style={{fontFamily:C.mono,fontSize:10,color:on?t.color:C.muted,flex:1,fontWeight:on?700:400,transition:'color .12s'}}>{t.label}</span>
                    {/* count badge */}
                    <span style={{fontFamily:C.mono,fontSize:9,padding:'1px 7px',borderRadius:20,flexShrink:0,
                      background:on?`${t.color}22`:C.border2,
                      color:on?t.color:C.fainter,
                      border:`1px solid ${on?t.color+'40':'transparent'}`,
                      fontWeight:on?700:400,
                      transition:'all .15s'}}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SEARCH — improved focus state + live count ── */}
          <div style={{background:C.card,border:`1px solid ${searchFocused?C.pink+'55':C.border}`,borderRadius:14,overflow:'hidden',transition:'border-color .18s',boxShadow:searchFocused?`0 0 0 3px rgba(244,114,182,.08)`:'none'}}>
            <SH label="Search" accent={C.indigo}/>
            <div style={{padding:'10px 12px'}}>
              <div style={{position:'relative'}}>
                <svg style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',transition:'stroke .18s'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={searchFocused?C.pink:C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="user, tag, title, keyword…"
                  onFocus={()=>setSearchFocused(true)}
                  onBlur={()=>setSearchFocused(false)}
                  style={{width:'100%',boxSizing:'border-box',paddingLeft:28,paddingRight:searchQuery?26:10,paddingTop:8,paddingBottom:8,
                    background:'#0e0e0d',border:`1px solid ${searchFocused?C.pink+'40':C.border}`,borderRadius:9,
                    color:C.text,fontSize:12,fontFamily:C.sans,outline:'none',caretColor:C.pink,transition:'border-color .18s'}}
                />
                {searchQuery&&<button onClick={()=>setSearchQuery('')} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.faint,cursor:'pointer',fontSize:12,lineHeight:1,padding:2,borderRadius:4,transition:'color .15s'}} onMouseEnter={e=>e.currentTarget.style.color=C.pink} onMouseLeave={e=>e.currentTarget.style.color=C.faint}>✕</button>}
              </div>
              {/* live result count */}
              {searchQuery.trim()&&(
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:7}}>
                  <div style={{width:4,height:4,borderRadius:'50%',background:searchResultCount>0?C.cyan:C.faint,flexShrink:0}}/>
                  <p style={{fontFamily:C.mono,fontSize:9,color:searchResultCount>0?C.cyan:C.faint,margin:0,transition:'color .2s'}}>
                    {searchResultCount===0?'no results found':`${searchResultCount} result${searchResultCount!==1?'s':''} found`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── PLATFORM STATS ── new micro-widget ── */}
          {platformStats&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="Platform" accent={C.purple}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,padding:'10px 8px'}}>
                {[
                  {label:'posts',   value:platformStats.posts,    color:C.pink},
                  {label:'people',  value:platformStats.people,   color:C.cyan},
                  {label:'hubs',    value:platformStats.communities, color:C.green},
                ].map((stat,i)=>(
                  <div key={stat.label} style={{textAlign:'center',padding:'8px 4px',borderRight:i<2?`1px solid ${C.border}`:'none'}}>
                    <p style={{fontFamily:C.mono,fontSize:16,fontWeight:700,color:stat.color,margin:'0 0 2px',lineHeight:1}}>{stat.value}</p>
                    <p style={{fontFamily:C.mono,fontSize:8,color:C.fainter,margin:0,letterSpacing:'.06em'}}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TOP CONTRIBUTORS — with medal rings ── */}
          {topContributors.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="top contributors" accent={C.amber}/>
              <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:2}}>
                {topContributors.map((u,i)=>{
                  const medalColor=i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':null;
                  const maxPts=topContributors[0]?.points||1;
                  const barPct=Math.round(((u.points||0)/maxPts)*100);
                  return(
                    <div key={u.id} onClick={()=>navigate(`/user/id/${u.id}`)}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:9,cursor:'pointer',transition:'background .12s',position:'relative'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.03)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      {/* rank number */}
                      <span style={{fontFamily:C.mono,fontSize:9,color:medalColor||C.fainter,width:12,flexShrink:0,textAlign:'center',fontWeight:700}}>{i+1}</span>
                      {/* avatar with medal ring */}
                      <div style={{position:'relative',flexShrink:0}}>
                        {u.avatar_url
                          ?<img src={u.avatar_url} alt="" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover',border:`2px solid ${medalColor||C.border}`,display:'block'}}/>
                          :<div style={{width:30,height:30,borderRadius:'50%',background:avatarGradient(u.id),border:`2px solid ${medalColor||C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{getInitials(u.full_name||u.username||'?')}</div>
                        }
                        {medalColor&&<div style={{position:'absolute',bottom:-1,right:-1,width:10,height:10,borderRadius:'50%',background:medalColor,border:`1.5px solid ${C.card}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:5}}>★</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                          <p style={{fontFamily:C.sans,fontSize:12,fontWeight:600,color:C.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{u.full_name||u.username||'Anonymous'}</p>
                          <span style={{fontFamily:C.mono,fontSize:9,color:medalColor||C.faint,flexShrink:0}}>{u.points||0}</span>
                        </div>
                        {/* mini points bar */}
                        <div style={{height:3,borderRadius:2,background:C.border2,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:2,width:`${barPct}%`,background:medalColor?`linear-gradient(90deg,${medalColor}aa,${medalColor})`:`linear-gradient(90deg,${C.indigo},${C.cyan})`,transition:'width .5s ease'}}/>
                        </div>
                      </div>
                      {u.open_to_work&&<span style={{fontSize:7,padding:'1px 5px',borderRadius:20,background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.25)',color:C.green,fontFamily:C.mono,flexShrink:0}}>hire</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── HOT RIGHT NOW — improved cards ── */}
          {hotPosts.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="hot right now" live accent={C.pink}/>
              <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:6}}>
                {hotPosts.map((p,idx)=>{
                  const title=p.type==='project'?(p.project_title||'Untitled Project'):(p.caption||p.file_name||p.tag||'Untitled');
                  const author=resolveName(p,pm);
                  const tc=tagC(p.tag);
                  const rank=['🥇','🥈','🥉','4️⃣'][idx]||'';
                  return(
                    <div key={p.id} onClick={()=>onHotPostClick(p)}
                      style={{padding:'9px 11px',background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,transition:'all .15s',cursor:'pointer',position:'relative',overflow:'hidden'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.pink+'50';e.currentTarget.style.background='#131312';e.currentTarget.style.transform='translateX(2px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card2;e.currentTarget.style.transform='none';}}
                    >
                      {/* accent left bar */}
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${C.pink},${C.pink}00)`}}/>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4,paddingLeft:6}}>
                        <p style={{fontFamily:C.sans,fontSize:12,color:C.mid,fontWeight:600,margin:0,lineHeight:1.35,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</p>
                        {p.tag&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,flexShrink:0,fontFamily:C.mono,color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`}}>{p.tag}</span>}
                      </div>
                      <p style={{fontFamily:C.mono,fontSize:9,color:C.faint,margin:'0 0 5px 6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>by {author}</p>
                      <div style={{display:'flex',alignItems:'center',gap:8,paddingLeft:6}}>
                        <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:C.pink,fontFamily:C.mono}}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {p.likes||0}
                        </span>
                        <span style={{fontSize:9,color:C.faint,fontFamily:C.mono}}>{p.comments||0} cmts</span>
                        <span style={{marginLeft:'auto',fontSize:9,color:C.fainter,fontFamily:C.mono}}>{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RECENTLY ACTIVE COMMUNITIES ── */}
          {activeCommunities.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="recently active" live accent={C.green}/>
              <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:2}}>
                {activeCommunities.map(c=>(
                  <div key={c.id} onClick={()=>navigate(`/community/${c.id}`)}
                    style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',borderRadius:9,cursor:'pointer',transition:'background .12s,border-color .12s',border:'1px solid transparent'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(52,211,153,.04)';e.currentTarget.style.borderColor='rgba(52,211,153,.18)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}
                  >
                    <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.mono,fontSize:12,fontWeight:700,color:C.green}}>
                      {(c.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:C.sans,fontSize:12,fontWeight:600,color:C.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</p>
                      <p style={{fontFamily:C.mono,fontSize:9,color:C.faint,margin:'2px 0 0'}}>{c.memberCount} members · {timeAgoShort(c.lastPost)}</p>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={C.green+'66'} strokeWidth="1.5" strokeLinecap="round"><path d="M4 8h8M9 5l3 3-3 3"/></svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRENDING TOPICS — with score bar ── */}
          {trendTopics.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="trending topics" accent={C.cyan}/>
              <div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:1}}>
                {trendTopics.map(([tag,score],i)=>{
                  const tc=tagC(tag),on=activeTag===tag;
                  const barW=Math.round((score/maxTopicScore)*100);
                  return(
                    <div key={tag} onClick={()=>onTagClick(on?null:tag)}
                      style={{padding:'7px 8px',borderRadius:9,transition:'background .12s',cursor:'pointer',background:on?tc.bg:'transparent',border:`1px solid ${on?tc.border:'transparent'}`,position:'relative',overflow:'hidden'}}
                      onMouseEnter={e=>{if(!on){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)';}}}
                      onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}}
                    >
                      {/* subtle score bar behind */}
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${barW}%`,background:`${tc.color}08`,pointerEvents:'none',transition:'width .3s ease'}}/>
                      <div style={{position:'relative',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:C.mono,fontSize:9,color:C.fainter,width:14,flexShrink:0,textAlign:'right'}}>{i+1}</span>
                        <span style={{fontFamily:C.mono,fontSize:11,color:on?tc.color:C.muted,fontWeight:on?700:400,flex:1,transition:'color .12s'}}>#{tag}</span>
                        <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:tc.bg,border:`1px solid ${tc.border}`,color:tc.color,fontFamily:C.mono,flexShrink:0}}>{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE — main component
// ─────────────────────────────────────────────────────────────────────────────
const Explore = () => {
  const { user: currentUser } = useAuth();
  const [allPosts,    setAllPosts]    = useState([]);
  const [communities, setCommunities] = useState([]);
  const [comMeta,     setComMeta]     = useState({});
  const [myMems,      setMyMems]      = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [profileMap,  setProfileMap]  = useState({});
  const [activeTag,   setActiveTag]   = useState(null);
  const [activeType,  setActiveType]  = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalPost,   setModalPost]   = useState(null);
  const [likedPosts,    setLikedPosts]    = useState({});
  const [localLikes,    setLocalLikes]    = useState({});
  const [localComments, setLocalComments] = useState({});
  const [drawerPostId,  setDrawerPostId]  = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);
  const scrollContainerRef = useRef(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const shaped = await getExploreFeed();
      const uids = [...new Set(shaped.map(p=>p.user_id).filter(Boolean))];
      let pm = {};
      if (uids.length) pm = await getProfileMap(uids);
      setProfileMap(pm);
      const enriched = shaped.map(p=>({
        ...p,
        author_name:     p.author_name     || pm[p.user_id]?.full_name  || pm[p.user_id]?.username || null,
        author_avatar:   p.author_avatar   || pm[p.user_id]?.avatar_url || null,
        github_username: p.github_username || pm[p.user_id]?.username   || null,
      }));
      setAllPosts(enriched);
      setVisibleCount(PAGE_SIZE);
      const communityPostIds = enriched.filter(p=>p._source==='community').map(p=>p.id);
      if (currentUser && communityPostIds.length) {
        const likedSet = await getCommunityLikedPosts(currentUser.id, communityPostIds);
        const liked = {};
        likedSet.forEach(id=>{ liked[id]=true; });
        setLikedPosts(prev=>({...prev,...liked}));
      }
    } catch(err) { console.error('Explore load error:', err); }
    setLoading(false);
  }, [currentUser]);

  const loadCommunities = useCallback(async (userId) => {
    const [{data:comms},membshp] = await Promise.all([
      supabase.from('communities').select('id,name,description,slug').order('created_at',{ascending:false}).limit(20),
      userId ? supabase.from('community_members').select('community_id').eq('user_id',userId) : Promise.resolve({data:[]}),
    ]);
    const mySet = new Set((membshp.data||[]).map(r=>r.community_id));
    setMyMems(mySet);
    const unjoined = (comms||[]).filter(c=>!mySet.has(c.id)).slice(0,12);
    setCommunities(unjoined);
    await Promise.all(unjoined.map(async c=>{
      const{data:mems}=await supabase.from('community_members').select('user_id').eq('community_id',c.id).limit(30);
      const count=mems?.length??0;
      const uids=mems?.slice(0,3).map(m=>m.user_id).filter(Boolean)||[];
      let avatars=[];
      if(uids.length){const{data:profs}=await supabase.from('profiles').select('id,full_name,avatar_url').in('id',uids);avatars=profs||[];}
      setComMeta(prev=>({...prev,[c.id]:{count,avatars}}));
    }));
  }, []);

  const handleLike = async (postId) => {
    if (!currentUser) return alert('Login to like posts');
    const already=likedPosts[postId]??false;
    const current=localLikes[postId]??(allPosts.find(p=>p.id===postId)?.likes??0);
    setLikedPosts(p=>({...p,[postId]:!already}));
    setLocalLikes(p=>({...p,[postId]:already?Math.max(0,current-1):current+1}));
    const{error}=await toggleCommunityLike(postId,currentUser.id,already);
    if(error){setLikedPosts(p=>({...p,[postId]:already}));setLocalLikes(p=>({...p,[postId]:current}));}
  };

  const loadComments = async (postId) => {
    setLocalComments(p=>({...p,[postId]:null}));
    const enriched=await getCommunityComments(postId,currentUser?.id??null);
    const commentUids=[...new Set(enriched.map(c=>c.user_id).filter(Boolean))];
    if(currentUser?.id)commentUids.push(currentUser.id);
    const missing=commentUids.filter(uid=>!profileMap[uid]);
    if(missing.length>0){const extra=await getProfileMap(missing);setProfileMap(prev=>({...prev,...extra}));}
    setLocalComments(p=>({...p,[postId]:enriched}));
  };

  const handleOpenComments = (postId) => {
    setDrawerPostId(postId); setDrawerOpen(true);
    if (!localComments[postId]) loadComments(postId);
  };

  useEffect(()=>{
    loadPosts();
    const channels=[
      supabase.channel('xp-p').on('postgres_changes',{event:'*',schema:'public',table:'posts'},loadPosts).subscribe(),
      supabase.channel('xp-j').on('postgres_changes',{event:'*',schema:'public',table:'project_posts'},loadPosts).subscribe(),
      supabase.channel('xp-c').on('postgres_changes',{event:'*',schema:'public',table:'community_posts'},loadPosts).subscribe(),
    ];
    return()=>channels.forEach(ch=>supabase.removeChannel(ch));
  },[loadPosts]);

  useEffect(()=>{if(currentUser!==null)loadCommunities(currentUser?.id??null);},[currentUser,loadCommunities]);

  const handleJoin = async (id) => {
    if(!currentUser?.id)return;
    const{error}=await supabase.from('community_members').insert({community_id:id,user_id:currentUser.id});
    if(!error){setMyMems(prev=>new Set(prev).add(id));setTimeout(()=>setCommunities(prev=>prev.filter(c=>c.id!==id)),1900);}
  };

  const filteredPosts = useMemo(()=>{
    let r=allPosts;
    if(activeTag){r=r.filter(p=>{const tags=[];if(p.tag)tags.push(p.tag.toLowerCase());if(p.project_stack)p.project_stack.split(',').forEach(t=>tags.push(t.trim().toLowerCase()));return tags.includes(activeTag);});}
    if(activeType!=='all'){
      if(activeType==='community')r=r.filter(p=>p._source==='community');
      else if(activeType==='code')r=r.filter(p=>p.type==='code'&&p._source!=='community');
      else if(activeType==='project')r=r.filter(p=>p.type==='project');
    }
    if(searchQuery.trim())r=r.filter(p=>postMatchesSearch(p,searchQuery,profileMap));
    return r;
  },[allPosts,activeTag,activeType,searchQuery,profileMap]);

  useEffect(()=>{setVisibleCount(PAGE_SIZE);},[activeTag,activeType,searchQuery]);

  const visiblePosts=useMemo(()=>filteredPosts.slice(0,visibleCount),[filteredPosts,visibleCount]);
  const hasMore=visibleCount<filteredPosts.length;
  const isTweetPost=(p)=>p._source==='community'&&(p.type==='text'||p.type==='pdf');

  const feedItems=useMemo(()=>{
    if(loading)return[];
    const items=[];let pi=0,ci=0,radarInserted=false;
    const openComms=communities.slice(ci,ci+2);
    if(openComms.length){items.push({type:'communities',items:openComms});ci+=2;}
    let gridBatch=[];
    const flushGrid=()=>{if(gridBatch.length){items.push({type:'posts',items:[...gridBatch]});gridBatch=[];}};
    for(;pi<visiblePosts.length;pi++){
      const p=visiblePosts[pi];
      if(isTweetPost(p)){flushGrid();items.push({type:'tweet',post:p});}
      else{
        gridBatch.push(p);
        if(gridBatch.length===6){flushGrid();if(!radarInserted){items.push({type:'radar'});radarInserted=true;}else{const cb=communities.slice(ci,ci+2);if(cb.length){items.push({type:'communities',items:cb});ci+=2;}}}
      }
    }
    flushGrid();
    return items;
  },[visiblePosts,communities,loading]);

  return(
    <>
      <style>{`
        @keyframes xpulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes xping{75%,100%{transform:scale(2);opacity:0}}
        @keyframes xpop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
        @keyframes xwelcome{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes xload{from{width:0}to{width:100%}}
        @keyframes xspin{to{transform:rotate(360deg)}}
        @keyframes xShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .xgc:hover .xgc-ov{opacity:1!important;background:rgba(0,0,0,.76)!important;}
      `}</style>

      <div style={{display:'flex',height:'100vh',overflow:'hidden',width:'100%'}}>
        <div ref={scrollContainerRef} style={{flex:1,minWidth:0,overflowY:'auto',padding:'40px 20px 60px'}}>
          <div style={{maxWidth:740,margin:'0 auto'}}>

            <TagCloud posts={allPosts} activeTag={activeTag} onTagClick={t=>{setActiveTag(t);setSearchQuery('');setActiveType('all');}}/>

            {(activeTag||searchQuery.trim()||activeType!=='all')&&(
              <div style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 14px',flexWrap:'wrap'}}>
                {activeTag&&<button onClick={()=>setActiveTag(null)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(244,114,182,.08)',border:'1px solid rgba(244,114,182,.25)',color:C.pink,fontFamily:C.mono,fontSize:10,cursor:'pointer'}}>#{activeTag} ✕</button>}
                {searchQuery.trim()&&<button onClick={()=>setSearchQuery('')} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(129,140,248,.08)',border:'1px solid rgba(129,140,248,.25)',color:C.indigo,fontFamily:C.mono,fontSize:10,cursor:'pointer'}}>"{searchQuery}" ✕</button>}
                {activeType!=='all'&&<button onClick={()=>setActiveType('all')} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(56,189,248,.08)',border:'1px solid rgba(56,189,248,.25)',color:C.cyan,fontFamily:C.mono,fontSize:10,cursor:'pointer'}}>{activeType} ✕</button>}
                <button onClick={()=>{setActiveTag(null);setSearchQuery('');setActiveType('all');}} style={{fontSize:10,color:C.faint,background:'none',border:'none',cursor:'pointer',fontFamily:C.mono,padding:0}}>clear all</button>
                <span style={{marginLeft:'auto',fontFamily:C.mono,fontSize:9,color:C.fainter}}>{filteredPosts.length} post{filteredPosts.length!==1?'s':''}</span>
              </div>
            )}

            {/* shimmer skeletons */}
            {loading&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
                {Array.from({length:9}).map((_,i)=>(
                  <div key={i} style={{aspectRatio:'1/1',borderRadius:14,overflow:'hidden',border:`1px solid ${C.border}`,position:'relative',background:C.card,animationDelay:`${i*0.07}s`}}>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.04) 50%,transparent 100%)',backgroundSize:'400px 100%',animation:'xShimmer 1.6s ease-in-out infinite',animationDelay:`${i*0.12}s`}}/>
                  </div>
                ))}
              </div>
            )}

            {!loading&&filteredPosts.length===0&&(
              <div style={{textAlign:'center',padding:'56px 0'}}>
                <div style={{fontSize:32,marginBottom:12,opacity:.4}}>🔍</div>
                <p style={{fontFamily:C.mono,fontSize:12,color:C.faint,margin:'0 0 6px'}}>
                  {activeTag||searchQuery||activeType!=='all'?'No posts match this filter.':'No posts on the platform yet.'}
                </p>
                {(activeTag||searchQuery||activeType!=='all')&&<button onClick={()=>{setActiveTag(null);setSearchQuery('');setActiveType('all');}} style={{marginTop:12,padding:'7px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontFamily:C.mono,fontSize:11,cursor:'pointer',transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.pink+'60';e.currentTarget.style.color=C.pink;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>Clear filters</button>}
              </div>
            )}

            {!loading&&feedItems.map((batch,bi)=>(
              <div key={bi} style={{marginBottom:16}}>
                {batch.type==='posts'&&(
                  <AnimatedBatch>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
                      {batch.items.map(p=>(
                        <div key={`${p._source}-${p.id}`} className="xgc">
                          <GridCard post={p} pm={profileMap} onClick={()=>setModalPost(p)}/>
                        </div>
                      ))}
                    </div>
                  </AnimatedBatch>
                )}
                {batch.type==='tweet'&&<TweetCard post={batch.post} pm={profileMap} onClick={()=>setModalPost(batch.post)}/>}
                {batch.type==='radar'&&<DevRadar currentUser={currentUser} allPosts={allPosts}/>}
                {batch.type==='communities'&&batch.items.length>0&&(
                  <AnimatedBatch>
                    <div style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0 10px'}}>
                      <div style={{flex:1,height:1,background:C.border}}/><span style={{fontFamily:C.mono,fontSize:8,letterSpacing:'.14em',textTransform:'uppercase',color:C.fainter,flexShrink:0}}>communities to explore</span><div style={{flex:1,height:1,background:C.border}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      {batch.items.map(c=><InlineCommunityCard key={c.id} community={c} memberCount={comMeta[c.id]?.count} avatars={comMeta[c.id]?.avatars||[]} onJoin={handleJoin}/>)}
                    </div>
                  </AnimatedBatch>
                )}
              </div>
            ))}

            {!loading&&filteredPosts.length>0&&(
              <div style={{paddingTop:24,paddingBottom:40}}>
                <div style={{width:'100%',height:2,background:C.border,borderRadius:2,overflow:'hidden',marginBottom:14}}>
                  <div style={{height:'100%',borderRadius:2,background:`linear-gradient(90deg,${C.pink},${C.indigo},${C.cyan})`,width:`${Math.min(100,Math.round((Math.min(visibleCount,filteredPosts.length)/filteredPosts.length)*100))}%`,transition:'width .6s cubic-bezier(.22,1,.36,1)'}}/>
                </div>
                {hasMore?(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                    <p style={{fontFamily:C.mono,fontSize:9,color:C.fainter,margin:0}}>{`${Math.min(visibleCount,filteredPosts.length)} of ${filteredPosts.length} posts`}</p>
                    <button onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'10px 24px',borderRadius:10,cursor:'pointer',border:`1px solid ${C.border}`,background:C.card,color:C.muted,fontFamily:C.mono,fontSize:10,transition:'all .18s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(244,114,182,.45)';e.currentTarget.style.color=C.pink;e.currentTarget.style.background='rgba(244,114,182,.06)';e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;e.currentTarget.style.background=C.card;e.currentTarget.style.transform='none';}}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      Load {Math.min(PAGE_SIZE,filteredPosts.length-visibleCount)} more posts
                    </button>
                  </div>
                ):(
                  <p style={{textAlign:'center',fontFamily:C.mono,fontSize:9,color:C.fainter,margin:0}}>// all {filteredPosts.length} post{filteredPosts.length!==1?'s':''} loaded</p>
                )}
              </div>
            )}
          </div>
        </div>

        <ExploreSidebar
          allPosts={allPosts} pm={profileMap}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          activeTag={activeTag} onTagClick={t=>{setActiveTag(t);setSearchQuery('');setActiveType('all');}}
          onHotPostClick={p=>setModalPost(p)}
          activeType={activeType} onTypeChange={t=>{setActiveType(t);setVisibleCount(PAGE_SIZE);}}
          searchResultCount={filteredPosts.length}
        />
      </div>

      {modalPost&&<PostDetailModal post={modalPost} me={currentUser} pm={profileMap} onClose={()=>setModalPost(null)} likedPosts={likedPosts} localLikes={localLikes} onLike={handleLike} onOpenComments={handleOpenComments}/>}
      <CommentDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} post={allPosts.find(p=>p.id===drawerPostId)??null} currentUserId={currentUser?.id??null} comments={localComments[drawerPostId]??null} onRefresh={()=>drawerPostId&&loadComments(drawerPostId)} onCommentPosted={()=>{}} profileMap={profileMap}/>
    </>
  );
};

export default Explore;
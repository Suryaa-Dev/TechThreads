// src/features/feed/pages/Explore.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   REPLACED: supabase.auth.getUser()            → useAuth() from AuthContext
//   REPLACED: inline loadPosts() queries         → getExploreFeed() from postService
//   REPLACED: inline profileMap fetch            → getProfileMap() from userService
//   REPLACED: inline handleLike community logic  → toggleCommunityLike() from likeService
//   REPLACED: inline initLikedState              → getCommunityLikedPosts() from likeService
//   REPLACED: inline loadComments               → getCommunityComments() from postService
//   REPLACED: inline postMatchesQuery            → postMatchesQuery() from helpers
//   REPLACED: inline getInitials / avatarGrad    → getInitials / avatarGradient from userService
//   REMOVED:  inline resolveName/resolveAvatar/resolveUsername (now use profileMap directly)
//   KEPT: ALL UI — DevRadar, TagCloud, GridCard, InlineCommunityCard, ExploreSidebar
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
import ActivityStreamBar from '../components/ActivityStreamBar';
import CommunityPostCard from '../../communities/components/PostCard';
import CommentDrawer     from '../../communities/components/CommentDrawer';

// ─── tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:'#0e0e0d',card:'#161615',border:'#252523',
  pink:'#f472b6',indigo:'#818cf8',cyan:'#38bdf8',green:'#34d399',amber:'#f5a623',
  text:'#e8eaf6',muted:'#8891b2',faint:'#6b7a99',fainter:'#2d3452',
};

// ─── tag colours ──────────────────────────────────────────────────────────────
const TAG_C = {
  react:      {color:'#61AFEF',border:'rgba(97,175,239,.3)', bg:'rgba(97,175,239,.1)' },
  typescript: {color:'#4EC9B0',border:'rgba(78,201,176,.3)', bg:'rgba(78,201,176,.1)' },
  javascript: {color:'#FFD43B',border:'rgba(255,212,59,.3)', bg:'rgba(255,212,59,.1)' },
  python:     {color:'#FFD43B',border:'rgba(255,212,59,.3)', bg:'rgba(255,212,59,.1)' },
  java:       {color:'#f89820',border:'rgba(248,152,32,.3)', bg:'rgba(248,152,32,.1)' },
  css:        {color:'#D4537E',border:'rgba(212,83,126,.3)', bg:'rgba(212,83,126,.1)' },
  tailwind:   {color:'#38bdf8',border:'rgba(56,189,248,.3)', bg:'rgba(56,189,248,.1)' },
  supabase:   {color:'#3ECF8E',border:'rgba(62,207,142,.3)', bg:'rgba(62,207,142,.1)' },
  'ml-ai':    {color:'#a78bfa',border:'rgba(167,139,250,.3)',bg:'rgba(167,139,250,.1)'},
  nextjs:     {color:'#c0c0ba',border:'rgba(192,192,186,.3)',bg:'rgba(192,192,186,.08)'},
  rust:       {color:'#f0744d',border:'rgba(240,116,77,.3)', bg:'rgba(240,116,77,.1)' },
  go:         {color:'#00add8',border:'rgba(0,173,216,.3)',  bg:'rgba(0,173,216,.1)'  },
  devops:     {color:'#9c6fff',border:'rgba(156,111,255,.3)',bg:'rgba(156,111,255,.1)'},
  frontend:   {color:'#00d4ff',border:'rgba(0,212,255,.3)',  bg:'rgba(0,212,255,.1)'  },
  backend:    {color:'#00e676',border:'rgba(0,230,118,.3)',  bg:'rgba(0,230,118,.1)'  },
};
const tagC = (t) => TAG_C[(t||'').toLowerCase().replace(/[\.\s]/g,'')] ||
  {color:C.pink,border:'rgba(244,114,182,.3)',bg:'rgba(244,114,182,.1)'};

const PAGE_SIZE = 12;

// ─── profile helpers (now delegated to userService) ──────────────────────────
const resolveName   = (post, pm) => pm[post.user_id]?.full_name    || null;
const resolveAvatar = (post, pm) => pm[post.user_id]?.avatar_url   || null;
const resolveUsername = (post, pm) => pm[post.user_id]?.username   || null;

// ─────────────────────────────────────────────────────────────────────────────
// GRID CARD
// ─────────────────────────────────────────────────────────────────────────────
function GridCard({post, me, pm, onClick}) {
  const name     = resolveName(post, pm);
  const avatar   = resolveAvatar(post, pm);
  const initials = getInitials(name || '');
  const isCode    = post.type==='code' || (post._source==='community' && post.type!=='image' && post.type!=='project');
  const isProject = post.type==='project';
  const isImage   = post.type==='image' && post.file_url;
  const tc        = tagC(post.tag);
  const caption   = post.caption || post.text || post.project_desc || null;

  return (
    <div onClick={onClick} className="xgc"
      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden',
        cursor:'pointer',position:'relative',aspectRatio:'1/1',
        transition:'transform .15s,border-color .15s,box-shadow .15s',display:'flex',flexDirection:'column'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=C.pink+'55';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,.55)';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none';}}
    >
      <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,${C.pink},${C.indigo},${C.cyan})`}}/>
      <div style={{flex:1,minHeight:0,overflow:'hidden',position:'relative'}}>
        {isImage&&<img src={post.file_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>}
        {isCode&&!isImage&&(
          <div style={{width:'100%',height:'100%',background:'#0d0d10',overflow:'hidden',padding:'10px 12px',boxSizing:'border-box'}}>
            <div style={{display:'flex',gap:4,marginBottom:8}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#ff5f57',flexShrink:0}}/>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#febc2e',flexShrink:0}}/>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#28c840',flexShrink:0}}/>
              {post.tag&&<span style={{marginLeft:'auto',fontFamily:"'Space Mono',monospace",fontSize:8,fontWeight:400,color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`,padding:'0 5px',borderRadius:4}}>{post.tag}</span>}
            </div>
            {(post.code||'// no preview').split('\n').slice(0,12).map((line,i)=>(
              <div key={i} style={{display:'flex',gap:8,minHeight:'1.35em'}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'#2a3a4a',flexShrink:0,width:14,textAlign:'right',userSelect:'none'}}>{i+1}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:'#abb2bf',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{line||' '}</span>
              </div>
            ))}
          </div>
        )}
        {isProject&&(
          <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16,boxSizing:'border-box',background:'linear-gradient(135deg,#0d1520,#111c2e)',textAlign:'center'}}>
            <div style={{fontSize:26,marginBottom:8}}>⚙️</div>
            <p style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:12,color:C.text,margin:'0 0 4px',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{post.project_title||'Untitled Project'}</p>
            {post.project_stack&&<p style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:C.faint,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{post.project_stack}</p>}
          </div>
        )}
        {/* hover overlay */}
        <div className="xgc-ov" style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'10px 10px 8px',transition:'background .18s,opacity .18s',opacity:0}}>
          {caption&&<p style={{fontFamily:"'Syne',sans-serif",fontSize:10,color:'rgba(255,255,255,.85)',margin:'0 0 7px',lineHeight:1.45,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{caption}</p>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              {avatar?<img src={avatar} alt="" style={{width:18,height:18,borderRadius:'50%',objectFit:'cover',border:`1px solid ${C.border}`}}/>
                :<div style={{width:18,height:18,borderRadius:'50%',background:avatarGradient(name||''),display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:500,color:'#fff'}}>{initials}</div>}
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:500,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{name||'Unknown'}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:C.pink}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likes||0}
              </span>
              <span style={{fontSize:10,color:C.muted}}>{post.comments||0}</span>
            </div>
          </div>
        </div>
      </div>
      {post.community_name&&(
        <div style={{flexShrink:0,padding:'4px 10px',background:'rgba(129,140,248,.07)',borderTop:`1px solid rgba(129,140,248,.14)`,display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:10,height:10,borderRadius:3,background:'rgba(129,140,248,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,color:C.indigo,flexShrink:0}}>{post.community_name[0].toUpperCase()}</div>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:C.indigo,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.community_name}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PostDetailModal({post, me, pm, onClose, likedPosts={}, localLikes={}, onLike, onOpenComments}) {
  useEffect(()=>{
    const esc=(e)=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',esc);
    return()=>window.removeEventListener('keydown',esc);
  },[onClose]);

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,.82)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',borderRadius:20}}>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
          <button onClick={onClose}
            style={{width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.2)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';}}
          >✕</button>
        </div>
        {post._source==='community'
          ?<CommunityPostCard
              post={post}
              currentUserId={me?.id??null}
              displayName={resolveName(post,pm)}
              avatarUrl={resolveAvatar(post,pm)}
              githubUsername={resolveUsername(post,pm)}
              communityId={post.community_id}
              likeCount={likedPosts[post.id]!==undefined?(localLikes[post.id]??post.likes??0):(post.likes??0)}
              liked={likedPosts[post.id]??false}
              onLike={onLike}
              onOpenComments={onOpenComments}
            />
          :post.type==='project'
          ?<ProjectCard post={post} currentUser={me}/>
          :<PostCard currentUser={me} post={{
              id:post.id,
              author:{name:resolveName(post,pm),username:resolveUsername(post,pm),avatar:resolveAvatar(post,pm)},
              user_id:post.user_id,tag:post.tag,fileName:post.file_name,
              code:post.code,caption:post.caption,likes:post.likes,comments:post.comments,created_at:post.created_at
            }}/>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG HEAT CLOUD  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function TagCloud({posts,activeTag,onTagClick}){
  const tagScores=useMemo(()=>{
    const sc={};
    posts.forEach(p=>{
      const tags=[];
      if(p.tag)tags.push(p.tag.toLowerCase());
      if(p.project_stack)p.project_stack.split(',').forEach(t=>tags.push(t.trim().toLowerCase()));
      tags.forEach(t=>{if(t)sc[t]=(sc[t]||0)+(p.likes||0)+1;});
    });
    return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,14);
  },[posts]);

  if(!tagScores.length)return null;
  const max=tagScores[0][1];
  const min=tagScores[tagScores.length-1][1];
  const range=max-min||1;
  const fs=(score)=>Math.round(11+((score-min)/range)*8);
  const op=(score)=>+(0.55+((score-min)/range)*0.45).toFixed(2);

  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'14px 16px',marginBottom:8}}>
      <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:400,letterSpacing:'.12em',textTransform:'uppercase',color:C.fainter,margin:'0 0 12px'}}>
        trending tags — size &amp; colour = activity
      </p>
      <div style={{display:'flex',flexWrap:'wrap',gap:9,alignItems:'center'}}>
        {tagScores.map(([tag,score])=>{
          const tc=tagC(tag);
          const on=activeTag===tag;
          const opa=op(score);
          const rgb=hexToRgb(tc.color);
          return(
            <button key={tag} onClick={()=>onTagClick(on?null:tag)}
              style={{fontFamily:"'Space Mono',monospace",fontSize:fs(score),fontWeight:400,padding:'3px 11px',borderRadius:20,cursor:'pointer',transition:'all .15s',
                border:`1px solid ${on?tc.color:`rgba(${rgb},${opa*0.6})`}`,
                background:on?tc.bg:`rgba(${rgb},${opa*0.06})`,
                color:`rgba(${rgb},${on?1:opa})`,
                transform:on?'translateY(-1px)':'none'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=tc.color;}}
              onMouseLeave={e=>{e.currentTarget.style.transform=on?'translateY(-1px)':'none';e.currentTarget.style.borderColor=on?tc.color:`rgba(${rgb},${opa*0.6})`;}}
            >#{tag}</button>
          );
        })}
      </div>
    </div>
  );
}

function hexToRgb(hex){
  const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,(_,r,g,b)=>`#${r+r}${g+g}${b+b}`));
  return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:'200,200,200';
}

// ─────────────────────────────────────────────────────────────────────────────
// DEV RADAR  (unchanged except: uses getInitials/avatarGradient from userService)
// ─────────────────────────────────────────────────────────────────────────────
function DevRadar({currentUser, allPosts}) {
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
        if(!byUser[p.user_id])byUser[p.user_id]={userId:p.user_id,likes:0,posts:0,topTag:null,name:null,avatar:null,github:null,tagCounts:{}};
        byUser[p.user_id].likes+=(p.likes||0);
        byUser[p.user_id].posts+=1;
        if(p.tag){const k=p.tag.toLowerCase();byUser[p.user_id].tagCounts[k]=(byUser[p.user_id].tagCounts[k]||0)+1;}
      });
      Object.values(byUser).forEach(u=>{
        const entries=Object.entries(u.tagCounts);
        if(entries.length)u.topTag=entries.sort((a,b)=>b[1]-a[1])[0][0];
      });
      const others=Object.values(byUser).filter(u=>u.userId!==currentUser?.id);
      let followedSet=new Set();
      if(currentUser?.id){
        const{data:frows}=await supabase.from('follows').select('following_id').eq('follower_id',currentUser.id);
        followedSet=new Set((frows||[]).map(r=>r.following_id));
      }
      const unFollowed=others.filter(u=>!followedSet.has(u.userId));
      const top=unFollowed.sort((a,b)=>b.likes-a.likes).slice(0,10);
      const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uids=top.map(u=>u.userId).filter(id=>id&&UUID_RE.test(id));
      if(uids.length){
        try{
          const{data:profs,error:profErr}=await supabase.from('profiles').select('id,full_name,avatar_url,username,open_to_work').in('id',uids);
          if(!profErr&&profs){
            const pm={};profs.forEach(p=>{pm[p.id]=p;});
            top.forEach(u=>{
              if(pm[u.userId]){
                u.name    =pm[u.userId].full_name    ||pm[u.userId].username||u.name;
                u.avatar  =pm[u.userId].avatar_url   ||u.avatar;
                u.username=pm[u.userId].username     ||null;
                u.openToWork=pm[u.userId].open_to_work||false;
              }
            });
          }
        }catch(e){}
      }
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

  const scroll=(dir)=>{ if(scrollRef.current)scrollRef.current.scrollBy({left:dir*300,behavior:'smooth'}); };

  if(!devs.length)return null;

  return(
    <div style={{marginBottom:8,position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:C.cyan}}>▍</span>
          <p style={{fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:400,letterSpacing:'.1em',textTransform:'uppercase',color:C.faint,margin:0}}>
            dev_radar — developers to follow
          </p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>scroll(-1)} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.faint,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',fontSize:12}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.cyan+'60';e.currentTarget.style.color=C.cyan;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.faint;}}
          >‹</button>
          <button onClick={()=>scroll(1)} style={{width:26,height:26,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',color:C.faint,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',fontSize:12}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.cyan+'60';e.currentTarget.style.color=C.cyan;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.faint;}}
          >›</button>
        </div>
      </div>
      <div ref={scrollRef} style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none',msOverflowStyle:'none'}}>
        <style>{`.xdr::-webkit-scrollbar{display:none}`}</style>
        {devs.map((dev,idx)=>{
          const tc=tagC(dev.topTag);
          const grad=avatarGradient(dev.userId);
          const state=followState[dev.userId]||'idle';
          const ini=getInitials(dev.name||'');
          return(
            <div key={dev.userId}
              style={{flexShrink:0,width:168,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',transition:'border-color .15s,transform .15s',fontFamily:"'Space Mono',monospace",display:'flex',flexDirection:'column'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=tc.color+'55';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none';}}
            >
              <div style={{height:2,background:`linear-gradient(90deg,${tc.color},${tc.color}00)`}}/>
              <div style={{padding:'12px 12px 10px',display:'flex',flexDirection:'column',flex:1}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontSize:8,color:C.fainter,letterSpacing:'.08em'}}>// dev_{String(idx+1).padStart(2,'0')}</span>
                  {dev.openToWork&&(<span style={{fontSize:7,padding:'1px 5px',borderRadius:10,background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',color:C.green}}>hiring</span>)}
                </div>
                <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
                  {dev.avatar
                    ?<img src={dev.avatar} alt="" onClick={()=>navigate(`/user/id/${dev.userId}`)}
                        style={{width:46,height:46,borderRadius:'50%',objectFit:'cover',border:`2px solid ${tc.color}40`,cursor:'pointer',transition:'border-color .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=tc.color;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=`${tc.color}40`;}}
                      />
                    :<div onClick={()=>navigate(`/user/id/${dev.userId}`)}
                        style={{width:46,height:46,borderRadius:'50%',background:grad,border:`2px solid ${tc.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:500,color:'#fff',cursor:'pointer'}}>
                        {ini}
                      </div>
                  }
                </div>
                <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:C.text,margin:'0 0 2px',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {dev.name||dev.username||`user_${dev.userId.slice(0,6)}`}
                </p>
                {dev.username&&<p style={{fontSize:9,color:C.faint,margin:'0 0 8px',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{dev.username}</p>}
                <div style={{background:'#121211',borderRadius:6,padding:'5px 8px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:8,color:C.fainter}}>posts</span><span style={{fontSize:8,color:C.cyan}}>{dev.posts}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:8,color:C.fainter}}>likes</span><span style={{fontSize:8,color:C.pink}}>{dev.likes}</span></div>
                  {dev.topTag&&(<div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:8,color:C.fainter}}>top tag</span><span style={{fontSize:8,color:tc.color}}>#{dev.topTag}</span></div>)}
                </div>
                <button onClick={()=>handleFollow(dev.userId)} disabled={state!=='idle'}
                  style={{marginTop:'auto',width:'100%',padding:'5px 0',borderRadius:7,fontSize:9,cursor:state==='idle'?'pointer':'default',fontFamily:"'Space Mono',monospace",transition:'all .15s',
                    border:state==='done'?`1px solid ${C.green}40`:`1px solid ${tc.color}40`,
                    background:state==='done'?`rgba(52,211,153,.08)`:state==='following'?`${tc.color}06`:`${tc.color}10`,
                    color:state==='done'?C.green:state==='following'?tc.color+'80':tc.color,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5}}
                  onMouseEnter={e=>{if(state==='idle'){e.currentTarget.style.background=`${tc.color}20`;}}}
                  onMouseLeave={e=>{if(state==='idle'){e.currentTarget.style.background=`${tc.color}10`;}}}
                >
                  {state==='done'?(<><span style={{fontSize:10}}>✓</span> following</>):state==='following'?(<><span style={{width:8,height:8,borderRadius:'50%',border:`1.5px solid ${tc.color}50`,borderTopColor:tc.color,animation:'xspin .7s linear infinite',display:'inline-block'}}/>following</>):(<>+ follow</>)}
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
// INLINE COMMUNITY CARD  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function InlineCommunityCard({community,memberCount,avatars,onJoin}){
  const navigate=useNavigate();
  const accents=[C.cyan,C.indigo,C.green,C.pink,C.amber,'#a78bfa'];
  const accent=accents[(community.id?.charCodeAt(0)??0)%accents.length];
  const [joinState,setJoinState]=useState('idle');

  const handleJoinClick=async()=>{
    if(joinState!=='idle')return;
    setJoinState('joining');
    await onJoin(community.id);
    setJoinState('welcome');
    setTimeout(()=>navigate(`/community/${community.id}`),1800);
  };

  return(
    <div
      style={{background:C.card,border:`1px solid ${joinState==='welcome'?accent+'90':C.border}`,borderRadius:14,overflow:'hidden',transition:'border-color .3s,transform .15s',display:'flex',flexDirection:'column',minHeight:148}}
      onMouseEnter={e=>{if(joinState==='idle'){e.currentTarget.style.borderColor=accent+'55';e.currentTarget.style.transform='translateY(-1px)';}}}
      onMouseLeave={e=>{if(joinState==='idle'){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform='none';}}}
    >
      <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,${accent},${accent}00)`}}/>
      {joinState==='welcome'?(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'14px',textAlign:'center',background:`linear-gradient(135deg,${accent}08,${accent}14)`,animation:'xwelcome .3s ease-out'}}>
          <div style={{width:34,height:34,borderRadius:'50%',background:`${accent}22`,border:`2px solid ${accent}70`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,marginBottom:9,color:accent,animation:'xpop .4s cubic-bezier(.175,.885,.32,1.275)'}}>✓</div>
          <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:C.text,margin:'0 0 3px',lineHeight:1.3}}>Welcome to {community.name}!</p>
          <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.faint,margin:'0 0 10px'}}>taking you there…</p>
          <div style={{width:'80%',height:2,borderRadius:2,background:`${accent}20`,overflow:'hidden'}}>
            <div style={{height:'100%',background:accent,borderRadius:2,animation:'xload 1.8s linear forwards'}}/>
          </div>
        </div>
      ):(
        <div style={{flex:1,padding:'10px 12px',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
            <div style={{width:28,height:28,borderRadius:7,flexShrink:0,background:`${accent}18`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:accent,fontFamily:"'Space Mono',monospace"}}>{community.name.slice(0,2).toUpperCase()}</div>
            <div style={{minWidth:0}}>
              <Link to={`/community/${community.id}`} style={{textDecoration:'none'}}>
                <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:C.text,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{community.name}</p>
              </Link>
              <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.faint,margin:'1px 0 0'}}>{memberCount??'-'} members</p>
            </div>
          </div>
          <p style={{fontFamily:"'Syne',sans-serif",fontSize:11,color:C.muted,lineHeight:1.5,flex:1,margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
            {community.description||'No description yet.'}
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto'}}>
            <div style={{display:'flex'}}>
              {(avatars||[]).map((a,i)=>(
                a.avatar_url
                  ?<img key={a.id} src={a.avatar_url} alt="" style={{width:18,height:18,borderRadius:'50%',objectFit:'cover',marginLeft:i?-5:0,border:`1.5px solid ${C.card}`,flexShrink:0}}/>
                  :<div key={a.id} style={{width:18,height:18,borderRadius:'50%',marginLeft:i?-5:0,flexShrink:0,background:avatarGradient(a.full_name||''),border:`1.5px solid ${C.card}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff'}}>{getInitials(a.full_name||'')}</div>
              ))}
            </div>
            <button onClick={handleJoinClick} disabled={joinState==='joining'}
              style={{padding:'4px 12px',borderRadius:7,fontSize:10,fontFamily:"'Space Mono',monospace",cursor:joinState==='joining'?'default':'pointer',border:`1px solid ${accent}45`,background:joinState==='joining'?`${accent}06`:`${accent}12`,color:joinState==='joining'?accent+'70':accent,transition:'all .15s',display:'flex',alignItems:'center',gap:5,flexShrink:0}}
              onMouseEnter={e=>{if(joinState==='idle')e.currentTarget.style.background=`${accent}22`;}}
              onMouseLeave={e=>{if(joinState==='idle')e.currentTarget.style.background=`${accent}12`;}}
            >
              {joinState==='joining'?(<><span style={{width:8,height:8,borderRadius:'50%',border:`1.5px solid ${accent}50`,borderTopColor:accent,animation:'xspin .7s linear infinite',display:'inline-block',flexShrink:0}}/>Joining</>):'+ Join'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE SIDEBAR  (unchanged — still has its own direct supabase calls for
//                   top contributors + active communities; these are read-only
//                   sidebar widgets and not part of the core data flow)
// ─────────────────────────────────────────────────────────────────────────────
function ExploreSidebar({allPosts,searchQuery,setSearchQuery,activeTag,onTagClick,onHotPostClick,activeType,onTypeChange}){
  const navigate=useNavigate();
  const [topContributors,setTopContributors]=useState([]);
  const [activeCommunities,setActiveCommunities]=useState([]);

  useEffect(()=>{
    let mounted=true;
    supabase.from('profiles').select('id,full_name,avatar_url,points,accepted_solutions_count,open_to_work').order('points',{ascending:false}).limit(5)
      .then(({data})=>{if(mounted&&data)setTopContributors(data);});
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

  const hotPosts=useMemo(()=>[...allPosts].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3),[allPosts]);
  const trendTopics=useMemo(()=>{
    const sc={};
    allPosts.forEach(p=>{
      if(p.tag)sc[p.tag.toLowerCase()]=(sc[p.tag.toLowerCase()]||0)+(p.likes||0)+1;
      if(p.project_stack)p.project_stack.split(',').forEach(t=>{const k=t.trim().toLowerCase();if(k)sc[k]=(sc[k]||0)+(p.likes||0)+1;});
    });
    return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,8);
  },[allPosts]);

  const timeAgoShort=(iso)=>{
    const s=(Date.now()-new Date(iso))/1000;
    if(s<3600)return`${Math.floor(s/60)}m ago`;
    if(s<86400)return`${Math.floor(s/3600)}h ago`;
    return`${Math.floor(s/86400)}d ago`;
  };

  const SH=({label,live})=>(
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderBottom:`1px solid ${C.border}`}}>
      {live&&(<span style={{position:'relative',display:'inline-flex',width:6,height:6,flexShrink:0}}>
        <span style={{position:'absolute',inset:0,borderRadius:'50%',background:C.pink,opacity:.5,animation:'xping 1.5s cubic-bezier(0,0,.2,1) infinite'}}/>
        <span style={{position:'relative',width:6,height:6,borderRadius:'50%',background:C.pink}}/>
      </span>)}
      <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:C.faint,margin:0}}>{label}</p>
    </div>
  );

  return(
    <>
      <style>{`@keyframes xping{75%,100%{transform:scale(2);opacity:0}} .xgc:hover .xgc-ov{opacity:1!important;background:rgba(0,0,0,.72)!important;}`}</style>
      <div style={{width:252,flexShrink:0,height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',gap:10,padding:'40px 14px 40px 0',borderLeft:`1px solid ${C.border}`}}>
        <div style={{paddingLeft:12,display:'flex',flexDirection:'column',gap:10}}>

          {/* Post Type Filter */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderBottom:`1px solid ${C.border}`}}>
              <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:C.faint,margin:0}}>Filter by type</p>
            </div>
            <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:4}}>
              {[
                {id:'all',     label:'All posts',   icon:'◈', count:allPosts.length},
                {id:'code',    label:'Code',        icon:'⌥', count:allPosts.filter(p=>p.type==='code'&&p._source!=='community').length},
                {id:'project', label:'Projects',    icon:'⚙', count:allPosts.filter(p=>p.type==='project').length},
                {id:'community',label:'Community',  icon:'⬡', count:allPosts.filter(p=>p._source==='community').length},
              ].map(t=>{
                const on=activeType===t.id;
                return(
                  <button key={t.id} onClick={()=>onTypeChange(t.id)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,cursor:'pointer',width:'100%',textAlign:'left',transition:'all .15s',
                      border:`1px solid ${on?'rgba(244,114,182,.35)':C.border}`,
                      background:on?'rgba(244,114,182,.08)':'transparent'}}
                    onMouseEnter={e=>{if(!on){e.currentTarget.style.background='rgba(255,255,255,.025)';e.currentTarget.style.borderColor='rgba(255,255,255,.08)';}}}
                    onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=C.border;}}}
                  >
                    <span style={{fontSize:12,color:on?C.pink:C.faint,flexShrink:0,lineHeight:1}}>{t.icon}</span>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:on?C.pink:C.muted,flex:1,transition:'color .12s'}}>{t.label}</span>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:on?C.pink:C.fainter,flexShrink:0}}>{t.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <SH label="Search"/>
            <div style={{padding:'10px 12px'}}>
              <div style={{position:'relative'}}>
                <svg style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="user, title, keyword…"
                  style={{width:'100%',boxSizing:'border-box',paddingLeft:28,paddingRight:searchQuery?26:10,paddingTop:7,paddingBottom:7,background:'#121211',border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12,fontFamily:"'Syne',sans-serif",outline:'none',caretColor:C.pink,transition:'border-color .15s'}}
                  onFocus={e=>{e.target.style.borderColor='rgba(244,114,182,.4)';}}
                  onBlur={e=>{e.target.style.borderColor=C.border;}}
                />
                {searchQuery&&<button onClick={()=>setSearchQuery('')} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.faint,cursor:'pointer',fontSize:11,lineHeight:1,padding:0}}>✕</button>}
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          {topContributors.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="top contributors"/>
              <div style={{padding:'8px 12px',display:'flex',flexDirection:'column',gap:4}}>
                {topContributors.map((u,i)=>(
                  <div key={u.id} onClick={()=>navigate(`/user/id/${u.id}`)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'7px 8px',borderRadius:9,cursor:'pointer',transition:'background .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.035)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:i===0?C.amber:C.fainter,width:14,flexShrink:0,textAlign:'center',fontWeight:700}}>
                      {i===0?'①':i===1?'②':i===2?'③':`${i+1}.`}
                    </span>
                    {u.avatar_url
                      ?<img src={u.avatar_url} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`1.5px solid ${i===0?'rgba(245,166,35,.5)':C.border}`}}/>
                      :<div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:avatarGradient(u.full_name||u.id),border:`1.5px solid ${i===0?'rgba(245,166,35,.5)':C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{getInitials(u.full_name||'?')}</div>
                    }
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:600,color:C.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.full_name||'Anonymous'}</p>
                      <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.faint,margin:'1px 0 0'}}>{u.points||0} pts{u.accepted_solutions_count>0?` · ${u.accepted_solutions_count} ✓`:''}</p>
                    </div>
                    {u.open_to_work&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:20,background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.25)',color:C.green,fontFamily:"'Space Mono',monospace",flexShrink:0}}>hire</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot Right Now */}
          {hotPosts.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="hot right now" live/>
              <div style={{padding:'8px 12px',display:'flex',flexDirection:'column',gap:6}}>
                {hotPosts.map(p=>{
                  const title=p.type==='project'?(p.project_title||'Untitled Project'):(p.file_name||p.tag||'Untitled');
                  const author=p.author_name||p.author?.name||'Unknown';
                  const tc=tagC(p.tag);
                  return(
                    <div key={p.id} onClick={()=>onHotPostClick(p)}
                      style={{padding:'9px 11px',background:'#121211',border:`1px solid ${C.border}`,borderRadius:10,transition:'border-color .15s,background .15s',cursor:'pointer'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.pink+'40';e.currentTarget.style.background='#0f1118';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background='#121211';}}
                    >
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:3}}>
                        <p style={{fontFamily:"'Syne',sans-serif",fontSize:12,color:'#c8cde8',fontWeight:600,margin:0,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{title}</p>
                        {p.tag&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,flexShrink:0,fontFamily:"'Space Mono',monospace",color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`}}>{p.tag}</span>}
                      </div>
                      <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.faint,margin:'0 0 5px'}}>by {author}</p>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:C.pink}}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {p.likes||0}
                        </span>
                        <span style={{fontSize:10,color:C.faint}}>{p.comments||0} cmts</span>
                        <span style={{marginLeft:'auto',fontSize:8,color:C.fainter,fontFamily:"'Space Mono',monospace"}}>tap to view →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recently Active Communities */}
          {activeCommunities.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="recently active" live/>
              <div style={{padding:'8px 12px',display:'flex',flexDirection:'column',gap:4}}>
                {activeCommunities.map(c=>(
                  <div key={c.id} onClick={()=>navigate(`/community/${c.id}`)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'8px 9px',borderRadius:9,cursor:'pointer',transition:'background .12s,border-color .12s',border:'1px solid transparent'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}
                  >
                    <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:'rgba(129,140,248,.12)',border:'1px solid rgba(129,140,248,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,color:C.indigo}}>
                      {(c.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:600,color:C.text,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</p>
                      <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.faint,margin:'2px 0 0'}}>{c.memberCount} members · {timeAgoShort(c.lastPost)}</p>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={C.fainter} strokeWidth="1.5" strokeLinecap="round"><path d="M4 8h8M9 5l3 3-3 3"/></svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          {trendTopics.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <SH label="trending topics"/>
              <div style={{padding:'6px 10px',display:'flex',flexDirection:'column',gap:1}}>
                {trendTopics.map(([tag,score],i)=>{
                  const tc=tagC(tag);
                  const on=activeTag===tag;
                  return(
                    <div key={tag} onClick={()=>onTagClick(on?null:tag)}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'6px 7px',borderRadius:8,transition:'background .12s,border-color .12s',cursor:'pointer',background:on?tc.bg:'transparent',border:`1px solid ${on?tc.border:'transparent'}`}}
                      onMouseEnter={e=>{if(!on){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.05)';}}}
                      onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}}
                    >
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.fainter,width:12,flexShrink:0}}>{i+1}</span>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:on?tc.color:C.muted,fontWeight:on?600:400,flex:1,transition:'color .12s'}}>#{tag}</span>
                      <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,background:tc.bg,border:`1px solid ${tc.border}`,color:tc.color,fontFamily:"'Space Mono',monospace"}}>{score}</span>
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef(null);

  // ── load all posts ────────────────────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const shaped = await getExploreFeed();
      setAllPosts(shaped);
      setVisibleCount(PAGE_SIZE);

      // Init liked state for community posts
      const communityPostIds = shaped.filter(p => p._source === 'community').map(p => p.id);
      if (currentUser && communityPostIds.length) {
        const likedSet = await getCommunityLikedPosts(currentUser.id, communityPostIds);
        const liked = {};
        likedSet.forEach(id => { liked[id] = true; });
        setLikedPosts(prev => ({ ...prev, ...liked }));
      }

      // Profile map
      const uids = [...new Set(shaped.map(p => p.user_id).filter(Boolean))];
      if (uids.length) {
        const map = await getProfileMap(uids);
        setProfileMap(map);
      }
    } catch (err) { console.error('Explore load error:', err); }
    setLoading(false);
  }, [currentUser]);

  const loadCommunities = useCallback(async (userId) => {
    const [{data:comms}, membshp] = await Promise.all([
      supabase.from('communities').select('id,name,description,slug').order('created_at',{ascending:false}).limit(20),
      userId ? supabase.from('community_members').select('community_id').eq('user_id',userId) : Promise.resolve({data:[]}),
    ]);
    const mySet = new Set((membshp.data||[]).map(r=>r.community_id));
    setMyMems(mySet);
    const unjoined = (comms||[]).filter(c=>!mySet.has(c.id)).slice(0,12);
    setCommunities(unjoined);
    await Promise.all(unjoined.map(async c => {
      const {data:mems} = await supabase.from('community_members').select('user_id').eq('community_id',c.id).limit(30);
      const count = mems?.length??0;
      const uids = mems?.slice(0,3).map(m=>m.user_id).filter(Boolean)||[];
      let avatars = [];
      if (uids.length) { const {data:profs} = await supabase.from('profiles').select('id,full_name,avatar_url').in('id',uids); avatars=profs||[]; }
      setComMeta(prev => ({...prev, [c.id]:{count,avatars}}));
    }));
  }, []);

  // ── community like handler ────────────────────────────────────────────────
  const handleLike = async (postId) => {
    if (!currentUser) return alert('Login to like posts');
    const already   = likedPosts[postId] ?? false;
    const current   = localLikes[postId] ?? (allPosts.find(p => p.id === postId)?.likes ?? 0);
    const optimistic = already ? Math.max(0, current - 1) : current + 1;
    setLikedPosts(p => ({ ...p, [postId]: !already }));
    setLocalLikes(p => ({ ...p, [postId]: optimistic }));
    const { error } = await toggleCommunityLike(postId, currentUser.id, already);
    if (error) {
      setLikedPosts(p => ({ ...p, [postId]: already }));
      setLocalLikes(p => ({ ...p, [postId]: current }));
    }
  };

  // ── community comments ────────────────────────────────────────────────────
  const loadComments = async (postId) => {
    setLocalComments(p => ({ ...p, [postId]: null }));
    const enriched = await getCommunityComments(postId, currentUser?.id ?? null);
    const commentUids = [...new Set(enriched.map(c => c.user_id).filter(Boolean))];
    if (currentUser?.id) commentUids.push(currentUser.id);
    const missing = commentUids.filter(uid => !profileMap[uid]);
    if (missing.length > 0) {
      const extra = await getProfileMap(missing);
      setProfileMap(prev => ({ ...prev, ...extra }));
    }
    setLocalComments(p => ({ ...p, [postId]: enriched }));
  };

  const handleOpenComments = (postId) => {
    setDrawerPostId(postId);
    setDrawerOpen(true);
    if (!localComments[postId]) loadComments(postId);
  };

  // ── effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPosts();
    const channels = [
      supabase.channel('xp-p').on('postgres_changes',{event:'*',schema:'public',table:'posts'},loadPosts).subscribe(),
      supabase.channel('xp-j').on('postgres_changes',{event:'*',schema:'public',table:'project_posts'},loadPosts).subscribe(),
      supabase.channel('xp-c').on('postgres_changes',{event:'*',schema:'public',table:'community_posts'},loadPosts).subscribe(),
    ];
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [loadPosts]);

  useEffect(() => { if (currentUser !== null) loadCommunities(currentUser?.id ?? null); }, [currentUser, loadCommunities]);

  const handleJoin = async (id) => {
    if (!currentUser?.id) return;
    const { error } = await supabase.from('community_members').insert({ community_id: id, user_id: currentUser.id });
    if (!error) {
      setMyMems(prev => new Set(prev).add(id));
      setTimeout(() => setCommunities(prev => prev.filter(c => c.id !== id)), 1900);
    }
  };

  // ── filters ───────────────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    let r = allPosts;
    if (activeTag) {
      r = r.filter(p => {
        const tags = [];
        if (p.tag) tags.push(p.tag.toLowerCase());
        if (p.project_stack) p.project_stack.split(',').forEach(t => tags.push(t.trim().toLowerCase()));
        return tags.includes(activeTag);
      });
    }
    if (activeType !== 'all') {
      if (activeType === 'community') r = r.filter(p => p._source === 'community');
      else if (activeType === 'code')    r = r.filter(p => p.type === 'code' && p._source !== 'community');
      else if (activeType === 'project') r = r.filter(p => p.type === 'project');
    }
    if (searchQuery.trim()) r = r.filter(p => postMatchesQuery(p, searchQuery));
    return r;
  }, [allPosts, activeTag, activeType, searchQuery]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTag, activeType, searchQuery]);

  const visiblePosts = useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);
  const hasMore = visibleCount < filteredPosts.length;

  const feedItems = useMemo(() => {
    if (loading) return [];
    const items = [];
    let pi = 0, ci = 0;
    let radarInserted = false;
    const openComms = communities.slice(ci, ci + 2);
    if (openComms.length) { items.push({type:'communities',items:openComms}); ci += 2; }
    while (pi < visiblePosts.length) {
      const batchSize = 6;
      const postBatch = visiblePosts.slice(pi, pi + batchSize);
      items.push({type:'posts',items:postBatch});
      pi += batchSize;
      if (!radarInserted) {
        items.push({type:'radar'});
        radarInserted = true;
      } else {
        const commBatch = communities.slice(ci, ci + 2);
        if (commBatch.length && pi < visiblePosts.length) { items.push({type:'communities',items:commBatch}); ci += 2; }
      }
    }
    return items;
  }, [visiblePosts, communities, loading]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes xpulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes xping{75%,100%{transform:scale(2);opacity:0}}
        @keyframes xpop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
        @keyframes xwelcome{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes xload{from{width:0}to{width:100%}}
        @keyframes xspin{to{transform:rotate(360deg)}}
        @keyframes xcursor{0%,100%{opacity:1}50%{opacity:0}}
        .xgc:hover .xgc-ov{opacity:1!important;background:rgba(0,0,0,.72)!important;}
        .xdr-scroll::-webkit-scrollbar{display:none}
      `}</style>

      <div style={{display:'flex',height:'100vh',overflow:'hidden',width:'100%'}}>
        <div ref={scrollContainerRef} style={{flex:1,minWidth:0,overflowY:'auto',padding:'40px 20px 60px'}}>
          <div style={{maxWidth:740,margin:'0 auto'}}>

            <TagCloud posts={allPosts} activeTag={activeTag} onTagClick={t=>{setActiveTag(t);setSearchQuery('');setActiveType('all');}}/>

            {(activeTag||searchQuery.trim()||(activeType!=='all'))&&(
              <div style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 14px'}}>
                {activeTag&&<button onClick={()=>setActiveTag(null)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(244,114,182,.08)',border:'1px solid rgba(244,114,182,.25)',color:C.pink,fontFamily:"'Space Mono',monospace",fontSize:10,cursor:'pointer'}}>#{activeTag} ✕</button>}
                {searchQuery.trim()&&<button onClick={()=>setSearchQuery('')} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'rgba(129,140,248,.08)',border:'1px solid rgba(129,140,248,.25)',color:C.indigo,fontFamily:"'Space Mono',monospace",fontSize:10,cursor:'pointer'}}>"{searchQuery}" ✕</button>}
                <button onClick={()=>{setActiveTag(null);setSearchQuery('');setActiveType('all');}} style={{fontSize:10,color:C.faint,background:'none',border:'none',cursor:'pointer',fontFamily:"'Space Mono',monospace",padding:0}}>clear all</button>
                <span style={{marginLeft:'auto',fontFamily:"'Space Mono',monospace",fontSize:9,color:C.fainter}}>{filteredPosts.length} post{filteredPosts.length!==1?'s':''}</span>
              </div>
            )}

            {loading&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
                {Array.from({length:9}).map((_,i)=>(
                  <div key={i} style={{aspectRatio:'1/1',borderRadius:14,background:C.card,border:`1px solid ${C.border}`,animation:'xpulse 1.5s ease-in-out infinite',animationDelay:`${i*0.07}s`}}/>
                ))}
              </div>
            )}

            {!loading&&filteredPosts.length===0&&(
              <div style={{textAlign:'center',padding:'48px 0'}}>
                <p style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:C.faint}}>
                  {activeTag||searchQuery||activeType!=='all'?'No posts match this filter.':'No posts on the platform yet.'}
                </p>
                {(activeTag||searchQuery||activeType!=='all')&&(
                  <button onClick={()=>{setActiveTag(null);setSearchQuery('');setActiveType('all');}} style={{marginTop:12,padding:'6px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontFamily:"'Space Mono',monospace",fontSize:11,cursor:'pointer'}}>Clear filters</button>
                )}
              </div>
            )}

            {!loading&&feedItems.map((batch,bi)=>(
              <div key={bi} style={{marginBottom:16}}>
                {batch.type==='posts'&&(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
                    {batch.items.map(p=>(
                      <div key={`${p._source}-${p.id}`} className="xgc">
                        <GridCard post={p} me={currentUser} pm={profileMap} onClick={()=>setModalPost(p)}/>
                      </div>
                    ))}
                  </div>
                )}
                {batch.type==='radar'&&<DevRadar currentUser={currentUser} allPosts={allPosts}/>}
                {batch.type==='communities'&&batch.items.length>0&&(
                  <>
                    <div style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0 10px'}}>
                      <div style={{flex:1,height:1,background:C.border}}/>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:'.14em',textTransform:'uppercase',color:C.fainter,flexShrink:0}}>communities to explore</span>
                      <div style={{flex:1,height:1,background:C.border}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      {batch.items.map(c=>(
                        <InlineCommunityCard key={c.id} community={c} memberCount={comMeta[c.id]?.count} avatars={comMeta[c.id]?.avatars||[]} onJoin={handleJoin}/>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}

            {!loading&&filteredPosts.length>0&&(
              <div style={{paddingTop:24,paddingBottom:40}}>
                <div style={{width:'100%',height:2,background:C.border,borderRadius:2,overflow:'hidden',marginBottom:14}}>
                  <div style={{height:'100%',borderRadius:2,background:`linear-gradient(90deg,${C.pink},${C.indigo})`,width:`${Math.min(100,Math.round((Math.min(visibleCount,filteredPosts.length)/filteredPosts.length)*100))}%`,transition:'width .5s ease'}}/>
                </div>
                {hasMore?(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                    <p style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.fainter,margin:0}}>{`${Math.min(visibleCount,filteredPosts.length)} of ${filteredPosts.length} posts`}</p>
                    <button onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'10px 24px',borderRadius:10,cursor:'pointer',border:`1px solid ${C.border}`,background:C.card,color:C.muted,fontFamily:"'Space Mono',monospace",fontSize:10,transition:'all .15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(244,114,182,.4)';e.currentTarget.style.color=C.pink;e.currentTarget.style.background='rgba(244,114,182,.06)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;e.currentTarget.style.background=C.card;}}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      Load {Math.min(PAGE_SIZE,filteredPosts.length-visibleCount)} more posts
                    </button>
                  </div>
                ):(
                  <p style={{textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:9,color:C.fainter,margin:0}}>
                    // all {filteredPosts.length} post{filteredPosts.length!==1?'s':''} loaded
                  </p>
                )}
              </div>
            )}

          </div>
        </div>

        <ExploreSidebar
          allPosts={allPosts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTag={activeTag}
          onTagClick={t=>{setActiveTag(t);setSearchQuery('');setActiveType('all');}}
          onHotPostClick={p=>setModalPost(p)}
          activeType={activeType}
          onTypeChange={t=>{setActiveType(t);setVisibleCount(PAGE_SIZE);}}
        />
      </div>

      {modalPost&&(
        <PostDetailModal post={modalPost} me={currentUser} pm={profileMap} onClose={()=>setModalPost(null)}
          likedPosts={likedPosts} localLikes={localLikes} onLike={handleLike} onOpenComments={handleOpenComments}/>
      )}
      <CommentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        post={allPosts.find(p => p.id === drawerPostId) ?? null}
        currentUserId={currentUser?.id ?? null}
        comments={localComments[drawerPostId] ?? null}
        onRefresh={() => drawerPostId && loadComments(drawerPostId)}
        onCommentPosted={() => {}}
        profileMap={profileMap}
      />
    </>
  );
};

export default Explore;
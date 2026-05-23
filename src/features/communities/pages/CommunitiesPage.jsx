// src/features/communities/pages/CommunitiesPage.jsx
// LAZY LOADING:
//   - Skeleton cards shown during initial fetch (replaces spinner)
//   - Each CommunityCard is wrapped in a LazyCard observer — it only
//     becomes visible (and triggers its entrance animation) once it
//     enters the viewport.  Cards far below the fold are rendered as
//     transparent placeholders until they scroll into view, keeping
//     paint/layout work minimal.
//   - The observer is disconnected once the card has been revealed
//     (fire-once pattern) to avoid unnecessary callbacks.
// DELETE BUG FIX (unchanged):
//   loadAll runs ONCE on mount; handleDeleted removes from local state.

import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";
import { getProfile } from "../../../services/userService";
import { uploadCommunityFile } from "../../../services/postService";
import { AuthContext } from "../../../context/AuthContext";
import CommunityCard from "../components/CommunityCard";

const THRESHOLD = { points: 100, posts: 3, days: 7 };
// How many skeleton cards to show while loading
const SKELETON_COUNT = 6;

const T = {
  bg:"#0e0e0d", card:"#161615", border:"#252523",
  cyan:"#00d4ff", green:"#00e676", red:"#ff4c6a",
  amber:"#f5a623", purple:"#9c6fff",
  text:"#f0f4ff", mid:"#d0d8ee", muted:"#8b95ae", dim:"#6b7a99",
  mono:"'Space Mono', monospace", syne:"'Syne', sans-serif",
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    overflow: "hidden",
    animation: "skeletonPulse 1.6s ease-in-out infinite",
  }}>
    {/* cover image placeholder */}
    <div style={{ height: 110, background: "#1e1e1c" }} />
    <div style={{ padding: "16px 18px 20px" }}>
      {/* title */}
      <div style={{ height: 16, width: "60%", background: "#1e1e1c", borderRadius: 6, marginBottom: 10 }} />
      {/* description lines */}
      <div style={{ height: 11, width: "90%", background: "#1a1a18", borderRadius: 5, marginBottom: 6 }} />
      <div style={{ height: 11, width: "70%", background: "#1a1a18", borderRadius: 5, marginBottom: 18 }} />
      {/* button */}
      <div style={{ height: 32, width: 90, background: "#1e1e1c", borderRadius: 8 }} />
    </div>
  </div>
);

// ── Lazy wrapper — reveals card when it enters the viewport ───────────────────
const LazyCard = ({ children, index }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Cards already in the initial viewport appear immediately (no flash)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // fire-once
        }
      },
      { rootMargin: "80px 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stagger delay caps at 5 cards so the grid entrance feels snappy
  const delay = Math.min(index % 6, 5) * 60;

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: visible
          ? `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`
          : "none",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CommunitiesPage = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [communities,   setCommunities]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [query,         setQuery]         = useState("");
  const [filter,        setFilter]        = useState("all");
  const [myMemberships, setMyMemberships] = useState(new Set());
  const [showRequest,   setShowRequest]   = useState(false);
  const navigate = useNavigate();

  // ── Load communities ONCE on mount ──────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  // ── Load memberships when auth state is known ────────────────────────────
  useEffect(() => {
    if (currentUser) getMyMemberships();
  }, [currentUser?.id]);

  const loadAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, slug, description, created_at, cover_url, created_by")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setCommunities([]); }
    else setCommunities(data || []);
    setLoading(false);
  };

  const getMyMemberships = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", currentUser.id);
    if (data) setMyMemberships(new Set(data.map(r => r.community_id)));
  };

  const handleJoin = async (communityId) => {
    if (!currentUser) return alert("Please login to join");
    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: currentUser.id });
    if (error) return alert("Unable to join community");
    setMyMemberships(prev => new Set(prev).add(communityId));
  };

  const handleLeave = async (communityId) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from("community_members")
      .delete()
      .match({ community_id: communityId, user_id: currentUser.id });
    if (error) return alert("Unable to leave");
    setMyMemberships(prev => { const c = new Set(prev); c.delete(communityId); return c; });
  };

  // ── Remove deleted community from local state ────────────────────────────
  const handleDeleted = (communityId) => {
    setCommunities(prev => prev.filter(c => c.id !== communityId));
    setMyMemberships(prev => { const n = new Set(prev); n.delete(communityId); return n; });
  };

  const filtered = communities.filter(c => {
    const q = query.trim().toLowerCase();
    if (q && !(`${c.name} ${c.description || ""}`.toLowerCase().includes(q))) return false;
    if (filter === "joined") return myMemberships.has(c.id);
    return true;
  });

  return (
    <>
      {/* keyframe for skeleton pulse */}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      <div style={{ padding: "28px 24px", color: T.text, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* header */}
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,gap:16,flexWrap:"wrap" }}>
            <div>
              <h1 style={{ fontFamily:T.syne,fontWeight:800,fontSize:30,color:T.text,margin:0,lineHeight:1.1 }}>
                Connect <span style={{ color:T.cyan }}>Communities</span>
              </h1>
              <p style={{ fontFamily:T.mono,fontSize:12,color:T.dim,margin:"6px 0 0",letterSpacing:"0.04em" }}>
                // {loading ? "…" : communities.length} communities · find your tribe
              </p>
            </div>
            <button
              onClick={() => { if (!currentUser) { alert("Please login first"); return; } setShowRequest(true); }}
              style={{ padding:"10px 20px",borderRadius:10,border:`1px solid ${T.cyan}66`,background:`${T.cyan}18`,color:T.cyan,fontFamily:T.mono,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.03em",transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${T.cyan}28`;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${T.cyan}18`;}}>
              + Request Community
            </button>
          </div>

          {/* search + filter */}
          <div style={{ display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",alignItems:"center" }}>
            <div style={{ flex:1,minWidth:200,position:"relative" }}>
              <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.dim,fontSize:14 }}>⌕</span>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search communities..."
                style={{ width:"100%",boxSizing:"border-box",paddingLeft:34,paddingRight:14,paddingTop:10,paddingBottom:10,background:"#161615",border:"1px solid #252523",borderRadius:10,color:T.text,fontFamily:T.syne,fontSize:14,outline:"none" }}
                onFocus={e=>(e.target.style.borderColor=`${T.cyan}44`)}
                onBlur={e=>(e.target.style.borderColor="#252523")}
              />
            </div>
            <div style={{ display:"flex",gap:6 }}>
              {["all","joined"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{ padding:"9px 16px",borderRadius:10,border:filter===f?`1px solid ${T.cyan}`:"1px solid #252523",background:filter===f?`${T.cyan}18`:"transparent",color:filter===f?T.cyan:T.muted,fontFamily:T.mono,fontSize:10,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.05em",transition:"all 0.15s" }}>
                  {f==="all"?"All":"Joined"}
                </button>
              ))}
            </div>
          </div>

          {/* grid — skeletons during load, lazy cards after */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
            {loading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.map((c, i) => (
                  <LazyCard key={c.id} index={i}>
                    <CommunityCard
                      community={c}
                      joined={myMemberships.has(c.id)}
                      onJoin={()=>handleJoin(c.id)}
                      onLeave={()=>handleLeave(c.id)}
                      onDeleted={handleDeleted}
                    />
                  </LazyCard>
                ))
            }
          </div>

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <p style={{ fontFamily:T.mono,fontSize:14,color:T.dim }}>// no communities found</p>
            </div>
          )}
        </div>

        {showRequest && (
          <CommunityRequestModal
            currentUser={currentUser}
            onClose={()=>setShowRequest(false)}
            onSubmitted={()=>setShowRequest(false)}
          />
        )}
      </div>
    </>
  );
};

// ── CommunityRequestModal (unchanged) ────────────────────────────────────────

const CommunityRequestModal = ({ currentUser, onClose, onSubmitted }) => {
  const [checking,  setChecking]  = useState(true);
  const [profile,   setProfile]   = useState(null);
  const [name,      setName]      = useState("");
  const [desc,      setDesc]      = useState("");
  const [reason,    setReason]    = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(()=>{
    checkThreshold();
    const esc=e=>{ if(e.key==="Escape")onClose(); };
    window.addEventListener("keydown",esc);
    return ()=>window.removeEventListener("keydown",esc);
  },[]);

  async function checkThreshold() {
    setChecking(true);
    if (!currentUser?.id) { setChecking(false); return; }
    const data = await getProfile(currentUser.id);
    setProfile(data);
    setChecking(false);
  }

  const daysOnPlatform = profile ? Math.floor((Date.now()-new Date(profile.created_at))/86400000) : 0;
  const userPoints = profile?.points ?? 0;
  const userPosts  = profile?.post_count ?? 0;

  const checks = [
    { label:"Points earned",    current:userPoints,     required:THRESHOLD.points, unit:"pts",   pass:userPoints     >= THRESHOLD.points },
    { label:"Posts made",       current:userPosts,      required:THRESHOLD.posts,  unit:"posts", pass:userPosts      >= THRESHOLD.posts  },
    { label:"Days on platform", current:daysOnPlatform, required:THRESHOLD.days,   unit:"days",  pass:daysOnPlatform >= THRESHOLD.days   },
  ];
  const allPass = checks.every(c=>c.pass);

  async function handleSubmit() {
    if (!name.trim()||!reason.trim()) { setError("Name and reason are required."); return; }
    setSubmitting(true); setError(null);
    const slug = name.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    let cover_url = null;
    if (coverFile) {
      const { url, error:upErr } = await uploadCommunityFile("requests", coverFile);
      if (!upErr) cover_url = url;
    }
    const { error:err } = await supabase.from("community_requests").insert({
      user_id:currentUser.id, name:name.trim(), slug,
      description:desc.trim()||null, reason:reason.trim(), cover_url, status:"pending",
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(onSubmitted, 2200);
  }

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",zIndex:50,padding:"48px 16px 48px" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"linear-gradient(160deg,#161615 0%,#121211 100%)",border:`1px solid ${T.border}`,borderRadius:20,width:"100%",maxWidth:460,boxShadow:"0 32px 80px rgba(0,0,0,0.7)",overflow:"hidden" }}>
        <div style={{ height:3,background:`linear-gradient(90deg,${T.cyan},${T.purple},transparent)` }}/>
        <div style={{ padding:"22px 24px 18px",borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <p style={{ fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.cyan,letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 5px" }}>Request a community</p>
              <h2 style={{ fontFamily:T.syne,fontWeight:800,fontSize:22,color:T.text,margin:0 }}>Build your space</h2>
              <p style={{ fontFamily:T.mono,fontSize:12,color:T.dim,margin:"4px 0 0" }}>earn it · request it · launch it</p>
            </div>
            <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.muted,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:16 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"20px 24px 26px" }}>
          {checking && <div style={{ textAlign:"center",padding:"36px 0" }}><p style={{ fontFamily:T.mono,fontSize:12,color:T.dim,margin:0 }}>// checking eligibility...</p></div>}
          {!checking && (
            <>
              <p style={{ fontFamily:T.mono,fontSize:9,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 10px" }}>Eligibility</p>
              <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:20 }}>
                {checks.map(c=>(
                  <div key={c.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",background:c.pass?"rgba(0,230,118,0.05)":"rgba(255,76,106,0.05)",border:`1px solid ${c.pass?"rgba(0,230,118,0.2)":"rgba(255,76,106,0.2)"}`,borderRadius:9 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      <div style={{ width:18,height:18,borderRadius:"50%",background:c.pass?"rgba(0,230,118,0.15)":"rgba(255,76,106,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <span style={{ fontSize:10,color:c.pass?T.green:T.red,fontWeight:700 }}>{c.pass?"✓":"✗"}</span>
                      </div>
                      <span style={{ fontFamily:T.mono,fontSize:12,color:c.pass?T.green:T.red }}>{c.label}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"baseline",gap:3 }}>
                      <span style={{ fontFamily:T.mono,fontSize:12,color:c.pass?T.green:T.red,fontWeight:700 }}>{c.current}</span>
                      <span style={{ fontFamily:T.mono,fontSize:10,color:T.dim }}>/ {c.required} {c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!allPass && (
                <div style={{ padding:"14px 16px",background:"rgba(255,76,106,0.05)",border:"1px solid rgba(255,76,106,0.18)",borderRadius:12,textAlign:"center" }}>
                  <p style={{ fontFamily:T.syne,fontSize:14,color:T.red,margin:"0 0 5px",fontWeight:700 }}>Not eligible yet</p>
                  <p style={{ fontFamily:T.mono,fontSize:12,color:T.muted,margin:0,lineHeight:1.65 }}>Post, solve challenges, and respond to prompts<br/>to earn points and unlock this.</p>
                </div>
              )}

              {allPass && !submitted && (
                <>
                  <div style={{ height:1,background:T.border,margin:"0 0 20px" }}/>
                  <div style={{ display:"flex",flexDirection:"column",gap:15 }}>
                    <div>
                      <p style={fLabelStyle}>Community name <span style={{ color:T.cyan }}>*</span></p>
                      <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. React Developers" style={fInputStyle} onFocus={e=>(e.target.style.borderColor=`${T.cyan}55`)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
                    </div>
                    <div>
                      <p style={fLabelStyle}>Description</p>
                      <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="What is this community about?" style={{ ...fInputStyle,resize:"vertical",lineHeight:1.55 }} onFocus={e=>(e.target.style.borderColor=`${T.cyan}55`)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
                    </div>
                    <div>
                      <p style={fLabelStyle}>Cover image</p>
                      <label style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 13px",background:"#0e0e0d",border:`1px solid ${coverFile?"rgba(0,230,118,0.4)":T.border}`,borderRadius:10,cursor:"pointer" }}>
                        <div style={{ width:32,height:32,borderRadius:8,background:coverFile?"rgba(0,230,118,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${coverFile?"rgba(0,230,118,0.3)":T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14 }}>{coverFile?"✓":"🖼"}</div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontFamily:T.mono,fontSize:12,color:coverFile?T.green:T.dim,margin:0 }}>{coverFile?coverFile.name:"Upload a cover image..."}</p>
                          {!coverFile && <p style={{ fontFamily:T.mono,fontSize:10,color:"#2e2e2b",margin:"2px 0 0" }}>jpg, png, webp</p>}
                        </div>
                        {coverFile && <button onClick={e=>{e.preventDefault();setCoverFile(null);}} style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:18,padding:"0 2px",flexShrink:0 }}>×</button>}
                        <input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files[0]||null)} style={{ display:"none" }}/>
                      </label>
                    </div>
                    <div>
                      <p style={fLabelStyle}>Why does this community need to exist? <span style={{ color:T.cyan }}>*</span></p>
                      <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="What gap does it fill? Who will it serve?" style={{ ...fInputStyle,resize:"vertical",lineHeight:1.55 }} onFocus={e=>(e.target.style.borderColor=`${T.cyan}55`)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
                    </div>
                    {error && <p style={{ fontFamily:T.mono,fontSize:12,color:T.red,margin:0 }}>{error}</p>}
                    <div style={{ display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4 }}>
                      <button onClick={onClose} style={{ padding:"10px 18px",borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.muted,fontFamily:T.mono,fontSize:12,cursor:"pointer" }}>Cancel</button>
                      <button onClick={handleSubmit} disabled={submitting||!name.trim()||!reason.trim()}
                        style={{ padding:"10px 24px",borderRadius:10,border:"none",background:submitting?"#252523":"#0C63E7",color:"#fff",fontFamily:T.mono,fontSize:12,fontWeight:800,letterSpacing:"0.05em",cursor:submitting?"not-allowed":"pointer",opacity:(!name.trim()||!reason.trim())?0.6:1,boxShadow:submitting?"none":"0 6px 18px rgba(12,99,231,0.35)",transition:"all 0.2s" }}
                        onMouseEnter={e=>{if(!submitting){e.currentTarget.style.background="#0a54c5";e.currentTarget.style.transform="translateY(-1px)";}}}
                        onMouseLeave={e=>{e.currentTarget.style.background="#0C63E7";e.currentTarget.style.transform="none";}}>
                        {submitting?"// sending...":"Submit request"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {submitted && (
                <div style={{ textAlign:"center",padding:"28px 0 6px" }}>
                  <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:22 }}>✓</div>
                  <p style={{ fontFamily:T.syne,fontSize:18,fontWeight:700,color:T.green,margin:"0 0 8px" }}>Request sent!</p>
                  <p style={{ fontFamily:T.mono,fontSize:12,color:T.muted,margin:0,lineHeight:1.7 }}>We'll review it shortly.<br/>The community appears here once approved.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── AdminCommunityRequests (unchanged) ────────────────────────────────────────

export const AdminCommunityRequests = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(()=>{ loadRequests(); },[]);

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase.from("community_requests").select("*").order("created_at",{ascending:false});
    setRequests(data||[]);
    setLoading(false);
  }

  async function approve(req) {
    setActing(req.id);
    const { data:community, error:commErr } = await supabase.from("communities")
      .insert({ name:req.name, slug:req.slug||req.name.toLowerCase().replace(/\s+/g,"-"), description:req.description||"", created_by:req.user_id, cover_url:req.cover_url||null })
      .select().single();
    if (commErr) { alert(commErr.message); setActing(null); return; }
    await supabase.from("community_members").insert({ community_id:community.id, user_id:req.user_id });
    await supabase.from("community_requests").update({ status:"approved", reviewed_by:currentUser?.id }).eq("id",req.id);
    setRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:"approved"}:r));
    setActing(null);
  }

  async function reject(req) {
    setActing(req.id);
    await supabase.from("community_requests").update({ status:"rejected", reviewed_by:currentUser?.id }).eq("id",req.id);
    setRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:"rejected"}:r));
    setActing(null);
  }

  const counts = { pending:0, approved:0, rejected:0 };
  requests.forEach(r=>{ if(r.status in counts) counts[r.status]++; });
  const visible  = requests.filter(r=>r.status===activeTab);
  const tabColor = { pending:T.amber, approved:T.green, rejected:T.red };

  return (
    <div style={{ padding:"32px 24px",color:T.text,minHeight:"100vh" }}>
      <div style={{ maxWidth:760,margin:"0 auto" }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:T.syne,fontWeight:800,fontSize:26,color:T.text,margin:"0 0 6px" }}>Community requests</h1>
          <p style={{ fontFamily:T.mono,fontSize:12,color:T.dim,margin:0 }}>
            <span style={{ color:counts.pending>0?T.amber:T.dim,fontWeight:counts.pending>0?700:400 }}>{counts.pending} pending</span>
            {" · "}<span style={{ color:T.green }}>{counts.approved} approved</span>
            {" · "}<span style={{ color:T.red }}>{counts.rejected} rejected</span>
          </p>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:22 }}>
          {["pending","approved","rejected"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{ padding:"7px 16px",borderRadius:20,cursor:"pointer",fontFamily:T.mono,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",border:activeTab===tab?`1px solid ${tabColor[tab]}`:`1px solid ${T.border}`,background:activeTab===tab?`${tabColor[tab]}18`:"transparent",color:activeTab===tab?tabColor[tab]:T.muted,transition:"all 0.15s" }}>
              {tab}
              {counts[tab]>0&&<span style={{ marginLeft:7,background:activeTab===tab?`${tabColor[tab]}30`:T.border,color:activeTab===tab?tabColor[tab]:T.dim,borderRadius:99,padding:"1px 7px",fontSize:9 }}>{counts[tab]}</span>}
            </button>
          ))}
        </div>
        {loading&&<p style={{ fontFamily:T.mono,fontSize:12,color:T.dim }}>// loading...</p>}
        {!loading&&visible.length===0&&(
          <div style={{ textAlign:"center",padding:"48px 0",border:`1px dashed ${T.border}`,borderRadius:16 }}>
            <p style={{ fontFamily:T.mono,fontSize:12,color:T.dim }}>// no {activeTab} requests</p>
          </div>
        )}
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {visible.map(req=>(
            <RequestCard key={req.id} req={req} isActing={acting===req.id} onApprove={()=>approve(req)} onReject={()=>reject(req)}/>
          ))}
        </div>
      </div>
    </div>
  );
};

const RequestCard = ({ req, isActing, onApprove, onReject }) => {
  const isPending = req.status==="pending";
  return (
    <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden" }}>
      {req.cover_url&&<img src={req.cover_url} alt="cover" style={{ width:"100%",height:110,objectFit:"cover",display:"block" }}/>}
      <div style={{ padding:"18px 20px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontFamily:T.syne,fontWeight:700,fontSize:17,color:T.text,margin:"0 0 3px" }}>{req.name}</p>
            <p style={{ fontFamily:T.mono,fontSize:10,color:T.dim,margin:0 }}>by User {req.user_id.slice(0,8)} · {new Date(req.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</p>
          </div>
          {isPending&&(
            <div style={{ display:"flex",gap:8,flexShrink:0 }}>
              <button onClick={onReject} disabled={isActing} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid rgba(255,76,106,0.3)",background:"rgba(255,76,106,0.08)",color:T.red,fontFamily:T.mono,fontSize:12,fontWeight:700,cursor:isActing?"not-allowed":"pointer",opacity:isActing?0.5:1 }} onMouseEnter={e=>{if(!isActing)e.currentTarget.style.background="rgba(255,76,106,0.18)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,76,106,0.08)";}}>Reject</button>
              <button onClick={onApprove} disabled={isActing} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid rgba(0,230,118,0.3)",background:"rgba(0,230,118,0.08)",color:T.green,fontFamily:T.mono,fontSize:12,fontWeight:700,cursor:isActing?"not-allowed":"pointer",opacity:isActing?0.5:1 }} onMouseEnter={e=>{if(!isActing)e.currentTarget.style.background="rgba(0,230,118,0.18)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,230,118,0.08)";}}>Approve</button>
            </div>
          )}
        </div>
        {req.description&&<p style={{ fontFamily:T.syne,fontSize:14,color:T.muted,margin:"0 0 10px",lineHeight:1.6 }}>{req.description}</p>}
        {req.reason&&(
          <div style={{ padding:"10px 13px",background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.14)",borderRadius:9 }}>
            <p style={{ fontFamily:T.mono,fontSize:9,color:T.cyan,margin:"0 0 4px",letterSpacing:"0.08em",textTransform:"uppercase" }}>Why</p>
            <p style={{ fontFamily:T.syne,fontSize:14,color:T.mid,margin:0,lineHeight:1.6 }}>{req.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const fLabelStyle = { fontFamily:"'Space Mono', monospace",fontSize:9,fontWeight:700,color:"#7a8499",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 7px" };
const fInputStyle = { width:"100%",boxSizing:"border-box",background:"#0e0e0d",border:"1px solid #252523",borderRadius:10,padding:"10px 13px",color:"#e8edf5",fontFamily:"'Syne', sans-serif",fontSize:14,outline:"none",transition:"border-color 0.15s" };

export default CommunitiesPage;
// src/features/docs/pages/DocsPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../../../context/AuthContext';
import GUIDE_SECTIONS  from '../data/guideContent';

const C = {
  bg:'#0e0e0d', surface:'#111110', card:'#161615', cardH:'#1a1918',
  border:'#252523', borderH:'#343430', cyan:'#00d4ff', pink:'#f472b6',
  indigo:'#818cf8', green:'#00e676', amber:'#f5a623', purple:'#a78bfa',
  text:'#f0f4ff', mid:'#d0d8ee', muted:'#8b95ae', dim:'#4a5878',
  mono:"'Space Mono', monospace", sans:"'Syne', sans-serif",
};

const KEYFRAMES = `
  @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer{ 0%{background-position:-400% 0} 100%{background-position:400% 0} }
  @keyframes scanline{
    0%{transform:translateY(-100%);opacity:0} 10%{opacity:.6}
    90%{opacity:.6} 100%{transform:translateY(100vh);opacity:0}
  }
  @keyframes glowDot{ 0%,100%{box-shadow:0 0 4px currentColor} 50%{box-shadow:0 0 12px currentColor} }
`;

const Cursor = ({ color = C.cyan, size = 8 }) => (
  <span style={{
    display:'inline-block', width:size, height:Math.round(size*1.5),
    background:color, marginLeft:3, verticalAlign:'middle',
    animation:'blink 1.1s step-end infinite', borderRadius:1,
  }}/>
);

function MediaSlot({ slot, accent }) {
  const [hov,setHov]=useState(false);
  const isVideo = slot.type==='video';
  const [n,d]  = (slot.aspectRatio||'16/9').split('/').map(Number);
  const pct    = `${((d/n)*100).toFixed(2)}%`;
  return (
    <div style={{marginBottom:4}}>
      <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{
          position:'relative', width:'100%', paddingBottom:pct,
          background:hov?'#1e1e1c':C.card,
          border:`1.5px dashed ${hov?accent+'70':C.border}`,
          borderRadius:10, overflow:'hidden', cursor:'default',
          transition:'all .2s ease',
        }}>
        {/* grid bg */}
        <div style={{
          position:'absolute',inset:0,opacity:.5,
          backgroundImage:`linear-gradient(${C.border}44 1px,transparent 1px),linear-gradient(90deg,${C.border}44 1px,transparent 1px)`,
          backgroundSize:'32px 32px',
        }}/>
        {/* shimmer */}
        {hov&&<div style={{
          position:'absolute',inset:0,
          background:`linear-gradient(90deg,transparent 0%,${accent}08 50%,transparent 100%)`,
          backgroundSize:'400% 100%', animation:'shimmer 1.8s linear infinite',
        }}/>}
        {/* scanline */}
        {hov&&<div style={{
          position:'absolute',left:0,right:0,top:0,height:2,
          background:`linear-gradient(90deg,transparent,${accent}60,transparent)`,
          animation:'scanline 2s linear infinite',
        }}/>}
        {/* centre */}
        <div style={{
          position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',gap:10,
        }}>
          <div style={{fontSize:28,opacity:.25,filter:hov?'none':'grayscale(1)',transition:'filter .2s'}}>
            {isVideo?'▶':'🖼'}
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <span style={{
              fontFamily:C.mono,fontSize:9,
              color:hov?accent:C.dim,letterSpacing:'.12em',textTransform:'uppercase',
              transition:'color .2s',
            }}>
              {isVideo?'screen recording':'screenshot'} · placeholder
            </span>
            <span style={{fontFamily:C.mono,fontSize:8,color:C.dim,letterSpacing:'.08em'}}>
              [{slot.id}]
            </span>
          </div>
          <div style={{
            display:'flex',alignItems:'center',gap:5,
            background:accent+'10',border:`1px solid ${accent}28`,
            borderRadius:6,padding:'4px 10px',
            opacity:hov?1:0,transition:'opacity .2s',
          }}>
            <span style={{fontFamily:C.mono,fontSize:8,color:accent}}>add via admin panel →</span>
          </div>
        </div>
        {/* aspect label */}
        <div style={{
          position:'absolute',top:8,right:8,
          background:accent+'18',border:`1px solid ${accent}30`,
          borderRadius:4,padding:'2px 6px',
          fontFamily:C.mono,fontSize:7.5,color:accent,letterSpacing:'.1em',
        }}>
          {slot.aspectRatio||'16/9'}
        </div>
      </div>
      {slot.caption&&(
        <p style={{fontFamily:C.mono,fontSize:10,color:C.dim,textAlign:'center',margin:'8px 0 0',fontStyle:'italic'}}>
          {slot.caption}
        </p>
      )}
    </div>
  );
}

function StepCard({ step, index, accent }) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex',flexDirection:'column',gap:16,
        background:hov?C.cardH:C.card,
        border:`1px solid ${hov?accent+'40':C.border}`,
        borderRadius:14,padding:'22px 22px 24px',
        transition:'all .2s ease',
        animation:`fadeUp .4s ease ${index*.08}s both`,
        position:'relative',overflow:'hidden',
      }}>
      {/* accent bar */}
      <div style={{
        position:'absolute',left:0,top:0,bottom:0,width:3,
        background:`linear-gradient(180deg,${accent},${accent}33)`,
        borderRadius:'14px 0 0 14px',
        opacity:hov?1:.45,transition:'opacity .2s',
      }}/>
      {/* header */}
      <div style={{display:'flex',alignItems:'flex-start',gap:14,paddingLeft:8}}>
        <div style={{
          flexShrink:0,width:30,height:30,borderRadius:'50%',
          background:accent+'18',border:`1.5px solid ${accent}50`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:C.mono,fontSize:11,fontWeight:700,color:accent,
          boxShadow:hov?`0 0 12px ${accent}33`:'none',transition:'box-shadow .2s',
        }}>
          {index+1}
        </div>
        <div style={{flex:1}}>
          <h3 style={{fontFamily:C.sans,fontSize:15,fontWeight:700,color:C.text,margin:'0 0 8px',lineHeight:1.3}}>
            {step.title}
          </h3>
          <p style={{fontFamily:C.sans,fontSize:13.5,color:C.mid,lineHeight:1.72,margin:0}}>
            {step.description}
          </p>
        </div>
      </div>
      {step.mediaSlot&&(
        <div style={{paddingLeft:8}}>
          <MediaSlot slot={step.mediaSlot} accent={accent}/>
        </div>
      )}
    </div>
  );
}

function TipsBlock({ tips, accent }) {
  return (
    <div style={{
      background:accent+'08',border:`1px solid ${accent}28`,
      borderRadius:12,padding:'16px 18px',
      animation:'fadeUp .4s ease .3s both',
    }}>
      <p style={{fontFamily:C.mono,fontSize:9,color:accent,letterSpacing:'.1em',textTransform:'uppercase',margin:'0 0 12px'}}>
        💡 pro tips
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {tips.map((tip,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{fontFamily:C.mono,fontSize:10,color:accent,flexShrink:0,marginTop:2}}>→</span>
            <p style={{fontFamily:C.mono,fontSize:11.5,color:accent+'cc',margin:0,lineHeight:1.6}}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQBlock({ faqs, accent }) {
  const [open,setOpen]=useState(null);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8,animation:'fadeUp .4s ease .4s both'}}>
      <p style={{fontFamily:C.mono,fontSize:9,color:C.muted,letterSpacing:'.1em',textTransform:'uppercase',margin:'0 0 4px'}}>
        frequently asked
      </p>
      {faqs.map((faq,i)=>(
        <div key={i} onClick={()=>setOpen(open===i?null:i)}
          style={{
            background:open===i?C.cardH:C.card,
            border:`1px solid ${open===i?accent+'35':C.border}`,
            borderRadius:10,padding:'13px 16px',cursor:'pointer',transition:'all .18s ease',
          }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <p style={{
              fontFamily:C.sans,fontSize:13,fontWeight:600,
              color:open===i?accent:C.mid,margin:0,transition:'color .15s',
            }}>
              {faq.q}
            </p>
            <span style={{
              fontFamily:C.mono,fontSize:13,color:open===i?accent:C.dim,
              flexShrink:0,transform:open===i?'rotate(180deg)':'rotate(0)',
              transition:'transform .2s,color .15s',lineHeight:1,
            }}>↓</span>
          </div>
          {open===i&&(
            <p style={{fontFamily:C.sans,fontSize:13,color:C.muted,margin:'10px 0 0',lineHeight:1.65,animation:'fadeIn .2s ease'}}>
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionDivider({ accent }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'28px 0'}}>
      <div style={{height:1,flex:1,background:C.border}}/>
      <div style={{width:5,height:5,borderRadius:'50%',background:accent+'60',flexShrink:0}}/>
      <div style={{height:1,flex:1,background:C.border}}/>
    </div>
  );
}

function NavItem({ section, isActive, index, onClick }) {
  const [hov,setHov]=useState(false);
  const ac=section.accent;
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:9,
        padding:'9px 11px',borderRadius:9,cursor:'pointer',border:'none',
        background:isActive?ac+'12':hov?'rgba(255,255,255,.03)':'transparent',
        outline:`1px solid ${isActive?ac+'35':hov?C.borderH:'transparent'}`,
        transform:isActive?'translateX(4px)':hov?'translateX(2px)':'translateX(0)',
        transition:'all .17s ease',position:'relative',
      }}>
      {isActive&&<div style={{
        position:'absolute',left:-1,top:'18%',bottom:'18%',width:3,
        borderRadius:2,background:`linear-gradient(180deg,${ac},${ac}77)`,
        boxShadow:`0 0 8px ${ac}66`,
      }}/>}
      <span style={{fontSize:14,flexShrink:0}}>{section.icon}</span>
      <span style={{
        fontFamily:C.sans,fontSize:12.5,flex:1,
        fontWeight:isActive?700:500,
        color:isActive?ac:hov?C.mid:C.muted,
        transition:'color .15s',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
      }}>
        {section.title}
      </span>
      <span style={{
        fontFamily:C.mono,fontSize:8,color:C.dim,
        background:C.surface,border:`1px solid ${C.border}`,
        borderRadius:3,padding:'1px 4px',flexShrink:0,
      }}>
        {index+1}
      </span>
    </button>
  );
}

export default function DocsPage() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const isAdmin     = profile?.is_admin===true;

  const [activeIdx,setActiveIdx] = useState(0);
  const [scrolled,setScrolled]   = useState(false);
  const contentRef               = useRef(null);
  const sectionRefs              = useRef([]);

  useEffect(()=>{
    const handler=(e)=>{
      const n=parseInt(e.key,10);
      if(n>=1&&n<=GUIDE_SECTIONS.length&&!e.ctrlKey&&!e.metaKey&&!e.altKey) jumpTo(n-1);
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[]);

  useEffect(()=>{
    const el=contentRef.current;
    if(!el) return;
    const onScroll=()=>{
      setScrolled(el.scrollTop>20);
      let found=0;
      sectionRefs.current.forEach((ref,i)=>{
        if(!ref) return;
        if(ref.getBoundingClientRect().top < window.innerHeight*.45) found=i;
      });
      setActiveIdx(found);
    };
    el.addEventListener('scroll',onScroll,{passive:true});
    return ()=>el.removeEventListener('scroll',onScroll);
  },[]);

  const jumpTo = useCallback((idx)=>{
    const ref=sectionRefs.current[idx];
    if(ref&&contentRef.current) contentRef.current.scrollTo({top:ref.offsetTop-24,behavior:'smooth'});
    setActiveIdx(idx);
  },[]);

  const activeSection=GUIDE_SECTIONS[activeIdx];

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{display:'flex',height:'100%',minHeight:'100vh',background:C.bg,overflow:'hidden'}}>

        {/* ── LEFT NAV ── */}
        <aside style={{
          width:230,flexShrink:0,borderRight:`1px solid ${C.border}`,
          display:'flex',flexDirection:'column',background:C.bg,
          overflowY:'auto',position:'sticky',top:0,height:'100vh',
        }}>
          {/* Header */}
          <div style={{padding:'20px 14px 14px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:10}}>
              <div style={{
                width:6,height:6,borderRadius:'50%',
                background:C.green,color:C.green,
                animation:'glowDot 2.4s ease-in-out infinite',
              }}/>
              <span style={{fontFamily:C.mono,fontSize:8.5,color:C.dim,letterSpacing:'.12em'}}>
                TECHTHREADS / GUIDE
              </span>
            </div>
            <h2 style={{fontFamily:C.sans,fontSize:15,fontWeight:800,color:C.text,margin:'0 0 3px',letterSpacing:'-.01em'}}>
              User Guide
            </h2>
            <p style={{fontFamily:C.mono,fontSize:9,color:C.dim,margin:0}}>
              press [1–{GUIDE_SECTIONS.length}] to jump
            </p>
          </div>

          {/* Sections */}
          <nav style={{flex:1,padding:'10px 8px',overflowY:'auto'}}>
            <p style={{fontFamily:C.mono,fontSize:7.5,color:C.dim,letterSpacing:'.14em',textTransform:'uppercase',margin:'0 3px 8px'}}>
              sections
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {GUIDE_SECTIONS.map((s,i)=>(
                <NavItem key={s.id} section={s} isActive={i===activeIdx} index={i} onClick={()=>jumpTo(i)}/>
              ))}
            </div>
          </nav>

          {/* Admin link */}
          {isAdmin&&(
            <div style={{padding:'10px 8px 14px',borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <button onClick={()=>navigate('/docs/admin')}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amber+'50';e.currentTarget.style.color=C.amber;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
                style={{
                  width:'100%',textAlign:'left',display:'flex',alignItems:'center',gap:8,
                  padding:'8px 11px',borderRadius:8,background:'transparent',
                  border:`1px solid ${C.border}`,cursor:'pointer',transition:'all .15s',
                  fontFamily:C.mono,fontSize:10,color:C.muted,
                }}>
                <span>⚙</span><span>Manage Guide</span>
              </button>
            </div>
          )}

          {/* Watermark */}
          <div style={{padding:'8px 14px 16px',borderTop:`1px solid ${C.border}`,flexShrink:0}}>
            <p style={{fontFamily:C.mono,fontSize:8.5,color:C.dim,margin:0,lineHeight:1.8}}>
              {'>'} TechThreads v1.0<br/>
              {'>'} user guide<br/>
              <span style={{color:C.green}}>{'>'} status: online</span>
            </p>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <main ref={contentRef} style={{flex:1,overflowY:'auto',padding:'0 0 80px'}}>
          {/* Sticky top bar */}
          <div style={{
            position:'sticky',top:0,zIndex:10,
            background:scrolled?C.bg+'f0':'transparent',
            backdropFilter:scrolled?'blur(12px)':'none',
            borderBottom:scrolled?`1px solid ${C.border}`:'1px solid transparent',
            padding:'14px 36px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            transition:'all .25s ease',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:17}}>{activeSection?.icon}</span>
              <span style={{fontFamily:C.sans,fontSize:14,fontWeight:700,color:activeSection?.accent??C.cyan,transition:'color .2s'}}>
                {activeSection?.title}
              </span>
              <Cursor color={activeSection?.accent??C.cyan} size={7}/>
            </div>
            <span style={{fontFamily:C.mono,fontSize:9,color:C.dim}}>
              {activeIdx+1} / {GUIDE_SECTIONS.length}
            </span>
          </div>

          {/* All sections */}
          <div style={{padding:'0 36px'}}>
            {GUIDE_SECTIONS.map((section,sIdx)=>{
              const ac=section.accent;
              return (
                <section key={section.id} id={section.id}
                  ref={el=>{sectionRefs.current[sIdx]=el;}}
                  style={{paddingTop:sIdx===0?28:64,paddingBottom:20,maxWidth:780}}>

                  {/* Section heading */}
                  <div style={{marginBottom:28}}>
                    {/* eyebrow */}
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <div style={{height:1,width:24,background:`linear-gradient(90deg,${ac},transparent)`}}/>
                      <span style={{fontFamily:C.mono,fontSize:9,color:ac,letterSpacing:'.14em',textTransform:'uppercase'}}>
                        {String(sIdx+1).padStart(2,'0')} · {section.id}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                      <span style={{fontSize:30,lineHeight:1}}>{section.icon}</span>
                      <h2 style={{fontFamily:C.sans,fontSize:26,fontWeight:800,color:C.text,margin:0,letterSpacing:'-.02em'}}>
                        {section.title}
                      </h2>
                    </div>

                    {/* Accent underline */}
                    <div style={{height:2,width:64,background:`linear-gradient(90deg,${ac},transparent)`,borderRadius:2,marginBottom:20}}/>

                    {/* Intro callout */}
                    <div style={{
                      background:ac+'0d',border:`1px solid ${ac}28`,
                      borderLeft:`3px solid ${ac}`,borderRadius:10,padding:'14px 18px',marginBottom:16,
                    }}>
                      <p style={{fontFamily:C.sans,fontSize:14.5,color:C.mid,lineHeight:1.68,margin:0,fontWeight:500}}>
                        {section.intro}
                      </p>
                    </div>

                    {/* Purpose */}
                    <div style={{
                      background:C.surface,border:`1px solid ${C.border}`,
                      borderRadius:10,padding:'14px 18px',
                    }}>
                      <p style={{fontFamily:C.mono,fontSize:8,color:C.muted,letterSpacing:'.12em',textTransform:'uppercase',margin:'0 0 8px'}}>
                        why this feature exists
                      </p>
                      <p style={{fontFamily:C.sans,fontSize:13.5,color:C.muted,lineHeight:1.68,margin:0}}>
                        {section.purpose}
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{marginBottom:28}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                      <span style={{fontFamily:C.mono,fontSize:9,color:C.muted,letterSpacing:'.1em',textTransform:'uppercase'}}>
                        how to use it
                      </span>
                      <div style={{height:1,flex:1,background:C.border}}/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:16}}>
                      {section.steps.map((step,stIdx)=>(
                        <StepCard key={step.id} step={step} index={stIdx} accent={ac}/>
                      ))}
                    </div>
                  </div>

                  {section.tips?.length>0&&<><SectionDivider accent={ac}/><TipsBlock tips={section.tips} accent={ac}/></>}
                  {section.faqs?.length>0&&<><SectionDivider accent={ac}/><FAQBlock faqs={section.faqs} accent={ac}/></>}

                  {/* Prev / Next nav */}
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:36,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
                    {sIdx>0?(
                      <button onClick={()=>jumpTo(sIdx-1)}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=GUIDE_SECTIONS[sIdx-1].accent+'50';e.currentTarget.style.color=GUIDE_SECTIONS[sIdx-1].accent;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
                        style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontFamily:C.mono,fontSize:10,color:C.muted,transition:'all .15s'}}>
                        ← {GUIDE_SECTIONS[sIdx-1].icon} {GUIDE_SECTIONS[sIdx-1].title}
                      </button>
                    ):<div/>}
                    {sIdx<GUIDE_SECTIONS.length-1?(
                      <button onClick={()=>jumpTo(sIdx+1)}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=GUIDE_SECTIONS[sIdx+1].accent+'50';e.currentTarget.style.color=GUIDE_SECTIONS[sIdx+1].accent;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
                        style={{display:'flex',alignItems:'center',gap:6,background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontFamily:C.mono,fontSize:10,color:C.muted,transition:'all .15s'}}>
                        {GUIDE_SECTIONS[sIdx+1].icon} {GUIDE_SECTIONS[sIdx+1].title} →
                      </button>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:6,background:C.green+'0f',border:`1px solid ${C.green}30`,borderRadius:8,padding:'8px 16px',fontFamily:C.mono,fontSize:10,color:C.green}}>
                        ✓ guide complete <Cursor color={C.green} size={6}/>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}

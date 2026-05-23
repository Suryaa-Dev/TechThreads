// src/features/docs/pages/DocsAdmin.jsx
// Admin panel for managing the TechThreads User Guide.
// Admins can:
//  - Add / edit / delete sections
//  - Add / edit / delete steps within a section (with media URL or placeholder)
//  - Edit intro, purpose, tips, FAQs per section
//  - Reorder sections
//  - Seed DB with guideContent.js defaults

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase }    from '../../../services/supabaseClient';
import { useAuth }     from '../../../context/AuthContext';
import GUIDE_SECTIONS  from '../data/guideContent';

const C = {
  bg:'#09090a', surface:'#111110', card:'#161615', cardH:'#1a1918',
  border:'#252523', borderH:'#343430', cyan:'#00d4ff', green:'#00e676',
  red:'#ff4c6a', amber:'#f5a623', purple:'#a78bfa', pink:'#f472b6',
  text:'#f0f4ff', mid:'#d0d8ee', muted:'#8b95ae', dim:'#4a5878',
  mono:"'Space Mono', monospace", sans:"'Syne', sans-serif",
};

const KF = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
`;

// ── Micro components ──────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${C.border}`,borderTopColor:C.cyan,animation:'spin .7s linear infinite',flexShrink:0}}/>
);

function Btn({children,onClick,variant='default',disabled,small,style:ext}) {
  const [hov,setHov]=useState(false);
  const v={
    default:{bg:hov?C.cardH:C.card,border:hov?C.borderH:C.border,color:C.mid},
    primary:{bg:hov?'#00bbdd':C.cyan+'18',border:C.cyan+'50',color:C.cyan},
    danger: {bg:hov?C.red+'22':C.red+'0f',border:C.red+'50',color:C.red},
    success:{bg:hov?C.green+'22':C.green+'0f',border:C.green+'50',color:C.green},
    ghost:  {bg:'transparent',border:'transparent',color:C.muted},
  }[variant]||{};
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        fontFamily:C.mono,fontSize:small?10:11,
        padding:small?'5px 10px':'8px 14px',
        background:disabled?C.surface:v.bg,
        border:`1px solid ${disabled?C.border:v.border}`,
        color:disabled?C.dim:v.color,
        borderRadius:8,cursor:disabled?'default':'pointer',
        transition:'all .15s',opacity:disabled?.5:1,
        display:'flex',alignItems:'center',gap:5,...ext,
      }}>
      {children}
    </button>
  );
}

function Field({label,value,onChange,multiline,placeholder,mono,rows=4}) {
  const base={
    width:'100%',boxSizing:'border-box',
    background:C.surface,border:`1px solid ${C.border}`,
    borderRadius:8,padding:'9px 12px',
    fontFamily:mono?C.mono:C.sans,fontSize:mono?11:13,color:C.text,
    outline:'none',transition:'border-color .15s',
    resize:multiline?'vertical':undefined,
  };
  return (
    <label style={{display:'flex',flexDirection:'column',gap:5}}>
      <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase'}}>{label}</span>
      {multiline
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={base}
            onFocus={e=>e.target.style.borderColor=C.cyan+'60'} onBlur={e=>e.target.style.borderColor=C.border}/>
        : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}
            onFocus={e=>e.target.style.borderColor=C.cyan+'60'} onBlur={e=>e.target.style.borderColor=C.border}/>
      }
    </label>
  );
}

// ── Step editor modal ─────────────────────────────────────────────────────────
function StepModal({step,onSave,onClose,accent}) {
  const blank={id:'',title:'',description:'',mediaSlot:{id:'',type:'image',caption:'',aspectRatio:'16/9',url:''}};
  const [s,setS]=useState(step??blank);
  const set=k=>v=>setS(p=>({...p,[k]:v}));
  const setMedia=k=>v=>setS(p=>({...p,mediaSlot:{...p.mediaSlot,[k]:v}}));

  const handleSave=()=>{
    if(!s.title.trim()||!s.description.trim()) return;
    const id=s.id||`step-${Date.now()}`;
    const ms=s.mediaSlot?.id?s.mediaSlot:null;
    onSave({...s,id,mediaSlot:ms});
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.78)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{
        background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,
        width:'100%',maxWidth:560,display:'flex',flexDirection:'column',gap:16,
        animation:'fadeUp .2s ease',maxHeight:'90vh',overflowY:'auto',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:C.mono,fontSize:10,color:accent,letterSpacing:'.1em'}}>
            {s.id?'// edit step':'// new step'}
          </span>
          <Btn variant="ghost" small onClick={onClose}>✕</Btn>
        </div>

        <Field label="Step title" value={s.title} onChange={set('title')} placeholder="e.g. Sign in with GitHub"/>
        <Field label="Step description" value={s.description} onChange={set('description')} multiline rows={5}
          placeholder="Explain clearly what the user should do, step by step..."/>

        {/* Media slot */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 16px'}}>
          <p style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase',margin:'0 0 12px'}}>
            media slot (optional)
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <Field label="Slot ID (unique key)" value={s.mediaSlot?.id??''} onChange={setMedia('id')} placeholder="e.g. gs-signin" mono/>
            <div style={{display:'flex',gap:10}}>
              <label style={{display:'flex',flexDirection:'column',gap:5,flex:1}}>
                <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase'}}>type</span>
                <select value={s.mediaSlot?.type??'image'} onChange={e=>setMedia('type')(e.target.value)}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',fontFamily:C.mono,fontSize:11,color:C.text,outline:'none'}}>
                  <option value="image">image</option>
                  <option value="video">video</option>
                </select>
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:5,flex:1}}>
                <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase'}}>aspect ratio</span>
                <select value={s.mediaSlot?.aspectRatio??'16/9'} onChange={e=>setMedia('aspectRatio')(e.target.value)}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',fontFamily:C.mono,fontSize:11,color:C.text,outline:'none'}}>
                  <option value="16/9">16/9 (widescreen)</option>
                  <option value="4/3">4/3 (standard)</option>
                  <option value="1/1">1/1 (square)</option>
                </select>
              </label>
            </div>
            <Field label="Caption" value={s.mediaSlot?.caption??''} onChange={setMedia('caption')} placeholder="Short description shown below the image"/>
            <Field label="Media URL (leave blank for placeholder)" value={s.mediaSlot?.url??''} onChange={setMedia('url')}
              placeholder="https://... (add later when screenshot is ready)" mono/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}>
          <Btn onClick={onClose}>cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!s.title.trim()||!s.description.trim()}>save step</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Section detail editor ─────────────────────────────────────────────────────
function SectionDetailModal({section,onSave,onClose}) {
  const isNew=!section;
  const ACCENT_PRESETS=['#00d4ff','#818cf8','#f472b6','#f5a623','#00e676','#a78bfa','#38bdf8','#34d399'];
  const [s,setS]=useState(section??{
    id:'',icon:'📄',title:'',accent:'#00d4ff',
    intro:'',purpose:'',steps:[],tips:[],faqs:[],
  });
  const set=k=>v=>setS(p=>({...p,[k]:v}));

  // tips array editing
  const addTip=()=>setS(p=>({...p,tips:[...p.tips,'']}));
  const setTip=(i,v)=>setS(p=>{const t=[...p.tips];t[i]=v;return{...p,tips:t};});
  const delTip=(i)=>setS(p=>({...p,tips:p.tips.filter((_,j)=>j!==i)}));

  // faqs
  const addFaq=()=>setS(p=>({...p,faqs:[...p.faqs,{q:'',a:''}]}));
  const setFaq=(i,k,v)=>setS(p=>{const f=[...p.faqs];f[i]={...f[i],[k]:v};return{...p,faqs:f};});
  const delFaq=(i)=>setS(p=>({...p,faqs:p.faqs.filter((_,j)=>j!==i)}));

  const handleSave=()=>{
    if(!s.title.trim()||!s.id.trim()) return;
    onSave(s);
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.78)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{
        background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,
        width:'100%',maxWidth:600,display:'flex',flexDirection:'column',gap:16,
        animation:'fadeUp .2s ease',maxHeight:'92vh',overflowY:'auto',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:C.mono,fontSize:10,color:C.cyan,letterSpacing:'.1em'}}>
            {isNew?'// new section':'// edit section metadata'}
          </span>
          <Btn variant="ghost" small onClick={onClose}>✕</Btn>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Field label="Section ID (slug)" value={s.id} onChange={set('id')} placeholder="e.g. feed, challenges" mono/>
          <Field label="Icon Emoji" value={s.icon} onChange={set('icon')} placeholder="e.g. ⚡"/>
        </div>
        <Field label="Section Title" value={s.title} onChange={set('title')} placeholder="e.g. Your Feed"/>

        {/* Accent */}
        <div>
          <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>accent color</span>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            {ACCENT_PRESETS.map(c=>(
              <div key={c} onClick={()=>set('accent')(c)}
                style={{width:22,height:22,borderRadius:'50%',background:c,cursor:'pointer',
                  border:`2px solid ${s.accent===c?'#fff':'transparent'}`,
                  boxShadow:s.accent===c?`0 0 8px ${c}`:'none',transition:'all .15s'}}/>
            ))}
            <input value={s.accent} onChange={e=>set('accent')(e.target.value)}
              style={{width:80,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',fontFamily:C.mono,fontSize:10,color:s.accent,outline:'none'}}/>
          </div>
        </div>

        <Field label="Intro (1–2 sentences — what is this feature?)" value={s.intro} onChange={set('intro')} multiline rows={2}/>
        <Field label="Purpose (why does this feature exist?)" value={s.purpose} onChange={set('purpose')} multiline rows={3}/>

        {/* Tips */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase'}}>pro tips</span>
            <Btn small onClick={addTip}>+ add tip</Btn>
          </div>
          {s.tips.map((tip,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
              <input value={tip} onChange={e=>setTip(i,e.target.value)} placeholder={`Tip ${i+1}`}
                style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontFamily:C.sans,fontSize:12,color:C.text,outline:'none'}}/>
              <Btn small variant="danger" onClick={()=>delTip(i)}>✕</Btn>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase'}}>FAQs</span>
            <Btn small onClick={addFaq}>+ add FAQ</Btn>
          </div>
          {s.faqs.map((faq,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:6,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',marginBottom:8}}>
              <input value={faq.q} onChange={e=>setFaq(i,'q',e.target.value)} placeholder="Question"
                style={{background:'transparent',border:'none',borderBottom:`1px solid ${C.border}`,padding:'4px 0',fontFamily:C.sans,fontSize:12,color:C.mid,outline:'none'}}/>
              <div style={{display:'flex',gap:6}}>
                <textarea value={faq.a} onChange={e=>setFaq(i,'a',e.target.value)} placeholder="Answer" rows={2}
                  style={{flex:1,background:'transparent',border:'none',fontFamily:C.sans,fontSize:12,color:C.muted,outline:'none',resize:'vertical'}}/>
                <Btn small variant="danger" onClick={()=>delFaq(i)}>✕</Btn>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}>
          <Btn onClick={onClose}>cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!s.title.trim()||!s.id.trim()}>
            {isNew?'create section':'save changes'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main DocsAdmin ────────────────────────────────────────────────────────────
export default function DocsAdmin() {
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [sections,      setSections]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [selectedIdx,   setSelectedIdx]   = useState(0);
  const [sectionModal,  setSectionModal]  = useState(null); // null | 'new' | obj
  const [stepModal,     setStepModal]     = useState(null); // null | 'new' | obj
  const [confirmDel,    setConfirmDel]    = useState(null);

  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};

  // ── Supabase table: guide_sections ────────────────────────────────────────
  // Schema: id text PK, order_index int, icon text, title text, accent text,
  //         intro text, purpose text, steps jsonb, tips jsonb, faqs jsonb
  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const{data,error}=await supabase.from('guide_sections').select('*').order('order_index',{ascending:true});
      if(!error&&data&&data.length>0) {
        setSections(data.map(s=>({
          ...s,
          steps: typeof s.steps==='string'?JSON.parse(s.steps):(s.steps??[]),
          tips:  typeof s.tips ==='string'?JSON.parse(s.tips) :(s.tips ??[]),
          faqs:  typeof s.faqs ==='string'?JSON.parse(s.faqs) :(s.faqs ??[]),
        })));
      } else {
        setSections([]);
      }
    } catch { setSections([]); }
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const seed=async()=>{
    setSaving(true);
    try {
      const rows=GUIDE_SECTIONS.map((s,i)=>({
        id:s.id, order_index:i, icon:s.icon, title:s.title,
        accent:s.accent, intro:s.intro, purpose:s.purpose,
        steps:s.steps, tips:s.tips, faqs:s.faqs,
      }));
      const{error}=await supabase.from('guide_sections').upsert(rows,{onConflict:'id'});
      if(error) throw error;
      showToast('✓ Seeded with defaults');
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const saveSection=async(data)=>{
    setSaving(true);
    try {
      const isNew=!sections.find(s=>s.id===data.id);
      const payload={...data,order_index:isNew?sections.length:data.order_index,updated_at:new Date().toISOString()};
      const{error}=isNew
        ?await supabase.from('guide_sections').insert(payload)
        :await supabase.from('guide_sections').update(payload).eq('id',data.id);
      if(error) throw error;
      showToast(isNew?'✓ Section created':'✓ Section updated');
      setSectionModal(null);
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const deleteSection=async(id)=>{
    setSaving(true);
    try {
      const{error}=await supabase.from('guide_sections').delete().eq('id',id);
      if(error) throw error;
      showToast('✓ Section deleted');
      setSelectedIdx(0);
      setConfirmDel(null);
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const moveSection=async(idx,dir)=>{
    const swap=idx+dir;
    if(swap<0||swap>=sections.length) return;
    setSaving(true);
    try {
      const a=sections[idx],b=sections[swap];
      await supabase.from('guide_sections').update({order_index:b.order_index}).eq('id',a.id);
      await supabase.from('guide_sections').update({order_index:a.order_index}).eq('id',b.id);
      showToast('✓ Reordered');
      setSelectedIdx(swap);
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const saveStep=async(stepData)=>{
    const section=sections[selectedIdx];
    if(!section) return;
    setSaving(true);
    try {
      const existing=section.steps??[];
      const isNew=!existing.find(s=>s.id===stepData.id);
      const updated=isNew?[...existing,stepData]:existing.map(s=>s.id===stepData.id?stepData:s);
      const{error}=await supabase.from('guide_sections').update({steps:updated,updated_at:new Date().toISOString()}).eq('id',section.id);
      if(error) throw error;
      showToast(isNew?'✓ Step added':'✓ Step updated');
      setStepModal(null);
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const deleteStep=async(stepId)=>{
    const section=sections[selectedIdx];
    if(!section) return;
    setSaving(true);
    try {
      const updated=(section.steps??[]).filter(s=>s.id!==stepId);
      const{error}=await supabase.from('guide_sections').update({steps:updated,updated_at:new Date().toISOString()}).eq('id',section.id);
      if(error) throw error;
      showToast('✓ Step deleted');
      setConfirmDel(null);
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const moveStep=async(stepIdx,dir)=>{
    const section=sections[selectedIdx];
    if(!section) return;
    const steps=[...section.steps??[]];
    const swap=stepIdx+dir;
    if(swap<0||swap>=steps.length) return;
    [steps[stepIdx],steps[swap]]=[steps[swap],steps[stepIdx]];
    setSaving(true);
    try {
      const{error}=await supabase.from('guide_sections').update({steps,updated_at:new Date().toISOString()}).eq('id',section.id);
      if(error) throw error;
      await load();
    } catch(e){showToast('✗ '+e.message,false);}
    setSaving(false);
  };

  const active=sections[selectedIdx]??null;

  return (
    <>
      <style>{KF}</style>

      {/* Toast */}
      {toast&&(
        <div style={{
          position:'fixed',top:20,right:20,zIndex:9999,
          background:toast.ok?C.green+'18':C.red+'18',
          border:`1px solid ${toast.ok?C.green+'50':C.red+'50'}`,
          color:toast.ok?C.green:C.red,
          fontFamily:C.mono,fontSize:11,borderRadius:8,padding:'10px 16px',
          animation:'fadeUp .2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel&&(
        <div onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}
          style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:C.card,border:`1px solid ${C.red}40`,borderRadius:12,padding:24,maxWidth:380,display:'flex',flexDirection:'column',gap:14,animation:'fadeUp .2s ease'}}>
            <p style={{fontFamily:C.mono,fontSize:10,color:C.red,margin:0}}>// confirm delete</p>
            <p style={{fontFamily:C.sans,fontSize:13,color:C.mid,margin:0}}>
              Delete <strong style={{color:C.text}}>{confirmDel.label}</strong>? This cannot be undone.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <Btn onClick={()=>setConfirmDel(null)}>cancel</Btn>
              <Btn variant="danger" onClick={()=>{
                if(confirmDel.type==='section') deleteSection(confirmDel.id);
                else deleteStep(confirmDel.id);
              }}>delete</Btn>
            </div>
          </div>
        </div>
      )}

      {sectionModal&&<SectionDetailModal section={sectionModal==='new'?null:sectionModal} onSave={saveSection} onClose={()=>setSectionModal(null)}/>}
      {stepModal&&<StepModal step={stepModal==='new'?null:stepModal} accent={active?.accent??C.cyan} onSave={saveStep} onClose={()=>setStepModal(null)}/>}

      <div style={{minHeight:'100vh',background:C.bg,padding:'28px 32px 64px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <span style={{fontFamily:C.mono,fontSize:9,color:C.dim}}>admin</span>
              <span style={{fontFamily:C.mono,fontSize:9,color:C.dim}}>/</span>
              <span style={{fontFamily:C.mono,fontSize:9,color:C.cyan}}>guide</span>
            </div>
            <h1 style={{fontFamily:C.sans,fontSize:20,fontWeight:800,color:C.text,margin:0}}>Guide Admin Panel</h1>
            <p style={{fontFamily:C.mono,fontSize:9,color:C.dim,margin:'4px 0 0'}}>
              Manage sections, steps, tips, FAQs and media slots for the user guide.
            </p>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <Btn onClick={()=>navigate('/docs')}>← view guide</Btn>
            <Btn variant="success" onClick={seed} disabled={saving||loading}>
              {saving?<Spinner/>:null} seed defaults
            </Btn>
            <Btn variant="primary" onClick={()=>setSectionModal('new')} disabled={saving}>
              + new section
            </Btn>
          </div>
        </div>

        {loading?(
          <div style={{display:'flex',gap:12,alignItems:'center',paddingTop:40}}>
            <Spinner/><span style={{fontFamily:C.mono,fontSize:11,color:C.dim}}>loading guide data…</span>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:20,alignItems:'start'}}>

            {/* LEFT — section list */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <p style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase',margin:'0 0 4px'}}>
                sections ({sections.length})
              </p>
              {sections.length===0?(
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'20px 16px',textAlign:'center'}}>
                  <p style={{fontFamily:C.mono,fontSize:10,color:C.dim,margin:'0 0 10px'}}>no sections yet</p>
                  <Btn variant="success" small onClick={seed}>seed defaults</Btn>
                </div>
              ):(
                sections.map((s,i)=>(
                  <div key={s.id} onClick={()=>setSelectedIdx(i)}
                    style={{
                      background:i===selectedIdx?s.accent+'10':C.card,
                      border:`1px solid ${i===selectedIdx?s.accent+'40':C.border}`,
                      borderRadius:10,padding:'11px 13px',cursor:'pointer',
                      transition:'all .17s',display:'flex',alignItems:'center',gap:10,
                    }}>
                    <span style={{fontSize:16}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:C.sans,fontSize:12.5,fontWeight:700,color:i===selectedIdx?s.accent:C.text,margin:0}}>
                        {s.title}
                      </p>
                      <p style={{fontFamily:C.mono,fontSize:8.5,color:C.dim,margin:'2px 0 0'}}>
                        {s.steps?.length??0} steps
                      </p>
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <Btn small onClick={()=>moveSection(i,-1)} disabled={i===0||saving}>↑</Btn>
                      <Btn small onClick={()=>moveSection(i,1)} disabled={i===sections.length-1||saving}>↓</Btn>
                      <Btn small variant="primary" onClick={()=>setSectionModal(s)} disabled={saving}>edit</Btn>
                      <Btn small variant="danger" onClick={()=>setConfirmDel({type:'section',id:s.id,label:s.title})} disabled={saving}>del</Btn>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RIGHT — steps of selected section */}
            <div>
              {active?(
                <>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
                    <div>
                      <p style={{fontFamily:C.mono,fontSize:9,color:C.dim,letterSpacing:'.1em',textTransform:'uppercase',margin:'0 0 4px'}}>
                        steps in
                      </p>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:18}}>{active.icon}</span>
                        <h2 style={{fontFamily:C.sans,fontSize:16,fontWeight:700,color:active.accent,margin:0}}>{active.title}</h2>
                      </div>
                    </div>
                    <Btn variant="primary" onClick={()=>setStepModal('new')} disabled={saving}>+ add step</Btn>
                  </div>

                  <div style={{height:1,background:`linear-gradient(90deg,${active.accent}50,transparent)`,marginBottom:14}}/>

                  {/* Section meta summary */}
                  <div style={{
                    display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18,
                    background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 16px',
                  }}>
                    <div>
                      <p style={{fontFamily:C.mono,fontSize:8,color:C.dim,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'.1em'}}>intro</p>
                      <p style={{fontFamily:C.sans,fontSize:12,color:C.muted,margin:0,lineHeight:1.55}}>
                        {active.intro||<span style={{color:C.dim,fontStyle:'italic'}}>not set</span>}
                      </p>
                    </div>
                    <div>
                      <p style={{fontFamily:C.mono,fontSize:8,color:C.dim,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'.1em'}}>tips / FAQs</p>
                      <p style={{fontFamily:C.mono,fontSize:11,color:C.muted,margin:0}}>
                        {active.tips?.length??0} tips · {active.faqs?.length??0} FAQs
                      </p>
                    </div>
                  </div>

                  {/* Steps list */}
                  {(active.steps??[]).length===0?(
                    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:24,textAlign:'center'}}>
                      <p style={{fontFamily:C.mono,fontSize:10,color:C.dim,margin:'0 0 12px'}}>no steps yet</p>
                      <Btn variant="primary" small onClick={()=>setStepModal('new')}>add first step</Btn>
                    </div>
                  ):(
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {(active.steps??[]).map((step,stIdx)=>(
                        <div key={step.id}
                          style={{
                            background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,
                            padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12,
                            animation:'fadeUp .2s ease',
                          }}>
                          <div style={{
                            flexShrink:0,width:26,height:26,borderRadius:'50%',
                            background:active.accent+'18',border:`1px solid ${active.accent}40`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontFamily:C.mono,fontSize:10,fontWeight:700,color:active.accent,
                          }}>
                            {stIdx+1}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontFamily:C.sans,fontSize:13,fontWeight:600,color:C.mid,margin:0}}>{step.title}</p>
                            <p style={{fontFamily:C.mono,fontSize:9.5,color:C.dim,margin:'3px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {step.description?.slice(0,90)}…
                              {step.mediaSlot?.id&&<span style={{color:active.accent,marginLeft:8}}>📎 {step.mediaSlot.type}</span>}
                            </p>
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0}}>
                            <Btn small onClick={()=>moveStep(stIdx,-1)} disabled={stIdx===0||saving}>↑</Btn>
                            <Btn small onClick={()=>moveStep(stIdx,1)} disabled={stIdx===(active.steps?.length??0)-1||saving}>↓</Btn>
                            <Btn small variant="primary" onClick={()=>setStepModal(step)} disabled={saving}>edit</Btn>
                            <Btn small variant="danger" onClick={()=>setConfirmDel({type:'step',id:step.id,label:step.title})} disabled={saving}>del</Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ):(
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:32,textAlign:'center'}}>
                  <p style={{fontFamily:C.mono,fontSize:11,color:C.dim,margin:0}}>← select a section to manage its steps</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

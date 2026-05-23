// src/features/auth/pages/AuthPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { FaGithub } from 'react-icons/fa';

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      '#09090a',
  surface: '#111318',
  border:  '#1e2030',
  borderH: '#2d3452',
  fainter: '#2a3352',
  cyan:    '#00d4ff',
  pink:    '#f472b6',
  indigo:  '#818cf8',
  purple:  '#a78bfa',
  green:   '#34d399',
  amber:   '#fbbf24',
  text:    '#f0f4ff',
  mid:     '#c8d4ee',
  muted:   '#8b95ae',
  dim:     '#4a5878',
  mono:    "'Space Mono', monospace",
  sans:    "'Syne', sans-serif",
};

// ── code lines ────────────────────────────────────────────────────────────────
const CODE_LINES = [
  { text: "import { useState } from 'react'",      color: '#38bdf8', delay: 0    },
  { text: "import { useAuth } from './context'",    color: '#38bdf8', delay: 320  },
  { text: "",                                       color: C.dim,     delay: 480  },
  { text: "// share your best snippet",             color: '#4a5878', delay: 640  },
  { text: "const post = {",                         color: C.mid,     delay: 860  },
  { text: "  tag: 'typescript',",                   color: '#34d399', delay: 1060 },
  { text: "  code: snippet,",                       color: '#34d399', delay: 1220 },
  { text: "  caption: 'solved it 🎉',",             color: '#f472b6', delay: 1380 },
  { text: "}",                                      color: C.mid,     delay: 1540 },
  { text: "",                                       color: C.dim,     delay: 1660 },
  { text: "// get discovered by recruiters",        color: '#4a5878', delay: 1820 },
  { text: "await postService.create(post)",         color: '#818cf8', delay: 2020 },
  { text: "// → liked by 24 devs ✦",               color: '#fbbf24', delay: 2280 },
];

const STATS = [
  { value: '12k+', label: 'snippets shared'  },
  { value: '3.4k', label: 'devs active'      },
  { value: '89%',  label: 'answers accepted' },
];

const PILLS = [
  { icon: '{}', label: 'Code posts',    accent: C.cyan   },
  { icon: '⬡',  label: 'Communities',  accent: C.indigo },
  { icon: '✦',  label: 'Solutions',    accent: C.pink   },
  { icon: '⚙',  label: 'Build public', accent: C.green  },
  { icon: '🏅', label: 'Earn badges',  accent: C.amber  },
  { icon: '✉',  label: 'DM recruiters',accent: C.purple },
];

const FEATURES = [
  { icon: '⌨️', title: 'Code Posts',           desc: 'Share snippets with syntax highlighting, language badges, and tag categories. Explain your approach — not just paste code.' },
  { icon: '🚀', title: 'Project Posts',         desc: 'Showcase projects with tech stack pills, GitHub link, live demo URL, and project type — Frontend, Backend, ML/AI, Mobile.' },
  { icon: '🟢', title: 'Open to Work',          desc: 'Toggle one badge. It appears on every project post automatically — passively signalling availability to every recruiter.' },
  { icon: '👥', title: 'Follow + Communities',  desc: 'Follow developers you respect. Join communities by technology — React, Python, DSA. Realtime follower counts via Supabase subscriptions.', wide: true },
  { icon: '⚡', title: 'Challenges',            desc: 'Weekly coding challenges posted to the platform. Submit solutions as code posts. Recruiters see how you think under pressure.' },
  { icon: '🔍', title: 'Smart Search + Trending',desc: 'Search by username, title, caption, language, or tech stack — all at once. Trending topics surface from live engagement.' },
  { icon: '📄', title: 'One-Tap Recruiter Access',desc: 'Resume, GitHub, and live demo surfaced directly on every project card. A recruiter never has to click into a profile.' },
];

const STACK = [
  { label: 'React + Vite',           color: '#61dafb' },
  { label: 'Tailwind CSS',           color: '#38bdf8' },
  { label: 'Supabase',               color: '#3ECF8E' },
  { label: 'TypeScript',             color: '#5b9dd9' },
  { label: 'GitHub OAuth',           color: '#f97316' },
  { label: 'Realtime Subscriptions', color: '#a78bfa' },
  { label: 'Supabase Storage',       color: '#fb923c' },
  { label: 'PostgreSQL',             color: '#34d399' },
  { label: 'React Router v6',        color: '#f472b6' },
];

// ── hooks ─────────────────────────────────────────────────────────────────────
function useTypedLines(lines) {
  const [visible, setVisible] = useState([]);
  useEffect(() => {
    const timers = lines.map((line, i) =>
      setTimeout(() => setVisible(v => [...v, i]), line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return visible;
}

function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), 530);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 14, marginLeft: 2,
      background: on ? C.cyan : 'transparent',
      verticalAlign: 'middle', borderRadius: 1, transition: 'background .08s',
    }}/>
  );
}

// ── scroll reveal ─────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.tt-reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const siblings = [...e.target.parentElement.querySelectorAll('.tt-reveal')];
        const i = siblings.indexOf(e.target);
        setTimeout(() => e.target.classList.add('tt-vis'), i * 90);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ═════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const [hovBtn,  setHovBtn]  = useState(false);
  const [loading, setLoading] = useState(false);
  const visibleLines = useTypedLines(CODE_LINES);
  useReveal();

  const handleGitHubLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        @keyframes tt-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes tt-scan     { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes tt-pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.7)} }
        @keyframes tt-glow-btn { 0%,100%{box-shadow:0 0 0 0 rgba(244,114,182,0)} 50%{box-shadow:0 0 28px 4px rgba(244,114,182,0.18)} }
        @keyframes tt-line-in  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes tt-fade-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tt-spin     { to{transform:rotate(360deg)} }
        @keyframes tt-float    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-6px)} }

        .tt-code-line { animation: tt-line-in .25s ease both; }
        .tt-fade-up   { animation: tt-fade-up .55s ease both; }
        .tt-float     { animation: tt-float 3.5s ease-in-out infinite; }

        /* scroll reveal */
        .tt-reveal { opacity:0; transform:translateY(28px); transition:opacity .65s ease,transform .65s ease; }
        .tt-reveal.tt-vis { opacity:1; transform:translateY(0); }

        /* feature card hover bar */
        .tt-fcard { position:relative; overflow:hidden; }
        .tt-fcard::after { content:''; position:absolute; inset-x:0; top:0; height:2px; background:linear-gradient(90deg,#f472b6,#a78bfa,#00d4ff); opacity:0; transition:opacity .3s; }
        .tt-fcard:hover::after { opacity:1; }
        .tt-fcard:hover { border-color:rgba(0,212,255,0.2) !important; transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.4); }

        .tt-pcard:hover { border-color:#2d3452 !important; transform:translateX(4px); }
        .tt-stack:hover { border-color:#2d3452 !important; color:#f0f4ff !important; transform:translateY(-2px); }

        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#09090a; }
        ::-webkit-scrollbar-thumb { background:#f472b6; border-radius:2px; }
      `}</style>

      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: C.sans, overflowX: 'hidden' }}>

        {/* ── AMBIENT MESH ─────────────────────────────────────────────────── */}
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'-15%', left:'-8%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.055) 0%,transparent 65%)' }}/>
          <div style={{ position:'absolute', bottom:'-20%', right:'5%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(129,140,248,0.045) 0%,transparent 65%)' }}/>
          <div style={{ position:'absolute', top:'38%', left:'42%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(244,114,182,0.035) 0%,transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(circle,${C.fainter} 1px,transparent 1px)`, backgroundSize:'28px 28px', opacity:.45 }}/>
          <div style={{ position:'absolute', left:0, right:0, height:120, background:'linear-gradient(180deg,transparent,rgba(0,212,255,0.008),transparent)', animation:'tt-scan 10s linear infinite' }}/>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            HERO SECTION — original AuthPage layout, preserved exactly
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          position:'relative', zIndex:1,
          minHeight:'100vh',
          display:'grid', gridTemplateColumns:'1fr 480px',
          padding:'0 120px',
        }}>

          {/* LEFT — brand + terminal */}
          <div style={{
            display:'flex', flexDirection:'column', justifyContent:'center',
            padding:'56px 64px 0 72px',
            borderRight:`1px solid ${C.border}`,
          }}>
            <div className="tt-fade-up" style={{ animationDelay:'0ms', display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ height:1, width:28, background:`linear-gradient(90deg,${C.cyan},transparent)` }}/>
              <span style={{ fontFamily:C.mono, fontSize:9, color:C.cyan, letterSpacing:'0.18em', textTransform:'uppercase' }}>developer social network</span>
            </div>

            <div className="tt-fade-up" style={{ animationDelay:'60ms', marginBottom:6 }}>
              <span style={{ fontFamily:C.sans, fontSize:58, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, display:'block' }}>
                <span style={{ color:C.text }}>Tech</span>
                <span style={{
                  background:'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399,#f472b6)',
                  backgroundSize:'300% auto',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                  animation:'tt-shimmer 5s linear infinite',
                }}>Threads</span>
              </span>
            </div>

            <div className="tt-fade-up" style={{ animationDelay:'120ms', marginBottom:32 }}>
              <p style={{ fontFamily:C.sans, fontSize:16, color:C.muted, lineHeight:1.65, margin:0, maxWidth:440 }}>
                Where developers share code, get real answers,<br/>
                and build in public — together.
              </p>
            </div>

            <div className="tt-fade-up" style={{ animationDelay:'180ms', display:'flex', gap:28, marginBottom:36, paddingBottom:36, borderBottom:`1px solid ${C.border}` }}>
              {STATS.map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily:C.mono, fontSize:22, fontWeight:700, color:C.text, margin:'0 0 2px', letterSpacing:'-0.02em' }}>{s.value}</p>
                  <p style={{ fontFamily:C.mono, fontSize:9, color:C.dim, margin:0, letterSpacing:'0.06em', textTransform:'uppercase' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* terminal */}
            <div className="tt-fade-up tt-float" style={{ animationDelay:'240ms', maxWidth:500 }}>
              <div style={{ background:'#0d0e12', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.03)' }}>
                <div style={{ padding:'10px 14px', background:'#111318', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57', display:'inline-block' }}/>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:'#febc2e', display:'inline-block' }}/>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:'#28c840', display:'inline-block' }}/>
                  <span style={{ flex:1, textAlign:'center', fontFamily:C.mono, fontSize:9, color:C.dim, letterSpacing:'0.08em' }}>techthreads.dev — snippet.ts</span>
                </div>
                <div style={{ padding:'16px 20px', minHeight:200 }}>
                  <div style={{ display:'flex', gap:16 }}>
                    <div style={{ display:'flex', flexDirection:'column', userSelect:'none', flexShrink:0 }}>
                      {CODE_LINES.map((_, i) => (
                        <span key={i} style={{ fontFamily:C.mono, fontSize:12, lineHeight:'1.8em', color:C.fainter, textAlign:'right', minWidth:16 }}>
                          {visibleLines.includes(i) ? i+1 : ''}
                        </span>
                      ))}
                    </div>
                    <div style={{ flex:1 }}>
                      {CODE_LINES.map((line, i) => (
                        <div key={i} style={{ fontFamily:C.mono, fontSize:12, lineHeight:'1.8em', minHeight:'1.8em' }}>
                          {visibleLines.includes(i) && (
                            <span className="tt-code-line" style={{ color:line.color || C.mid }}>{line.text}</span>
                          )}
                          {visibleLines.length > 0 && i === Math.max(...visibleLines) && <Cursor/>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — sign-in card */}
          <div style={{
            display:'flex', flexDirection:'column', justifyContent:'center',
            padding:'40px 44px',
            background:'rgba(17,19,24,0.6)',
            backdropFilter:'blur(12px)',
          }}>
            <div style={{ marginTop:70, background:C.surface, border:`1px solid ${C.borderH}`, borderRadius:20, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.65)' }}>

              <div style={{ height:3, background:'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#34d399,#fbbf24)' }}/>

              <div style={{ padding:'32px 32px 28px' }}>
                {/* live badge */}
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'4px 10px', borderRadius:20, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', marginBottom:16 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, animation:'tt-pulse 2s ease-in-out infinite', display:'inline-block' }}/>
                  <span style={{ fontFamily:C.mono, fontSize:8, color:C.green, letterSpacing:'0.12em', textTransform:'uppercase' }}>devs online now</span>
                </div>

                <h2 style={{ fontFamily:C.sans, fontSize:24, fontWeight:800, color:C.text, margin:'0 0 6px', lineHeight:1.15 }}>Join the thread.</h2>
                <p style={{ fontFamily:C.sans, fontSize:13, color:C.muted, margin:'0 0 24px', lineHeight:1.6 }}>
                  One click with GitHub — your identity, your repos, your dev cred.
                </p>

                {/* GitHub CTA */}
                <button
                  onClick={handleGitHubLogin}
                  disabled={loading}
                  onMouseEnter={() => setHovBtn(true)}
                  onMouseLeave={() => setHovBtn(false)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    padding:'14px 20px', borderRadius:12,
                    border:`1px solid ${hovBtn ? 'rgba(244,114,182,0.5)' : 'rgba(244,114,182,0.2)'}`,
                    background: hovBtn
                      ? 'linear-gradient(135deg,rgba(244,114,182,0.18),rgba(167,139,250,0.12))'
                      : 'linear-gradient(135deg,rgba(244,114,182,0.09),rgba(167,139,250,0.06))',
                    color:C.text, cursor:loading?'wait':'pointer',
                    fontFamily:C.sans, fontSize:14, fontWeight:700, letterSpacing:'0.01em',
                    transition:'all .2s ease',
                    transform:hovBtn?'translateY(-2px)':'none',
                    boxShadow:hovBtn?'0 8px 24px rgba(244,114,182,0.2)':'none',
                    animation:!hovBtn&&!loading?'tt-glow-btn 3s ease-in-out infinite':'none',
                    marginBottom:20,
                  }}
                >
                  {loading
                    ? <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.15)', borderTopColor:C.text, animation:'tt-spin .7s linear infinite', display:'inline-block' }}/>
                    : <FaGithub size={18}/>
                  }
                  <span>{loading ? 'Redirecting to GitHub…' : 'Continue with GitHub'}</span>
                </button>

                {/* feature pills */}
                <div style={{ marginBottom:24 }}>
                  <p style={{ fontFamily:C.mono, fontSize:8, color:C.dim, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 12px' }}>// what's inside</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {PILLS.map(p => (
                      <div key={p.label} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:20, background:`${p.accent}0e`, border:`1px solid ${p.accent}28` }}>
                        <span style={{ fontSize:11 }}>{p.icon}</span>
                        <span style={{ fontFamily:C.mono, fontSize:9, color:p.accent, fontWeight:700, letterSpacing:'0.04em' }}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${C.border})` }}/>
                  <span style={{ fontFamily:C.mono, fontSize:8, color:C.fainter, letterSpacing:'0.1em' }}>NO PASSWORD. NO FORM.</span>
                  <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${C.border},transparent)` }}/>
                </div>

                <p style={{ fontFamily:C.mono, fontSize:9, color:C.dim, textAlign:'center', margin:0, lineHeight:1.9 }}>
                  We never post to GitHub on your behalf.<br/>
                  <span style={{ color:C.fainter }}>By continuing you agree to our Terms &amp; Privacy Policy.</span>
                </p>
              </div>
            </div>

            <p style={{ fontFamily:C.mono, fontSize:9, color:C.fainter, textAlign:'center', marginTop:22, letterSpacing:'0.08em' }}>
              © TechThreads · built for devs, by devs
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PROBLEM SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'120px 48px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'center' }}>
          <div className="tt-reveal">
            {/* eyebrow */}
            <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:C.mono, fontSize:9, color:C.cyan, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18 }}>
              <div style={{ height:1, width:20, background:C.cyan }}/>the problem
            </div>
            <h2 style={{ fontFamily:C.sans, fontWeight:800, fontSize:'clamp(30px,4vw,52px)', letterSpacing:'-0.04em', lineHeight:1.05, color:C.text, marginBottom:18 }}>
              Developers are <span style={{ color:C.pink }}>invisible.</span>
            </h2>
            <p style={{ fontFamily:C.mono, fontSize:12, color:C.muted, lineHeight:1.9 }}>
              GitHub is a file system. LinkedIn is a resume board. Neither shows what a developer actually thinks, builds, or values. Recruiters can't find talent. Developers can't be found.
            </p>
          </div>
          <div className="tt-reveal" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { bad: true,  lbl:'// before TechThreads', txt:'A developer pushes a great project to GitHub. Nobody sees it. They write about it on LinkedIn. It gets buried. They apply to 200 jobs. Recruiters still don\'t know what they can actually build.' },
              { bad: false, lbl:'// after TechThreads',  txt:'They post on TechThreads. Tech stack, GitHub link, live demo, and resume — all on one card. A recruiter finds them while scrolling, same as you\'d find a product on Instagram.' },
            ].map(c => (
              <div key={c.lbl} className="tt-pcard" style={{ padding:'20px 24px', borderRadius:12, border:`1px solid ${C.border}`, background:C.surface, position:'relative', overflow:'hidden', transition:'all .3s', cursor:'default' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:c.bad?'#ef4444':C.green }}/>
                <p style={{ fontFamily:C.mono, fontSize:9, textTransform:'uppercase', letterSpacing:'0.12em', color:c.bad?'#ef4444':C.green, marginBottom:7 }}>{c.lbl}</p>
                <p style={{ fontFamily:C.mono, fontSize:11, color:C.muted, lineHeight:1.8, margin:0 }}>{c.txt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════════════════════════════ */}
        <div id="features" style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'0 48px 120px' }}>
          <div className="tt-reveal" style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:C.mono, fontSize:9, color:C.cyan, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18 }}>
              <div style={{ height:1, width:20, background:C.cyan }}/>platform features
            </div>
            <h2 style={{ fontFamily:C.sans, fontWeight:800, fontSize:'clamp(30px,4vw,52px)', letterSpacing:'-0.04em', color:C.text, marginBottom:16 }}>
              Everything a developer <span style={{ color:C.cyan }}>needs.</span>
            </h2>
            <p style={{ fontFamily:C.mono, fontSize:12, color:C.muted, lineHeight:1.9, maxWidth:500, margin:'0 auto' }}>
              Built ground-up for code-native content. Not a generic social feed with a developer theme — a developer platform with social built in.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="tt-fcard tt-reveal"
                style={{
                  gridColumn: f.wide ? 'span 2' : 'span 1',
                  padding:26, borderRadius:14,
                  border:`1px solid ${C.border}`, background:C.surface,
                  transition:'all .3s', cursor:'default',
                }}>
                <div style={{ width:40, height:40, borderRadius:9, background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:18 }}>{f.icon}</div>
                <p style={{ fontFamily:C.sans, fontWeight:700, fontSize:16, color:C.text, letterSpacing:'-0.02em', marginBottom:9 }}>{f.title}</p>
                <p style={{ fontFamily:C.mono, fontSize:11, color:C.muted, lineHeight:1.8, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DUAL POV
        ══════════════════════════════════════════════════════════════════ */}
        <div id="pov" style={{ position:'relative', zIndex:1, background:'#0d0e12', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'120px 48px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div className="tt-reveal" style={{ textAlign:'center', marginBottom:60 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:C.mono, fontSize:9, color:C.cyan, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18 }}>
                <div style={{ height:1, width:20, background:C.cyan }}/>who it's for
              </div>
              <h2 style={{ fontFamily:C.sans, fontWeight:800, fontSize:'clamp(30px,4vw,52px)', letterSpacing:'-0.04em', color:C.text }}>
                Two users. <span style={{ color:C.green }}>One platform.</span>
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {[
                {
                  cls:'dev', accent:C.pink, label:'Developer POV',
                  title:'Stop being invisible.\nStart being found.',
                  steps:[
                    ['01','Sign in with GitHub OAuth — your identity is already verified'],
                    ['02','Post a code snippet explaining your approach to a problem'],
                    ['03','Showcase a project with stack, GitHub link, and live demo'],
                    ['04','Toggle Open to Work — it appears on every post automatically'],
                  ],
                },
                {
                  cls:'rec', accent:C.green, label:'Recruiter POV',
                  title:'Find real talent.\nNot just polished resumes.',
                  steps:[
                    ['01','Browse the feed — filter by All, Code Posts, or Projects'],
                    ['02','Search by technology, username, or keyword instantly'],
                    ['03','See GitHub, Live Demo, and Resume right on the project card'],
                    ['04','Spot the Open to Work badge — available candidates, zero guesswork'],
                  ],
                },
              ].map(pov => (
                <div key={pov.cls} className="tt-reveal" style={{ padding:34, borderRadius:18, border:`1px solid ${C.border}`, background:C.bg, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:.04, background:`radial-gradient(circle at ${pov.cls==='dev'?'20% 20%':'80% 20%'}, ${pov.accent}, transparent 60%)` }}/>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:C.mono, fontSize:9, textTransform:'uppercase', letterSpacing:'0.15em', color:pov.accent, marginBottom:22 }}>
                    <div style={{ width:18, height:1, background:pov.accent }}/>{pov.label}
                  </div>
                  <h3 style={{ fontFamily:C.sans, fontWeight:800, fontSize:22, color:C.text, letterSpacing:'-0.03em', marginBottom:20, lineHeight:1.2, whiteSpace:'pre-line' }}>{pov.title}</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {pov.steps.map(([num, txt]) => (
                      <div key={num} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 14px', borderRadius:9, background:C.surface, border:`1px solid ${C.border}` }}>
                        <span style={{ fontFamily:C.mono, fontSize:9, color:C.dim, flexShrink:0, marginTop:1 }}>{num}</span>
                        <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, lineHeight:1.65 }}>{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TECH STACK
        ══════════════════════════════════════════════════════════════════ */}
        <div id="stack" style={{ position:'relative', zIndex:1, maxWidth:1000, margin:'0 auto', padding:'120px 48px', textAlign:'center' }}>
          <div className="tt-reveal" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:C.mono, fontSize:9, color:C.cyan, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18 }}>
            <div style={{ height:1, width:20, background:C.cyan }}/>built with
          </div>
          <h2 className="tt-reveal" style={{ fontFamily:C.sans, fontWeight:800, fontSize:'clamp(30px,4vw,52px)', letterSpacing:'-0.04em', color:C.text, marginBottom:0 }}>
            Production-grade <span style={{ color:C.cyan }}>stack.</span>
          </h2>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10, marginTop:44 }}>
            {STACK.map(s => (
              <div key={s.label} className="tt-stack tt-reveal"
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, fontFamily:C.mono, fontSize:11, color:C.muted, transition:'all .25s', cursor:'default' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM CTA — scroll back up to login
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:'80px 48px 100px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, background:'radial-gradient(ellipse,rgba(244,114,182,0.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <div className="tt-reveal" style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:20, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', fontFamily:C.mono, fontSize:8, color:C.green, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:24 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, animation:'tt-pulse 2s ease-in-out infinite', display:'inline-block' }}/>
            devs online now
          </div>
          <h2 className="tt-reveal" style={{ fontFamily:C.sans, fontWeight:800, fontSize:'clamp(36px,5vw,68px)', letterSpacing:'-0.04em', lineHeight:1, marginBottom:22, position:'relative', zIndex:1 }}>
            Thread the{' '}
            <span style={{ background:'linear-gradient(90deg,#f472b6,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Tech.</span>
          </h2>
          <p className="tt-reveal" style={{ fontFamily:C.mono, fontSize:12, color:C.muted, marginBottom:36, maxWidth:400, margin:'0 auto 36px', lineHeight:1.9, position:'relative', zIndex:1 }}>
            Your code deserves to be seen. Join TechThreads and let your work speak for you.
          </p>
          <button
            className="tt-reveal"
            onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}
            style={{
              display:'inline-flex', alignItems:'center', gap:10,
              padding:'13px 28px', borderRadius:10, cursor:'pointer',
              background:'linear-gradient(135deg,rgba(244,114,182,0.15),rgba(167,139,250,0.1))',
              border:'1px solid rgba(244,114,182,0.35)',
              color:C.pink, fontFamily:C.mono, fontSize:12, fontWeight:700,
              letterSpacing:'0.06em', textTransform:'uppercase',
              transition:'all .25s', position:'relative', zIndex:1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background='linear-gradient(135deg,rgba(244,114,182,0.25),rgba(167,139,250,0.18))'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(244,114,182,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='linear-gradient(135deg,rgba(244,114,182,0.15),rgba(167,139,250,0.1))'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
          >
            <FaGithub size={16}/> Continue with GitHub
          </button>
        </div>

        {/* FOOTER */}
        <div style={{ position:'relative', zIndex:1, borderTop:`1px solid ${C.border}`, padding:'28px 56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:C.sans, fontWeight:800, fontSize:15, letterSpacing:'-0.04em' }}>
            <span style={{ color:C.text }}>Tech</span><span style={{ color:C.pink }}>Threads</span>
          </span>
          <span style={{ fontFamily:C.mono, fontSize:9, color:C.dim, letterSpacing:'0.06em' }}>© 2025 TechThreads · built for devs, by devs</span>
          <span style={{ fontFamily:C.mono, fontSize:9, color:C.fainter, letterSpacing:'0.1em', textTransform:'uppercase' }}>Thread the Tech</span>
        </div>

      </div>
    </>
  );
}

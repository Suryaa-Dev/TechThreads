// ProblemPanel.jsx — left column: problem statement, examples, countdown timer
// src/features/challenges/components/codewars/ProblemPanel.jsx
//
// HEIGHT STRATEGY (mirrors Arena's approach):
//   This component is rendered inside a wrapper that is overflow:hidden + flex column.
//   ProblemPanel itself must be display:flex + flexDirection:column + height:100%
//   so it fills the wrapper exactly.
//   Inside:
//     - Header (title, tags, timer) → flexShrink:0
//     - Tab bar                     → flexShrink:0
//     - Scrollable content area     → flex:1 + minHeight:0 + overflowY:auto
//     - Bottom guide block          → flexShrink:0 (always visible)

import { useState, useEffect } from 'react'

const KF = `
  @keyframes ppIn    { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ppBlink { 0%,100%{opacity:1} 50%{opacity:0} }
`

function InlineCode({ children }) {
  return (
    <code style={{
      fontFamily:'var(--mono)', fontSize:11,
      background:'var(--bg4)', color:'var(--cyan)',
      padding:'1px 5px', borderRadius:4,
      border:'1px solid var(--border)',
    }}>{children}</code>
  )
}

function Description({ text }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <p style={{ fontSize:13, lineHeight:1.75, color:'var(--muted)', margin:'0 0 16px' }}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`')
          ? <InlineCode key={i}>{p.slice(1,-1)}</InlineCode>
          : p
      )}
    </p>
  )
}

function Timer({ startedAt, limitMs }) {
  const [remaining, setRemaining] = useState(limitMs)
  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - new Date(startedAt).getTime()
      setRemaining(Math.max(0, limitMs - elapsed))
    }, 1000)
    return () => clearInterval(iv)
  }, [startedAt, limitMs])

  const mins     = Math.floor(remaining / 60000)
  const secs     = Math.floor((remaining % 60000) / 1000)
  const pct      = (remaining / limitMs) * 100
  const urgent   = remaining < 120000
  const critical = remaining < 30000

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8,
      background: urgent ? 'rgba(255,76,106,0.06)' : 'var(--bg3)',
      border:`1px solid ${urgent ? 'rgba(255,76,106,0.2)' : 'var(--border)'}`,
      transition:'background 0.4s, border-color 0.4s',
    }}>
      <svg width={32} height={32} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        <circle cx={16} cy={16} r={13} fill="none" stroke="var(--bg4)" strokeWidth={2.5}/>
        <circle cx={16} cy={16} r={13} fill="none"
          stroke={critical ? 'var(--red)' : urgent ? 'var(--amber)' : 'var(--cyan)'}
          strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={81.7} strokeDashoffset={81.7 - (81.7 * pct / 100)}
          style={{ transition:'stroke-dashoffset 1s linear, stroke 0.4s' }}/>
      </svg>
      <div>
        <div style={{
          fontFamily:'var(--mono)', fontSize:16, fontWeight:800, lineHeight:1,
          color: critical ? 'var(--red)' : urgent ? 'var(--amber)' : 'var(--text)',
          letterSpacing:'-0.02em',
          animation: critical ? 'ppBlink 0.8s step-end infinite' : 'none',
        }}>
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </div>
        <div style={{ fontSize:8, fontFamily:'var(--mono)', color:'var(--muted)',
          letterSpacing:'0.08em', marginTop:2 }}>
          {critical ? 'HURRY!' : urgent ? 'TIME LOW' : 'REMAINING'}
        </div>
      </div>
    </div>
  )
}

function Example({ ex, index }) {
  return (
    <div style={{
      marginBottom:10, borderRadius:8, overflow:'hidden',
      border:'1px solid var(--border)',
      animation:`ppIn 0.3s ease ${index * 60}ms both`,
    }}>
      <div style={{ padding:'5px 12px', background:'var(--bg3)',
        borderBottom:'1px solid var(--border)',
        fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)', letterSpacing:'0.1em' }}>
        EXAMPLE {index + 1}
      </div>
      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)',
            minWidth:44, letterSpacing:'0.06em', paddingTop:2 }}>INPUT</span>
          <code style={{ fontFamily:'var(--mono)', fontSize:12,
            color:'var(--text)', lineHeight:1.5 }}>{ex.input}</code>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)',
            minWidth:44, letterSpacing:'0.06em', paddingTop:2 }}>OUTPUT</span>
          <code style={{ fontFamily:'var(--mono)', fontSize:12,
            color:'var(--green)', lineHeight:1.5 }}>{ex.output}</code>
        </div>
        {ex.explanation && (
          <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)',
            lineHeight:1.55, borderTop:'1px solid var(--border)', paddingTop:7, marginTop:2 }}>
            // {ex.explanation}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProblemPanel({ problem, match }) {
  const [tab, setTab] = useState('problem')

  if (!problem) {
    return (
      <div style={{ height:'100%', display:'flex', alignItems:'center',
        justifyContent:'center', background:'var(--bg2)',
        fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>
        loading problem...
      </div>
    )
  }

  const examples = Array.isArray(problem.examples) ? problem.examples : []

  return (
    // height:100% fills the wrapper column div in Arena.
    // This flex column then distributes space among its children.
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
    }}>
      <style>{KF}</style>

      {/* Header — flexShrink:0, never compresses */}
      <div style={{ flexShrink:0, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
          <span style={{
            fontSize:9, fontWeight:700, fontFamily:'var(--mono)',
            padding:'2px 8px', borderRadius:20, letterSpacing:'0.06em',
            background: problem.difficulty >= 1400 ? 'rgba(255,76,106,0.1)'
              : problem.difficulty >= 1200 ? 'rgba(245,166,35,0.1)' : 'rgba(0,230,118,0.1)',
            color: problem.difficulty >= 1400 ? 'var(--red)'
              : problem.difficulty >= 1200 ? 'var(--amber)' : 'var(--green)',
          }}>
            {problem.difficulty >= 1400 ? 'HARD' : problem.difficulty >= 1200 ? 'MEDIUM' : 'EASY'}
          </span>
          {problem.tags?.slice(0,2).map(t => (
            <span key={t} style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)',
              padding:'2px 7px', borderRadius:5, border:'1px solid var(--border)',
              background:'var(--bg3)' }}>{t}</span>
          ))}
        </div>
        <h3 style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.01em',
          marginBottom:10, lineHeight:1.2 }}>{problem.title}</h3>
        {match?.started_at && (
          <Timer startedAt={match.started_at} limitMs={problem.time_limit_ms ?? 900000} />
        )}
      </div>

      {/* Tab bar — flexShrink:0 */}
      <div style={{ flexShrink:0, display:'flex', borderBottom:'1px solid var(--border)' }}>
        {['problem','examples'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', fontSize:10, fontFamily:'var(--mono)',
            fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
            background:'none', border:'none', cursor:'pointer',
            borderBottom:`2px solid ${tab===t ? 'var(--cyan)' : 'transparent'}`,
            color: tab===t ? 'var(--cyan)' : 'var(--muted)',
            transition:'color 0.15s, border-color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Scrollable content — flex:1 + minHeight:0 absorbs all remaining space */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'16px 16px 8px' }}>
        {tab === 'problem' && (
          <div style={{ animation:'ppIn 0.25s ease' }}>
            <Description text={problem.description} />
            {/* Show first example inline as a quick preview */}
            {examples.length > 0 && (
              <Example ex={examples[0]} index={0} />
            )}
          </div>
        )}
        {tab === 'examples' && (
          <div style={{ animation:'ppIn 0.25s ease' }}>
            {examples.length === 0
              ? <div style={{ color:'var(--muted)', fontFamily:'var(--mono)', fontSize:12,
                  textAlign:'center', paddingTop:24 }}>// no examples available</div>
              : examples.map((ex, i) => <Example key={i} ex={ex} index={i} />)
            }
          </div>
        )}
      </div>

      {/* Bottom strip — flexShrink:0, always visible, sticks to bottom */}
      <div style={{ flexShrink:0, padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
        {/* "View Examples" redirect button — only on problem tab */}
        {tab === 'problem' && examples.length > 0 && (
          <button onClick={() => setTab('examples')} style={{
            display:'flex', alignItems:'center', gap:6,
            width:'100%', padding:'7px 13px', marginBottom:8,
            borderRadius:8,
            border:'1px solid rgba(0,212,255,0.22)',
            background:'rgba(0,212,255,0.05)',
            color:'var(--cyan)', fontFamily:'var(--mono)',
            fontSize:10, fontWeight:700, letterSpacing:'0.06em',
            cursor:'pointer', transition:'background 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,212,255,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(0,212,255,0.05)'}>
            View all {examples.length} examples →
          </button>
        )}
        {/* Guide — always visible */}
        <div style={{
          padding:'8px 12px', borderRadius:8,
          background:'rgba(0,212,255,0.04)', border:'1px solid rgba(0,212,255,0.12)',
          fontSize:10, fontFamily:'var(--mono)', color:'var(--muted)', lineHeight:1.6,
        }}>
          // {problem.languages?.join(' · ')} supported<br/>
          // RUN TESTS → public tests only (no win)<br/>
          // SUBMIT → all tests including hidden
        </div>
      </div>
    </div>
  )
}
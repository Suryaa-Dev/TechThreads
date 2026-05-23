// Arena.jsx — Code Wars duel screen
// src/features/challenges/components/codewars/Arena.jsx
//
// Layout: ProblemPanel (25%) | Editor (50%) | CI Output + Opponent strip (25%)
// Props: { match, player, opponent, onMatchEnd }
//
// HEIGHT STRATEGY:
//   The root div uses height:100vh so it always fills the viewport regardless
//   of whether the parent passes a height down. Every column is a flex column
//   that fills that space. Within each column, fixed-height pieces use
//   flexShrink:0 and the single growing piece uses flex:1 + minHeight:0 so
//   overflow is contained and nothing bleeds out to cause blank space.

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../services/supabaseClient'
import { useAuth } from '../../../../context/AuthContext'
import { runPublicTests, submitSolution, getProblem } from '../../../../services/localExecutionService'
import ProblemPanel from './ProblemPanel'
import OpponentBar  from './OpponentBar'

const KF = `
  @keyframes arIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes arSpin   { to{transform:rotate(360deg)} }
  @keyframes arTest   { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
  @keyframes arMerge  { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
  @keyframes arPrBar  { from{width:0} to{width:100%} }
  @keyframes arBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes arPuls   { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 14px rgba(0,212,255,0.28)} }
`

const LANGS = {
  javascript: { label:'JavaScript', ext:'js',  color:'#f5a623', comment:'//' },
  typescript: { label:'TypeScript', ext:'ts',  color:'#9c6fff', comment:'//' },
  python:     { label:'Python',     ext:'py',  color:'#00d4ff', comment:'#'  },
}

function CopyBtn({ code }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(()=>setDone(false),1400) } catch {}
  }
  return (
    <button onClick={copy} style={{
      padding:'3px 9px', borderRadius:5, fontSize:9, fontFamily:'var(--mono)',
      fontWeight:700, cursor:'pointer', transition:'all 0.15s',
      border:`1px solid ${done?'rgba(0,230,118,0.4)':'var(--border2)'}`,
      background:done?'rgba(0,230,118,0.06)':'transparent',
      color:done?'var(--green)':'var(--muted)',
    }}>{done ? '✓ COPIED' : '⎘ COPY'}</button>
  )
}

function ResetBtn({ onReset }) {
  const [armed, setArmed] = useState(false)
  const t = useRef(null)
  const click = () => {
    if (!armed) { setArmed(true); t.current=setTimeout(()=>setArmed(false),2000) }
    else { clearTimeout(t.current); setArmed(false); onReset() }
  }
  useEffect(()=>()=>clearTimeout(t.current),[])
  return (
    <button onClick={click} style={{
      padding:'3px 9px', borderRadius:5, fontSize:9, fontFamily:'var(--mono)',
      fontWeight:700, cursor:'pointer', transition:'all 0.18s',
      border:`1px solid ${armed?'rgba(255,76,106,0.5)':'var(--border2)'}`,
      background:armed?'rgba(255,76,106,0.08)':'transparent',
      color:armed?'var(--red)':'var(--muted)',
    }}
      onMouseEnter={e=>{ if(!armed) e.currentTarget.style.color='var(--text)' }}
      onMouseLeave={e=>{ if(!armed) e.currentTarget.style.color='var(--muted)' }}>
      {armed ? '⚠ CONFIRM?' : '↺ RESET'}
    </button>
  )
}

function TestRow({ test, delay }) {
  const [show, setShow] = useState(false)
  useEffect(()=>{ const t=setTimeout(()=>setShow(true),delay); return()=>clearTimeout(t) },[delay])
  if (!show) return null
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:9, padding:'7px 12px',
      borderBottom:'1px solid var(--border)', animation:'arTest 0.16s ease both',
      background:test.pass?'rgba(0,230,118,0.03)':'rgba(255,76,106,0.03)',
    }}>
      <div style={{
        width:16, height:16, borderRadius:4, flexShrink:0, marginTop:1,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9, fontWeight:700,
        background:test.pass?'rgba(0,230,118,0.12)':'rgba(255,76,106,0.12)',
        color:test.pass?'var(--green)':'var(--red)',
        border:`1px solid ${test.pass?'rgba(0,230,118,0.25)':'rgba(255,76,106,0.25)'}`,
      }}>{test.pass?'✓':'✕'}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontSize:11, fontFamily:'var(--mono)',
          color:test.pass?'var(--text)':'var(--muted)' }}>
          {test.hidden && <span style={{ opacity:0.4 }}>◈ </span>}
          {test.name}
        </span>
        {!test.pass && test.expected && (
          <div style={{ marginTop:3, fontSize:10, fontFamily:'var(--mono)',
            color:'var(--border2)', lineHeight:1.5 }}>
            <span style={{ color:'var(--green)' }}>expected</span> {test.expected}{'  '}
            <span style={{ color:'var(--red)' }}>got</span> {test.got}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Arena({ match, player, opponent, onMatchEnd }) {
  const { user } = useAuth()
  const [problem,   setProblem]  = useState(null)
  const [lang,      setLang]     = useState(player?.language ?? 'javascript')
  const [code,      setCode]     = useState('')
  const [lineCount, setLineCt]   = useState(1)
  const [running,   setRunning]  = useState(false)
  const [results,   setResults]  = useState(null)
  const [execMs,    setExecMs]   = useState(null)
  const [attempts,  setAttempts] = useState(0)
  const [passed,    setPassed]   = useState(false)
  const [showWin,   setShowWin]  = useState(false)
  const [error,     setError]    = useState(null)
  const outRef = useRef(null)

  const passedRef  = useRef(false)
  const problemRef = useRef(null)
  const pollRef    = useRef(null)
  useEffect(() => { passedRef.current  = passed  }, [passed])
  useEffect(() => { problemRef.current = problem }, [problem])

  // Poll for opponent win every 2 s
  useEffect(() => {
    if (!match?.id) return
    pollRef.current = setInterval(async () => {
      if (passedRef.current) return
      try {
        const { data: m } = await supabase
          .from('cw_matches')
          .select('id, status, winner, local_problem_slug')
          .eq('id', match.id)
          .single()
        if (m?.status === 'complete' && m.winner && m.winner !== user?.id && !passedRef.current) {
          clearInterval(pollRef.current)
          onMatchEnd({
            outcome: 'loss',
            match:   { ...m, local_problem_slug: m.local_problem_slug ?? match.local_problem_slug },
            problem: problemRef.current,
          })
        }
      } catch (_) {}
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [match?.id])

  // Load problem
  useEffect(() => {
    const problemKey = match?.local_problem_slug ?? match?.problem_id
    if (!problemKey) return
    getProblem(problemKey).then(p => {
      if (!p) return
      setProblem(p)
      setCode(p.starter?.[lang] ?? p.starter?.javascript ?? '')
    }).catch(console.error)
  }, [match?.local_problem_slug, match?.problem_id])

  useEffect(() => { setLineCt(code.split('\n').length) }, [code])

  const onKey = useCallback((e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el=e.target, s=el.selectionStart, end=el.selectionEnd
    setCode(c => c.substring(0,s)+'    '+c.substring(end))
    requestAnimationFrame(()=>{ el.selectionStart=s+4; el.selectionEnd=s+4 })
  }, [])

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==='Enter') { e.preventDefault(); if(!running&&!passed) handleSubmit() }
      else if ((e.ctrlKey||e.metaKey) && e.key==='Enter')          { e.preventDefault(); if(!running&&!passed) handleRun() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [running, passed, code, lang])

  const switchLang = (l) => {
    if (l === lang) return
    setLang(l)
    setCode(problem?.starter?.[l] ?? '')
    setResults(null); setExecMs(null); setError(null)
  }

  const handleRun = async () => {
    if (running||passed||!problem) return
    setRunning(true); setResults(null); setExecMs(null); setError(null); setAttempts(a=>a+1)
    try {
      const r = await runPublicTests({ code, language:lang, problemId:problem.id })
      setResults(r); setExecMs(r.execMs)
      if (r.error) setError(r.error)
    } catch(err) { setError(err.message) }
    finally { setRunning(false) }
  }

  const handleSubmit = async () => {
    if (running||passed||!problem) return
    setRunning(true); setResults(null); setExecMs(null); setError(null); setAttempts(a=>a+1)
    try {
      const r = await submitSolution({ code, language:lang, problemId:problem.id, matchId:match.id })
      setResults(r); setExecMs(r.execMs)
      if (r.error) setError(r.error)
      if (r.pass) {
        passedRef.current = true
        clearInterval(pollRef.current)
        setPassed(true)
        await supabase.from('cw_matches').update({
          status:'complete', winner:user.id, finished_at:new Date().toISOString(),
        }).eq('id', match.id)
        setTimeout(() => setShowWin(true), (r.tests?.length ?? 4) * 110 + 600)
      }
    } catch(err) { setError(err.message) }
    finally { setRunning(false) }
  }

  const lm    = LANGS[lang] ?? LANGS.javascript
  const tests = results?.tests ?? []

  // ─────────────────────────────────────────────────────────────────────────
  // ROOT: height:100vh anchors the whole layout to the viewport.
  // overflow:hidden on root + each column ensures nothing leaks out.
  // Each column is display:flex + flexDirection:column.
  // Inside each column:
  //   - Headers/toolbars/footers → flexShrink:0  (never shrink)
  //   - The single growing region → flex:1 + minHeight:0  (absorbs all free space,
  //     minHeight:0 overrides the flex item's implicit min-height:auto which
  //     would otherwise let content push past the container)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      // 100vh guarantees the layout fills the full viewport height regardless
      // of what the parent element's height is set to.
      height: '92vh',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{KF}</style>

      {/* ── LEFT — problem panel (25%) ──────────────────────────────────────
          ProblemPanel itself is a flex column; it receives height:100% from
          its wrapper which has overflow:hidden so it can't grow past the column.
      */}
      <div style={{
        width: '25%',
        flexShrink: 0,
        overflow: 'hidden',   // clips ProblemPanel if it tries to grow
        display: 'flex',
        flexDirection: 'column',
      }}>
        <ProblemPanel problem={problem} match={match} />
      </div>

      {/* ── CENTRE — editor column (50%) ────────────────────────────────────
          Three rows:
            1. Toolbar          → flexShrink:0, fixed 36 px
            2. Editor textarea  → flex:1 + minHeight:0, absorbs all free space
            3. Action bar       → flexShrink:0, content height
      */}
      <div style={{
        width: '50%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
      }}>

        {/* 1. Toolbar */}
        <div style={{
          flexShrink: 0,
          height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {['#ff4c6a','#f5a623','#00e676'].map((c,i)=>(
              <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:c, opacity:0.45 }}/>
            ))}
            <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)', marginLeft:4 }}>
              solution.{lm.ext} · {lineCount} lines
            </span>
          </div>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            {(problem?.languages ?? ['javascript','python']).filter(l => LANGS[l]).map(l=>(
              <button key={l} onClick={()=>switchLang(l)} style={{
                padding:'3px 9px', borderRadius:5, fontSize:9,
                fontFamily:'var(--mono)', fontWeight:700,
                border:`1px solid ${l===lang?`${LANGS[l].color}50`:'transparent'}`,
                background:l===lang?`${LANGS[l].color}12`:'transparent',
                color:l===lang?LANGS[l].color:'var(--muted)',
                cursor:'pointer', transition:'all 0.15s',
              }}>.{LANGS[l].ext}</button>
            ))}
            <div style={{ width:1, height:16, background:'var(--border)', margin:'0 2px' }}/>
            <CopyBtn code={code} />
            <ResetBtn onReset={()=>{
              setCode(problem?.starter?.[lang]??'')
              setResults(null); setExecMs(null); setError(null)
            }} />
          </div>
        </div>

        {/* 2. Editor — flex:1 + minHeight:0 fills everything between toolbar and action bar */}
        <div style={{ flex:1, minHeight:0, padding:'8px' }}>
          <textarea
            value={code}
            onChange={e=>{ if(!passed) setCode(e.target.value) }}
            onKeyDown={onKey}
            readOnly={passed}
            spellCheck={false} autoCapitalize="none" autoCorrect="off"
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              resize: 'none',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: '#cdd6f4',
              lineHeight: 1.85,
              outline: 'none',
              animation: 'arIn 0.3s ease',
              transition: 'border-color 0.2s',
            }}
            onFocus={e=>{ if(!passed) e.currentTarget.style.borderColor='rgba(0,212,255,0.3)' }}
            onBlur={e=>e.currentTarget.style.borderColor='var(--border)'}
          />
        </div>

        {/* 3. Action bar — always pinned to the bottom of the centre column */}
        <div style={{
          flexShrink: 0,
          display: 'flex', gap: 8,
          padding: '8px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}>
          <button onClick={handleRun} disabled={running||passed||!problem}
            style={{
              flex:1, padding:'9px', borderRadius:8,
              fontFamily:'var(--mono)', fontWeight:700, fontSize:10, letterSpacing:'0.08em',
              cursor:running||passed?'not-allowed':'pointer',
              border:'1px solid var(--border2)', background:'transparent',
              color:'var(--muted)', transition:'color 0.15s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
            onMouseEnter={e=>{ if(!running&&!passed) e.currentTarget.style.color='var(--text)' }}
            onMouseLeave={e=>{ if(!running&&!passed) e.currentTarget.style.color='var(--muted)' }}>
            {running&&!results
              ? <><span style={{ animation:'arSpin 0.8s linear infinite', display:'inline-block' }}>◌</span>RUNNING...</>
              : <>▷ RUN TESTS <span style={{ fontSize:8, opacity:0.5 }}>⌘↵</span></>
            }
          </button>
          <button onClick={handleSubmit} disabled={running||passed||!problem}
            style={{
              flex:2, padding:'9px', borderRadius:8,
              fontFamily:'var(--mono)', fontWeight:700, fontSize:10, letterSpacing:'0.08em',
              cursor:running||passed?'not-allowed':'pointer',
              border:'none',
              background:passed?'rgba(0,230,118,0.08)':running?'var(--bg3)':'var(--cyan)',
              color:passed?'var(--green)':running?'var(--muted)':'#000',
              animation:!passed&&!running?'arPuls 2.5s ease-in-out infinite':'none',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              transition:'all 0.2s',
            }}>
            {running&&results
              ? <><span style={{ animation:'arSpin 0.8s linear infinite', display:'inline-block' }}>◌</span>JUDGING...</>
              : passed ? '✓ SUBMITTED'
              : <>⚡ SUBMIT <span style={{ fontSize:8, opacity:0.6 }}>⌘⇧↵</span></>
            }
          </button>
        </div>
      </div>

      {/* ── RIGHT — CI output + opponent strip (25%) ────────────────────────
          Three rows:
            1. CI header        → flexShrink:0
            2. CI body          → flex:1 + minHeight:0, scrolls internally
            3. Opponent strip   → flexShrink:0, always visible at bottom
      */}
      <div style={{
        width: '25%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* 1. CI header */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px',
          borderBottom: '1px solid var(--border)',
          background: passed
            ? 'rgba(0,230,118,0.04)'
            : results&&!results.pass
              ? 'rgba(255,76,106,0.04)'
              : 'var(--bg2)',
          transition: 'background 0.3s',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{
              fontSize:9, fontFamily:'var(--mono)', letterSpacing:'0.12em',
              color:passed?'var(--green)':results&&!results.pass?'var(--red)':'var(--muted)',
              transition:'color 0.3s',
            }}>// CI OUTPUT</span>
            {!results&&!running && (
              <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--border2)',
                animation:'arBlink 1.1s step-end infinite' }}>▋</span>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {attempts>0 && (
              <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)' }}>
                attempt {attempts}
              </span>
            )}
            {execMs!==null && (
              <span style={{ fontSize:8, fontFamily:'var(--mono)', color:'var(--muted)',
                padding:'1px 6px', borderRadius:4, background:'var(--bg3)',
                border:'1px solid var(--border)' }}>
                {execMs}ms
              </span>
            )}
          </div>
        </div>

        {/* 2. CI body — flex:1 + minHeight:0 = scrolls, never pushes opponent strip down */}
        <div ref={outRef} style={{ flex:1, minHeight:0, overflowY:'auto' }}>
          {!results&&!running && (
            <div style={{ padding:'12px', fontSize:10, fontFamily:'var(--mono)',
              color:'var(--border2)', lineHeight:1.7 }}>
              {lm.comment} ⌘↵ run public tests<br/>
              {lm.comment} ⌘⇧↵ submit solution
            </div>
          )}
          {running && (
            <div style={{ padding:'12px', display:'flex', gap:8, alignItems:'center',
              fontSize:11, fontFamily:'var(--mono)', color:'var(--cyan)' }}>
              <span style={{ animation:'arSpin 0.7s linear infinite', display:'inline-block' }}>◌</span>
              {results ? 'judging with hidden tests...' : 'running public tests...'}
            </div>
          )}
          {error && (
            <div style={{ margin:'10px 12px', padding:'12px 14px', borderRadius:8,
              background:'rgba(255,76,106,0.06)', border:'1px solid rgba(255,76,106,0.2)' }}>
              <div style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--red)',
                letterSpacing:'0.1em', marginBottom:6 }}>// EXECUTION ERROR</div>
              <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--red)',
                lineHeight:1.7, whiteSpace:'pre-wrap' }}>{error}</div>
              <div style={{ marginTop:10, fontSize:10, fontFamily:'var(--mono)',
                color:'var(--muted)', lineHeight:1.6 }}>
                Tip: Check your syntax carefully. Common issues:<br/>
                · Missing closing bracket or parenthesis<br/>
                · Function name mismatch (check problem statement)<br/>
                · Incorrect return type
              </div>
            </div>
          )}
          {results?._publicOnly && (
            <div style={{ padding:'7px 12px', background:'rgba(245,166,35,0.06)',
              borderBottom:'1px solid rgba(245,166,35,0.15)',
              fontSize:9, fontFamily:'var(--mono)', color:'var(--amber)', letterSpacing:'0.06em' }}>
              ⚠ Edge Function offline — running public tests only (no hidden tests)
            </div>
          )}
          {results&&!running&&!error && tests.map((t,i)=>(
            <TestRow key={`${attempts}-${i}`} test={t} delay={i*90} />
          ))}
          {results?.pass && !showWin && (
            <div style={{ padding:'7px 12px', display:'flex', alignItems:'center', gap:8,
              background:'rgba(0,230,118,0.04)', borderTop:'1px solid rgba(0,230,118,0.12)' }}>
              <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--green)',
                letterSpacing:'0.08em', whiteSpace:'nowrap' }}>REGISTERING WIN</span>
              <div style={{ flex:1, height:2, background:'rgba(0,230,118,0.1)',
                borderRadius:1, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'var(--green)',
                  animation:`arPrBar ${(tests.length*110)+400}ms linear forwards` }}/>
              </div>
            </div>
          )}
        </div>

        {/* 3. Opponent strip — always pinned to the bottom of the right column */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--bg2)',
          padding: '10px 14px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)',
              boxShadow:'0 0 6px rgba(0,230,118,0.6)' }}/>
            <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)',
              letterSpacing:'0.1em' }}>LIVE MATCH</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>
            <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)' }}>
              {match?.id?.slice(0,6)}
            </span>
          </div>
          <OpponentBar opponent={opponent} matchId={match?.id} compact />
        </div>
      </div>

      {/* ── WIN overlay ──────────────────────────────────────────────────── */}
      {showWin && (
        <div style={{
          position:'absolute', inset:0, zIndex:100,
          background:'rgba(8,16,12,0.95)', backdropFilter:'blur(10px)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:18,
          animation:'arMerge 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ fontSize:56, lineHeight:1 }}>⚡</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--green)',
            letterSpacing:'0.16em' }}>// MATCH COMPLETE</div>
          <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.02em' }}>You won!</h2>
          <div style={{ background:'var(--bg2)', border:'1px solid rgba(0,230,118,0.25)',
            borderLeft:'3px solid var(--green)', borderRadius:8,
            padding:'12px 18px', maxWidth:380, width:'100%' }}>
            <div style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--muted)', marginBottom:6 }}>
              $ git commit -m</div>
            <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3 }}>
              "feat: solved '{problem?.title}'"</div>
            <div style={{ display:'flex', gap:14, marginTop:10 }}>
              <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--green)' }}>
                {tests.length}/{tests.length} tests passed</span>
              <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--cyan)' }}>{lang}</span>
              {execMs && <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--muted)' }}>
                {execMs}ms</span>}
            </div>
          </div>
          <button onClick={()=>onMatchEnd({ outcome:'win', match, problem })}
            style={{ padding:'12px 36px', borderRadius:10, border:'none',
              background:'var(--green)', color:'#000', fontFamily:'var(--mono)',
              fontWeight:700, fontSize:11, letterSpacing:'0.08em', cursor:'pointer' }}>
            See Results →
          </button>
        </div>
      )}
    </div>
  )
}
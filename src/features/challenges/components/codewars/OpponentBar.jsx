// OpponentBar.jsx — [WAR THEME REDESIGN]
// src/features/challenges/components/codewars/OpponentBar.jsx
//
// Two render modes:
//   compact — single-row strip pinned at bottom of Arena right column
//   full    — tall panel with event feed
//
// Subscribes to cw_submissions via Supabase Realtime.
// Only reveals pass/fail signal for the opponent — never their code.

import { useState, useEffect } from 'react'
import { supabase } from '../../../../services/supabaseClient'

const WAR_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');`

const KF = `
  ${WAR_FONTS}
  @keyframes obSlide   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes obPulse   { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
  @keyframes obAlertW  { 0%,100%{background:rgba(248,113,113,0.06)} 50%{background:rgba(248,113,113,0.14)} }
  @keyframes obAlertY  { 0%,100%{background:rgba(240,160,32,0.06)} 50%{background:rgba(240,160,32,0.13)} }
  @keyframes obTyping  { 0%,100%{opacity:.2} 33%{opacity:.8} 66%{opacity:.45} }
  @keyframes obMarking { from{stroke-dashoffset:0} to{stroke-dashoffset:-24} }
  @keyframes obBlink   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes obSpin    { to{transform:rotate(360deg)} }
`

function eloColor(elo) {
  if (elo >= 1800) return '#FF4C4C'
  if (elo >= 1600) return '#F0A020'
  if (elo >= 1400) return '#A78BFA'
  if (elo >= 1200) return '#4EAAFF'
  if (elo >= 1000) return '#34D399'
  return '#6B7280'
}
function eloLabel(elo) {
  if (elo >= 1800) return 'Warlord'
  if (elo >= 1600) return 'Commander'
  if (elo >= 1400) return 'Veteran'
  if (elo >= 1200) return 'Soldier'
  if (elo >= 1000) return 'Recruit'
  return 'Conscript'
}

// ── Transient submit event — auto-expires after 5s ─────────────────────────
function IntelBurst({ event }) {
  const [alive, setAlive] = useState(true)
  useEffect(() => { const t = setTimeout(() => setAlive(false), 5000); return () => clearTimeout(t) }, [])
  if (!alive) return null

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'6px 10px',
      background: event.pass
        ? 'rgba(52,211,153,0.07)'
        : 'rgba(248,113,113,0.07)',
      border:`1px solid ${event.pass ? 'rgba(52,211,153,0.22)' : 'rgba(248,113,113,0.22)'}`,
      clipPath:'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)',
      animation:'obSlide 0.2s ease',
    }}>
      <span style={{
        fontFamily:"'Bebas Neue', sans-serif",
        fontSize:11, letterSpacing:'0.08em',
        color: event.pass ? '#34D399' : '#F87171',
      }}>
        {event.pass ? '✓ ALL CLEAR' : `✕ ATTEMPT ${event.attempt}`}
      </span>
      <span style={{
        fontFamily:"'Share Tech Mono', monospace",
        fontSize:8, color:'rgba(255,255,255,0.25)',
        marginLeft:'auto',
      }}>{event.pass ? 'SUBMIT OK' : 'TESTS FAILED'}</span>
    </div>
  )
}

export default function OpponentBar({ opponent, matchId, compact = true }) {
  const [events,   setEvents]   = useState([])
  const [attempts, setAttempts] = useState(0)
  const [status,   setStatus]   = useState('idle') // idle | active | won
  const [lastLang, setLastLang] = useState(null)

  useEffect(() => {
    if (!matchId || !opponent?.id) return
    const channel = supabase
      .channel(`opp-${matchId}-${opponent.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'cw_submissions',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const sub = payload.new
        if (sub.player_id !== opponent.id) return
        const attempt = sub.attempt_num ?? 1
        setAttempts(attempt)
        setLastLang(sub.language)
        if (sub.mode === 'submit') {
          setStatus(sub.pass ? 'won' : 'active')
          setEvents(prev => [{ id: Date.now(), pass: sub.pass, attempt }, ...prev.slice(0, 3)])
        } else {
          setStatus('active')
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [matchId, opponent?.id])

  const color = eloColor(opponent?.elo ?? 1000)

  // Status text in war language
  const statusLabel =
    status === 'won'    ? 'SOLUTION SUBMITTED' :
    status === 'active' ? `${attempts} ATTEMPT${attempts !== 1 ? 'S' : ''}${lastLang ? ` · ${lastLang.toUpperCase()}` : ''}` :
    'ENGAGING TARGET...'

  const statusColor =
    status === 'won'    ? '#F87171' :
    status === 'active' ? '#F0A020' :
    'rgba(255,255,255,0.25)'

  // ── COMPACT MODE ─────────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <style>{KF}</style>

        {/* Opponent row */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          animation: status !== 'idle' ? `${status === 'won' ? 'obAlertW' : 'obAlertY'} 1.5s ease-in-out infinite` : 'none',
          padding: status !== 'idle' ? '3px 0' : '0',
          transition:'padding 0.3s',
        }}>
          {/* Avatar with corner-clip */}
          <div style={{ position:'relative', width:34, height:34, flexShrink:0 }}>
            <div style={{
              width:'100%', height:'100%', overflow:'hidden',
              clipPath:'polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)',
              background: opponent?.avatarUrl ? 'transparent' : `${color}12`,
              border:`1.5px solid ${color}35`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, color,
              fontFamily:"'Rajdhani', sans-serif",
            }}>
              {opponent?.avatarUrl
                ? <img src={opponent.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
                : (opponent?.username?.[0] ?? '?').toUpperCase()
              }
            </div>
            {/* Status dot */}
            <div style={{
              position:'absolute', bottom:0, right:0,
              width:7, height:7, borderRadius:'50%',
              background: statusColor,
              border:'1.5px solid #080A0D',
              animation: status !== 'idle' ? 'obPulse 1.4s ease-in-out infinite' : 'none',
            }}/>
          </div>

          {/* Name + status */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
              fontSize:13, color:'#F5F0E8', lineHeight:1,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              marginBottom:2,
            }}>@{opponent?.username ?? 'Opponent'}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              {status !== 'idle' && (
                <div style={{ width:4, height:4, borderRadius:'50%', flexShrink:0, background:statusColor }}/>
              )}
              <span style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:8,
                color:statusColor, letterSpacing:'0.08em',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                animation: status === 'idle' ? 'obBlink 2s step-end infinite' : 'none',
              }}>{statusLabel}</span>
            </div>
          </div>

          {/* Rank badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:4, flexShrink:0,
            padding:'2px 8px 2px 5px',
            background:`${color}0E`, border:`1px solid ${color}28`,
            clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
          }}>
            <span style={{ width:3, height:3, borderRadius:'50%', background:color, display:'inline-block' }}/>
            <span style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:8,
              color, letterSpacing:'0.06em',
            }}>{opponent?.elo ?? '—'}</span>
          </div>
        </div>

        {/* Intel burst (submit event) */}
        {events.length > 0 && (
          <div style={{ marginTop:7 }}>
            <IntelBurst key={events[0].id} event={events[0]} />
          </div>
        )}
      </>
    )
  }

  // ── FULL MODE — tall panel ────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <style>{KF}</style>

      {/* Header */}
      <div style={{
        flexShrink:0, padding:'8px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        background:'rgba(255,255,255,0.02)',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <span style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:8,
          color:'rgba(255,255,255,0.28)', letterSpacing:'0.14em',
        }}>// ENEMY INTEL</span>
        <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
        {status === 'won' && (
          <span style={{
            fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9,
            letterSpacing:'0.12em', color:'#F87171',
            animation:'obBlink 0.8s step-end infinite',
          }}>⚠ SUBMITTED</span>
        )}
      </div>

      {/* Opponent card */}
      <div style={{
        flexShrink:0, padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          {/* Avatar */}
          <div style={{ position:'relative', width:42, height:42, flexShrink:0 }}>
            <div style={{
              width:'100%', height:'100%',
              clipPath:'polygon(7px 0%,100% 0%,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)',
              background: opponent?.avatarUrl ? 'transparent' : `${color}12`,
              border:`1.5px solid ${color}35`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, fontWeight:700, color, overflow:'hidden',
              fontFamily:"'Rajdhani', sans-serif",
            }}>
              {opponent?.avatarUrl
                ? <img src={opponent.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
                : (opponent?.username?.[0] ?? '?').toUpperCase()
              }
            </div>
            <div style={{
              position:'absolute', bottom:0, right:0,
              width:8, height:8, borderRadius:'50%',
              background:statusColor, border:'1.5px solid #080A0D',
              animation: status !== 'idle' ? 'obPulse 1.4s ease-in-out infinite' : 'none',
            }}/>
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
              fontSize:15, color:'#F5F0E8', letterSpacing:'0.04em', lineHeight:1, marginBottom:4,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>@{opponent?.username ?? 'Opponent'}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:4,
              padding:'2px 8px 2px 5px',
              background:`${color}0E`, border:`1px solid ${color}28`,
              clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
            }}>
              <span style={{ width:3, height:3, borderRadius:'50%', background:color, display:'inline-block' }}/>
              <span style={{
                fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:9,
                letterSpacing:'0.1em', color, textTransform:'uppercase',
              }}>{eloLabel(opponent?.elo ?? 1000)}</span>
              <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:8, color:`${color}80` }}>
                {opponent?.elo}
              </span>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'6px 10px',
          background:'rgba(255,255,255,0.02)',
          border:'1px solid rgba(255,255,255,0.06)',
          clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
        }}>
          <div style={{
            width:6, height:6, borderRadius:'50%', flexShrink:0,
            background:statusColor,
            animation: status !== 'idle' ? 'obPulse 1.4s ease-in-out infinite' : 'none',
          }}/>
          <span style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:9,
            color:statusColor, letterSpacing:'0.08em', flex:1,
          }}>{statusLabel}</span>
        </div>
      </div>

      {/* Intel feed */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 14px',
        display:'flex', flexDirection:'column', gap:6 }}>
        {events.length > 0 ? (
          events.map(ev => <IntelBurst key={ev.id} event={ev} />)
        ) : (
          <div style={{ paddingTop:6 }}>
            <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:4, height:4, borderRadius:'50%', background:'rgba(255,255,255,0.15)',
                  animation:`obTyping 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}/>
              ))}
            </div>
            <div style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:9,
              color:'rgba(255,255,255,0.2)', lineHeight:1.7,
            }}>
              // enemy position: unknown<br/>
              // awaiting submission signals...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
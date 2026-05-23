// ResultScreen.jsx — [WAR THEME REDESIGN]
// src/features/challenges/components/codewars/ResultScreen.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../services/supabaseClient'

const WAR_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');`

const KF = `
  ${WAR_FONTS}
  @keyframes rsIn        { from{opacity:0;transform:translateY(22px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes rsTrophy    { from{opacity:0;transform:scale(0.2) rotate(-20deg)} 65%{transform:scale(1.18) rotate(5deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes rsDelta     { 0%{opacity:0;transform:translateY(0) scale(.6)} 25%{opacity:1;transform:translateY(-18px) scale(1.2)} 80%{opacity:1;transform:translateY(-28px)} 100%{opacity:0;transform:translateY(-36px)} }
  @keyframes rsFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes rsBar       { from{width:0} to{width:var(--w)} }
  @keyframes scanDown    { from{top:-2px} to{top:100%} }
  @keyframes rsCount     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rsPulse     { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
  @keyframes rsGlitch    { 0%,92%,100%{clip-path:none;transform:none} 93%{clip-path:inset(20% 0 55% 0);transform:translateX(4px)} 95%{clip-path:inset(60% 0 10% 0);transform:translateX(-4px)} }
  @keyframes rsMarching  { from{stroke-dashoffset:0} to{stroke-dashoffset:-24} }
  @keyframes rsSiren     { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes rsShake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
  @keyframes rsReveal    { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
`

// ── Elo math ─────────────────────────────────────────────────────────────────
function calcElo({ myElo, oppElo, outcome, execMs, limitMs }) {
  const K = 32
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
  const actual = outcome === 'win' ? 1 : outcome === 'loss' ? 0 : 0.5
  let mult = 1.0
  if (outcome === 'win' && execMs && limitMs) {
    const frac = execMs / limitMs
    if (frac < 0.25) mult = 1.2
    else if (frac < 0.5) mult = 1.1
    else if (frac > 0.75) mult = 0.95
  }
  const delta = Math.round(K * (actual - expected) * mult)
  return { delta, newElo: Math.max(600, myElo + delta), mult }
}

// ── Animated Elo counter ──────────────────────────────────────────────────────
function EloCounter({ from, to, duration = 1400 }) {
  const [display, setDisplay] = useState(from)
  const frameRef = useRef(null)
  useEffect(() => {
    const start = performance.now()
    const diff = to - from
    const step = (now) => {
      const elapsed = Math.min(now - start, duration)
      const eased = 1 - Math.pow(1 - elapsed / duration, 3)
      setDisplay(Math.round(from + diff * eased))
      if (elapsed < duration) frameRef.current = requestAnimationFrame(step)
    }
    const t = setTimeout(() => { frameRef.current = requestAnimationFrame(step) }, 700)
    return () => { clearTimeout(t); cancelAnimationFrame(frameRef.current) }
  }, [from, to, duration])
  return <>{display.toLocaleString()}</>
}

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

// ── Share text builder ────────────────────────────────────────────────────────
function buildShareText({ outcome, problem, player, delta, lang }) {
  const emoji = outcome === 'win' ? '⚔' : outcome === 'draw' ? '🤝' : '💀'
  const verb  = outcome === 'win' ? 'won' : outcome === 'draw' ? 'drew' : 'fell in'
  return `${emoji} Just ${verb} a Code Wars duel!\n\n` +
    `Mission: "${problem?.title ?? 'Unknown'}"\n` +
    `Weapon: ${lang}\n` +
    `Elo: ${delta > 0 ? '+' : ''}${delta}\n\n` +
    `#CodeWars #TechThreads #${lang}`
}

// ── Clipped stat cell ─────────────────────────────────────────────────────────
function StatCell({ label, value, color, delay = 0 }) {
  return (
    <div style={{
      flex:1, textAlign:'center', padding:'14px 10px',
      background:'#0D1014',
      border:'1px solid rgba(255,255,255,0.07)',
      clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
      animation:`rsIn 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
    }}>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif",
        fontSize:22, letterSpacing:'0.04em', lineHeight:1,
        color: color || '#F5F0E8',
      }}>{value}</div>
      <div style={{
        fontFamily:"'Share Tech Mono', monospace",
        fontSize:8, color:'rgba(255,255,255,0.28)',
        letterSpacing:'0.14em', marginTop:4, textTransform:'uppercase',
      }}>{label}</div>
    </div>
  )
}

// ── ELO delta float ───────────────────────────────────────────────────────────
function EloDeltaBadge({ delta }) {
  const positive = delta >= 0
  return (
    <div style={{
      position:'absolute', top:-10, right:12,
      fontFamily:"'Share Tech Mono', monospace",
      fontSize:13, fontWeight:700,
      color: positive ? '#34D399' : '#F87171',
      animation:'rsDelta 2.2s ease 0.9s forwards',
      pointerEvents:'none',
      background: positive ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
      border:`1px solid ${positive ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
      padding:'2px 8px',
      clipPath:'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)',
    }}>
      {positive ? `+${delta}` : delta}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ResultScreen({
  outcome, match, problem, player, opponent, onRematch, onBack
}) {
  const [eloSaved,    setEloSaved]    = useState(false)
  const [showShare,   setShowShare]   = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [diffVote,    setDiffVote]    = useState(null)
  const [lang,        setLang]        = useState('javascript')
  const [execMs,      setExecMs]      = useState(null)

  useEffect(() => {
    if (!match?.id || !player?.id) return
    supabase.from('cw_submissions')
      .select('language')
      .eq('match_id', match.id).eq('player_id', player.id)
      .eq('mode', 'submit').order('submitted_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.language) setLang(data.language) })
  }, [match?.id, player?.id])

  useEffect(() => {
    if (!match?.id || outcome !== 'win') return
    supabase.from('cw_submissions')
      .select('exec_ms').eq('match_id', match.id)
      .eq('player_id', player.id).eq('pass', true).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.exec_ms) setExecMs(data.exec_ms) })
  }, [match?.id, outcome])

  const limitMs = problem?.time_limit_ms ?? 900000
  const { delta, newElo } = calcElo({ myElo: player?.elo ?? 1000, oppElo: opponent?.elo ?? 1000, outcome, execMs, limitMs })

  useEffect(() => {
    if (!player?.id || eloSaved) return
    setEloSaved(true)
    supabase.from('cw_ratings').update({
      elo: newElo,
      matches_played: (player.matchesPlayed ?? 0) + 1,
      matches_won:  (player.wins   ?? 0) + (outcome === 'win'  ? 1 : 0),
      matches_lost: (player.losses ?? 0) + (outcome === 'loss' ? 1 : 0),
      peak_elo: Math.max(newElo, player.peakElo ?? newElo),
      last_match_at: new Date().toISOString(),
    }).eq('user_id', player.id).then(({ error }) => { if (error) console.warn('Elo update failed:', error.message) })
    if (match?.id) {
      const col = match.player_a === player.id ? 'elo_a_after' : 'elo_b_after'
      supabase.from('cw_matches').update({ [col]: newElo }).eq('id', match.id).then(() => {})
    }
  }, [player?.id])

  const handleShare = async () => {
    const text = buildShareText({ outcome, problem, player, delta, lang })
    try { await navigator.clipboard.writeText(text); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }
    catch { setShowShare(true) }
  }

  const handleDiffVote = async (vote) => {
    setDiffVote(vote)
    if (!player?.id) return
    supabase.from('cw_difficulty_votes')
      .upsert({ user_id: player.id, problem_id: null, vote }, { onConflict: 'user_id,problem_id' })
      .then(({ error }) => { if (error) console.warn('Difficulty vote skipped:', error.message) })
  }

  const won  = outcome === 'win'
  const draw = outcome === 'draw'

  // War-language config per outcome
  const cfg = won
    ? { icon:'⚡', heading:'VICTORY', sub:'Mission accomplished — enemy neutralised',
        headingColor:'#34D399', borderColor:'rgba(52,211,153,0.3)',
        bgAccent:'rgba(52,211,153,0.04)', tagColor:'#34D399', tag:'// OPERATION COMPLETE' }
    : draw
    ? { icon:'🤝', heading:'CEASEFIRE', sub:'Honourable draw — no winner declared',
        headingColor:'#F0A020', borderColor:'rgba(240,160,32,0.3)',
        bgAccent:'rgba(240,160,32,0.04)', tagColor:'#F0A020', tag:'// MATCH DRAWN' }
    : { icon:'💀', heading:'ELIMINATED', sub:'You were outgunned — regroup and return',
        headingColor:'#F87171', borderColor:'rgba(248,113,113,0.3)',
        bgAccent:'rgba(248,113,113,0.04)', tagColor:'#F87171', tag:'// MISSION FAILED' }

  const playerColor   = eloColor(player?.elo  ?? 1000)
  const opponentColor = eloColor(opponent?.elo ?? 1000)

  const solveTime = execMs
    ? execMs < 60000
      ? `${Math.round(execMs / 1000)}s`
      : `${Math.floor(execMs / 60000)}m ${Math.round((execMs % 60000) / 1000)}s`
    : '—'

  return (
    <div style={{
      height:'100%', overflowY:'auto', background:'#080A0D',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'28px 20px 48px', gap:20, position:'relative',
    }}>
      <style>{KF}</style>

      {/* Scanline */}
      <div style={{
        position:'fixed', left:0, right:0, height:'1px', zIndex:0,
        background:`linear-gradient(90deg,transparent,${cfg.tagColor}30,transparent)`,
        animation:'scanDown 4s linear infinite', pointerEvents:'none',
      }}/>

      {/* Corner deco */}
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={`${v}${h}`} style={{
          position:'fixed', [v]:12, [h]:12,
          width:18, height:18, pointerEvents:'none',
          borderTop:    v==='top'    ? `1px solid ${cfg.tagColor}30` : 'none',
          borderBottom: v==='bottom' ? `1px solid ${cfg.tagColor}30` : 'none',
          borderLeft:   h==='left'   ? `1px solid ${cfg.tagColor}30` : 'none',
          borderRight:  h==='right'  ? `1px solid ${cfg.tagColor}30` : 'none',
        }}/>
      ))}

      {/* ── OUTCOME ICON ─────────────────────────────── */}
      <div style={{
        fontSize:58, lineHeight:1, zIndex:1,
        animation:'rsTrophy 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, rsFloat 3.5s ease-in-out 1s infinite',
      }}>{cfg.icon}</div>

      {/* ── HEADING ──────────────────────────────────── */}
      <div style={{ textAlign:'center', animation:'rsIn 0.4s ease 0.28s both', zIndex:1 }}>
        {/* <div style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:9,
          color:cfg.tagColor, letterSpacing:'0.18em', marginBottom:8,
          animation:'rsSiren 1.4s ease-in-out infinite',
        }}>{cfg.tag}</div> */}

        <div style={{ position:'relative', display:'inline-block' }}>
          <h2 style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:54, letterSpacing:'0.06em', lineHeight:0.9,
            color:cfg.headingColor, margin:'0 0 6px',
            textShadow:`0 0 40px ${cfg.headingColor}40`,
            animation: won ? 'none' : !won && !draw ? 'rsShake 0.5s ease 0.4s' : 'none',
          }}>{cfg.heading}</h2>
          {/* Glitch copy */}
          <h2 aria-hidden style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:54, letterSpacing:'0.06em', lineHeight:0.9,
            color:cfg.headingColor, margin:'0 0 6px',
            position:'absolute', top:0, left:0,
            opacity:0.3, transform:'translateX(2px)',
            animation:'rsGlitch 7s step-end infinite',
            userSelect:'none',
          }}>{cfg.heading}</h2>
        </div>

        <p style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:10,
          color:'rgba(255,255,255,0.35)', margin:0, letterSpacing:'0.05em',
        }}>{cfg.sub}</p>
        
      </div>

      {/* ── ELO CARD ─────────────────────────────────── */}
      <div style={{
        width:'100%', maxWidth:420, zIndex:1,
        animation:'rsIn 0.45s ease 0.45s both',
        position:'relative',
      }}>
        <EloDeltaBadge delta={delta} />
        <div style={{
          padding:'1px',
          background:`linear-gradient(135deg, ${cfg.borderColor.replace('0.3', '0.6')}, rgba(255,255,255,0.05), ${cfg.borderColor.replace('0.3', '0.6')})`,
          clipPath:'polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
        }}>
          <div style={{
            background:`#0D1014`,
            padding:'18px 20px',
            display:'flex', alignItems:'center', gap:16,
            clipPath:'polygon(11px 0%,100% 0%,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)',
          }}>
            {/* Avatar */}
            <div style={{
              width:52, height:52, flexShrink:0, position:'relative',
              clipPath:'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
              background: player?.avatarUrl ? 'transparent' : `${playerColor}15`,
              border:`1.5px solid ${playerColor}35`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:700, color:playerColor, overflow:'hidden',
              fontFamily:"'Rajdhani', sans-serif",
            }}>
              {player?.avatarUrl
                ? <img src={player.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
                : (player?.username?.[0] ?? 'D').toUpperCase()
              }
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:8,
                color:'rgba(255,255,255,0.28)', letterSpacing:'0.14em', marginBottom:4,
              }}>◆ OPERATOR</div>
              <div style={{
                fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
                fontSize:18, color:'#F5F0E8', letterSpacing:'0.04em', lineHeight:1, marginBottom:6,
              }}>@{player?.username}</div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5,
                padding:'2px 9px 2px 6px',
                background:`${eloColor(newElo)}10`, border:`1px solid ${eloColor(newElo)}30`,
                clipPath:'polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%)',
              }}>
                <span style={{ width:4, height:4, borderRadius:'50%', background:eloColor(newElo),
                  boxShadow:`0 0 4px ${eloColor(newElo)}`, display:'inline-block' }}/>
                <span style={{
                  fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:'0.1em', color:eloColor(newElo), textTransform:'uppercase',
                }}>{eloLabel(newElo)}</span>
              </div>
            </div>

            {/* ELO counter */}
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:32, letterSpacing:'0.02em', lineHeight:1,
                color:'#F5F0E8', animation:'rsCount 0.4s ease 0.7s both',
              }}>
                <EloCounter from={player?.elo ?? 1000} to={newElo} />
              </div>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace",
                fontSize:8, color:'rgba(255,255,255,0.28)', letterSpacing:'0.14em', marginTop:2,
              }}>ELO RATING</div>
            </div>
          </div>
        </div>

        {/* Progress bar — elo change visual */}
        <div style={{ marginTop:6, height:2, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
          <div style={{
            height:'100%', background:cfg.headingColor,
            '--w': `${Math.min(100, Math.max(5, Math.abs(delta) * 2))}%`,
            width:'var(--w)', animation:'rsBar 1.2s cubic-bezier(0.22,1,0.36,1) 0.9s both',
          }}/>
        </div>
      </div>

      {/* ── STAT CELLS ───────────────────────────────── */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:420, zIndex:1 }}>
        <StatCell label="SOLVE TIME"  value={solveTime}    color="#4EAAFF"  delay={0.52} />
        <StatCell label="ELO SWING"   value={delta >= 0 ? `+${delta}` : `${delta}`}
          color={delta >= 0 ? '#34D399' : '#F87171'}  delay={0.59} />
        <StatCell label="WEAPON"      value={lang.slice(0,4).toUpperCase()}  color="#F0A020"  delay={0.66} />
      </div>

      {/* ── OPPONENT ROW ─────────────────────────────── */}
      {opponent && (
        <div style={{
          width:'100%', maxWidth:420, zIndex:1,
          animation:'rsIn 0.4s ease 0.72s both',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'12px 16px',
            background:'#0D1014',
            border:'1px solid rgba(255,255,255,0.07)',
            clipPath:'polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
          }}>
            {/* Opponent avatar */}
            <div style={{
              width:38, height:38, flexShrink:0,
              clipPath:'polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
              background: opponent.avatarUrl ? 'transparent' : `${opponentColor}15`,
              border:`1.5px solid ${opponentColor}35`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:700, color:opponentColor, overflow:'hidden',
              fontFamily:"'Rajdhani', sans-serif",
            }}>
              {opponent.avatarUrl
                ? <img src={opponent.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
                : (opponent.username?.[0] ?? '?').toUpperCase()
              }
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:8,
                color:'rgba(255,255,255,0.25)', letterSpacing:'0.12em', marginBottom:2,
              }}>vs</div>
              <div style={{
                fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
                fontSize:15, color:'#F5F0E8', letterSpacing:'0.04em',
              }}>@{opponent.username}</div>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:9,
                color:'rgba(255,255,255,0.25)', marginTop:1,
              }}>{opponent.elo} ELO · {eloLabel(opponent.elo)}</div>
            </div>

            {/* Result badge */}
            <div style={{
              padding:'4px 12px 4px 10px',
              clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              background: won
                ? 'rgba(248,113,113,0.08)'
                : draw ? 'rgba(240,160,32,0.08)' : 'rgba(52,211,153,0.08)',
              border:`1px solid ${won ? 'rgba(248,113,113,0.25)' : draw ? 'rgba(240,160,32,0.25)' : 'rgba(52,211,153,0.25)'}`,
            }}>
              <span style={{
                fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:10,
                letterSpacing:'0.12em', textTransform:'uppercase',
                color: won ? '#F87171' : draw ? '#F0A020' : '#34D399',
              }}>
                {won ? 'DEFEATED' : draw ? 'DREW' : 'VICTOR'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION BUTTONS ───────────────────────────── */}
      <div style={{
        display:'flex', gap:8, width:'100%', maxWidth:420, zIndex:1,
        animation:'rsIn 0.4s ease 0.88s both',
      }}>
        <button onClick={onRematch} style={{
          flex:2, padding:'13px 0',
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:18, letterSpacing:'0.12em',
          cursor:'pointer', border:'none',
          background:'#DC2626', color:'#fff',
          clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
          transition:'background 0.15s, transform 0.1s',
          textShadow:'0 1px 3px rgba(0,0,0,0.4)',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#B91C1C'; e.currentTarget.style.transform='translateY(-2px)' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='#DC2626'; e.currentTarget.style.transform='none' }}>
          ⚔ REMATCH
        </button>

        <button onClick={handleShare} style={{
          flex:1, padding:'13px 0',
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:14, letterSpacing:'0.1em',
          cursor:'pointer',
          border:`1px solid ${shareCopied ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
          background: shareCopied ? 'rgba(52,211,153,0.08)' : 'transparent',
          color: shareCopied ? '#34D399' : 'rgba(255,255,255,0.45)',
          clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
          transition:'all 0.15s',
        }}>
          {shareCopied ? '✓ FILED' : '↗ SHARE'}
        </button>
      </div>

      <button onClick={onBack} style={{
        background:'none', border:'none', cursor:'pointer',
        fontFamily:"'Share Tech Mono', monospace", fontSize:10,
        color:'rgba(255,255,255,0.22)', letterSpacing:'0.1em',
        transition:'color 0.15s', zIndex:1,
        animation:'rsIn 0.4s ease 0.94s both',
      }}
        onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}
        onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.22)'}>
        ← RETURN TO BASE
      </button>

      {/* Share fallback */}
      {showShare && (
        <div style={{
          width:'100%', maxWidth:420, zIndex:1,
          padding:'14px 16px',
          background:'#0D1014', border:'1px solid rgba(255,255,255,0.09)',
          clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
          fontFamily:"'Share Tech Mono', monospace", fontSize:11,
          color:'rgba(255,255,255,0.4)', lineHeight:1.8, whiteSpace:'pre-wrap',
          animation:'rsIn 0.25s ease',
        }}>
          {buildShareText({ outcome, problem, player, delta, lang })}
        </div>
      )}
    </div>
  )
}
// WaitingRoom.jsx — [WAR THEME REDESIGN]
// src/features/challenges/components/codewars/WaitingRoom.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase }         from '../../../../services/supabaseClient'
import { useAuth }          from '../../../../context/AuthContext'
import { getRandomProblem } from '../../../../services/localExecutionService'

const WAR_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');`

const KF = `
  ${WAR_FONTS}
  @keyframes wrSpin       { to{transform:rotate(360deg)} }
  @keyframes wrIn         { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes wrFadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes scanDown     { from{top:-2px} to{top:100%} }
  @keyframes radarSweep   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes radarPulse   { 0%{transform:scale(0.5);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }
  @keyframes ping         { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
  @keyframes marching     { from{stroke-dashoffset:0} to{stroke-dashoffset:-24} }
  @keyframes battleFlash  { 0%,100%{background:#0D1014} 50%{background:#150505} }
  @keyframes countSlam    { 0%{transform:scale(2.2);opacity:0} 60%{transform:scale(0.9)} 100%{transform:scale(1);opacity:1} }
  @keyframes slideRight   { from{transform:translateX(-30px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideLeft    { from{transform:translateX(30px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes glitch1      { 0%,91%,100%{clip-path:none} 92%{clip-path:inset(30% 0 50% 0);transform:translateX(3px)} 94%{clip-path:inset(60% 0 10% 0);transform:translateX(-3px)} 96%{clip-path:none} }
  @keyframes vsShake      { 0%,100%{transform:scale(1)} 20%{transform:scale(1.12) rotate(-2deg)} 40%{transform:scale(0.95) rotate(2deg)} 60%{transform:scale(1.08) rotate(-1deg)} 80%{transform:scale(1)} }
  @keyframes lockOn       { 0%{opacity:0;transform:scale(0.6) rotate(-10deg)} 60%{transform:scale(1.05) rotate(1deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
  @keyframes warSiren     { 0%,100%{background:rgba(220,38,38,0.04)} 50%{background:rgba(220,38,38,0.12)} }
  @keyframes dashes       { to{stroke-dashoffset:-100} }
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

// ── Radar component ────────────────────────────────────────────────────────
function Radar({ size = 140, found = false }) {
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ position:'absolute', inset:0 }}>
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <circle key={i}
            cx={size/2} cy={size/2} r={(size/2 - 4) * r}
            fill="none" stroke="rgba(220,38,38,0.15)" strokeWidth="1"/>
        ))}
        {/* Crosshairs */}
        <line x1={size/2} y1={4} x2={size/2} y2={size-4}
          stroke="rgba(220,38,38,0.1)" strokeWidth="1"/>
        <line x1={4} y1={size/2} x2={size-4} y2={size/2}
          stroke="rgba(220,38,38,0.1)" strokeWidth="1"/>

        {/* Sweep */}
        {!found && (
          <g style={{ transformOrigin:`${size/2}px ${size/2}px`, animation:'radarSweep 2s linear infinite' }}>
            <path
              d={`M ${size/2} ${size/2} L ${size/2} 6 A ${size/2 - 6} ${size/2 - 6} 0 0 1 ${size/2 + (size/2-6) * Math.sin(Math.PI/3)} ${size/2 - (size/2-6) * Math.cos(Math.PI/3)} Z`}
              fill="url(#sweepGrad)"
            />
            <defs>
              <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(220,38,38,0.5)"/>
                <stop offset="100%" stopColor="rgba(220,38,38,0)"/>
              </radialGradient>
            </defs>
          </g>
        )}

        {/* Center dot */}
        <circle cx={size/2} cy={size/2} r={3} fill="#DC2626"/>

        {/* Found ping */}
        {found && (
          <>
            <circle cx={size * 0.65} cy={size * 0.38} r={4} fill="#34D399"
              style={{ animation:'ping 1s ease-out infinite' }}/>
            <circle cx={size * 0.65} cy={size * 0.38} r={3} fill="#34D399"/>
          </>
        )}
      </svg>
    </div>
  )
}

// ── Player combat card ─────────────────────────────────────────────────────
function CombatCard({ player, side, revealed = true, isEnemy = false }) {
  const color    = eloColor(player?.elo ?? 1000)
  const initial  = (player?.username?.[0] ?? '?').toUpperCase()
  const slideAnim = side === 'left' ? 'slideRight 0.4s cubic-bezier(0.22,1,0.36,1) both'
                                    : 'slideLeft 0.4s cubic-bezier(0.22,1,0.36,1) both'
  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:12,
      animation: revealed ? slideAnim : 'wrIn 0.3s ease both',
    }}>
      {/* Avatar frame */}
      <div style={{ position:'relative' }}>
        {/* Marching border via SVG */}
        <svg width={76} height={76} style={{ position:'absolute', inset:-3, zIndex:1 }}
          viewBox="0 0 82 82">
          <rect x={1} y={1} width={80} height={80}
            fill="none"
            stroke={revealed ? color : 'rgba(255,255,255,0.1)'}
            strokeWidth={1.5}
            strokeDasharray={revealed ? '6 3' : '3 3'}
            style={revealed ? { animation:'marching 0.5s linear infinite' } : {}}
          />
        </svg>

        {/* Avatar */}
        <div style={{
          width:70, height:70, overflow:'hidden',
          clipPath:'polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
          background: revealed && player?.avatarUrl ? 'transparent' : `${color}10`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:26, fontWeight:700, color,
          fontFamily:"'Rajdhani', sans-serif",
          border:`1px solid ${color}25`,
          position:'relative',
        }}>
          {revealed && player ? (
            player.avatarUrl
              ? <img src={player.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt=""/>
              : initial
          ) : (
            // Unknown enemy silhouette
            <div style={{
              width:'100%', height:'100%',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(220,38,38,0.05)',
            }}>
              {isEnemy ? (
                <div style={{
                  width:24, height:24, border:'2px solid rgba(220,38,38,0.25)',
                  borderTopColor:'rgba(220,38,38,0.6)', borderRadius:'50%',
                  animation:'wrSpin 1s linear infinite',
                }}/>
              ) : '?'}
            </div>
          )}

          {/* Scan overlay for unknown */}
          {!revealed && (
            <div style={{
              position:'absolute', inset:0,
              background:'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(220,38,38,0.03) 3px, rgba(220,38,38,0.03) 4px)',
            }}/>
          )}
        </div>

        {/* Corner brackets */}
        {['top-left','top-right','bottom-left','bottom-right'].map(pos => {
          const [v, h] = pos.split('-')
          return (
            <div key={pos} style={{
              position:'absolute',
              [v]: -4, [h]: -4,
              width:10, height:10,
              borderTop:    v==='top'    ? `2px solid ${revealed ? color : 'rgba(220,38,38,0.3)'}` : 'none',
              borderBottom: v==='bottom' ? `2px solid ${revealed ? color : 'rgba(220,38,38,0.3)'}` : 'none',
              borderLeft:   h==='left'   ? `2px solid ${revealed ? color : 'rgba(220,38,38,0.3)'}` : 'none',
              borderRight:  h==='right'  ? `2px solid ${revealed ? color : 'rgba(220,38,38,0.3)'}` : 'none',
              zIndex:2,
            }}/>
          )
        })}
      </div>

      {/* Name + rank */}
      {revealed && player ? (
        <div style={{ textAlign:'center' }}>
          <div style={{
            fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
            fontSize:15, color:'#F5F0E8', letterSpacing:'0.06em',
            marginBottom:4,
            animation:'glitch1 6s ease-in-out infinite',
          }}>@{player.username}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center' }}>
            <span style={{ width:4, height:4, borderRadius:'50%', background:color,
              boxShadow:`0 0 4px ${color}`, display:'inline-block' }}/>
            <span style={{
              fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
              fontSize:10, letterSpacing:'0.1em', color,
              textTransform:'uppercase',
            }}>{eloLabel(player.elo ?? 1000)}</span>
          </div>
          <div style={{
            fontFamily:"'Share Tech Mono', monospace",
            fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2,
          }}>{player.elo ?? 1000} ELO</div>
        </div>
      ) : (
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:5,
          alignItems:'center' }}>
          <div style={{ width:80, height:10, background:'rgba(220,38,38,0.08)',
            border:'1px solid rgba(220,38,38,0.12)', borderRadius:1 }}/>
          <div style={{ width:50, height:8, background:'rgba(255,255,255,0.04)',
            borderRadius:1 }}/>
        </div>
      )}

      {/* Side label */}
      <div style={{
        fontFamily:"'Share Tech Mono', monospace", fontSize:8,
        letterSpacing:'0.18em', textTransform:'uppercase',
        color: isEnemy && !revealed ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.2)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        paddingTop:8, width:'100%', textAlign:'center',
      }}>
        {isEnemy ? (revealed ? '◆ ENEMY' : '? UNKNOWN') : '◆ YOU'}
      </div>
    </div>
  )
}

// ── VS Divider ─────────────────────────────────────────────────────────────
function VsDivider({ countdown, found }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      gap:8, flexShrink:0, width:64,
    }}>
      <div style={{ width:1, flex:1, background:'linear-gradient(to bottom, transparent, rgba(220,38,38,0.3), transparent)' }}/>

      {found && countdown !== null ? (
        <div style={{
          width:52, height:52,
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative',
        }}>
          {/* Outer ring */}
          <svg width={52} height={52} style={{ position:'absolute', inset:0 }} viewBox="0 0 52 52">
            <circle cx={26} cy={26} r={24} fill="none"
              stroke="rgba(220,38,38,0.2)" strokeWidth={1.5}/>
            <circle cx={26} cy={26} r={24} fill="none"
              stroke="#DC2626" strokeWidth={2}
              strokeDasharray={151}
              strokeDashoffset={151 * (1 - countdown/3)}
              style={{ transformOrigin:'26px 26px', transform:'rotate(-90deg)',
                transition:'stroke-dashoffset 0.9s linear' }}/>
          </svg>
          <div style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:28, color:'#DC2626',
            lineHeight:1,
            animation:'countSlam 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            textShadow:'0 0 20px rgba(220,38,38,0.5)',
          }}>{countdown}</div>
        </div>
      ) : (
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:20, letterSpacing:'0.06em',
          color:'rgba(220,38,38,0.5)',
          animation: found ? 'vsShake 0.5s ease' : 'none',
        }}>VS</div>
      )}

      <div style={{ width:1, flex:1, background:'linear-gradient(to bottom, transparent, rgba(220,38,38,0.3), transparent)' }}/>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function WaitingRoom({ player, onMatched, onCancel }) {
  const { user }    = useAuth()
  const [phase,     setPhase]     = useState('searching')
  const [opponent,  setOpponent]  = useState(null)
  const [statusMsg, setStatusMsg] = useState('SCANNING BATTLEFIELD...')
  const [statusSub, setStatusSub] = useState('Searching for a worthy opponent')
  const [elapsed,   setElapsed]   = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [error,     setError]     = useState(null)

  const isMounted       = useRef(true)
  const pollRef         = useRef(null)
  const countRef        = useRef(null)
  const matchIdRef      = useRef(null)
  const localProblemRef = useRef(null)

  const startCountdown = (matchData, oppData) => {
    setPhase('found')
    setOpponent(oppData)
    setStatusMsg('ENEMY LOCATED')
    setStatusSub('Initializing duel protocol...')
    let c = 3
    setCountdown(c)
    countRef.current = setInterval(() => {
      c -= 1
      if (c <= 0) {
        clearInterval(countRef.current)
        if (isMounted.current) onMatched({ match: matchData, opponent: oppData })
      } else {
        if (isMounted.current) setCountdown(c)
      }
    }, 1000)
  }

  const resolveOpponent = async (matchRow) => {
    const oppId = matchRow.player_a === user.id ? matchRow.player_b : matchRow.player_a
    if (!oppId) {
      if (isMounted.current) { setPhase('error'); setError('Could not identify opponent') }
      return
    }
    const [{ data: prof }, { data: rating }] = await Promise.all([
      supabase.from('profiles').select('username, avatar_url').eq('id', oppId).single(),
      supabase.from('cw_ratings').select('elo, matches_won, matches_lost').eq('user_id', oppId).single(),
    ])
    const opp = {
      id:        oppId,
      username:  prof?.username ?? 'opponent',
      avatarUrl: prof?.avatar_url ?? null,
      elo:       rating?.elo ?? 1000,
      wins:      rating?.matches_won ?? 0,
      losses:    rating?.matches_lost ?? 0,
    }
    const slug = matchRow.local_problem_slug ?? localProblemRef.current ?? getRandomProblem().slug
    const enrichedMatch = { ...matchRow, local_problem_slug: slug }
    if (isMounted.current) startCountdown(enrichedMatch, opp)
  }

  const startPolling = (matchId) => {
    matchIdRef.current = matchId
    pollRef.current = setInterval(async () => {
      if (!isMounted.current) { clearInterval(pollRef.current); return }
      const { data: m } = await supabase.from('cw_matches').select('*').eq('id', matchId).single()
      if (!m) return
      if (m.status === 'active') {
        clearInterval(pollRef.current)
        await resolveOpponent(m)
      } else if (m.status === 'abandoned') {
        clearInterval(pollRef.current)
        if (isMounted.current) { setError('Match abandoned — try again'); setPhase('error') }
      }
    }, 1500)
  }

  useEffect(() => {
    if (!user?.id) return
    isMounted.current = true
    const ticker = setInterval(() => { if (isMounted.current) setElapsed(e => e + 1) }, 1000)

    const run = async () => {
      try {
        try { await supabase.rpc('ensure_cw_rating', { p_user_id: user.id }) } catch(e) {}
        setStatusMsg('SCANNING BATTLEFIELD...')
        setStatusSub('Looking for active matches')
        const { data: open } = await supabase
          .from('cw_matches')
          .select('id, player_a, elo_a_before, problem_id, local_problem_slug, status')
          .eq('status', 'waiting').neq('player_a', user.id)
          .order('created_at', { ascending: true }).limit(5)

        const best = open
          ?.filter(m => Math.abs((m.elo_a_before ?? 1000) - (player.elo ?? 1000)) <= 2000)
          ?.sort((a, b) => Math.abs((a.elo_a_before ?? 1000) - (player.elo ?? 1000)) - Math.abs((b.elo_a_before ?? 1000) - (player.elo ?? 1000)))?.[0]

        if (best) {
          setStatusMsg('TARGET ACQUIRED')
          setStatusSub('Joining match...')
          const { data: joined, error: joinErr } = await supabase
            .from('cw_matches')
            .update({ player_b: user.id, elo_b_before: player.elo ?? 1000, status:'active', started_at: new Date().toISOString() })
            .eq('id', best.id).eq('status', 'waiting').select('*').single()
          if (joinErr || !joined) { setTimeout(run, 800); return }
          if (best.local_problem_slug) localProblemRef.current = best.local_problem_slug
          await resolveOpponent(joined)
        } else {
          setStatusMsg('BROADCASTING CHALLENGE...')
          setStatusSub('Waiting for an opponent to accept')
          const localProblem = getRandomProblem()
          localProblemRef.current = localProblem.slug
          const { data: newMatch, error: createErr } = await supabase
            .from('cw_matches')
            .insert({ player_a: user.id, elo_a_before: player.elo ?? 1000, status:'waiting', local_problem_slug: localProblem.slug })
            .select('*').single()
          if (createErr || !newMatch) throw createErr
          startPolling(newMatch.id)
        }
      } catch (err) {
        console.error('Matchmaking error:', err)
        if (isMounted.current) { setPhase('error'); setError(err?.message ?? 'Could not find a match') }
      }
    }
    run()
    return () => {
      isMounted.current = false
      clearInterval(pollRef.current); clearInterval(countRef.current); clearInterval(ticker)
      if (matchIdRef.current) {
        supabase.from('cw_matches').update({ status:'abandoned' }).eq('id', matchIdRef.current).eq('status','waiting').then(()=>{})
      }
    }
  }, [user?.id])

  const mins    = Math.floor(elapsed / 60)
  const timeStr = mins > 0 ? `${mins}m ${elapsed % 60}s` : `${elapsed}s`

  return (
    <div style={{
      height:'100%', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#080A0D', padding:'28px 24px', gap:0,
      position:'relative', overflow:'hidden',
      animation: phase === 'found' ? 'battleFlash 0.6s ease' : 'none',
    }}>
      <style>{KF}</style>

      {/* Scanline */}
      <div style={{
        position:'absolute', left:0, right:0, height:'1px',
        background:'linear-gradient(90deg,transparent,rgba(220,38,38,0.2),transparent)',
        animation:'scanDown 3s linear infinite', pointerEvents:'none',
      }}/>

      {/* Corner decorations */}
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={`${v}${h}`} style={{
          position:'absolute', [v]:12, [h]:12,
          width:20, height:20, pointerEvents:'none',
          borderTop:    v==='top'    ? '1px solid rgba(220,38,38,0.25)' : 'none',
          borderBottom: v==='bottom' ? '1px solid rgba(220,38,38,0.25)' : 'none',
          borderLeft:   h==='left'   ? '1px solid rgba(220,38,38,0.25)' : 'none',
          borderRight:  h==='right'  ? '1px solid rgba(220,38,38,0.25)' : 'none',
        }}/>
      ))}

      {/* ── HEADER ─────────────────────────────────── */}
      <div style={{
        textAlign:'center', marginBottom:28, zIndex:2,
        animation:'wrIn 0.35s ease both',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', marginBottom:10 }}>
          <div style={{ width:24, height:1, background:'rgba(220,38,38,0.4)' }}/>
          <span style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:9,
            color:'rgba(220,38,38,0.6)', letterSpacing:'0.2em',
          }}>MATCHMAKING</span>
          <div style={{ width:24, height:1, background:'rgba(220,38,38,0.4)' }}/>
        </div>
        <h2 style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:32, letterSpacing:'0.06em',
          color: phase === 'found' ? '#34D399' : '#F5F0E8',
          margin:'0 0 4px',
          transition:'color 0.4s ease',
          textShadow: phase === 'found' ? '0 0 30px rgba(52,211,153,0.3)' : 'none',
        }}>
          {statusMsg}
        </h2>
        <p style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:10,
          color:'rgba(255,255,255,0.3)', margin:0, letterSpacing:'0.06em',
        }}>{statusSub}</p>
      </div>

      {/* ── BATTLEFIELD CARD ──────────────────────── */}
      <div style={{
        width:'100%', maxWidth:440,
        marginBottom:24, zIndex:2,
        animation:'wrIn 0.35s ease 0.06s both',
      }}>
        <div style={{
          position:'relative', padding:1,
          background: phase === 'found'
            ? 'linear-gradient(135deg, #34D399, rgba(52,211,153,0.2), #34D399)'
            : 'linear-gradient(135deg, #DC2626, rgba(220,38,38,0.1), #DC2626)',
          clipPath:'polygon(14px 0%,100% 0%,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)',
          transition:'background 0.5s',
        }}>
          <div style={{
            background:'#0D1014', padding:'24px 20px',
            clipPath:'polygon(13px 0%,100% 0%,100% calc(100% - 13px),calc(100% - 13px) 100%,0 100%,0 13px)',
            display:'flex', alignItems:'center', gap:0,
          }}>
            <CombatCard player={player} side="left" revealed />
            <VsDivider countdown={countdown} found={phase === 'found'} />
            <CombatCard
              player={opponent}
              side="right"
              revealed={phase === 'found'}
              isEnemy
            />
          </div>
        </div>
      </div>

      {/* ── SEARCHING STATE ────────────────────────── */}
      {phase === 'searching' && (
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:20, zIndex:2,
          animation:'wrIn 0.35s ease 0.12s both',
        }}>
          <Radar size={130} found={false} />

          <div style={{ display:'flex', gap:28, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:24, letterSpacing:'0.04em',
                color:'#F5F0E8', lineHeight:1,
              }}>{timeStr}</div>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace",
                fontSize:8, color:'rgba(255,255,255,0.3)',
                letterSpacing:'0.1em', marginTop:2,
              }}>IN QUEUE</div>
            </div>

            <div style={{ width:1, height:32, background:'rgba(255,255,255,0.08)' }}/>

            <div style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:24, letterSpacing:'0.04em',
                color: eloColor(player.elo ?? 1000), lineHeight:1,
              }}>{player.elo ?? 1000}</div>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace",
                fontSize:8, color:'rgba(255,255,255,0.3)',
                letterSpacing:'0.1em', marginTop:2,
              }}>YOUR ELO</div>
            </div>

            <div style={{ width:1, height:32, background:'rgba(255,255,255,0.08)' }}/>

            <div style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:24, letterSpacing:'0.04em',
                color:'#F5F0E8', lineHeight:1,
              }}>±400</div>
              <div style={{
                fontFamily:"'Share Tech Mono', monospace",
                fontSize:8, color:'rgba(255,255,255,0.3)',
                letterSpacing:'0.1em', marginTop:2,
              }}>ELO RANGE</div>
            </div>
          </div>

          <button onClick={onCancel} style={{
            padding:'8px 28px',
            fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
            fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase',
            border:'1px solid rgba(255,255,255,0.12)',
            background:'transparent',
            color:'rgba(255,255,255,0.35)',
            clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
            cursor:'pointer', transition:'all 0.15s',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)' }}>
            ✕ ABORT MISSION
          </button>
        </div>
      )}

      {/* ── FOUND STATE ───────────────────────────── */}
      {phase === 'found' && (
        <div style={{
          textAlign:'center', zIndex:2,
          animation:'lockOn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <Radar size={80} found />
          <div style={{
            marginTop:12,
            fontFamily:"'Share Tech Mono', monospace",
            fontSize:9, color:'rgba(52,211,153,0.6)',
            letterSpacing:'0.16em',
            animation:'warSiren 1s ease-in-out infinite',
          }}>⬛ DUEL COMMENCING ⬛</div>
        </div>
      )}

      {/* ── ERROR STATE ────────────────────────────── */}
      {phase === 'error' && (
        <div style={{
          textAlign:'center', zIndex:2,
          animation:'wrIn 0.3s ease both',
        }}>
          <div style={{
            padding:'12px 18px', marginBottom:16,
            background:'rgba(220,38,38,0.06)',
            border:'1px solid rgba(220,38,38,0.2)',
            clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:9,
              color:'rgba(220,38,38,0.6)', letterSpacing:'0.14em', marginBottom:5,
            }}>⚠ MISSION FAILED</div>
            <div style={{
              fontFamily:"'Rajdhani', sans-serif", fontSize:13,
              color:'#F87171', fontWeight:600,
            }}>{error}</div>
          </div>
          <button
            onClick={() => { setPhase('searching'); setElapsed(0); setError(null); setOpponent(null) }}
            style={{
              padding:'10px 28px',
              fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
              fontSize:13, letterSpacing:'0.12em', textTransform:'uppercase',
              border:'none', background:'#DC2626', color:'#fff',
              clipPath:'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              cursor:'pointer',
            }}>
            ↺ REDEPLOY
          </button>
        </div>
      )}
    </div>
  )
}
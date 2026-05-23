// CodeWarsMode.jsx — Code Wars root controller [WAR THEME REDESIGN]
// src/features/challenges/pages/CodeWarsMode.jsx
import { useState, useEffect, useContext } from 'react'
import { AuthContext }  from '../../../context/AuthContext'
import { supabase }     from '../../../services/supabaseClient'
import WaitingRoom      from '../components/codewars/WaitingRoom'
import Arena            from '../components/codewars/Arena'
import ResultScreen     from '../components/codewars/ResultScreen'

const FADE_MS = 250

const LANGS = [
  { id:'javascript', label:'JS',  full:'JavaScript', color:'#F0C040' },
  { id:'python',     label:'PY',  full:'Python',     color:'#4EAAFF' },
  { id:'typescript', label:'TS',  full:'TypeScript', color:'#A78BFA' },
]

function eloLabel(elo) {
  if (elo >= 1800) return 'Warlord'
  if (elo >= 1600) return 'Commander'
  if (elo >= 1400) return 'Veteran'
  if (elo >= 1200) return 'Soldier'
  if (elo >= 1000) return 'Recruit'
  return 'Conscript'
}

function eloColor(elo) {
  if (elo >= 1800) return '#FF4C4C'
  if (elo >= 1600) return '#F0A020'
  if (elo >= 1400) return '#A78BFA'
  if (elo >= 1200) return '#4EAAFF'
  if (elo >= 1000) return '#34D399'
  return '#6B7280'
}

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');

  @keyframes lobbyIn      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scanDown     { from{top:-2px} to{top:100%} }
  @keyframes flicker      { 0%,95%,100%{opacity:1} 96%{opacity:0.85} 97%{opacity:1} 98%{opacity:0.9} }
  @keyframes warPulse     { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0)} 50%{box-shadow:0 0 0 8px rgba(220,38,38,0)} }
  @keyframes borderMarch  { 0%{background-position:0 0,100% 100%,0 100%,100% 0} 100%{background-position:40px 0,calc(100% - 40px) 100%,0 calc(100% - 40px),100% 40px} }
  @keyframes glitchX      { 0%,100%{clip-path:inset(0 0 100% 0)} 10%{clip-path:inset(15% 0 70% 0)} 20%{clip-path:inset(60% 0 10% 0)} 30%{clip-path:inset(0 0 100% 0)} }
  @keyframes heatShimmer  { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.003)} }
  @keyframes blink        { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes raidAlert    { 0%,100%{background:rgba(220,38,38,0.04)} 50%{background:rgba(220,38,38,0.10)} }
`

// ── Decorative: war noise / crosshatch bg ─────────────────────────────────
function WarGrid() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.03, pointerEvents:'none' }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wg" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="40" y1="0" x2="0" y2="40" stroke="#fff" strokeWidth="0.5"/>
          <line x1="0" y1="0" x2="40" y2="40" stroke="#fff" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wg)"/>
    </svg>
  )
}

// ── Rank badge ─────────────────────────────────────────────────────────────
function RankBadge({ elo }) {
  const color = eloColor(elo)
  const label = eloLabel(elo)
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px 3px 7px',
      borderRadius:2,
      background:`${color}14`,
      border:`1px solid ${color}35`,
      clipPath:'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:color,
        boxShadow:`0 0 5px ${color}`, display:'inline-block', flexShrink:0 }}/>
      <span style={{ fontFamily:"'Rajdhani', sans-serif", fontWeight:700, fontSize:10,
        letterSpacing:'0.12em', color, textTransform:'uppercase' }}>{label}</span>
      <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:9,
        color:`${color}99` }}>{elo}</span>
    </div>
  )
}

// ── Dog-tag style avatar ───────────────────────────────────────────────────
function DogTag({ player, size = 52 }) {
  const color = eloColor(player.elo)
  const initial = (player.username?.[0] ?? 'D').toUpperCase()
  return (
    <div style={{
      width:size, height:size, flexShrink:0, position:'relative',
    }}>
      {/* Corner clips for military look */}
      <div style={{
        width:'100%', height:'100%',
        clipPath:'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        background: player.avatarUrl ? 'transparent' : `${color}12`,
        border:`1.5px solid ${color}40`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:size * 0.36, fontWeight:700, color,
        overflow:'hidden',
        fontFamily:"'Rajdhani', sans-serif",
      }}>
        {player.avatarUrl
          ? <img src={player.avatarUrl} style={{ width:'100%',height:'100%',objectFit:'cover' }} alt="" />
          : initial
        }
      </div>
      {/* Status dot */}
      <div style={{
        position:'absolute', bottom:1, right:1,
        width:8, height:8, borderRadius:'50%',
        background:'#34D399', border:'1.5px solid var(--bg, #0a0c0f)',
        boxShadow:'0 0 6px rgba(52,211,153,0.7)',
      }}/>
    </div>
  )
}

// ── Lobby ─────────────────────────────────────────────────────────────────
function Lobby({ player, prefLang, onSetLang, onQueue, onBack }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1200)
    return () => clearInterval(iv)
  }, [])

  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0
  const kd = player.losses > 0 ? (player.wins / player.losses).toFixed(1) : '∞'

  return (
    <div style={{
      height:'100%', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#080A0D',
      padding:'24px 20px', gap:0,
    }}>
      <style>{GLOBAL_STYLES}</style>
      <WarGrid />

      {/* Scanline sweep */}
      <div style={{
        position:'absolute', left:0, right:0, height:1,
        background:'linear-gradient(90deg, transparent, rgba(220,38,38,0.15), transparent)',
        animation:'scanDown 4s linear infinite',
        pointerEvents:'none', zIndex:1,
      }}/>

      {/* ── WORDMARK ─────────────────────────────────── */}
      <div style={{ textAlign:'center', marginBottom:28, animation:'lobbyIn 0.4s ease both', zIndex:2 }}>
        {/* Overline */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          marginBottom:12,
        }}>
          <div style={{ width:32, height:1, background:'rgba(220,38,38,0.5)' }}/>
          <span style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:9,
            color:'rgba(220,38,38,0.7)', letterSpacing:'0.22em',
          }}>RANKED · 1V1 · ELO</span>
          <div style={{ width:32, height:1, background:'rgba(220,38,38,0.5)' }}/>
        </div>

        {/* Big title */}
        <div style={{ position:'relative' }}>
          <h1 style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:64, lineHeight:0.9,
            letterSpacing:'0.05em',
            color:'#F5F0E8',
            margin:0,
            textShadow:'0 0 40px rgba(220,38,38,0.3)',
            animation:'flicker 6s ease-in-out infinite',
          }}>CODE<br/><span style={{ color:'#DC2626', fontSize:68 }}>WARS</span></h1>
          {/* glitch layer */}
          <h1 aria-hidden style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:64, lineHeight:0.9,
            letterSpacing:'0.05em',
            color:'#DC2626',
            margin:0,
            position:'absolute', top:0, left:0,
            opacity:0.35,
            transform:'translateX(2px)',
            animation:'glitchX 8s step-end infinite',
            userSelect:'none',
          }}>CODE<br/><span style={{ fontSize:68 }}>WARS</span></h1>
        </div>

        <p style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:11,
          color:'rgba(255,255,255,0.35)', marginTop:10,
          letterSpacing:'0.1em',
        }}>FIRST TO PASS ALL TESTS WINS</p>
      </div>

      {/* ── PLAYER CARD ───────────────────────────────── */}
      <div style={{
        width:'100%', maxWidth:380,
        marginBottom:16,
        animation:'lobbyIn 0.4s ease 0.08s both',
        zIndex:2,
      }}>
        {/* Card border with marching-ants-style corners */}
        <div style={{
          position:'relative',
          padding:1,
          background:'linear-gradient(135deg, #DC2626 0%, rgba(220,38,38,0.1) 50%, #DC2626 100%)',
          borderRadius:0,
          clipPath:'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}>
          <div style={{
            background:'#0D1014',
            padding:'14px 18px',
            display:'flex', alignItems:'center', gap:14,
            clipPath:'polygon(11px 0%, 100% 0%, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px)',
          }}>
            <DogTag player={player} size={62} />

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                <span style={{
                  fontFamily:"'Share Tech Mono', monospace",
                  fontSize:9, color:'rgba(220,38,38,0.6)', letterSpacing:'0.15em',
                }}>◆ OPERATOR</span>
              </div>
              <div style={{
                fontFamily:"'Rajdhani', sans-serif", fontWeight:700,
                fontSize:20, color:'#F5F0E8',
                letterSpacing:'0.04em', lineHeight:1,
                marginBottom:6,
              }}>@{player.username}</div>
              <RankBadge elo={player.elo} />
            </div>

            {/* Stats column */}
            <div style={{
              display:'flex', flexDirection:'column', gap:2, alignItems:'flex-end',
              borderLeft:'1px solid rgba(255,255,255,0.07)', paddingLeft:14,
            }}>
              {[
                { v: `${winRate}%`, l:'WIN RATE' },
                { v: kd, l:'K/D' },
                { v: `${player.wins}W`, l:`${player.losses}L` },
              ].map(s => (
                <div key={s.l} style={{ textAlign:'right' }}>
                  <div style={{
                    fontFamily:"'Share Tech Mono', monospace",
                    fontSize:14, fontWeight:700,
                    color: s.l==='WIN RATE' ? (winRate >= 50 ? '#34D399' : '#F87171') : '#F5F0E8',
                    lineHeight:1.1,
                  }}>{s.v}</div>
                  <div style={{
                    fontFamily:"'Share Tech Mono', monospace",
                    fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em',
                  }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LANGUAGE SELECTOR ─────────────────────────── */}
      <div style={{
        width:'100%', maxWidth:380, marginBottom:14,
        animation:'lobbyIn 0.4s ease 0.13s both', zIndex:2,
      }}>
        <div style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:8,
          color:'rgba(255,255,255,0.3)', letterSpacing:'0.18em',
          marginBottom:6, textTransform:'uppercase',
        }}>── Weapon Select ──</div>
        <div style={{ display:'flex', gap:6 }}>
          {LANGS.map(l => (
            <button key={l.id} onClick={() => onSetLang(l.id)} style={{
              flex:1, padding:'10px 0',
              fontSize:11,
              fontFamily:"'Rajdhani', sans-serif",
              fontWeight:700, letterSpacing:'0.12em',
              cursor:'pointer',
              border:`1px solid ${prefLang===l.id ? `${l.color}60` : 'rgba(255,255,255,0.08)'}`,
              background:prefLang===l.id ? `${l.color}10` : 'rgba(255,255,255,0.02)',
              color:prefLang===l.id ? l.color : 'rgba(255,255,255,0.35)',
              clipPath:'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
              transition:'all 0.15s',
              textTransform:'uppercase',
            }}>
              {l.full}
            </button>
          ))}
        </div>
      </div>

      {/* ── DEPLOY BUTTON ─────────────────────────────── */}
      <div style={{
        width:'100%', maxWidth:380, marginBottom:14,
        animation:'lobbyIn 0.4s ease 0.18s both', zIndex:2,
      }}>
        <button onClick={onQueue} style={{
          width:'100%', padding:'15px 0',
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:22, letterSpacing:'0.14em',
          cursor:'pointer', border:'none',
          background:'#DC2626',
          color:'#fff',
          clipPath:'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
          transition:'background 0.15s, transform 0.1s',
          animation:'raidAlert 3s ease-in-out infinite',
          textShadow:'0 1px 4px rgba(0,0,0,0.4)',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#B91C1C'; e.currentTarget.style.transform='translateY(-2px)' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='#DC2626'; e.currentTarget.style.transform='none' }}>
          ⚔ ENTER THE WAR
        </button>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <div style={{
        width:'100%', maxWidth:380,
        display:'flex', gap:0,
        border:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(255,255,255,0.02)',
        marginBottom:16,
        animation:'lobbyIn 0.4s ease 0.23s both', zIndex:2,
        clipPath:'polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)',
      }}>
        {[
          { n:'I', icon:'⚡', t:'Matched by rank' },
          { n:'II', icon:'🎯', t:'Same objective' },
          { n:'III', icon:'🏆', t:'First to conquer' },
        ].map((s, i) => (
          <div key={s.n} style={{
            flex:1, padding:'11px 6px', textAlign:'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{
              fontFamily:"'Bebas Neue', sans-serif",
              fontSize:13, color:'rgba(220,38,38,0.7)',
              letterSpacing:'0.1em', marginBottom:2,
            }}>{s.n}</div>
            <div style={{ fontSize:13, marginBottom:2 }}>{s.icon}</div>
            <div style={{
              fontFamily:"'Share Tech Mono', monospace",
              fontSize:9, color:'rgba(255,255,255,0.3)',
              lineHeight:1.4,
            }}>{s.t}</div>
          </div>
        ))}
      </div>

      <button onClick={onBack} style={{
        background:'none', border:'none', cursor:'pointer',
        fontFamily:"'Share Tech Mono', monospace", fontSize:10,
        color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em',
        transition:'color 0.15s',
        animation:'lobbyIn 0.4s ease 0.27s both', zIndex:2,
      }}
        onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}
        onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
        ← STAND DOWN
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CodeWarsMode({ onBack }) {
  const { user } = useContext(AuthContext)
  const [screen,   setScreen]   = useState('lobby')
  const [fading,   setFading]   = useState(false)
  const [player,   setPlayer]   = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [match,    setMatch]    = useState(null)
  const [result,   setResult]   = useState(null)
  const [prefLang, setPrefLang] = useState('javascript')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      const [{ data: profile }, { data: rating }] = await Promise.all([
        supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
        supabase.from('cw_ratings').select('elo, matches_won, matches_lost').eq('user_id', user.id).single(),
      ])
      setPlayer({
        id:        user.id,
        username:  profile?.username ?? user.email?.split('@')[0] ?? 'dev',
        avatarUrl: profile?.avatar_url ?? null,
        elo:       rating?.elo         ?? 1000,
        wins:      rating?.matches_won  ?? 0,
        losses:    rating?.matches_lost ?? 0,
        language:  prefLang,
      })
      setLoading(false)
    }
    load()
  }, [user?.id])

  useEffect(() => {
    if (player) setPlayer(p => ({ ...p, language: prefLang }))
  }, [prefLang])

  const goTo = (next, cb) => {
    setFading(true)
    setTimeout(() => { cb?.(); setScreen(next); setFading(false) }, FADE_MS)
  }

  const handleMatched = ({ match: m, opponent: opp }) => {
    setMatch(m); setOpponent(opp); goTo('arena')
  }
  const handleMatchEnd = (res) => {
    setResult(res); goTo('result')
  }

  if (loading || !player) {
    return (
      <div style={{
        height:'100%', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#080A0D', gap:16,
      }}>
        <style>{`@keyframes cwSpin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif",
          fontSize:28, letterSpacing:'0.1em', color:'#DC2626',
        }}>CODE WARS</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.1)',
            borderTopColor:'#DC2626', borderRadius:'50%',
            animation:'cwSpin 0.7s linear infinite' }}/>
          <span style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:10,
            color:'rgba(255,255,255,0.3)', letterSpacing:'0.15em',
          }}>LOADING INTEL...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height:'100%', overflow:'hidden',
      opacity: fading ? 0 : 1,
      transform: fading ? 'scale(0.99)' : 'none',
      transition:`opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
    }}>
      {screen === 'lobby'   && <Lobby player={player} prefLang={prefLang} onSetLang={setPrefLang} onQueue={() => goTo('waiting')} onBack={onBack} />}
      {screen === 'waiting' && <WaitingRoom player={player} onMatched={handleMatched} onCancel={() => goTo('lobby')} />}
      {screen === 'arena'   && match && <Arena match={match} player={player} opponent={opponent} onMatchEnd={handleMatchEnd} />}
      {screen === 'result'  && result && <ResultScreen outcome={result.outcome} match={result.match} problem={result.problem} player={player} opponent={opponent} onRematch={() => goTo('waiting')} onBack={() => goTo('lobby')} />}
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../services/supabaseClient'
import {
  toggleCommunityLike,
  getCommunityLikedPosts,
} from '../../../services/likeService'
import {
  createCommunityPost,
  deleteCommunityPost,
  uploadCommunityFile,
} from '../../../services/postService'
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // 🔥 best dark theme
import "prismjs/components/prism-javascript";

const C = {
  bg: '#0e0e0d',
  card: '#161615',
  border: '#252523',
  borderHover: '#2e2e2b',
  codeBg: '#0d0d10',
  cyan: '#00d4ff',
  green: '#00e676',
  amber: '#f5a623',
  purple: '#9c6fff',
  red: '#ff4c6a',
  textPrimary: '#e8edf5',
  textMid: '#c8d0e0',
  textMuted: '#7a8499',
  textDim: '#4a5568',
}
const MONO = "'Space Mono', monospace"
const SYNE = "'Syne', sans-serif"

const ACCENTS = [C.cyan, C.purple, C.green, C.amber, C.red]
function accentFor(id) {
  if (!id) return C.cyan
  return ACCENTS[parseInt(id[id.length - 1], 16) % ACCENTS.length]
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const SUGGESTIONS = [
  "What's a piece of code you wrote that you're genuinely proud of?",
  "Share a bug that took you way too long to find.",
  "What tool or library changed how you work forever?",
  "Show your dev setup — terminal, editor, everything.",
  "What's something you learned the hard way?",
  "What's the most useful thing you've ever googled as a dev?",
  "Show your first project vs something you built recently.",
  "What's your hottest take on modern web development?",
  "What's a resource that made you significantly better?",
  "Describe a technical decision you regret.",
]

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT
// Props:
//   communityId   string
//   currentUserId string | null
//   isAdmin       bool
//   profileMap    { [userId]: { full_name, avatar_url } }
// ════════════════════════════════════════════════════════════════
export default function PromptsTab({ communityId, currentUserId, isAdmin, profileMap = {} }) {
  const [prompts, setPrompts] = useState([])
  const [responses, setResponses] = useState({})   // { [promptId]: number | post[] }
  const [likedResponses, setLikedResponses] = useState({})   // { [postId]: bool }
  const [loadingPrompts, setLoadingPrompts] = useState(true)
  const [loadingResp, setLoadingResp] = useState({})
  const [expanded, setExpanded] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [respondTo, setRespondTo] = useState(null)
  const [activePromptId, setActivePromptId] = useState(null)

  useEffect(() => { fetchPrompts() }, [communityId])

  async function fetchPrompts() {
    setLoadingPrompts(true)
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('community_id', communityId)
      .eq('type', 'prompt')
      .order('created_at', { ascending: false })

    const list = data || []
    setPrompts(list)
    if (list.length > 0) setActivePromptId(list[0].id)

    const counts = {}
    await Promise.all(list.map(async (p) => {
      const { count } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('prompt_id', p.id)
      counts[p.id] = count ?? 0
    }))
    setResponses(prev => {
      const next = { ...prev }
      list.forEach(p => { if (!(p.id in next)) next[p.id] = counts[p.id] })
      return next
    })
    setLoadingPrompts(false)
  }

  async function loadResponses(promptId) {
    if (Array.isArray(responses[promptId])) return
    setLoadingResp(prev => ({ ...prev, [promptId]: true }))
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })

    const list = data || []
    setResponses(prev => ({ ...prev, [promptId]: list }))
    setLoadingResp(prev => ({ ...prev, [promptId]: false }))

    // Seed liked state — use getCommunityLikedPosts from likeService
    if (currentUserId && list.length > 0) {
      const ids = list.map(p => p.id)
      const likedSet = await getCommunityLikedPosts(currentUserId, ids)
      const seed = {}
      likedSet.forEach(postId => { seed[postId] = true })
      setLikedResponses(prev => ({ ...prev, ...seed }))
    }
  }

  function toggleExpand(promptId) {
    const nowOpen = !expanded[promptId]
    setExpanded(prev => ({ ...prev, [promptId]: nowOpen }))
    if (nowOpen) loadResponses(promptId)
  }

  // Like a response post
  async function handleLikeResponse(postId, currentLikes) {
    if (!currentUserId) return
    const already = likedResponses[postId] ?? false
    const nextLikes = Math.max(0, currentLikes + (already ? -1 : 1))

    // Optimistic update
    setLikedResponses(prev => ({ ...prev, [postId]: !already }))
    setResponses(prev => {
      const next = { ...prev }
      for (const [pid, val] of Object.entries(next)) {
        if (!Array.isArray(val)) continue
        next[pid] = val.map(p => p.id === postId ? { ...p, likes: nextLikes } : p)
      }
      return next
    })

    // Use toggleCommunityLike from likeService
    await toggleCommunityLike(postId, currentUserId, already)
    // Keep likes counter in sync (no DB trigger on community_posts.likes)
    await supabase.from('community_posts').update({ likes: nextLikes }).eq('id', postId)
  }

  function handlePromptCreated(newPrompt) {
    setPrompts(prev => [newPrompt, ...prev])
    setActivePromptId(newPrompt.id)
    setResponses(prev => ({ ...prev, [newPrompt.id]: [] }))
  }

  function handleResponseCreated(newPost) {
    const pid = newPost.prompt_id
    setResponses(prev => {
      const existing = prev[pid]
      if (Array.isArray(existing)) return { ...prev, [pid]: [newPost, ...existing] }
      return { ...prev, [pid]: (typeof existing === 'number' ? existing + 1 : 1) }
    })
    setExpanded(prev => ({ ...prev, [pid]: true }))
  }

  async function handleDeletePrompt(promptId) {
    // Use deleteCommunityPost from postService
    await deleteCommunityPost(promptId, currentUserId)
    setPrompts(prev => prev.filter(p => p.id !== promptId))
    if (activePromptId === promptId) {
      setActivePromptId(prompts.find(p => p.id !== promptId)?.id ?? null)
    }
  }

  const responseCount = (pid) => {
    const v = responses[pid]
    return Array.isArray(v) ? v.length : (typeof v === 'number' ? v : 0)
  }

  // Name/avatar resolution using profileMap from CommunityPageView
  // const resolveName   = (uid) => profileMap[uid]?.full_name  || `User ${(uid || '').slice(0, 8)}`
  const resolveName = (uid) => profileMap[uid]?.full_name || "Unknown User"
  const resolveAvatar = (uid) => profileMap[uid]?.avatar_url || null

  if (loadingPrompts) return <LoadingState />

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: SYNE, fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
            Prompt of the day
          </h2>
          <p style={{ fontFamily: MONO, fontSize: 12, color: C.textMuted, margin: 0 }}>
            {prompts.length === 0 ? 'No prompts yet' : `${prompts.length} prompt${prompts.length > 1 ? 's' : ''} · share yours`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)}
            style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: '9px 16px', background: `${C.cyan}15`, border: `1px solid ${C.cyan}50`, borderRadius: 9, color: C.cyan, cursor: 'pointer', letterSpacing: '0.05em', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.cyan}25`}
            onMouseLeave={e => e.currentTarget.style.background = `${C.cyan}15`}
          >+ new prompt</button>
        )}
      </div>

      {prompts.length === 0 && <EmptyState isAdmin={isAdmin} onNew={() => setShowCreate(true)} />}

      {prompts.map((prompt) => {
        const isActive = prompt.id === activePromptId
        const isOpen = expanded[prompt.id]
        const accent = accentFor(prompt.id)
        const count = responseCount(prompt.id)
        const respList = Array.isArray(responses[prompt.id]) ? responses[prompt.id] : []

        const hasResponded = Array.isArray(responses[prompt.id])
  ? responses[prompt.id].some(r => r.user_id === currentUserId)
  : false;

        return (
          <div key={prompt.id} style={{ marginBottom: 16 }}>
            <PromptBlock
              prompt={prompt} accent={accent} isActive={isActive}
              isAdmin={isAdmin} currentUserId={currentUserId}
              responseCount={count} isExpanded={isOpen}
              onToggleExpand={() => toggleExpand(prompt.id)}
              onRespond={() => setRespondTo(prompt)}
              onDelete={() => handleDeletePrompt(prompt.id)}
            />

            {isOpen && (
              <div style={{ borderLeft: `2px solid ${accent}30`, marginLeft: 20, paddingLeft: 20, marginTop: 2 }}>
                {loadingResp[prompt.id] ? (
                  <div style={{ padding: '16px 0', fontFamily: MONO, fontSize: 12, color: C.textMuted }}>loading responses…</div>
                ) : respList.length === 0 ? (
                  <div style={{ padding: '16px 0', fontFamily: MONO, fontSize: 12, color: C.textMuted }}>
                    No responses yet.{' '}
                    <span onClick={() => setRespondTo(prompt)} style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }}>Be the first.</span>
                  </div>
                ) : (
                  respList.map(r => (
                    <ResponseCard
                      key={r.id}
                      post={r}
                      accent={accent}
                      displayName={resolveName(r.user_id)}
                      avatarUrl={resolveAvatar(r.user_id)}
                      liked={likedResponses[r.id] ?? false}
                      currentUserId={currentUserId}
                      onLike={() => handleLikeResponse(r.id, r.likes ?? 0)}
                    />
                  ))
                )}
                {currentUserId && !hasResponded &&(
                  <button onClick={() => setRespondTo(prompt)}
                    style={{ marginTop: 10, fontFamily: MONO, fontSize: 12, padding: '8px 14px', background: 'transparent', border: `1px dashed ${accent}40`, borderRadius: 8, color: C.textMuted, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.color = C.textMuted }}
                  >+ share your answer</button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {showCreate && (
        <CreatePromptModal communityId={communityId} currentUserId={currentUserId}
          onClose={() => setShowCreate(false)} onCreated={handlePromptCreated} />
      )}
      {respondTo && (
        <RespondModal prompt={respondTo} communityId={communityId} currentUserId={currentUserId}
          onClose={() => setRespondTo(null)}
          onCreated={(post) => { handleResponseCreated(post); setRespondTo(null) }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PromptBlock
// ════════════════════════════════════════════════════════════════
function PromptBlock({ prompt, accent, isActive, isAdmin, currentUserId, responseCount, isExpanded, onToggleExpand, onRespond, onDelete }) {
  const [hov, setHov] = useState(false)
  return (
    <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.card, border: `1px solid ${hov ? C.borderHover : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}
    >
      <div style={{ height: 2, background: isActive ? `linear-gradient(90deg,${accent},${accent}00)` : `linear-gradient(90deg,${accent}40,${accent}00)` }} />
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: isActive ? `0 0 6px ${accent}80` : 'none' }} />
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: isActive ? accent : C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {isActive ? "Today's prompt" : 'Past prompt'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textDim }}>{timeAgo(prompt.created_at)}</span>
            {isAdmin && (
              <button onClick={onDelete}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 16, lineHeight: 1, padding: '0 2px', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = C.red}
                onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                title="Delete prompt"
              >×</button>
            )}
          </div>
        </div>

        <p style={{ fontFamily: SYNE, fontSize: 17, fontWeight: 600, color: C.textPrimary, margin: '0 0 14px', lineHeight: 1.5 }}>
          {prompt.text}
        </p>

        {prompt.tag && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, background: '#ffffff07', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 8px' }}>
              {prompt.tag}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={onToggleExpand}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 7, background: isExpanded ? `${accent}12` : '#ffffff06', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${accent}18`}
            onMouseLeave={e => e.currentTarget.style.background = isExpanded ? `${accent}12` : '#ffffff06'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span style={{ fontFamily: MONO, fontSize: 12, color: responseCount > 0 ? C.textMid : C.textMuted }}>
              {responseCount === 0 ? 'no responses yet' : `${responseCount} response${responseCount !== 1 ? 's' : ''}`}
            </span>
          </button>
          {currentUserId && (
            <button onClick={onRespond}
              style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: '7px 14px', background: `${accent}12`, border: `1px solid ${accent}40`, borderRadius: 8, color: accent, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.04em' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.borderColor = `${accent}80` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${accent}12`; e.currentTarget.style.borderColor = `${accent}40` }}
            >Share answer</button>
          )}
        </div>
      </div>
    </article>
  )
}

// ════════════════════════════════════════════════════════════════
// ResponseCard — real names, avatar, like button, expandable code,
//               image lightbox, share button
// ════════════════════════════════════════════════════════════════
function ResponseCard({ post, accent, displayName, avatarUrl, liked, currentUserId, onLike }) {
  const [codeExpanded, setCodeExpanded] = useState(false)
  const [imgExpanded, setImgExpanded] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const codeLines = (post.code || '').split('\n')
  const TRUNC = 12
  const isLong = codeLines.length > TRUNC

  function handleShare() {
    const url = `${window.location.origin}/community/${post.community_id}/post/${post.id}`
    navigator.clipboard?.writeText(url).catch(() => { })
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 8 }}>

      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${accent}40`, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${accent}25`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: accent, fontWeight: 700 }}>{initials}</span>
            </div>
          )}
          <span style={{ fontFamily: SYNE, fontSize: 13, fontWeight: 600, color: C.textMid }}>{displayName}</span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textDim }}>{timeAgo(post.created_at)}</span>
      </div>

      {/* Text */}
      {post.text && (
        <p style={{ fontFamily: SYNE, fontSize: 14, color: C.textMid, margin: '0 0 10px', lineHeight: 1.6 }}>
          {post.text}
        </p>
      )}

      {/* Code */}
      {post.code && (
        <div style={{ marginBottom: 10 }}>
          
          <pre style={{
  background: "#0e0e0d",
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  padding: '12px',
  overflowX: 'auto',
  margin: 0
}}>
  <code
    className="language-javascript"
    dangerouslySetInnerHTML={{
      __html: Prism.highlight(
        codeExpanded ? post.code : codeLines.slice(0, TRUNC).join('\n'),
        Prism.languages.javascript,
        'javascript'
      )
    }}
  />
</pre>
          {isLong && (
            <button onClick={() => setCodeExpanded(v => !v)}
              style={{ width: '100%', marginTop: 4, padding: '6px 0', background: 'transparent', border: `1px dashed ${C.border}`, borderRadius: 6, fontFamily: MONO, fontSize: 11, color: C.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted }}
            >
              {codeExpanded ? '▲ show less' : `▼ show ${codeLines.length - TRUNC} more lines`}
            </button>
          )}
        </div>
      )}

      {/* Image */}
      {post.file_url && post.type === 'image' && (
        <div style={{ marginBottom: 10 }}>
          <img src={post.file_url} alt="" onClick={() => setImgExpanded(true)}
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 7, border: `1px solid ${C.border}`, cursor: 'zoom-in', display: 'block' }}
          />
          {imgExpanded && (
            <div onClick={() => setImgExpanded(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
            >
              <img src={post.file_url} alt="" onClick={e => e.stopPropagation()}
                style={{ maxWidth: '88vw', maxHeight: '88vh', borderRadius: 10, objectFit: 'contain', cursor: 'default' }}
              />
              <button onClick={() => setImgExpanded(false)}
                style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          )}
        </div>
      )}

      {/* Project */}
      {post.project_title && (
        <div style={{ marginBottom: 10, padding: '9px 12px', background: '#ffffff05', border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <p style={{ fontFamily: MONO, fontSize: 12, color: accent, margin: '0 0 3px', fontWeight: 700 }}>{post.project_title}</p>
          {post.project_desc && <p style={{ fontFamily: SYNE, fontSize: 13, color: C.textMuted, margin: '0 0 5px' }}>{post.project_desc}</p>}
          {post.project_link && (
            <a href={post.project_link} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, color: C.cyan, textDecoration: 'none' }}>View project ↗</a>
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <button onClick={currentUserId ? onLike : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 7, border: 'none', background: liked ? 'rgba(248,113,113,0.12)' : 'transparent', color: liked ? '#f87171' : C.textDim, fontFamily: MONO, fontSize: 12, cursor: currentUserId ? 'pointer' : 'default', transition: 'all 0.15s' }}
          onMouseEnter={e => { if (currentUserId) { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' } }}
          onMouseLeave={e => { if (!liked) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textDim } }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {(post.likes ?? 0) > 0 && <span>{post.likes}</span>}
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={handleShare}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1px solid ${shareCopied ? 'rgba(0,230,118,0.3)' : 'rgba(99,102,241,0.2)'}`, background: shareCopied ? 'rgba(0,230,118,0.1)' : 'rgba(99,102,241,0.08)', color: shareCopied ? C.green : '#818cf8', fontFamily: MONO, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {shareCopied
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          }
          {shareCopied ? 'copied!' : 'Share'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CreatePromptModal
// ════════════════════════════════════════════════════════════════
function CreatePromptModal({ communityId, currentUserId, onClose, onCreated }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [suggIdx, setSuggIdx] = useState(null)
  const taRef = useRef(null)

  useEffect(() => {
    taRef.current?.focus()
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const MAX = 280
  const over = text.length > MAX
  const ok = text.trim().length > 8 && !over && !loading

  async function submit() {
    if (!ok) return
    
    setLoading(true); setError(null)
    // Use createCommunityPost from postService
    const { data, error: err } = await createCommunityPost(currentUserId, communityId, {
      type: 'prompt', text: text.trim(), tag: tag.trim() || null,
    })
    if (err) { setError(err.message); setLoading(false); return }
    onCreated(data)
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 520, overflow: 'hidden' }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,${C.cyan},${C.cyan}00)` }} />
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.cyan, letterSpacing: '0.1em', textTransform: 'uppercase' }}>New prompt of the day</span>
              <p style={{ fontFamily: SYNE, fontSize: 13, color: C.textMuted, margin: '3px 0 0' }}>Ask the community something worth answering.</p>
            </div>
            <CloseBtn onClick={onClose} />
          </div>

          <p style={{ fontFamily: MONO, fontSize: 11, color: C.textDim, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>Quick starts</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => { setText(s); setSuggIdx(i); taRef.current?.focus() }}
                style={{ fontFamily: MONO, fontSize: 11, padding: '4px 9px', borderRadius: 6, border: `1px solid ${suggIdx === i ? C.cyan + '60' : C.border}`, background: suggIdx === i ? `${C.cyan}10` : '#ffffff04', color: suggIdx === i ? C.cyan : C.textMuted, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, transition: 'all 0.12s' }}
              >{s.length > 42 ? s.slice(0, 42) + '…' : s}</button>
            ))}
          </div>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <textarea ref={taRef} value={text} rows={4}
              onChange={(e) => { setText(e.target.value); setSuggIdx(null) }}
              placeholder="Ask something the community will want to answer…"
              style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${text ? C.borderHover : C.border}`, borderRadius: 10, padding: '12px 14px', color: C.textPrimary, fontFamily: SYNE, fontSize: 16, lineHeight: 1.5, resize: 'vertical', outline: 'none', transition: 'border-color 0.15s' }}
            />
            <span style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: MONO, fontSize: 11, color: over ? C.red : C.textDim }}>{text.length}/{MAX}</span>
          </div>

          <input value={tag} onChange={(e) => setTag(e.target.value)}
            placeholder="Tag (optional) — e.g. #career, #debugging"
            style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.textMid, fontFamily: MONO, fontSize: 13, outline: 'none', marginBottom: 16 }}
          />

          {error && <p style={{ fontFamily: MONO, fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn onClick={submit} disabled={!ok} accent={C.cyan}>{loading ? 'Posting…' : 'Post prompt'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ════════════════════════════════════════════════════════════════
// RespondModal — text, code, image
// ════════════════════════════════════════════════════════════════
function RespondModal({ prompt, communityId, currentUserId, onClose, onCreated }) {
  const [activeType, setActiveType] = useState('text')
  const [text, setText] = useState('')
  const [code, setCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const accent = accentFor(prompt.id)

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const TYPES = [{ id: 'text', label: 'Text' }, { id: 'code', label: 'Code' }, { id: 'image', label: 'Image' }]

  const canSubmit = !loading && (
    activeType === 'text' ? text.trim().length > 0 :
      activeType === 'code' ? code.trim().length > 0 :
        activeType === 'image' ? imageFile != null : false
  )

  // ? responses[prompt.id].some(r => r.user_id === currentUserId)
  // : false;

  async function submit() {
    if (!canSubmit) return
    setLoading(true); setError(null)

    const { data: existing } = await supabase
    .from("community_posts")
    .select("id")
    .eq("prompt_id", prompt.id)
    .eq("user_id", currentUserId)
    .limit(1);

  if (existing && existing.length > 0) {
    setError("You have already responded to this prompt.");
    setLoading(false);
    return;
  }

    let file_url = null
    if (activeType === 'image' && imageFile) {
      // Use uploadCommunityFile from postService — bucket "community" handled internally
      const { url, error: upErr } = await uploadCommunityFile(`prompt-responses`, imageFile)
      if (upErr) { setError('Image upload failed.'); setLoading(false); return }
      file_url = url
    }

    const fields = {
      type: activeType,
      prompt_id: prompt.id,
      text: text.trim() || null,
      code: activeType === 'code' ? code.trim() : null,
      file_name: activeType === 'image' ? (imageFile?.name || null) : null,
      file_url: activeType === 'image' ? file_url : null,
    }
    // Use createCommunityPost from postService
    const { data, error: err } = await createCommunityPost(currentUserId, communityId, fields)
    if (err) { setError(err.message); setLoading(false); return }
    onCreated(data)
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 520, overflow: 'hidden' }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,${accent},${accent}00)` }} />
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Share your answer</span>
            <CloseBtn onClick={onClose} />
          </div>

          {/* Prompt context box */}
          <div style={{ padding: '12px 14px', background: `${accent}08`, border: `1px solid ${accent}25`, borderRadius: 10, marginBottom: 18 }}>
            <p style={{ fontFamily: SYNE, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0, lineHeight: 1.45 }}>{prompt.text}</p>
          </div>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setActiveType(t.id)}
                style={{ fontFamily: MONO, fontSize: 12, padding: '6px 14px', borderRadius: 7, border: `1px solid ${activeType === t.id ? accent + '60' : C.border}`, background: activeType === t.id ? `${accent}15` : 'transparent', color: activeType === t.id ? accent : C.textMuted, cursor: 'pointer', transition: 'all 0.12s' }}
              >{t.label}</button>
            ))}
          </div>

          {/* Text */}
          {(activeType === 'text' || activeType === 'code') && (
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder={activeType === 'text' ? 'Write your answer…' : 'Add context (optional)…'}
              rows={activeType === 'code' ? 2 : 5}
              style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px', color: C.textPrimary, fontFamily: SYNE, fontSize: 14, lineHeight: 1.55, resize: 'vertical', outline: 'none', marginBottom: 10 }}
            />
          )}

          {/* Code */}
          {activeType === 'code' && (
            <>
              <textarea value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="// paste your code here…"
                rows={8}
                style={{ width: '100%', boxSizing: 'border-box', background: C.codeBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px', color: C.textMid, fontFamily: MONO, fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none', marginBottom: 10 }}
              />
            </>
          )}

          {/* Image */}
          {activeType === 'image' && (
            <div style={{ marginBottom: 10 }}>
              {imageFile ? (
                <div style={{ position: 'relative' }}>
                  <img src={URL.createObjectURL(imageFile)} alt="preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }}
                  />
                  <button onClick={() => setImageFile(null)}
                    style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px', background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>🖼</span>
                  <div>
                    <p style={{ fontFamily: MONO, fontSize: 12, color: C.textMuted, margin: 0 }}>Click to upload an image</p>
                    <p style={{ fontFamily: MONO, fontSize: 11, color: C.textDim, margin: '2px 0 0' }}>jpg, png, webp, gif</p>
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0] || null)} style={{ display: 'none' }} />
                </label>
              )}
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Caption (optional)"
                style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.textMid, fontFamily: SYNE, fontSize: 14, outline: 'none', marginTop: 8 }}
              />
            </div>
          )}

          {error && <p style={{ fontFamily: MONO, fontSize: 12, color: C.red, marginBottom: 10 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn onClick={submit} disabled={!canSubmit} accent={accent}>{loading ? 'Posting…' : 'Post answer'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ── Shared primitives ─────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >{children}</div>
  )
}
function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 20, lineHeight: 1, padding: '0 2px', transition: 'color 0.15s', flexShrink: 0 }}
      onMouseEnter={e => e.currentTarget.style.color = C.textMuted}
      onMouseLeave={e => e.currentTarget.style.color = C.textDim}
    >×</button>
  )
}
function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ padding: '9px 16px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontFamily: MONO, fontSize: 12, cursor: 'pointer' }}
    >{children}</button>
  )
}
function PrimaryBtn({ onClick, disabled, accent, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '9px 20px', background: disabled ? '#ffffff05' : `${accent}18`, border: `1px solid ${disabled ? C.border : accent + '55'}`, borderRadius: 8, color: disabled ? C.textDim : accent, fontFamily: MONO, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', letterSpacing: '0.04em' }}
    >{children}</button>
  )
}
function LoadingState() {
  return <div style={{ padding: '48px 0', textAlign: 'center' }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.textMuted }}>Loading prompts…</p></div>
}
function EmptyState({ isAdmin, onNew }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.cyan}12`, border: `1px solid ${C.cyan}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8S4.41 14.5 8 14.5 14.5 11.59 14.5 8 11.59 1.5 8 1.5zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-4.5v.5a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75 1.25 1.25 0 100-2.5 1.25 1.25 0 00-1.25 1.25.75.75 0 01-1.5 0A2.75 2.75 0 018 2.25a2.75 2.75 0 012.75 2.75A2.75 2.75 0 018.75 7.5z" fill={C.cyan} />
        </svg>
      </div>
      <p style={{ fontFamily: SYNE, fontSize: 16, fontWeight: 600, color: C.textMid, margin: '0 0 8px' }}>No prompts yet</p>
      <p style={{ fontFamily: MONO, fontSize: 13, color: C.textMuted, margin: '0 0 20px' }}>
        {isAdmin ? 'Post the first prompt to get the community talking.' : "The community admin hasn't posted a prompt yet."}
      </p>
      {isAdmin && (
        <button onClick={onNew}
          style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: '10px 20px', background: `${C.cyan}15`, border: `1px solid ${C.cyan}50`, borderRadius: 9, color: C.cyan, cursor: 'pointer' }}
        >Post first prompt</button>
      )}
    </div>
  )
}
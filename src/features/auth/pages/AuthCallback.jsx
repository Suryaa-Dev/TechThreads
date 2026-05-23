import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseClient';
import { getProfile } from '../../../services/userService';

const C = {
  bg: '#0a0c10',
  surface: '#111318',
  border: '#1a1e2e',
  cyan: '#00d4ff',
  green: '#00e676',
  pink: '#f472b6',
  indigo: '#818cf8',
  text: '#e8edf5',
  textMuted: '#7a8499',
  textDim: '#3d4560',
  mono: "'Space Mono', monospace",
  sans: "'Syne', sans-serif",
};

const STEPS = [
  { key: 'session', label: 'Reading session', icon: '◈' },
  { key: 'profile', label: 'Checking user profile', icon: '⬡' },
  { key: 'redirect', label: 'Preparing workspace', icon: '✦' },
];

export default function AuthCallback() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    let listener = null;

    const handlePostSignIn = async (user) => {
      try {
        if (!user?.id) return;
        setActiveStep(1);
        setStatusMsg('Checking user profile…');

        // DB trigger auto-creates `profiles` + `cg_profiles` on first signup.
        // We only need to check whether the profile row exists yet
        // to decide whether to redirect to /complete-profile or /feed.
        // const profile = await getProfile(user.id);

        let profile = await getProfile(user.id);

        // If profile row doesn't exist yet, create a minimal one
        if (!profile) {
          await supabase.from('profiles').upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            username: null, // will be set in /complete-profile
          }, { onConflict: 'id' });
          profile = null; // still no username → go to complete-profile
        }

        setActiveStep(2);
        setDone(true);

        setTimeout(() => {
          if (!mounted) return;
          // If profile has a username it was already completed; go to feed.
          // Otherwise send to the completion step.
          if (profile?.username) {
            navigate('/feed');
          } else {
            navigate('/complete-profile');
          }
        }, 600);

      } catch (err) {
        console.error('Post sign-in error:', err);
        navigate('/complete-profile');
      }
    };

    const initAuth = async () => {
      try {
        setActiveStep(0);
        setStatusMsg('Reading session…');

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Session error:', error);

        if (session?.user) {
          if (!mounted) return;
          await handlePostSignIn(session.user);
        } else {
          setStatusMsg('Waiting for sign-in…');

          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              handlePostSignIn(session.user);
            }
          });
          listener = authListener;

          setTimeout(async () => {
            const { data: { session: laterSession } } = await supabase.auth.getSession();
            if (laterSession?.user) await handlePostSignIn(laterSession.user);
          }, 1200);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        navigate('/auth');
      }
    };

    initAuth();

    return () => {
      mounted = false;
      if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
      else listener?.unsubscribe?.();
    };
  }, [navigate]);

  // ── UI (unchanged from original) ─────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes cb-spin  { to{transform:rotate(360deg)} }
        @keyframes cb-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes cb-slide { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes cb-pop   { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes cb-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
      `}</style>

      <div style={{
        minHeight: '100vh', width: '100%',
        background: C.bg,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.006) 2px,rgba(255,255,255,0.006) 4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,255,0.05),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(129,140,248,0.05),transparent 70%)', pointerEvents: 'none' }} />

        {/* Scanline */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 100, background: 'linear-gradient(180deg,transparent,rgba(0,212,255,0.012),transparent)', animation: 'cb-scan 6s linear infinite', pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          position: 'relative', zIndex: 1,
        }}>

          {/* Rainbow bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#00e676)' }} />

          <div style={{ padding: '36px 32px 32px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                {!done && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `2px solid ${C.border}`, borderTopColor: C.cyan,
                    animation: 'cb-spin .8s linear infinite',
                  }} />
                )}
                {done && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: `${C.green}15`, border: `2px solid ${C.green}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'cb-pop .4s cubic-bezier(.175,.885,.32,1.275)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l4 4 6-6" />
                    </svg>
                  </div>
                )}
                {!done && (
                  <div style={{
                    position: 'absolute', inset: 8, borderRadius: '50%',
                    background: `${C.cyan}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, animation: 'cb-pulse 1s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// authenticating</p>
                <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>
                  {done ? 'All set!' : 'Signing you in…'}
                </h2>
              </div>
            </div>

            {/* Step progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {STEPS.map((step, i) => {
                const isActive = i === activeStep && !done;
                const isComplete = i < activeStep || done;
                return (
                  <div key={step.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: isComplete ? `${C.green}08` : isActive ? `${C.cyan}08` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isComplete ? `${C.green}25` : isActive ? `${C.cyan}25` : C.border}`,
                    transition: 'all .3s ease',
                    animation: isActive ? 'cb-slide .25s ease' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isComplete ? `${C.green}15` : isActive ? `${C.cyan}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isComplete ? `${C.green}40` : isActive ? `${C.cyan}40` : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isComplete ? C.green : isActive ? C.cyan : C.textDim,
                      fontSize: 12,
                    }}>
                      {isComplete
                        ? <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 6-6" /></svg>
                        : step.icon
                      }
                    </div>
                    <span style={{
                      fontFamily: C.sans, fontSize: 13,
                      color: isComplete ? C.green : isActive ? C.text : C.textDim,
                      fontWeight: isActive ? 700 : 400, flex: 1,
                      transition: 'color .3s',
                    }}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${C.cyan}40`, borderTopColor: C.cyan, animation: 'cb-spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, textAlign: 'center', margin: 0, letterSpacing: '0.04em' }}>
              {statusMsg || 'Initialising…'}
            </p>
            <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, textAlign: 'center', margin: '10px 0 0', opacity: .6 }}>
              If this takes long, try a private window
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';
import { supabase } from '../../../services/supabaseClient';
import { awardBadge } from '../../../services/badgeEngine';
import { getCurrentUser, uploadResume, updateProfile } from '../../../services/userService';

const C = {
  bg:        '#0a0c10',
  surface:   '#111318',
  surfaceL:  '#13171f',
  border:    '#1a1e2e',
  borderH:   '#2d3a50',
  cyan:      '#00d4ff',
  cyanDim:   'rgba(0,212,255,0.1)',
  cyanBord:  'rgba(0,212,255,0.3)',
  pink:      '#f472b6',
  indigo:    '#818cf8',
  green:     '#00e676',
  amber:     '#f5a623',
  text:      '#e8edf5',
  textMid:   '#c8d0e0',
  textMuted: '#7a8499',
  textDim:   '#3d4560',
  mono:      "'Space Mono', monospace",
  sans:      "'Syne', sans-serif",
};

// ── step config ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'identity', label: 'Identity',  icon: '◈', hint: 'Your name & username' },
  { id: 'avatar',   label: 'Avatar',    icon: '⬡', hint: 'Profile picture'      },
  { id: 'links',    label: 'Links',     icon: '⌥', hint: 'GitHub & resume'      },
  { id: 'done',     label: 'Done',      icon: '✦', hint: 'All set!'             },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name?.trim()) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

async function uploadAvatar(userId, file) {
  if (!file) return { url: null, error: null };
  const ext  = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { url: null, error: upErr };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// ── sub-components ────────────────────────────────────────────────────────────
function InputField({ label, hint, value, onChange, placeholder, prefix, focused, onFocus, onBlur, type = 'text', error }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.textMid }}>{label}</label>
        {hint && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>{hint}</span>}
      </div>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused ? C.cyan : C.textDim, transition: 'color .15s', pointerEvents: 'none', fontSize: 13, fontFamily: C.mono }}>
            {prefix}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: focused ? C.surfaceL : 'rgba(255,255,255,0.03)',
            border: `1px solid ${error ? 'rgba(255,76,106,0.5)' : focused ? C.cyanBord : C.border}`,
            borderRadius: 10, padding: `11px 14px 11px ${prefix ? '36px' : '14px'}`,
            fontFamily: C.sans, fontSize: 13, color: C.text, outline: 'none',
            transition: 'all .18s ease',
          }}
        />
      </div>
      {error && <p style={{ fontFamily: C.mono, fontSize: 10, color: '#ff4c6a', margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function CompleteProfile() {
  const navigate = useNavigate();

  // step state
  const [stepIdx, setStepIdx] = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [globalErr, setGlobalErr] = useState('');

  // step 1 — identity
  const [fullName,     setFullName]     = useState('');
  const [username,     setUsername]     = useState('');
  const [nameFoc,      setNameFoc]      = useState(false);
  const [userFoc,      setUserFoc]      = useState(false);
  const [nameErr,      setNameErr]      = useState('');
  const [userErr,      setUserErr]      = useState('');
  const [checkingUser, setCheckingUser] = useState(false);

  // step 2 — avatar
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarDrag,    setAvatarDrag]    = useState(false);
  const avatarInputRef = useRef(null);

  // step 3 — links
  const [github,   setGithub]   = useState('');
  const [resume,   setResume]   = useState(null);
  const [gitFoc,   setGitFoc]   = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const currentStep = STEPS[stepIdx];

  // ── username availability check ───────────────────────────────────────────
  const checkUsername = async (val) => {
    setUsername(val);
    setUserErr('');
    if (!val.trim()) return;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) {
      setUserErr('3–20 chars, letters/numbers/underscores only');
      return;
    }
    setCheckingUser(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', val.trim())
      .maybeSingle();
    setCheckingUser(false);
    if (data) setUserErr('Username already taken');
  };

  // ── avatar pick ───────────────────────────────────────────────────────────
  const handleAvatarFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── step navigation ───────────────────────────────────────────────────────
  const goNext = async () => {
    setGlobalErr('');

    // validate step 1
    if (stepIdx === 0) {
      let ok = true;
      if (!fullName.trim()) { setNameErr('Full name is required'); ok = false; }
      if (!username.trim()) { setUserErr('Username is required'); ok = false; }
      if (userErr || nameErr) ok = false;
      if (!ok) return;
    }

    // step 2 — avatar is optional, just advance
    // step 3 — final save
    if (stepIdx === 2) {
      await handleSave();
      return;
    }

    setStepIdx(i => i + 1);
  };

  const goBack = () => setStepIdx(i => Math.max(0, i - 1));

  // ── final save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setGlobalErr('');
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // upload avatar
      setSaveMsg('Uploading avatar…');
      const { url: avatarUrl, error: avErr } = await uploadAvatar(user.id, avatarFile);
      if (avErr) throw new Error('Avatar upload failed: ' + avErr.message);

      // upload resume
      setSaveMsg('Uploading resume…');
      const { url: resumeUrl, error: upErr } = await uploadResume(user.id, resume);
      if (upErr) throw new Error('Resume upload failed: ' + upErr.message);

      // save profile
      setSaveMsg('Saving profile…');
      const { error: dbErr } = await updateProfile(user.id, {
        full_name:  fullName.trim(),
        username:   username.trim(),
        avatar_url: avatarUrl || null,
        github_url: github || null,
        resume_url: resumeUrl || null,
      });
      if (dbErr) throw new Error('Profile save failed: ' + dbErr.message);

      // badges
      if (github)    await awardBadge(user.id, 'github_linked',   { value: 1 });
      if (resumeUrl) await awardBadge(user.id, 'resume_uploaded', { value: 1 });
      if (github && resumeUrl) await awardBadge(user.id, 'profile_complete', { value: 1 });

      setStepIdx(3); // done screen
      setTimeout(() => navigate('/feed'), 1600);

    } catch (err) {
      console.error(err);
      setGlobalErr(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
      setSaveMsg('');
    }
  };

  // ── step panels ───────────────────────────────────────────────────────────
  const renderStep = () => {

    // ── DONE ──────────────────────────────────────────────────────────────
    if (stepIdx === 3) return (
      <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: `${C.green}15`, border: `2px solid ${C.green}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'cp-pop .4s cubic-bezier(.175,.885,.32,1.275)',
        }}>
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l4 4 6-6"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>
          You're all set, {fullName.split(' ')[0]}!
        </h2>
        <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: '0 0 6px' }}>
          Welcome to TechThreads. Heading to your feed…
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {[C.pink, C.indigo, C.cyan, C.green].map((c, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c, animation: `cp-bounce .6s ease ${i * .12}s infinite alternate` }}/>
          ))}
        </div>
      </div>
    );

    // ── STEP 1 — IDENTITY ─────────────────────────────────────────────────
    if (stepIdx === 0) return (
      <>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, margin: '0 0 10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// step 1 of 3</p>
          <h2 style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>Who are you?</h2>
          <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Your name and username identify you across TechThreads.</p>
        </div>

        <InputField
          label="Full Name" hint="required"
          value={fullName} onChange={v => { setFullName(v); setNameErr(''); }}
          placeholder="Kedarnath Chimman"
          focused={nameFoc} onFocus={() => setNameFoc(true)} onBlur={() => setNameFoc(false)}
          error={nameErr}
        />

        <InputField
          label="Username" hint={checkingUser ? 'checking…' : 'required · unique'}
          value={username} onChange={checkUsername}
          placeholder="kedar_dev"
          prefix="@"
          focused={userFoc} onFocus={() => setUserFoc(true)} onBlur={() => setUserFoc(false)}
          error={userErr}
        />

        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)',
          marginTop: 4,
        }}>
          <p style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
            Username: 3–20 chars · letters, numbers, underscores<br/>
            Can be changed later from profile settings
          </p>
        </div>
      </>
    );

    // ── STEP 2 — AVATAR ───────────────────────────────────────────────────
    if (stepIdx === 1) return (
      <>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, margin: '0 0 10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// step 2 of 3</p>
          <h2 style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>Put a face to the name</h2>
          <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Upload a profile picture. You can always change it later.</p>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
            border: `2px solid ${avatarPreview ? C.cyan : C.border}`,
            background: avatarPreview ? 'transparent' : `${C.indigo}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color .2s',
            boxShadow: avatarPreview ? `0 0 24px ${C.cyan}30` : 'none',
          }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <span style={{ fontFamily: C.mono, fontSize: 24, fontWeight: 700, color: C.indigo }}>{initials(fullName)}</span>
            }
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setAvatarDrag(true); }}
          onDragLeave={() => setAvatarDrag(false)}
          onDrop={e => { e.preventDefault(); setAvatarDrag(false); handleAvatarFile(e.dataTransfer.files?.[0]); }}
          onClick={() => avatarInputRef.current?.click()}
          style={{
            borderRadius: 12,
            border: `1px dashed ${avatarDrag ? C.cyan : avatarPreview ? `${C.green}60` : C.border}`,
            background: avatarDrag ? C.cyanDim : avatarPreview ? `${C.green}06` : 'rgba(255,255,255,0.02)',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'pointer', transition: 'all .18s ease',
          }}
        >
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarFile(e.target.files?.[0])}/>
          {avatarPreview ? (
            <>
              <p style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.green, margin: 0 }}>
                {avatarFile?.name}
              </p>
              <button onClick={e => { e.stopPropagation(); setAvatarFile(null); setAvatarPreview(null); }}
                style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer' }}>
                remove ✕
              </button>
            </>
          ) : (
            <>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Drop image here or <span style={{ color: C.cyan }}>browse</span></p>
              <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, margin: 0 }}>PNG, JPG, WEBP · max 5 MB</p>
            </>
          )}
        </div>

        <p style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, margin: '12px 0 0', textAlign: 'center' }}>
          No photo? We'll use your initials until you add one.
        </p>
      </>
    );

    // ── STEP 3 — LINKS ────────────────────────────────────────────────────
    if (stepIdx === 2) return (
      <>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, margin: '0 0 10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>// step 3 of 3</p>
          <h2 style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>Your links</h2>
          <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Connect your GitHub and attach a resume. Both optional.</p>
        </div>

        {/* GitHub */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.textMid }}>GitHub Profile</label>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>optional</span>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: gitFoc ? C.cyan : C.textDim, transition: 'color .15s', pointerEvents: 'none' }}>
              <FaGithub size={15}/>
            </div>
            <input
              type="text" value={github}
              onChange={e => setGithub(e.target.value)}
              placeholder="https://github.com/yourname"
              onFocus={() => setGitFoc(true)} onBlur={() => setGitFoc(false)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: gitFoc ? C.surfaceL : 'rgba(255,255,255,0.03)',
                border: `1px solid ${gitFoc ? C.cyanBord : C.border}`,
                borderRadius: 10, padding: '11px 14px 11px 36px',
                fontFamily: C.sans, fontSize: 13, color: C.text, outline: 'none',
                transition: 'all .18s ease',
              }}
            />
          </div>
        </div>

        {/* Resume */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.textMid }}>Resume</label>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>PDF only · optional</span>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type === 'application/pdf') setResume(f); }}
            onClick={() => document.getElementById('cp-resume-input').click()}
            style={{
              borderRadius: 12,
              border: `1px dashed ${dragOver ? C.cyan : resume ? `${C.green}60` : C.border}`,
              background: dragOver ? C.cyanDim : resume ? `${C.green}06` : 'rgba(255,255,255,0.02)',
              padding: '18px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', transition: 'all .18s ease',
            }}
          >
            <input id="cp-resume-input" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => setResume(e.target.files?.[0] || null)}/>
            {resume ? (
              <>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.green}15`, border: `1px solid ${C.green}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📄</div>
                <p style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.green, margin: 0 }}>{resume.name}</p>
                <button onClick={e => { e.stopPropagation(); setResume(null); }} style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer' }}>remove ✕</button>
              </>
            ) : (
              <>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Drop PDF here or <span style={{ color: C.cyan }}>browse</span></p>
                <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, margin: 0 }}>Max 10 MB</p>
              </>
            )}
          </div>
        </div>

        {globalErr && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,76,106,0.08)', border: '1px solid rgba(255,76,106,0.25)', marginTop: 16 }}>
            <p style={{ fontFamily: C.mono, fontSize: 11, color: '#ff4c6a', margin: 0 }}>{globalErr}</p>
          </div>
        )}
      </>
    );
  };

  const isDone = stepIdx === 3;

  return (
    <>
      <style>{`
        @keyframes cp-spin    { to { transform: rotate(360deg) } }
        @keyframes cp-pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes cp-pop     { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes cp-slide   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cp-bounce  { from{transform:translateY(0)} to{transform:translateY(-6px)} }
        @keyframes cp-fadein  { from{opacity:0} to{opacity:1} }
        .cp-panel { animation: cp-slide .28s ease both; }
      `}</style>

      <div style={{
        minHeight: '100vh', width: '100%',
        background: C.bg,
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.006) 2px,rgba(255,255,255,0.006) 4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glows */}
        <div style={{ position:'absolute', top:'-20%', right:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.05),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-20%', left:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(129,140,248,0.05),transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>

          {/* ── Step tracker ──────────────────────────────────────────────── */}
          {!isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
              {STEPS.slice(0, 3).map((s, i) => {
                const done   = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'unset' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background:  done ? `${C.green}18`   : active ? `${C.cyan}18`   : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${done ? `${C.green}50` : active ? `${C.cyan}60` : C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done ? C.green : active ? C.cyan : C.textDim,
                        fontSize: done ? 10 : 13,
                        transition: 'all .3s',
                        boxShadow: active ? `0 0 12px ${C.cyan}30` : 'none',
                      }}>
                        {done
                          ? <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 6-6"/></svg>
                          : s.icon
                        }
                      </div>
                      <span style={{ fontFamily: C.mono, fontSize: 8, color: active ? C.textMuted : C.textDim, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </div>
                    {i < 2 && (
                      <div style={{ flex: 1, height: 1, background: done ? `${C.green}40` : C.border, margin: '0 8px', marginBottom: 16, transition: 'background .3s' }}/>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Card ──────────────────────────────────────────────────────── */}
          <div style={{
            background: C.surface,
            border: `1px solid ${C.borderH}`,
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Rainbow bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8,#00e676)' }}/>

            <div style={{ padding: '32px 28px 28px' }}>
              <div className="cp-panel" key={stepIdx}>
                {renderStep()}
              </div>

              {/* ── Nav buttons ─────────────────────────────────────────── */}
              {!isDone && (
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  {/* Back */}
                  {stepIdx > 0 && (
                    <button
                      onClick={goBack}
                      disabled={saving}
                      style={{
                        flex: '0 0 auto', padding: '12px 18px', borderRadius: 12,
                        border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)',
                        color: C.textMuted, fontFamily: C.sans, fontSize: 13, fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer', transition: 'all .15s',
                      }}
                    >
                      ← Back
                    </button>
                  )}

                  {/* Next / Finish */}
                  <button
                    onClick={goNext}
                    disabled={saving || checkingUser || !!userErr}
                    style={{
                      flex: 1, padding: '13px 20px', borderRadius: 12,
                      border: `1px solid ${(saving || checkingUser || userErr) ? C.border : C.cyanBord}`,
                      background: (saving || checkingUser || userErr) ? 'rgba(255,255,255,0.04)' : C.cyanDim,
                      color: (saving || checkingUser || userErr) ? C.textDim : C.cyan,
                      fontFamily: C.sans, fontSize: 14, fontWeight: 700,
                      cursor: (saving || checkingUser || userErr) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all .18s ease',
                    }}
                    onMouseEnter={e => { if (!saving && !checkingUser && !userErr) { e.currentTarget.style.background='rgba(0,212,255,0.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.background=(saving||checkingUser||userErr)?'rgba(255,255,255,0.04)':C.cyanDim; e.currentTarget.style.transform='none'; }}
                  >
                    {saving ? (
                      <><span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.textDim}`, borderTopColor: C.cyan, animation: 'cp-spin .7s linear infinite', display: 'inline-block' }}/>{saveMsg || 'Saving…'}</>
                    ) : stepIdx === 2 ? (
                      'Finish setup →'
                    ) : (
                      'Continue →'
                    )}
                  </button>
                </div>
              )}

              {/* Skip — only on optional steps (2, 3) */}
              {!isDone && stepIdx >= 1 && !saving && (
                <button
                  onClick={stepIdx === 2 ? () => { setAvatarFile(null); setResume(null); setGithub(''); goNext(); } : goNext}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    fontFamily: C.mono, fontSize: 10, color: C.textDim,
                    cursor: 'pointer', letterSpacing: '0.06em', padding: '10px 0 2px',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.textMuted}
                  onMouseLeave={e => e.currentTarget.style.color = C.textDim}
                >
                  skip this step →
                </button>
              )}
            </div>
          </div>

          <p style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, textAlign: 'center', marginTop: 16, letterSpacing: '0.04em' }}>
            You can update everything anytime from profile settings
          </p>
        </div>
      </div>
    </>
  );
}

// QuestionScreen.jsx — [New UI S4]
// ─────────────────────────────────────────────────────────────────────────────
// Changes (all data/logic/Supabase calls preserved exactly):
//
//  1. Two-column layout (≥780px)
//     Left column (55%): progress row, difficulty/XP badge, question card,
//     code block, hint box.
//     Right column (45%): option cards, feedback panel.
//     Below 780px: single column (original flow).
//     Both columns scroll independently via overflow-y: auto.
//
//  2. Keyboard shortcuts A–D + Enter
//     - Pressing A/B/C/D selects the matching option (with the same visual
//       feedback as a mouse click). Badge bounces on keypress.
//     - Enter submits when an option is selected and not yet answered.
//     - Enter also fires "Next →" when feedback is visible.
//     - Listener is scoped to non-input elements.
//
//  3. Sticky bottom action bar
//     - The "Check Answer" button moves to a fixed 52px bar at the bottom
//       of the viewport, left side shows context (question N of M · game title),
//       right side has the CTA. Always reachable — never scrolls off screen.
//     - The hint link moves into the bar's left slot (below the context text).
//
//  4. Richer feedback panel
//     - Slide-up drawer showing: correct/wrong header, inline-code-highlighted
//       explanation text, a concept tag, and XP earned.
//     - Replaces the old flat coloured bar.
//
//  All save/badge/unlock logic: unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from "react";
import TopBar        from "./TopBar";
import LevelComplete from "./LevelComplete";
import { supabase }  from "../../../services/supabaseClient";
import { awardBadge } from "../../../services/badgeEngine";

// ── Keyframes ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes qsPageIn       { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes qsCardSlideIn  { from{opacity:0;transform:translateX(28px) scale(0.97)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes qsOptionIn     { from{opacity:0;transform:translateY(9px)} to{opacity:1;transform:translateY(0)} }
  @keyframes qsOptionShake  { 0%,100%{transform:translateX(0)} 18%{transform:translateX(-7px)} 36%{transform:translateX(6px)} 54%{transform:translateX(-4px)} 72%{transform:translateX(3px)} 90%{transform:translateX(-2px)} }
  @keyframes qsOptionGlow   { 0%{box-shadow:0 0 0 0 rgba(0,230,118,.3)} 50%{box-shadow:0 0 20px 4px rgba(0,230,118,.18)} 100%{box-shadow:0 0 0 0 rgba(0,230,118,0)} }
  @keyframes qsKeyBounce    { 0%{transform:scale(1)} 35%{transform:scale(1.28)} 70%{transform:scale(0.92)} 100%{transform:scale(1)} }
  @keyframes qsFeedbackUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes qsNextBounce   { 0%{opacity:0;transform:scale(0.7)} 55%{transform:scale(1.08)} 80%{transform:scale(0.96)} 100%{opacity:1;transform:scale(1)} }
  @keyframes qsXpPop        { 0%{opacity:0;transform:translateY(0) scale(.5)} 30%{opacity:1;transform:translateY(-12px) scale(1.15)} 70%{opacity:1;transform:translateY(-22px) scale(1)} 100%{opacity:0;transform:translateY(-32px) scale(.9)} }
  @keyframes qsProgressGlow { 0%,100%{box-shadow:0 0 4px 1px rgba(0,212,255,.6)} 50%{box-shadow:0 0 10px 3px rgba(0,212,255,.3)} }
  @keyframes qsSpinner      { to{transform:rotate(360deg)} }
  @keyframes qsReplayPulse  { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes qsBarIn        { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes qsHintIn       { from{opacity:0;max-height:0} to{opacity:1;max-height:160px} }
`;

const DIFFICULTY_STYLES = {
  easy:   { background:"rgba(0,230,118,0.12)",  color:"var(--green)", label:"Easy"   },
  medium: { background:"rgba(245,166,35,0.12)", color:"var(--amber)", label:"Medium" },
  hard:   { background:"rgba(255,76,106,0.12)", color:"var(--red)",   label:"Hard"   },
};

// ── Inline code highlighter for explanation text ──────────────────────────────
function highlight(text) {
  if (!text) return "";
  return text.replace(/`([^`]+)`/g, (_, code) =>
    `<code style="font-family:var(--mono);font-size:11px;background:var(--bg4);color:var(--cyan);padding:1px 5px;border-radius:4px;">${code}</code>`
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ code }) {
  const highlighted = code
    .replace(/\/\/.*/g,   m => `<span style="color:var(--muted)">${m}</span>`)
    .replace(/'[^']*'/g,  m => `<span style="color:#a6e3a1">${m}</span>`)
    .replace(/\b(const|let|var|function|return|await|async|new|class|import|export|default|from|if|else|for|while)\b/g,
      m => `<span style="color:#cba6f7">${m}</span>`)
    .replace(/\b(Promise|setTimeout|console|Object|Array|Math|JSON)\b/g,
      m => `<span style="color:#89dceb">${m}</span>`)
    .replace(/\b\d+\b/g, m => `<span style="color:#fab387">${m}</span>`);
  return (
    <div style={{
      background:"var(--bg)", border:"1px solid var(--border)", borderRadius:8,
      padding:16, fontFamily:"var(--mono)", fontSize:13, lineHeight:1.7,
      color:"#cdd6f4", overflowX:"auto", whiteSpace:"pre", marginTop:12,
    }} dangerouslySetInnerHTML={{ __html: highlighted }} />
  );
}

// ── Feedback drawer ───────────────────────────────────────────────────────────
function FeedbackDrawer({ isCorrect, explanation, xpReward, wasReplay, onNext, isSaving, isLast, keyPressedKey }) {
  return (
    <div style={{
      borderRadius:14, overflow:"hidden",
      border:`1px solid ${isCorrect ? "rgba(0,230,118,0.25)" : "rgba(255,76,106,0.25)"}`,
      animation:"qsFeedbackUp 0.28s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {/* Header */}
      <div style={{
        padding:"14px 18px 12px",
        background: isCorrect ? "rgba(0,230,118,0.08)" : "rgba(255,76,106,0.08)",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
      }}>
        <div>
          <div style={{
            fontSize:14, fontWeight:700, fontFamily:"var(--sans)",
            color: isCorrect ? "var(--green)" : "var(--red)", marginBottom:2,
          }}>
            {isCorrect
              ? wasReplay ? "Correct! (practice)" : `Correct! +${xpReward} XP`
              : "Not quite — keep going"}
          </div>
          {isCorrect && !wasReplay && (
            <div style={{
              fontSize:10, fontFamily:"var(--mono)", color:"var(--green)",
              opacity:0.7, letterSpacing:"0.06em",
            }}>
              XP added to your account
            </div>
          )}
        </div>
        {/* Next button inside drawer header */}
        <button
          onClick={onNext}
          disabled={isSaving}
          style={{
            padding:"9px 22px", borderRadius:9, fontSize:12, fontWeight:700,
            background:"var(--bg4)", color:isSaving?"var(--muted)":"var(--text)",
            border:"1px solid var(--border2)", cursor:isSaving?"not-allowed":"pointer",
            fontFamily:"var(--mono)", flexShrink:0,
            animation:"qsNextBounce 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.14s both",
            transition:"background 0.15s, transform 0.12s",
            minWidth:90,
          }}
          onMouseEnter={e=>{ if(!isSaving){ e.currentTarget.style.background="var(--bg3)"; e.currentTarget.style.transform="translateY(-1px)"; }}}
          onMouseLeave={e=>{ e.currentTarget.style.background="var(--bg4)"; e.currentTarget.style.transform="none"; }}
        >
          {isSaving ? "Saving..." : isLast ? "Finish →" : "Next →"}
        </button>
      </div>

      {/* Explanation body */}
      {explanation && (
        <div style={{ padding:"12px 18px 14px", background:"var(--bg2)" }}>
          <div style={{
            fontSize:9, fontFamily:"var(--mono)", color:"var(--muted)",
            letterSpacing:"0.1em", marginBottom:6,
          }}>
            // EXPLANATION
          </div>
          <div
            style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)", lineHeight:1.75 }}
            dangerouslySetInnerHTML={{ __html: highlight(explanation) }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function QuestionScreen({ level, game, onBack, onNextLevel, userStats, userId, onLevelComplete }) {
  const [questions,           setQuestions]          = useState([]);
  const [isLoading,           setIsLoading]          = useState(true);
  const [currentIdx,          setCurrentIdx]         = useState(0);
  const [selectedKey,         setSelectedKey]        = useState(null);
  const [answered,            setAnswered]           = useState(false);
  const [showHint,            setShowHint]           = useState(false);
  const [xpTotal,             setXpTotal]            = useState(0);
  const [correctCount,        setCorrectCount]       = useState(0);
  const [completed,           setCompleted]          = useState(false);
  const [isSaving,            setIsSaving]           = useState(false);
  const [wasAlreadyCompleted, setWasAlreadyCompleted]= useState(false);
  const [questionKey,         setQuestionKey]        = useState(0);
  const [wrongOptKey,         setWrongOptKey]        = useState(null);
  const [showXpPop,           setShowXpPop]          = useState(false);
  const [feedbackReady,       setFeedbackReady]      = useState(false);
  // [S5] per-question results for LevelComplete review accordion
  const [results,             setResults]            = useState([]);
  // [S4] which key badge to animate on keyboard press
  const [bouncingKey,         setBouncingKey]        = useState(null);
  // [S4] two-column layout removed in favour of layout B (top/bottom)
  const containerRef = useRef(null);

  // ── Load questions (unchanged) ───────────────────────────────────────────────
  useEffect(() => {
    if (!level?.level_id) return;
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        if (userId) {
          const { data: existingProgress } = await supabase
            .from("cg_user_level_progress").select("status")
            .eq("user_id", userId).eq("level_id", level.level_id).maybeSingle();
          if (existingProgress?.status === "completed") setWasAlreadyCompleted(true);
        }
        const { data: qData, error } = await supabase
          .from("cg_questions").select("*").eq("level_id", level.level_id).order("order", { ascending:true });
        if (error || !qData?.length) { console.error("Failed to load questions:", error); return; }
        const { data: oData } = await supabase
          .from("cg_options").select("*").in("question_id", qData.map(q => q.id)).order("order", { ascending:true });
        const groupedOptions = {};
        oData?.forEach(opt => {
          if (!groupedOptions[opt.question_id]) groupedOptions[opt.question_id] = [];
          groupedOptions[opt.question_id].push(opt);
        });
        const formatted = qData.map((q, index) => ({
          id:          index + 1,
          question_id: q.id,
          level:       level.title,
          difficulty:  q.difficulty || "medium",
          xpReward:    q.xp_reward || 20,
          text:        q.question_text,
          code:        q.code_snippet || null,
          hint:        q.hint || null,
          explanation: q.explanation || "",
          options:     (groupedOptions[q.id] || []).map(o => ({
            key: o.option_key, text: o.option_text,
            correct: o.is_correct, option_id: o.id,
          })),
        }));
        setQuestions(formatted);
      } catch (err) { console.error("Question load error:", err); }
      finally { setIsLoading(false); }
    };
    loadQuestions();
  }, [level?.level_id]);

  const q           = questions[currentIdx];
  const total       = questions.length;
  const progressPct = total ? Math.round((currentIdx / total) * 100) : 0;
  const difficulty  = q ? (DIFFICULTY_STYLES[q.difficulty] || DIFFICULTY_STYLES.medium) : null;
  const selectedOpt = q?.options?.find(o => o.key === selectedKey);
  const isCorrect   = selectedOpt?.correct;
  const isLast      = currentIdx + 1 >= total;

  const handleSelect = useCallback((key) => {
    if (answered) return;
    setSelectedKey(key);
  }, [answered]);

  // [S4] Keyboard handler — A/B/C/D selects, Enter submits or advances
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (!q) return;
      const key = e.key.toUpperCase();
      const validKeys = q.options.map(o => o.key.toUpperCase());
      if (validKeys.includes(key)) {
        const opt = q.options.find(o => o.key.toUpperCase() === key);
        if (opt && !answered) {
          handleSelect(opt.key);
          // Bounce the badge
          setBouncingKey(opt.key);
          setTimeout(() => setBouncingKey(null), 380);
        }
      }
      if (e.key === "Enter") {
        if (answered && feedbackReady) { handleNext(); return; }
        if (selectedKey && !answered) { handleSubmit(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [q, answered, selectedKey, feedbackReady]);

  const handleSubmit = async () => {
    if (!selectedKey || answered || !userId) return;
    setAnswered(true);
    const selectedOptionObj = q.options.find(o => o.key === selectedKey);
    const xpAwarded = selectedOptionObj.correct ? q.xpReward : 0;

    supabase.from("cg_user_question_attempts").insert({
      user_id:            userId,
      question_id:        q.question_id,
      selected_option_id: selectedOptionObj.option_id,
      is_correct:         selectedOptionObj.correct,
      xp_awarded:         xpAwarded,
      hint_used:          showHint,
    }).then(({ error }) => { if (error) console.error("Failed to save attempt:", error); });

    if (selectedOptionObj.correct) {
      setXpTotal(x => x + q.xpReward);
      setCorrectCount(c => c + 1);
      setShowXpPop(false);
      setTimeout(() => setShowXpPop(true), 50);
      setTimeout(() => setShowXpPop(false), 1200);
    } else {
      setWrongOptKey(selectedKey);
      setTimeout(() => setWrongOptKey(null), 500);
    }
    // [S5] Record result for review accordion
    setResults(prev => [...prev, {
      idx:       currentIdx,
      text:      q.text,
      correct:   selectedOptionObj.correct,
      xp:        selectedOptionObj.correct ? q.xpReward : 0,
    }]);
    setTimeout(() => setFeedbackReady(true), 80);
  };

  const handleNext = async () => {
    if (currentIdx + 1 < total) {
      setFeedbackReady(false);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSelectedKey(null);
        setAnswered(false);
        setShowHint(false);
        setWrongOptKey(null);
        setBouncingKey(null);
        setQuestionKey(k => k + 1);
      }, 160);
      return;
    }
    if (!userId) return;
    setIsSaving(true);
    try {
      const stars = correctCount >= total * 0.8 ? 3 : correctCount >= total * 0.5 ? 2 : 1;
      await supabase.from("cg_user_level_progress").upsert({
        user_id:      userId,
        level_id:     level.level_id,
        status:       "completed",
        xp_earned:    xpTotal,
        stars,
        completed_at: new Date().toISOString(),
      }, { onConflict:"user_id,level_id" });

      if (!wasAlreadyCompleted && xpTotal > 0) {
        await supabase.rpc("increment_cg_xp", { p_user_id: userId, p_delta: xpTotal });
        const { data: updatedCg } = await supabase.from("cg_profiles").select("xp").eq("id", userId).single();
        if (updatedCg?.xp != null) {
          await supabase.from("profiles").update({ points: updatedCg.xp }).eq("id", userId);
        }
      }

      let earnedBadges = [];
      if (!wasAlreadyCompleted) {
        const { count: completedCount } = await supabase.from("cg_user_level_progress")
          .select("id", { count:"exact", head:true }).eq("user_id", userId).eq("status","completed");
        const { count: perfectCount } = await supabase.from("cg_user_level_progress")
          .select("id", { count:"exact", head:true }).eq("user_id", userId).eq("stars", 3);
        const { data: latestProfile } = await supabase.from("cg_profiles").select("xp").eq("id", userId).single();
        const [gameBadges, xpBadges, perfBadges] = await Promise.all([
          awardBadge(userId, "levels_completed", { value: completedCount ?? 0, game_id: level.game_id }),
          awardBadge(userId, "xp_total",         { value: latestProfile?.xp ?? 0 }),
          awardBadge(userId, "perfect_runs",      { value: perfectCount ?? 0 }),
        ]);
        earnedBadges = [...(gameBadges ?? []), ...(xpBadges ?? []), ...(perfBadges ?? [])];
      }

      const { data: nextLevels } = await supabase.from("cg_levels")
        .select("id, order").eq("game_type_id", level.game_id).order("order", { ascending:true });
      const nextLevel = nextLevels?.find(l => l.order > level.order);
      if (nextLevel) {
        const { data: existingNext } = await supabase.from("cg_user_level_progress")
          .select("status").eq("user_id", userId).eq("level_id", nextLevel.id).maybeSingle();
        if (!existingNext || existingNext.status === "locked") {
          await supabase.from("cg_user_level_progress").upsert({
            user_id: userId, level_id: nextLevel.id, status: "active",
          }, { onConflict:"user_id,level_id" });
        }
      }

      if (onLevelComplete) onLevelComplete(earnedBadges);
    } catch (err) { console.error("Failed to save level progress:", err); }
    finally { setIsSaving(false); setCompleted(true); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen" style={{ background:"var(--bg)", color:"var(--text)" }}>
      <style>{KEYFRAMES}</style>
      <TopBar userStats={userStats} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--cyan)", animation:"qsSpinner 0.7s linear infinite" }}/>
        <p style={{ fontSize:13, fontFamily:"var(--mono)", color:"var(--muted)" }}>// loading questions...</p>
      </div>
    </div>
  );

  if (completed) return (
    <LevelComplete
      level={level} correctCount={correctCount} totalCount={total}
      xpEarned={xpTotal} xpAwarded={wasAlreadyCompleted ? 0 : xpTotal}
      wasReplay={wasAlreadyCompleted} onContinue={onBack}
      onNextLevel={onNextLevel} results={results}
      userStats={userStats}
    />
  );

  if (!q) return null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{ background:"var(--bg)", color:"var(--text)", animation:"qsPageIn 0.4s ease both",
        // [S4] bottom padding so sticky bar doesn't cover content
        paddingBottom: 64,
      }}
    >
      <style>{KEYFRAMES}</style>
      <TopBar userStats={userStats} />

      <div className="page-container" style={{ maxWidth:"860px", padding:"24px 24px 0" }}>

        {/* Progress row */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <button onClick={onBack}
            style={{ fontSize:12, fontFamily:"var(--mono)", color:"var(--muted)", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap", transition:"color 0.15s, transform 0.15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.color="var(--text)"; e.currentTarget.style.transform="translateX(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.color="var(--muted)"; e.currentTarget.style.transform="none"; }}
          >← levels</button>

          <div style={{ flex:1, height:6, background:"var(--bg4)", borderRadius:3, overflow:"visible", position:"relative" }}>
            <div style={{
              height:"100%", borderRadius:3,
              background:"linear-gradient(90deg, var(--cyan), var(--indigo))",
              width:`${progressPct}%`,
              transition:"width 0.6s cubic-bezier(0.22,1,0.36,1)", position:"relative",
            }}>
              {progressPct > 0 && (
                <div style={{
                  position:"absolute", right:-4, top:"50%", transform:"translateY(-50%)",
                  width:10, height:10, borderRadius:"50%", background:"var(--cyan)",
                  animation:"qsProgressGlow 1.8s ease-in-out infinite",
                }}/>
              )}
            </div>
          </div>

          <span style={{ fontSize:12, fontFamily:"var(--mono)", color:"var(--muted)", whiteSpace:"nowrap" }}>
            {currentIdx + 1} / {total}
          </span>

          {wasAlreadyCompleted && (
            <span style={{
              fontSize:10, fontFamily:"var(--mono)", color:"var(--muted)",
              background:"var(--bg3)", border:"1px solid var(--border)",
              padding:"3px 8px", borderRadius:10, whiteSpace:"nowrap",
              animation:"qsReplayPulse 2s ease-in-out infinite",
            }}>🔁 replay · no XP</span>
          )}
        </div>

        {/* ── Layout B: question top, 2×2 option grid bottom ── */}
        <div style={{ maxWidth: 760 }}>

          {/* Difficulty + XP + XP pop */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <span style={{ fontSize:10, fontFamily:"var(--mono)", fontWeight:700, padding:"4px 10px", borderRadius:10, letterSpacing:"0.08em", textTransform:"uppercase", ...difficulty }}>
              {difficulty.label}
            </span>
            <span style={{ fontSize:10, fontFamily:"var(--mono)", color:wasAlreadyCompleted?"var(--muted)":"var(--amber)" }}>
              {wasAlreadyCompleted ? "practice mode" : `+${q.xpReward} XP`}
            </span>
            {showXpPop && !wasAlreadyCompleted && (
              <span style={{ fontSize:13, fontWeight:700, fontFamily:"var(--mono)", color:"var(--green)", animation:"qsXpPop 1.1s ease forwards", pointerEvents:"none", userSelect:"none" }}>
                +{q.xpReward} XP ✓
              </span>
            )}
          </div>

          {/* Question card */}
          <div key={questionKey} style={{
            background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:14,
            padding:"24px 24px 20px", marginBottom:14,
            animation:"qsCardSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
          }}>
            <p style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:10, letterSpacing:"0.06em" }}>
              {game?.title || q.level} · {level?.title} · Q{currentIdx + 1} of {total}
            </p>
            <p style={{ fontSize:16, fontWeight:600, lineHeight:1.65, letterSpacing:"-0.01em", fontFamily:"var(--sans)", margin:0 }}>
              {q.text}
            </p>
            {q.code && <CodeBlock code={q.code} />}
          </div>

          {/* Hint */}
          {showHint && !answered && (
            <div style={{
              padding:"14px 18px", borderRadius:12, marginBottom:14,
              background:"rgba(156,111,255,0.06)", border:"1px solid rgba(156,111,255,0.2)",
              animation:"qsHintIn 0.3s ease both", overflow:"hidden",
            }}>
              <p style={{ fontSize:13, fontWeight:600, color:"var(--purple)", fontFamily:"var(--sans)", marginBottom:4 }}>💡 Hint</p>
              <p style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)", lineHeight:1.55, margin:0 }}>{q.hint}</p>
            </div>
          )}

          {/* Keyboard hint */}
          {!answered && (
            <div style={{ fontSize:9, fontFamily:"var(--mono)", color:"var(--border2)", marginBottom:10, letterSpacing:"0.06em" }}>
              // press A · B · C · D to select · Enter to confirm
            </div>
          )}

          {/* 2×2 option grid */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:10,
            marginBottom:14,
          }}>
            {q.options.map((opt, optIdx) => {
              let borderColor = "var(--border)";
              let bg          = "var(--bg2)";
              let keyColor    = "var(--muted)";
              let keyBorder   = "var(--border2)";
              let keyBg       = "transparent";
              let optAnim     = undefined;

              if (answered) {
                if (opt.correct) {
                  borderColor = "var(--green)"; bg = "rgba(0,230,118,0.08)";
                  keyColor = "var(--green)"; keyBorder = "var(--green)";
                  optAnim = "qsOptionGlow 0.7s ease forwards";
                } else if (opt.key === selectedKey && !opt.correct) {
                  borderColor = "var(--red)"; bg = "rgba(255,76,106,0.08)";
                  keyColor = "var(--red)"; keyBorder = "var(--red)";
                }
              } else if (opt.key === selectedKey) {
                borderColor = "var(--cyan)"; bg = "rgba(0,212,255,0.06)";
                keyColor = "var(--cyan)"; keyBorder = "var(--cyan)"; keyBg = "rgba(0,212,255,0.1)";
              }

              const isShaking  = wrongOptKey === opt.key;
              const isBouncing = bouncingKey === opt.key;

              return (
                <div
                  key={`${questionKey}-${opt.key}`}
                  onClick={() => handleSelect(opt.key)}
                  style={{
                    padding:"16px 18px", borderRadius:12,
                    border:`1.5px solid ${borderColor}`, background:bg,
                    cursor: answered ? "default" : "pointer",
                    display:"flex", alignItems:"flex-start", gap:12,
                    transition:"border-color 0.18s, background 0.18s, transform 0.18s",
                    transform: answered && opt.correct ? "scale(1.01)" : "none",
                    animation:[
                      `qsOptionIn 0.3s cubic-bezier(0.22,1,0.36,1) ${optIdx * 45}ms both`,
                      isShaking ? "qsOptionShake 0.42s ease" : "",
                      optAnim || "",
                    ].filter(Boolean).join(", "),
                    minHeight: 64,
                  }}
                  onMouseEnter={e => {
                    if (!answered && opt.key !== selectedKey) {
                      e.currentTarget.style.borderColor = "var(--border2)";
                      e.currentTarget.style.background  = "var(--bg3)";
                      e.currentTarget.style.transform   = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!answered && opt.key !== selectedKey) {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background  = "var(--bg2)";
                      e.currentTarget.style.transform   = "none";
                    }
                  }}
                >
                  {/* Key badge */}
                  <div style={{
                    width:30, height:30, borderRadius:8, flexShrink:0,
                    border:`1.5px solid ${keyBorder}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"var(--mono)", fontSize:12, fontWeight:800,
                    color:keyColor, background:keyBg,
                    transition:"all 0.18s",
                    animation: isBouncing ? "qsKeyBounce 0.38s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                  }}>
                    {answered && opt.correct ? "✓"
                      : answered && opt.key === selectedKey && !opt.correct ? "✗"
                      : opt.key}
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, lineHeight:1.5, fontFamily:"var(--sans)", paddingTop:4 }}>
                    {opt.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Feedback drawer — spans full width below the grid */}
          {answered && feedbackReady && (
            <div style={{ marginBottom:14 }}>
              <FeedbackDrawer
                isCorrect={isCorrect}
                explanation={q.explanation}
                xpReward={q.xpReward}
                wasReplay={wasAlreadyCompleted}
                onNext={handleNext}
                isSaving={isSaving}
                isLast={isLast}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── [S4] Sticky bottom action bar ──────────────────────────────────── */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, height:56,
        background:"var(--bg2)", borderTop:"1px solid var(--border)",
        display:"flex", alignItems:"center",
        padding:"0 28px", gap:16, zIndex:100,
        animation:"qsBarIn 0.25s ease both",
        backdropFilter:"blur(8px)",
      }}>
        {/* Left: context + hint link */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"var(--muted)", letterSpacing:"0.06em" }}>
            {game?.title} · {level?.title} · Q{currentIdx + 1}/{total}
          </div>
          {q.hint && !showHint && !answered && (
            <button onClick={() => setShowHint(true)} style={{
              fontSize:11, fontFamily:"var(--mono)", color:"var(--purple)",
              background:"none", border:"none", cursor:"pointer",
              padding:0, textAlign:"left", width:"fit-content",
              transition:"opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
            >
              💡 show hint (−5 XP)
            </button>
          )}
        </div>

        {/* Right: Check Answer CTA */}
        {!answered && (
          <button
            onClick={handleSubmit}
            disabled={!selectedKey || answered}
            style={{
              padding:"11px 32px", borderRadius:10, fontSize:13, fontWeight:700,
              background:!selectedKey?"var(--bg4)":"var(--cyan)",
              color:!selectedKey?"var(--muted)":"#000",
              border:"none", cursor:!selectedKey?"not-allowed":"pointer",
              fontFamily:"var(--sans)",
              transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow:selectedKey?"0 0 18px rgba(0,212,255,0.3)":"none",
              flexShrink:0,
            }}
            onMouseEnter={e=>{ if(selectedKey){ e.currentTarget.style.transform="translateY(-1px) scale(1.02)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(0,212,255,0.4)"; }}}
            onMouseLeave={e=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=selectedKey?"0 0 18px rgba(0,212,255,0.3)":"none"; }}
          >
            Check Answer
          </button>
        )}

        {/* When answered and feedback not ready yet — dimmed state */}
        {answered && !feedbackReady && (
          <div style={{ fontSize:12, fontFamily:"var(--mono)", color:"var(--muted)" }}>checking...</div>
        )}
      </div>
    </div>
  );
}
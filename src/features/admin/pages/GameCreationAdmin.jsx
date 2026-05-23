import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../services/supabaseClient";

// ─── tiny design tokens (matches the app's CSS vars) ──────────────────────────
const S = {
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid var(--border)", background: "rgba(10,12,16,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 },
  mono: { fontFamily: "var(--mono)" },
  card: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px 24px" },
  input: { width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "8px", padding: "10px 14px", color: "var(--text)", fontFamily: "var(--sans)", fontSize: "13px", outline: "none", boxSizing: "border-box" },
  label: { fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "6px", display: "block" },
  btnPrimary: { padding: "10px 22px", borderRadius: "9px", fontSize: "13px", fontWeight: 700, background: "var(--cyan)", color: "#000", border: "none", cursor: "pointer", fontFamily: "var(--sans)", transition: "opacity 0.15s" },
  btnSecondary: { padding: "10px 22px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)", cursor: "pointer", fontFamily: "var(--sans)", transition: "background 0.15s" },
  btnDanger: { padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, background: "rgba(255,76,106,0.12)", color: "var(--red)", border: "1px solid rgba(255,76,106,0.25)", cursor: "pointer", fontFamily: "var(--sans)" },
  section: { marginBottom: "32px" },
  row: { display: "flex", gap: "12px", alignItems: "flex-start" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontFamily: "var(--mono)", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: `rgba(${color},0.12)`, color: `rgb(${color})` }),
};

const ICONS = ["🧠", "🐛", "⚛️", "📊", "🎨", "🔷", "🚀", "🔥", "⚡", "🏗️", "🔬", "🎯", "🛠️", "🧩", "💡"];
const COLORS = ["cyan", "amber", "purple", "green", "pink", "blue", "red", "orange"];
const TAGS = ["MCQ", "TIMED", "CODING", "QUIZ"];
const DIFFICULTIES = ["easy", "medium", "hard"];

// ─── toast notification ───────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  if (!msg) return null;
  const colors = { success: ["0,230,118", "var(--green)"], error: ["255,76,106", "var(--red)"], info: ["0,212,255", "var(--cyan)"] };
  const [bg, text] = colors[type] || colors.info;
  return (
    <div style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 9999, padding: "13px 20px", borderRadius: "12px", background: `rgba(${bg},0.12)`, border: `1px solid rgba(${bg},0.3)`, color: text, fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 600, animation: "slideUp 0.25s ease-out", maxWidth: "340px" }}>
      {msg}
    </div>
  );
}

// ─── confirm dialog ───────────────────────────────────────────────────────────
function Confirm({ msg, onYes, onNo }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...S.card, maxWidth: "380px", width: "90%" }}>
        <p style={{ fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>{msg}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button style={S.btnSecondary} onClick={onNo}>Cancel</button>
          <button style={{ ...S.btnDanger, padding: "10px 20px" }} onClick={onYes}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Game Type", "Levels", "Questions"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "28px" }}>
      {steps.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, background: done ? "var(--green)" : active ? "var(--cyan)" : "var(--bg3)", color: done ? "#000" : active ? "#000" : "var(--muted)", border: `2px solid ${done ? "var(--green)" : active ? "var(--cyan)" : "var(--border)"}`, transition: "all 0.2s" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "10px", fontFamily: "var(--mono)", color: active ? "var(--text)" : "var(--muted)", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: "2px", background: done ? "var(--green)" : "var(--border)", margin: "0 8px", marginBottom: "16px", transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "18px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h2>
        {sub && <p style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--mono)", marginTop: "3px" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── field with label ─────────────────────────────────────────────────────────
function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}{required && <span style={{ color: "var(--red)", marginLeft: "3px" }}>*</span>}</label>
      {children}
    </div>
  );
}

// ─── option row inside question form ─────────────────────────────────────────
function OptionRow({ opt, idx, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: opt.is_correct ? "rgba(0,230,118,0.15)" : "var(--bg3)", border: `1.5px solid ${opt.is_correct ? "var(--green)" : "var(--border2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, fontFamily: "var(--mono)", color: opt.is_correct ? "var(--green)" : "var(--muted)", flexShrink: 0 }}>
        {opt.option_key}
      </div>
      <input
        style={{ ...S.input, flex: 1 }}
        placeholder={`Option ${opt.option_key} text`}
        value={opt.option_text}
        onChange={(e) => onChange(idx, "option_text", e.target.value)}
      />
      <button
        type="button"
        onClick={() => onChange(idx, "is_correct", !opt.is_correct)}
        style={{ padding: "7px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: opt.is_correct ? "rgba(0,230,118,0.15)" : "var(--bg3)", color: opt.is_correct ? "var(--green)" : "var(--muted)", border: `1px solid ${opt.is_correct ? "rgba(0,230,118,0.3)" : "var(--border)"}`, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "var(--mono)" }}
      >
        {opt.is_correct ? "✓ Correct" : "Mark ✓"}
      </button>
      {canRemove && (
        <button type="button" onClick={() => onRemove(idx)} style={{ ...S.btnDanger, padding: "6px 10px", flexShrink: 0 }}>✕</button>
      )}
    </div>
  );
}

// ─── question form (used in both create and edit) ─────────────────────────────
function QuestionForm({ levelId, initial, onSaved, onCancel }) {
  const ALPHA = ["A", "B", "C", "D", "E"];
  const initOptions = initial?.options?.length
    ? initial.options
    : ["A", "B", "C", "D"].map((k, i) => ({ option_key: k, option_text: "", is_correct: false, order: i + 1 }));

  const [form, setForm] = useState({
    question_text: initial?.question_text || "",
    code_snippet: initial?.code_snippet || "",
    difficulty: initial?.difficulty || "easy",
    xp_reward: initial?.xp_reward || 10,
    hint: initial?.hint || "",
    explanation: initial?.explanation || "",
    order: initial?.order || 1,
  });
  const [options, setOptions] = useState(initOptions);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const updateOpt = (idx, key, val) => {
    setOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [key]: val } : o));
  };
  const removeOpt = (idx) => setOptions((prev) => prev.filter((_, i) => i !== idx));
  const addOpt = () => {
    if (options.length >= 5) return;
    const key = ALPHA[options.length];
    setOptions((prev) => [...prev, { option_key: key, option_text: "", is_correct: false, order: options.length + 1 }]);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) return setErr("Question text is required.");
    if (!options.some((o) => o.is_correct)) return setErr("At least one option must be marked correct.");
    if (options.some((o) => !o.option_text.trim())) return setErr("All option texts must be filled.");
    setErr("");
    setSaving(true);
    try {
      let questionId = initial?.id;
      if (initial?.id) {
        await supabase.from("cg_questions").update({ ...form }).eq("id", initial.id);
        await supabase.from("cg_options").delete().eq("question_id", initial.id);
      } else {
        const { data, error } = await supabase.from("cg_questions").insert({ ...form, level_id: levelId }).select().single();
        if (error) throw error;
        questionId = data.id;
      }
      const optsToInsert = options.map((o, i) => ({ question_id: questionId, option_key: o.option_key, option_text: o.option_text, is_correct: o.is_correct, order: i + 1 }));
      await supabase.from("cg_options").insert(optsToInsert);
      onSaved();
    } catch (e) {
      setErr(e.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.card, marginBottom: "16px", borderColor: "var(--border2)" }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <Field label="Question Text" required>
            <textarea
              style={{ ...S.input, minHeight: "70px", resize: "vertical" }}
              placeholder="e.g. What does typeof null return?"
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
            />
          </Field>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "140px" }}>
          <Field label="Difficulty">
            <select style={S.input} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="XP Reward">
            <input type="number" style={S.input} value={form.xp_reward} min={1} max={500} onChange={(e) => setForm((f) => ({ ...f, xp_reward: parseInt(e.target.value) || 10 }))} />
          </Field>
          <Field label="Order">
            <input type="number" style={S.input} value={form.order} min={1} onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
          </Field>
        </div>
      </div>

      <Field label="Code Snippet (optional)">
        <textarea
          style={{ ...S.input, minHeight: "60px", resize: "vertical", fontFamily: "var(--mono)", fontSize: "12px" }}
          placeholder="const x = ..."
          value={form.code_snippet}
          onChange={(e) => setForm((f) => ({ ...f, code_snippet: e.target.value }))}
        />
      </Field>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <Field label="Hint (optional)">
            <input style={S.input} placeholder="Hint shown to user on request" value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Explanation (shown after answer)">
            <input style={S.input} placeholder="Why is the correct answer correct?" value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} />
          </Field>
        </div>
      </div>

      {/* Options */}
      <div style={{ marginTop: "4px" }}>
        <label style={{ ...S.label, marginBottom: "10px" }}>Answer Options <span style={{ color: "var(--red)" }}>*</span></label>
        {options.map((opt, idx) => (
          <OptionRow key={idx} opt={opt} idx={idx} onChange={updateOpt} onRemove={removeOpt} canRemove={options.length > 2} />
        ))}
        {options.length < 5 && (
          <button type="button" onClick={addOpt} style={{ ...S.btnSecondary, fontSize: "12px", padding: "6px 14px", marginTop: "4px" }}>
            + Add Option
          </button>
        )}
      </div>

      {err && <p style={{ color: "var(--red)", fontSize: "12px", fontFamily: "var(--mono)", marginTop: "12px" }}>⚠ {err}</p>}

      <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : initial?.id ? "Update Question" : "Save Question"}
        </button>
        <button onClick={onCancel} style={S.btnSecondary}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function GameCreationAdmin() {
  const [step, setStep] = useState(0); // 0=games, 1=levels, 2=questions
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // data
  const [games, setGames] = useState([]);
  const [levels, setLevels] = useState([]);
  const [questions, setQuestions] = useState([]);

  // selections
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);

  // forms
  const [showGameForm, setShowGameForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [showQForm, setShowQForm] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);
  const [editingQ, setEditingQ] = useState(null);

  const [loading, setLoading] = useState(false);

  const notify = (msg, type = "success") => setToast({ msg, type });

  // After any question is saved or deleted, recalculate level xp_reward
const recalcLevelXp = async (levelId) => {
  const { data: qs } = await supabase
    .from("cg_questions")
    .select("xp_reward")
    .eq("level_id", levelId);

  const total = (qs || []).reduce((sum, q) => sum + (q.xp_reward || 0), 0);

  await supabase
    .from("cg_levels")
    .update({ xp_reward: total })
    .eq("id", levelId);
};

  // ── load games ──────────────────────────────────────────────────────────────
  const loadGames = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("cg_game_types").select("*").order("order", { ascending: true });
    setGames(data || []);
    setLoading(false);
  }, []);

  // ── load levels for selected game ───────────────────────────────────────────
  const loadLevels = useCallback(async (gameId) => {
    setLoading(true);
    const { data } = await supabase.from("cg_levels").select("*").eq("game_type_id", gameId).order("order", { ascending: true });
    setLevels(data || []);
    setLoading(false);
  }, []);

  // ── load questions + options for selected level ──────────────────────────────
  const loadQuestions = useCallback(async (levelId) => {
    setLoading(true);
    const { data: qData } = await supabase.from("cg_questions").select("*").eq("level_id", levelId).order("order", { ascending: true });
    const { data: oData } = await supabase.from("cg_options").select("*").in("question_id", (qData || []).map((q) => q.id)).order("order", { ascending: true });
    const grouped = {};
    oData?.forEach((o) => { if (!grouped[o.question_id]) grouped[o.question_id] = []; grouped[o.question_id].push(o); });
    setQuestions((qData || []).map((q) => ({ ...q, options: grouped[q.id] || [] })));
    setLoading(false);
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);

  // ─── game form state ────────────────────────────────────────────────────────
  const [gameForm, setGameForm] = useState({ title: "", description: "", icon: "🧠", color: "cyan", tag: "MCQ", badge: "", xp_per_level: 120, order: 1, is_active: true });
  const [gameErr, setGameErr] = useState("");

  const openGameForm = (g = null) => {
    if (g) {
      setGameForm({ title: g.title, description: g.description || "", icon: g.icon || "🧠", color: g.color || "cyan", tag: g.tag || "MCQ", badge: g.badge || "", xp_per_level: g.xp_per_level || 120, order: g.order || 1, is_active: g.is_active ?? true });
      setEditingGame(g);
    } else {
      setGameForm({ title: "", description: "", icon: "🧠", color: "cyan", tag: "MCQ", badge: "", xp_per_level: 120, order: games.length + 1, is_active: true });
      setEditingGame(null);
    }
    setShowGameForm(true);
    setGameErr("");
  };

  const saveGame = async () => {
    if (!gameForm.title.trim()) return setGameErr("Title is required.");
    setGameErr("");
    try {
      if (editingGame) {
        await supabase.from("cg_game_types").update(gameForm).eq("id", editingGame.id);
        notify("Game type updated ✓");
      } else {
        await supabase.from("cg_game_types").insert(gameForm);
        notify("Game type created ✓");
      }
      setShowGameForm(false);
      loadGames();
    } catch (e) { setGameErr(e.message); }
  };

  const deleteGame = (g) => {
    setConfirm({
      msg: `Delete "${g.title}"? This will also delete all its levels and questions.`,
      onYes: async () => {
        // cascade via FK or manual
        const { data: lvls } = await supabase.from("cg_levels").select("id").eq("game_type_id", g.id);
        for (const l of lvls || []) {
          const { data: qs } = await supabase.from("cg_questions").select("id").eq("level_id", l.id);
          for (const q of qs || []) await supabase.from("cg_options").delete().eq("question_id", q.id);
          await supabase.from("cg_questions").delete().eq("level_id", l.id);
          await supabase.from("cg_user_level_progress").delete().eq("level_id", l.id);
        }
        await supabase.from("cg_levels").delete().eq("game_type_id", g.id);
        await supabase.from("cg_game_types").delete().eq("id", g.id);
        setConfirm(null);
        notify("Deleted.", "error");
        if (selectedGame?.id === g.id) { setSelectedGame(null); setStep(0); }
        loadGames();
      },
      onNo: () => setConfirm(null),
    });
  };

  // ─── level form state ───────────────────────────────────────────────────────
  const [levelForm, setLevelForm] = useState({ title: "", description: "", order: 1, xp_reward: 100, difficulty: "easy", is_active: true });
  const [levelErr, setLevelErr] = useState("");

  const openLevelForm = (l = null) => {
    if (l) {
      setLevelForm({ title: l.title, description: l.description || "", order: l.order || 1, xp_reward: l.xp_reward || 100, difficulty: l.difficulty || "easy", is_active: l.is_active ?? true });
      setEditingLevel(l);
    } else {
      setLevelForm({ title: `Level ${levels.length + 1}`, description: "", order: levels.length + 1, xp_reward: 100, difficulty: "easy", is_active: true });
      setEditingLevel(null);
    }
    setShowLevelForm(true);
    setLevelErr("");
  };

  const saveLevel = async () => {
    if (!levelForm.title.trim()) return setLevelErr("Title is required.");
    setLevelErr("");
    try {
      if (editingLevel) {
        await supabase.from("cg_levels").update({ ...levelForm, total_questions: 0 }).eq("id", editingLevel.id);
        notify("Level updated ✓");
      } else {
        await supabase.from("cg_levels").insert({ ...levelForm, game_type_id: selectedGame.id, total_questions: 0 });
        notify("Level created ✓");
      }
      setShowLevelForm(false);
      loadLevels(selectedGame.id);
    } catch (e) { setLevelErr(e.message); }
  };

  const deleteLevel = (l) => {
    setConfirm({
      msg: `Delete "${l.title}"? All questions inside will also be deleted.`,
      onYes: async () => {
        const { data: qs } = await supabase.from("cg_questions").select("id").eq("level_id", l.id);
        for (const q of qs || []) await supabase.from("cg_options").delete().eq("question_id", q.id);
        await supabase.from("cg_questions").delete().eq("level_id", l.id);
        await supabase.from("cg_user_level_progress").delete().eq("level_id", l.id);
        await supabase.from("cg_levels").delete().eq("id", l.id);
        setConfirm(null);
        notify("Deleted.", "error");
        if (selectedLevel?.id === l.id) { setSelectedLevel(null); setStep(1); }
        loadLevels(selectedGame.id);
      },
      onNo: () => setConfirm(null),
    });
  };

  // ─── delete question ────────────────────────────────────────────────────────
  const deleteQuestion = (q) => {
    setConfirm({
      msg: `Delete question "${q.question_text.slice(0, 60)}..."?`,
      onYes: async () => {
        await supabase.from("cg_options").delete().eq("question_id", q.id);
        await supabase.from("cg_questions").delete().eq("id", q.id);
        setConfirm(null);
        notify("Question deleted.", "error");
        await recalcLevelXp(selectedLevel.id);
        loadQuestions(selectedLevel.id);
      },
      onNo: () => setConfirm(null),
    });
  };

  // ─── color badge util ───────────────────────────────────────────────────────
  const colorMap = { cyan: "0,212,255", amber: "245,166,35", purple: "156,111,255", green: "0,230,118", pink: "255,105,180", blue: "80,140,255", red: "255,76,106", orange: "255,140,0" };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.page}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--cyan)", fontWeight: 700 }}>
            // <span style={{ color: "var(--muted)" }}>admin</span>/game-creation
          </div>
          {selectedGame && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontFamily: "var(--mono)", color: "var(--muted)" }}>
              <span style={{ color: "var(--border2)" }}>›</span>
              <span style={{ color: "var(--text)" }}>{selectedGame.icon} {selectedGame.title}</span>
              {selectedLevel && (
                <>
                  <span style={{ color: "var(--border2)" }}>›</span>
                  <span style={{ color: "var(--text)" }}>{selectedLevel.title}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button style={S.btnSecondary} onClick={() => {
              if (step === 2) { setStep(1); setSelectedLevel(null); setShowQForm(false); setEditingQ(null); }
              else { setStep(0); setSelectedGame(null); setLevels([]); setShowLevelForm(false); setEditingLevel(null); }
            }}>
              ← Back
            </button>
          )}
          <a href="/challenges" style={{ ...S.btnSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            ← App
          </a>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <StepBar step={step} />

        {/* ══════ STEP 0: GAME TYPES ══════ */}
        {step === 0 && (
          <>
            <SectionHeader
              title="Game Types"
              sub={`${games.length} game type${games.length !== 1 ? "s" : ""} · click a card to manage its levels`}
              action={
                <button style={S.btnPrimary} onClick={() => openGameForm()}>+ New Game Type</button>
              }
            />

            {/* Game form */}
            {showGameForm && (
              <div style={{ ...S.card, marginBottom: "20px", borderColor: "var(--cyan)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "18px" }}>
                  {editingGame ? `Edit "${editingGame.title}"` : "New Game Type"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Title" required>
                    <input style={S.input} placeholder="e.g. JavaScript" value={gameForm.title} onChange={(e) => setGameForm((f) => ({ ...f, title: e.target.value }))} />
                  </Field>
                  <Field label="Description">
                    <input style={S.input} placeholder="Short description" value={gameForm.description} onChange={(e) => setGameForm((f) => ({ ...f, description: e.target.value }))} />
                  </Field>
                  <Field label="Icon">
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {ICONS.map((ic) => (
                        <button key={ic} type="button" onClick={() => setGameForm((f) => ({ ...f, icon: ic }))}
                          style={{ width: "34px", height: "34px", borderRadius: "8px", border: `2px solid ${gameForm.icon === ic ? "var(--cyan)" : "var(--border)"}`, background: gameForm.icon === ic ? "rgba(0,212,255,0.1)" : "var(--bg)", cursor: "pointer", fontSize: "16px" }}>
                          {ic}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Color">
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setGameForm((f) => ({ ...f, color: c }))}
                          style={{ width: "28px", height: "28px", borderRadius: "50%", border: `3px solid ${gameForm.color === c ? "var(--text)" : "transparent"}`, background: `rgb(${colorMap[c] || "100,100,100"})`, cursor: "pointer" }} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Tag">
                    <select style={S.input} value={gameForm.tag} onChange={(e) => setGameForm((f) => ({ ...f, tag: e.target.value }))}>
                      {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Badge (optional)">
                    <input style={S.input} placeholder="e.g. HOT or NEW" value={gameForm.badge} onChange={(e) => setGameForm((f) => ({ ...f, badge: e.target.value }))} />
                  </Field>
                  <Field label="XP per Level">
                    <input type="number" style={S.input} value={gameForm.xp_per_level} onChange={(e) => setGameForm((f) => ({ ...f, xp_per_level: parseInt(e.target.value) || 100 }))} />
                  </Field>
                  <Field label="Display Order">
                    <input type="number" style={S.input} value={gameForm.order} min={1} onChange={(e) => setGameForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
                  </Field>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", marginBottom: "16px" }}>
                  <input type="checkbox" id="activeGame" checked={gameForm.is_active} onChange={(e) => setGameForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  <label htmlFor="activeGame" style={{ fontSize: "13px", cursor: "pointer" }}>Active (visible to users)</label>
                </div>
                {gameErr && <p style={{ color: "var(--red)", fontSize: "12px", fontFamily: "var(--mono)", marginBottom: "12px" }}>⚠ {gameErr}</p>}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={saveGame} style={S.btnPrimary}>{editingGame ? "Update" : "Create Game Type"}</button>
                  <button onClick={() => { setShowGameForm(false); setEditingGame(null); }} style={S.btnSecondary}>Cancel</button>
                </div>
              </div>
            )}

            {/* Game list */}
            {loading && <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px" }}>// loading...</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              {games.map((g) => (
                <div key={g.id} style={{ ...S.card, cursor: "pointer", border: selectedGame?.id === g.id ? "1px solid var(--cyan)" : "1px solid var(--border)", transition: "border-color 0.15s, transform 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{g.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>{g.title}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>order: {g.order}</div>
                      </div>
                    </div>
                    <span style={S.badge(colorMap[g.color] || "100,100,100")}>{g.tag}</span>
                  </div>
                  {g.description && <p style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "14px", lineHeight: 1.5 }}>{g.description}</p>}
                  <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => { setSelectedGame(g); loadLevels(g.id); setStep(1); setShowLevelForm(false); }} style={{ ...S.btnPrimary, fontSize: "12px", padding: "8px 14px" }}>
                      Manage Levels →
                    </button>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openGameForm(g)} style={{ ...S.btnSecondary, fontSize: "12px", padding: "7px 12px" }}>Edit</button>
                      <button onClick={() => deleteGame(g)} style={S.btnDanger}>Del</button>
                    </div>
                  </div>
                  {!g.is_active && (
                    <div style={{ marginTop: "10px", fontSize: "10px", fontFamily: "var(--mono)", color: "var(--muted)", background: "var(--bg3)", padding: "3px 8px", borderRadius: "6px", display: "inline-block" }}>
                      INACTIVE
                    </div>
                  )}
                </div>
              ))}
              {!loading && games.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px" }}>
                  // no game types yet — create one above
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════ STEP 1: LEVELS ══════ */}
        {step === 1 && selectedGame && (
          <>
            <SectionHeader
              title={`${selectedGame.icon} ${selectedGame.title} — Levels`}
              sub={`${levels.length} level${levels.length !== 1 ? "s" : ""} · click a level to manage its questions`}
              action={<button style={S.btnPrimary} onClick={() => openLevelForm()}>+ New Level</button>}
            />

            {showLevelForm && (
              <div style={{ ...S.card, marginBottom: "20px", borderColor: "var(--amber)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "18px" }}>
                  {editingLevel ? `Edit "${editingLevel.title}"` : "New Level"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Field label="Title" required>
                    <input style={S.input} placeholder="e.g. Level 1" value={levelForm.title} onChange={(e) => setLevelForm((f) => ({ ...f, title: e.target.value }))} />
                  </Field>
                  <Field label="Description">
                    <input style={S.input} placeholder="Basics of closures..." value={levelForm.description} onChange={(e) => setLevelForm((f) => ({ ...f, description: e.target.value }))} />
                  </Field>
                  <Field label="Order">
                    <input type="number" style={S.input} value={levelForm.order} min={1} onChange={(e) => setLevelForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
                  </Field>
                  <Field label="XP Reward">
                    <input type="number" style={S.input} value={levelForm.xp_reward} min={0} onChange={(e) => setLevelForm((f) => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))} />
                  </Field>
                  <Field label="Difficulty">
                    <select style={S.input} value={levelForm.difficulty} onChange={(e) => setLevelForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                </div>
                {levelErr && <p style={{ color: "var(--red)", fontSize: "12px", fontFamily: "var(--mono)", margin: "8px 0" }}>⚠ {levelErr}</p>}
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button onClick={saveLevel} style={S.btnPrimary}>{editingLevel ? "Update Level" : "Create Level"}</button>
                  <button onClick={() => { setShowLevelForm(false); setEditingLevel(null); }} style={S.btnSecondary}>Cancel</button>
                </div>
              </div>
            )}

            {loading && <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px" }}>// loading...</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {levels.map((l, idx) => (
                <div key={l.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: "16px", transition: "border-color 0.15s", borderColor: selectedLevel?.id === l.id ? "var(--amber)" : "var(--border)" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 800, fontFamily: "var(--sans)", color: "var(--amber)", flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>{l.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      {l.description} · {l.difficulty} · +{l.xp_reward} XP · order {l.order}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => { setSelectedLevel(l); loadQuestions(l.id); setStep(2); setShowQForm(false); setEditingQ(null); }}
                      style={{ ...S.btnPrimary, fontSize: "12px", padding: "8px 14px" }}>
                      Questions →
                    </button>
                    <button onClick={() => openLevelForm(l)} style={{ ...S.btnSecondary, fontSize: "12px", padding: "7px 12px" }}>Edit</button>
                    <button onClick={() => deleteLevel(l)} style={S.btnDanger}>Del</button>
                  </div>
                </div>
              ))}
              {!loading && levels.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px", ...S.card }}>
                  // no levels yet — create one above
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════ STEP 2: QUESTIONS ══════ */}
        {step === 2 && selectedLevel && (
          <>
            <SectionHeader
              title={`${selectedGame.icon} ${selectedLevel.title} — Questions`}
              sub={`${questions.length} question${questions.length !== 1 ? "s" : ""} · each needs ≥2 options and exactly 1+ correct answer`}
              action={
                !showQForm && !editingQ
                  ? <button style={S.btnPrimary} onClick={() => { setShowQForm(true); setEditingQ(null); }}>+ New Question</button>
                  : null
              }
            />

            {/* New question form */}
            {showQForm && !editingQ && (
              <QuestionForm
                levelId={selectedLevel.id}
                onSaved={() => { setShowQForm(false); loadQuestions(selectedLevel.id); recalcLevelXp(selectedLevel.id); notify("Question saved ✓"); }}
                onCancel={() => setShowQForm(false)}
              />
            )}

            {loading && <p style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px" }}>// loading...</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {questions.map((q, idx) => (
                <div key={q.id}>
                  {/* Edit form inline */}
                  {editingQ?.id === q.id ? (
                    <QuestionForm
                      levelId={selectedLevel.id}
                      initial={q}
                      onSaved={() => { setEditingQ(null); loadQuestions(selectedLevel.id); recalcLevelXp(selectedLevel.id); notify("Question updated ✓"); }}
                      onCancel={() => setEditingQ(null)}
                    />
                  ) : (
                    <div style={S.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flex: 1 }}>
                          <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)", background: "var(--bg3)", padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap", marginTop: "2px" }}>Q{idx + 1}</span>
                          <div>
                            <p style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.5, marginBottom: "4px" }}>{q.question_text}</p>
                            {q.code_snippet && (
                              <pre style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)", background: "var(--bg)", padding: "8px 12px", borderRadius: "6px", margin: "6px 0", overflowX: "auto" }}>
                                {q.code_snippet}
                              </pre>
                            )}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                              <span style={S.badge("0,212,255")}>{q.difficulty}</span>
                              <span style={S.badge("245,166,35")}>+{q.xp_reward} XP</span>
                              <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)" }}>order {q.order}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          <button onClick={() => { setEditingQ(q); setShowQForm(false); }} style={{ ...S.btnSecondary, fontSize: "12px", padding: "7px 12px" }}>Edit</button>
                          <button onClick={() => deleteQuestion(q)} style={S.btnDanger}>Del</button>
                        </div>
                      </div>

                      {/* Options display */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px" }}>
                        {q.options.map((opt) => (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: opt.is_correct ? "rgba(0,230,118,0.08)" : "var(--bg)", border: `1px solid ${opt.is_correct ? "rgba(0,230,118,0.25)" : "var(--border)"}` }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--mono)", color: opt.is_correct ? "var(--green)" : "var(--muted)", minWidth: "14px" }}>{opt.option_key}</span>
                            <span style={{ fontSize: "12px", flex: 1 }}>{opt.option_text}</span>
                            {opt.is_correct && <span style={{ fontSize: "11px", color: "var(--green)" }}>✓</span>}
                          </div>
                        ))}
                      </div>

                      {(q.hint || q.explanation) && (
                        <div style={{ marginTop: "10px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {q.hint && <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)" }}>💡 {q.hint}</span>}
                          {q.explanation && <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)" }}>// {q.explanation}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!loading && questions.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "13px", ...S.card }}>
                  // no questions yet — add one above
                </div>
              )}
            </div>

            {/* Quick summary */}
            {questions.length > 0 && (
              <div style={{ marginTop: "24px", padding: "16px 20px", borderRadius: "12px", background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>{questions.length}</span> questions
                </div>
                <div style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>{questions.reduce((a, q) => a + q.xp_reward, 0)}</span> total XP
                </div>
                <div style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  difficulties: {[...new Set(questions.map((q) => q.difficulty))].join(", ")}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast + Confirm */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={confirm.onNo} />}

      <style>{`
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        input:focus, textarea:focus, select:focus { border-color: var(--cyan) !important; box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
      `}</style>
    </div>
  );
}

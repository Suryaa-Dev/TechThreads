import { useState, useEffect, useContext } from "react";
import ChallengesPage from "./ChallengesPage";
import LevelSelect from "../components/LevelSelect";
import QuestionScreen from "../components/QuestionScreen";
import BadgeToast from '../../profile/components/BadgeToast';

import { supabase } from "../../../services/supabaseClient";
import { AuthContext } from "../../../context/AuthContext";
import { getInitials } from "../../../services/userService";
import "../../../index.css";

export default function Challenges() {
  const { user } = useContext(AuthContext);
  const [view, setView] = useState("challenges");
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [mode, setMode] = useState("challenges");
  const [newBadges, setNewBadges] = useState([]);
  // [Session 2] Incrementing this forces LevelSelect to re-fetch after a level
  // is completed so the next level immediately shows as active without needing
  // the user to navigate away and back.
  const [levelRefreshKey, setLevelRefreshKey] = useState(0);

  // ✅ Single source of truth for user — from AuthContext, passed as props everywhere
  const [userId, setUserId] = useState(null);
  const [userStats, setUserStats] = useState({
    xp: 0,
    streak: 0,
    initials: "",
    rank: 0,
    avatar_url: null,   // [Session 3] added for TopBar real avatar
    username: "",       // [Session 3] added for TopBar display name
  });

  useEffect(() => {
    const loadUser = async () => {
      // Use user from AuthContext — no supabase.auth.getUser() call needed
      if (!user) return;

      setUserId(user.id);

      // [Session 3] Fetch both cg_profiles (xp/streak/rank) and profiles
      // (avatar_url, username) in parallel so TopBar has everything it needs.
      const [{ data: cgProfile }, { data: publicProfile }] = await Promise.all([
        supabase.from("cg_profiles").select("xp, streak_count, rank").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("avatar_url, username, full_name").eq("id", user.id).maybeSingle(),
      ]);

      const fullName = publicProfile?.full_name || user.user_metadata?.full_name || "";
      const initials = getInitials(fullName) || "U";

      setUserStats({
        xp:         cgProfile?.xp          || 0,
        streak:     cgProfile?.streak_count || 0,
        rank:       cgProfile?.rank         || 0,
        initials,
        avatar_url: publicProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        username:   publicProfile?.username   ?? "",
      });
    };

    loadUser();
  }, [user]);

  // Called from QuestionScreen after level completion to refresh XP in TopBar
  const refreshUserStats = async (earnedBadges = []) => {
    if (!userId) return;
    const { data: profile } = await supabase
      .from('cg_profiles').select('xp, streak_count, rank')
      .eq('id', userId).single();
    if (profile) {
      // [Session 3] Preserve avatar_url/username — they don't change on level complete
      setUserStats((prev) => ({
        ...prev,
        xp:     profile.xp          || 0,
        streak: profile.streak_count || 0,
        rank:   profile.rank         || 0,
      }));
    }
    if (earnedBadges?.length > 0) setNewBadges(earnedBadges);
    // [Session 2] Trigger LevelSelect to re-fetch so the newly unlocked level
    // shows as active immediately when the user navigates back.
    setLevelRefreshKey(k => k + 1);
  };

  function handleSelectGame(game) {
    setSelectedGame(game);
    setView("levels");
  }

  function handleSelectLevel(level) {
    if (level.status === "locked") return;
    setSelectedLevel(level);
    setView("question");
  }

  function handleBackToLevels() {
    setView("levels");
    setSelectedLevel(null);
  }

  function handleBackToChallenges() {
    setView("challenges");
    setSelectedGame(null);
    setSelectedLevel(null);
  }

  return (
    <>

      {view === "challenges" && (
        <ChallengesPage
          onSelectGame={handleSelectGame}
          userStats={userStats}
          userId={userId}
          mode={mode}
          onModeChange={setMode}
        />
      )}
      {view === "levels" && (
        <LevelSelect
          game={selectedGame}
          onBack={handleBackToChallenges}
          onSelectLevel={handleSelectLevel}
          userStats={userStats}
          userId={userId}
          refreshKey={levelRefreshKey}
        />
      )}

      {view === "question" && (
        <QuestionScreen
          level={selectedLevel}
          game={selectedGame}
          onBack={handleBackToLevels}
          onNextLevel={handleSelectLevel}
          userStats={userStats}
          userId={userId}
          onLevelComplete={refreshUserStats}
        />
      )}

      <BadgeToast
        badges={newBadges}
        onDismiss={(badgeId) => setNewBadges((prev) => prev.filter((b) => b.id !== badgeId))}
      />
    </>
  );
}
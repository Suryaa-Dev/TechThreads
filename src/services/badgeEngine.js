// src/services/badgeEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal badge engine for TechGram.
// Call awardBadge() from ANY part of the app — Challenges, Community, Profile,
// Streak. The engine handles DB lookup, threshold check, and insertion.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

/**
 * Award badges to a user based on an event.
 *
 * @param {string} userId      - auth user id
 * @param {string} eventType   - matches condition_type in cg_badge_definitions
 * @param {object} eventData   - { value: number, game_id?: string }
 * @returns {Promise<Array>}   - array of newly earned badge objects (empty if none)
 *
 * Usage examples:
 *
 *   // Challenges — after level completion
 *   await awardBadge(userId, 'levels_completed', { value: 7, game_id: 'uuid' })
 *   await awardBadge(userId, 'xp_total',         { value: 2500 })
 *   await awardBadge(userId, 'perfect_runs',     { value: 3 })
 *
 *   // Community — after post published
 *   await awardBadge(userId, 'community_posts_created', { value: 1 })
 *
 *   // Community — after like toggled
 *   await awardBadge(userId, 'community_likes_received', { value: 50 })
 *
 *   // Community — after comment posted
 *   await awardBadge(userId, 'community_comments_made', { value: 5 })
 *
 *   // Profile — on profile save
 *   await awardBadge(userId, 'github_linked',   { value: 1 })
 *   await awardBadge(userId, 'resume_uploaded', { value: 1 })
 *
 *   // Streak — on login / daily activity
 *   await awardBadge(userId, 'streak_days', { value: 7 })
 */
export async function awardBadge(userId, eventType, eventData = {}) {
  if (!userId || !eventType) return [];

  try {
    // 1. Find badge definitions matching this event type
    const { data: definitions, error: defErr } = await supabase
      .from('cg_badge_definitions')
      .select('*')
      .eq('condition_type', eventType);

    if (defErr || !definitions?.length) return [];

    // 2. Find badges the user already has (all of them, not just this type)
    const { data: earned } = await supabase
      .from('cg_user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const earnedIds = new Set(earned?.map((b) => b.badge_id) ?? []);
    const toAward = [];

    // 3. Check each matching definition
    for (const def of definitions) {
      // Skip if already earned
      if (earnedIds.has(def.id)) continue;

      // If badge is game-specific, make sure game_id matches
      if (def.condition_game_id && def.condition_game_id !== eventData.game_id) continue;

      // Check threshold met
      if ((eventData.value ?? 0) >= def.condition_value) {
        toAward.push(def);
      }
    }

    if (toAward.length === 0) return [];

    // 4. Insert newly earned badges
    const { error: insertErr } = await supabase.from('cg_user_badges').insert(
      toAward.map((b) => ({
        user_id:   userId,
        badge_id:  b.id,
        source:    b.source,
        earned_at: new Date().toISOString(),
      }))
    );

    if (insertErr) {
      console.error('Badge insert error:', insertErr);
      return [];
    }

    // 5. If badges carry XP rewards, add them to cg_profiles
    const totalBonusXp = toAward.reduce((sum, b) => sum + (b.xp_reward ?? 0), 0);
    if (totalBonusXp > 0) {
      const { data: profile } = await supabase
        .from('cg_profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      await supabase
        .from('cg_profiles')
        .update({ xp: (profile?.xp ?? 0) + totalBonusXp })
        .eq('id', userId);
    }

    return toAward;
  } catch (err) {
    console.error('awardBadge error:', err);
    return [];
  }
}


/**
 * Load all badge progress for a user — used by the Badges tab in Profile.
 * Returns every definition enriched with user's earned status + level progress.
 *
 * @param {string} userId
 * @returns {Promise<Array>} enriched badge list
 */
export async function loadBadgeProgress(userId) {
  if (!userId) return [];

  try {
    // Fetch all definitions
    const { data: definitions } = await supabase
      .from('cg_badge_definitions')
      .select('*')
      .order('source')
      .order('tier');

    // Fetch user's earned badges
    const { data: earned } = await supabase
      .from('cg_user_badges')
      .select('badge_id, earned_at, is_pinned')
      .eq('user_id', userId);

    const earnedMap = {};
    earned?.forEach((e) => { earnedMap[e.badge_id] = e; });

    // Fetch data needed to compute progress values
    const [
      { data: allLevels },
      { data: completedLevels },
      { data: cgProfile },
    ] = await Promise.all([
      supabase.from('cg_levels').select('id, game_type_id'),
      supabase.from('cg_user_level_progress')
        .select('level_id, stars')
        .eq('user_id', userId)
        .eq('status', 'completed'),
      supabase.from('cg_profiles').select('xp, streak_count').eq('id', userId).single(),
    ]);

    // Community counts
    const [
      { count: postCount },
      { count: commentCount },
    ] = await Promise.all([
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    // Likes received on user's posts
    const { data: userPosts } = await supabase
      .from('community_posts')
      .select('id')
      .eq('user_id', userId);
    let likesReceived = 0;
    if (userPosts?.length) {
      const { count: lc } = await supabase
        .from('community_likes')
        .select('id', { count: 'exact', head: true })
        .in('post_id', userPosts.map((p) => p.id));
      likesReceived = lc ?? 0;
    }

    // Build game progress map { game_type_id: { done, total } }
    const completedIds = new Set(completedLevels?.map((l) => l.level_id) ?? []);
    const perfectRuns  = completedLevels?.filter((l) => l.stars === 3).length ?? 0;
    const gameProgress = {};
    allLevels?.forEach((lvl) => {
      if (!gameProgress[lvl.game_type_id]) gameProgress[lvl.game_type_id] = { total: 0, done: 0 };
      gameProgress[lvl.game_type_id].total++;
      if (completedIds.has(lvl.id)) gameProgress[lvl.game_type_id].done++;
    });

    // Profile checks
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('github_url, resume_url, bio, avatar_url')
      .eq('id', userId)
      .single();
    const githubLinked    = profileRow?.github_url ? 1 : 0;
    const resumeUploaded  = profileRow?.resume_url  ? 1 : 0;
    const profileComplete = (profileRow?.bio && profileRow?.avatar_url && profileRow?.github_url) ? 1 : 0;

    // Helper: get current value for a condition type
    const getCurrentValue = (def) => {
      switch (def.condition_type) {
        case 'levels_completed':
          return def.condition_game_id
            ? (gameProgress[def.condition_game_id]?.done ?? 0)
            : completedIds.size;
        case 'perfect_runs':            return perfectRuns;
        case 'xp_total':                return cgProfile?.xp ?? 0;
        case 'streak_days':             return cgProfile?.streak_count ?? 0;
        case 'community_posts_created': return postCount ?? 0;
        case 'community_likes_received':return likesReceived;
        case 'community_comments_made': return commentCount ?? 0;
        case 'github_linked':           return githubLinked;
        case 'resume_uploaded':         return resumeUploaded;
        case 'profile_complete':        return profileComplete;
        default:                        return 0;
      }
    };

    const getTotal = (def) => {
      if (def.condition_type === 'levels_completed' && def.condition_game_id) {
        return gameProgress[def.condition_game_id]?.total ?? def.condition_value;
      }
      return def.condition_value;
    };

    return (definitions ?? []).map((def) => {
      const earnedEntry  = earnedMap[def.id] ?? null;
      const currentValue = getCurrentValue(def);
      const totalValue   = getTotal(def);
      return {
        ...def,
        isEarned:    !!earnedEntry,
        earnedAt:    earnedEntry?.earned_at ?? null,
        isPinned:    earnedEntry?.is_pinned ?? false,
        currentValue,
        totalValue,
        progressPct: totalValue > 0 ? Math.min(100, Math.round((currentValue / totalValue) * 100)) : 0,
      };
    });
  } catch (err) {
    console.error('loadBadgeProgress error:', err);
    return [];
  }
}
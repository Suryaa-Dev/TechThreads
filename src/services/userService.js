// src/services/userService.js
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

// ── simple in-memory profile cache ───────────────────────────────────────────
// Keyed by user_id. Lives for the duration of the browser session.
// Prevents repeated identical fetches from different components.

const _profileCache = new Map();

/**
 * Get the currently authenticated user from Supabase auth.
 * Returns null if not logged in.
 *
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Fetch a user's profile row from the `profiles` table.
 * Results are cached in memory for the session — safe to call freely.
 *
 * @param {string} userId
 * @param {boolean} [forceRefresh=false]  bypass cache
 * @returns {Promise<Profile | null>}
 *
 * @typedef {{ id: string, full_name: string|null, username: string|null,
 *             avatar_url: string|null, bio: string|null, github_url: string|null,
 *             website_url: string|null, resume_url: string|null,
 *             open_to_work: boolean, post_count: number, points: number,
 *             accepted_solutions_count: number, created_at: string }} Profile
 */
export async function getProfile(userId, forceRefresh = false) {
  if (!userId) return null;

  if (!forceRefresh && _profileCache.has(userId)) {
    return _profileCache.get(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('getProfile error:', error);
    return null;
  }

  if (data) _profileCache.set(userId, data);
  return data;
}

/**
 * Fetch multiple profiles in a single query and return as an id → Profile map.
 * Already-cached profiles are skipped.
 *
 * @param {string[]} userIds
 * @returns {Promise<Record<string, Profile>>}
 */
export async function getProfileMap(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  // Return cached entries immediately, only fetch missing ones
  const missing = unique.filter((id) => !_profileCache.has(id));

  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username')
      .in('id', missing);

    if (error) {
      console.error('getProfileMap error:', error);
    } else {
      (data || []).forEach((p) => _profileCache.set(p.id, p));
    }
  }

  const map = {};
  unique.forEach((id) => {
    if (_profileCache.has(id)) map[id] = _profileCache.get(id);
  });
  return map;
}

/**
 * Invalidate a specific user's profile in the cache.
 * Call this after a profile update so the next read re-fetches.
 *
 * @param {string} userId
 */
export function invalidateProfile(userId) {
  _profileCache.delete(userId);
}

/**
 * Update the current user's profile. Invalidates cache on success.
 *
 * @param {string} userId
 * @param {Partial<Profile>} updates
 * @returns {Promise<{ error: Error|null }>}
 */
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (!error) invalidateProfile(userId);
  return { error };
}

/**
 * Get the follow counts (followers / following) for a given user.
 *
 * @param {string} userId
 * @returns {Promise<{ followers: number, following: number }>}
 */
export async function getFollowCounts(userId) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

/**
 * Check if `followerId` follows `followingId`.
 *
 * @param {string} followerId
 * @param {string} followingId
 * @returns {Promise<boolean>}
 */
export async function isFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false;
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

/**
 * Toggle follow/unfollow. Returns the new follow state.
 *
 * @param {string} followerId   (current user)
 * @param {string} followingId  (target user)
 * @returns {Promise<{ following: boolean, error: Error|null }>}
 */
export async function toggleFollow(followerId, followingId) {
  if (!followerId || !followingId) return { following: false, error: new Error('Missing ids') };

  const already = await isFollowing(followerId, followingId);

  if (already) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: followingId });
    return { following: false, error: error ?? null };
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    return { following: true, error: error ?? null };
  }
}

/**
 * Get all user IDs that a given user follows.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getFollowingIds(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) {
    console.error('getFollowingIds error:', error);
    return [];
  }
  return (data || []).map((r) => r.following_id).filter(Boolean);
}

/**
 * Upload a resume PDF to storage and return the public URL.
 * Uses the `resumes` bucket.
 *
 * @param {string} userId
 * @param {File} file
 * @returns {Promise<{ url: string|null, error: Error|null }>}
 */
export async function uploadResume(userId, file) {
  if (!file) return { url: null, error: null };
  const ext = file.name.split('.').pop();
  const filePath = `${userId}/${userId}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('resumes')
    .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });

  if (upErr) return { url: null, error: upErr };

  const { data } = supabase.storage.from('resumes').getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

// ── display helpers (previously scattered across every component) ─────────────

/**
 * Resolve a display name from a profile object.
 * Priority: full_name → username → 'Anonymous'
 *
 * @param {Partial<Profile>|null} profile
 * @returns {string}
 */
export function displayName(profile) {
  return profile?.full_name || profile?.username || 'Anonymous';
}

/**
 * Resolve the avatar URL for a profile, or null if none set.
 *
 * @param {Partial<Profile>|null} profile
 * @returns {string|null}
 */
export function displayAvatar(profile) {
  return profile?.avatar_url || null;
}

/**
 * Get initials from a name string (max 2 chars).
 * Used as fallback when avatar_url is absent or fails to load.
 *
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name = '') {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
}

/**
 * Pick a consistent gradient for a user's avatar fallback,
 * based on their user id (so the same user always gets the same colour).
 *
 * @param {string} uid
 * @returns {string}  CSS gradient string
 */
const GRADIENTS = [
  'linear-gradient(135deg,#00d4ff,#0099cc)',
  'linear-gradient(135deg,#9c6fff,#6b3fd4)',
  'linear-gradient(135deg,#00e676,#00a854)',
  'linear-gradient(135deg,#f5a623,#c97d00)',
  'linear-gradient(135deg,#ff4c6a,#c0003a)',
  'linear-gradient(135deg,#f472b6,#818cf8)',
];

export function avatarGradient(uid = '') {
  const idx = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[idx];
}
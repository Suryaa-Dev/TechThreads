// src/services/likeService.js
// ─────────────────────────────────────────────────────────────────────────────
// Central like/unlike service for TechGram.
//
// Three like domains exist in the DB:
//   feed     → feed_post_likes   (post_type: 'code' | 'project')
//   community post → community_likes
//   feed comment  → feed_comment_likes
//
// All components call these helpers instead of writing raw Supabase mutations.
// Each helper returns optimistic update values so the UI can update immediately.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

// ── Feed post likes ───────────────────────────────────────────────────────────

/**
 * Check which feed posts (code or project) the current user has liked.
 *
 * @param {string} userId
 * @param {string[]} postIds   array of post id strings
 * @param {'code'|'project'} postType
 * @returns {Promise<Set<string>>}  set of liked post ids
 */
export async function getFeedLikedPosts(userId, postIds, postType = 'code') {
  if (!userId || !postIds.length) return new Set();

  const { data } = await supabase
    .from('feed_post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_type', postType)
    .in('post_id', postIds);

  return new Set((data || []).map((r) => r.post_id));
}

/**
 * Toggle a like on a feed post (code or project).
 * Handles both the join table (feed_post_likes) and the counter column
 * on posts / project_posts via the DB trigger — no counter update needed here.
 *
 * @param {string} postId
 * @param {'code'|'project'} postType
 * @param {string} userId
 * @param {boolean} currentlyLiked
 * @returns {Promise<{ liked: boolean, error: Error|null }>}
 */
export async function toggleFeedLike(postId, postType, userId, currentlyLiked) {
  if (!userId) return { liked: currentlyLiked, error: new Error('Not authenticated') };

  if (currentlyLiked) {
    const { error } = await supabase
      .from('feed_post_likes')
      .delete()
      .match({ post_id: postId, post_type: postType, user_id: userId });
    return { liked: false, error: error ?? null };
  } else {
    const { error } = await supabase
      .from('feed_post_likes')
      .insert({ post_id: postId, post_type: postType, user_id: userId });
    return { liked: true, error: error ?? null };
  }
}

// ── Community post likes ──────────────────────────────────────────────────────

/**
 * Check which community posts the current user has liked.
 *
 * @param {string} userId
 * @param {string[]} postIds
 * @returns {Promise<Set<string>>}
 */
export async function getCommunityLikedPosts(userId, postIds) {
  if (!userId || !postIds.length) return new Set();

  const { data } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);

  return new Set((data || []).map((r) => r.post_id));
}

/**
 * Toggle a like on a community post.
 * The DB trigger (trg_sync_community_like_count) handles the counter column —
 * no manual update needed.
 *
 * @param {string} postId
 * @param {string} userId
 * @param {boolean} currentlyLiked
 * @returns {Promise<{ liked: boolean, error: Error|null }>}
 */
export async function toggleCommunityLike(postId, userId, currentlyLiked) {
  if (!userId) return { liked: currentlyLiked, error: new Error('Not authenticated') };

  if (currentlyLiked) {
    const { error } = await supabase
      .from('community_likes')
      .delete()
      .match({ post_id: postId, user_id: userId });
    return { liked: false, error: error ?? null };
  } else {
    const { error } = await supabase
      .from('community_likes')
      .insert({ post_id: postId, user_id: userId });
    return { liked: true, error: error ?? null };
  }
}

// ── Feed comment likes ────────────────────────────────────────────────────────

/**
 * Toggle a like on a feed comment.
 * Manually syncs the `likes` counter on feed_comments (no trigger for this one).
 *
 * @param {string} commentId
 * @param {string} userId
 * @param {boolean} currentlyLiked
 * @param {number} currentCount
 * @returns {Promise<{ liked: boolean, newCount: number, error: Error|null }>}
 */
export async function toggleCommentLike(commentId, userId, currentlyLiked, currentCount) {
  if (!userId) return { liked: currentlyLiked, newCount: currentCount, error: new Error('Not authenticated') };

  const newCount = currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

  if (currentlyLiked) {
    const { error } = await supabase
      .from('feed_comment_likes')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    if (!error) {
      await supabase.from('feed_comments').update({ likes: newCount }).eq('id', commentId);
    }
    return { liked: false, newCount: error ? currentCount : newCount, error: error ?? null };
  } else {
    const { error } = await supabase
      .from('feed_comment_likes')
      .insert({ comment_id: commentId, user_id: userId });
    if (!error) {
      await supabase.from('feed_comments').update({ likes: newCount }).eq('id', commentId);
    }
    return { liked: true, newCount: error ? currentCount : newCount, error: error ?? null };
  }
}

/**
 * Fetch which feed comment ids the current user has liked.
 *
 * @param {string} userId
 * @param {string[]} commentIds
 * @returns {Promise<Set<string>>}
 */
export async function getLikedComments(userId, commentIds) {
  if (!userId || !commentIds.length) return new Set();

  const { data } = await supabase
    .from('feed_comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds);

  return new Set((data || []).map((r) => r.comment_id));
}
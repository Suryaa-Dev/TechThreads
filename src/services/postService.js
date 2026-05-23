// src/services/postService.js
// ─────────────────────────────────────────────────────────────────────────────
// Central post/comment service for TechGram.
// Covers: feed posts, project posts, community posts, and their comments.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

// ── Storage ───────────────────────────────────────────────────────────────────
// Bucket names as defined in Phase 0 setup.
const BUCKET_POST_IMAGES = 'post-images';
const BUCKET_COMMUNITY   = 'community_covers';

// ── Feed Posts ────────────────────────────────────────────────────────────────

/**
 * Create a code post (feed).
 * No longer stores author_name / author_avatar / github_username —
 * those are resolved at read time via profiles.
 *
 * @param {string} userId
 * @param {{ tag: string, code: string, caption: string }} fields
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createCodePost(userId, { tag, code, caption }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: userId, tag, code, caption })
    .select()
    .single();
  return { data, error };
}

/**
 * Upload an image to the post-images bucket.
 *
 * @param {string} userId
 * @param {File} file
 * @returns {Promise<{ url: string|null, error: Error|null }>}
 */
export async function uploadPostImage(userId, file) {
  const filePath = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET_POST_IMAGES)
    .upload(filePath, file);

  if (error) return { url: null, error };
  const { data } = supabase.storage.from(BUCKET_POST_IMAGES).getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

/**
 * Create a project post.
 *
 * @param {string} userId
 * @param {{ project_title, project_desc, project_link, project_live_url,
 *            project_stack, project_image, project_type }} fields
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createProjectPost(userId, fields) {
  const { data, error } = await supabase
    .from('project_posts')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a feed post (code or project).
 *
 * @param {'posts'|'project_posts'} table
 * @param {string} postId
 * @param {string} userId   (for safety — only owner can delete)
 */
export async function deleteFeedPost(table, postId, userId) {
  const { error } = await supabase
    .from(table)
    .delete()
    .match({ id: postId, user_id: userId });
  return { error };
}

// ── Feed Comments ─────────────────────────────────────────────────────────────

/**
 * Fetch comments for a feed post (code or project).
 *
 * @param {string} postId
 * @param {'code'|'project'} postType
 * @returns {Promise<object[]>}
 */
export async function getFeedComments(postId, postType = 'code') {
  const { data, error } = await supabase
    .from('feed_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('post_type', postType)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getFeedComments error:', error);
    return [];
  }
  return data || [];
}

/**
 * Post a comment on a feed post.
 *
 * @param {string} postId
 * @param {'code'|'project'} postType
 * @param {string} userId
 * @param {string} content
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createFeedComment(postId, postType, userId, content) {
  const { data, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, post_type: postType, user_id: userId, content })
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a feed comment (owner only).
 *
 * @param {string} commentId
 * @param {string} userId
 */
export async function deleteFeedComment(commentId, userId) {
  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .match({ id: commentId, user_id: userId });
  return { error };
}

// ── Community Posts ───────────────────────────────────────────────────────────

/**
 * Fetch all posts for a community, ordered newest first.
 * Excludes prompt-type posts and prompt responses.
 *
 * @param {string} communityId
 * @returns {Promise<object[]>}
 */
export async function getCommunityPosts(communityId) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('community_id', communityId)
    .neq('type', 'prompt')
    .is('prompt_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getCommunityPosts error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch prompts for a community.
 *
 * @param {string} communityId
 * @returns {Promise<object[]>}
 */
export async function getCommunityPrompts(communityId) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*, responses:community_posts!prompt_id(*)')
    .eq('community_id', communityId)
    .eq('type', 'prompt')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getCommunityPrompts error:', error);
    return [];
  }
  return data || [];
}

/**
 * Upload a file (image or PDF) to the community bucket.
 *
 * @param {string} communityId
 * @param {File} file
 * @returns {Promise<{ url: string|null, error: Error|null }>}
 */
export async function uploadCommunityFile(communityId, file) {
  const filePath = `${communityId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET_COMMUNITY)
    .upload(filePath, file, { upsert: true });

  if (error) return { url: null, error };
  const { data } = supabase.storage.from(BUCKET_COMMUNITY).getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

/**
 * Create a community post.
 *
 * @param {string} userId
 * @param {string} communityId
 * @param {object} fields  — any fields valid for community_posts table
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createCommunityPost(userId, communityId, fields) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ user_id: userId, community_id: communityId, ...fields })
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a community post (owner only).
 */
export async function deleteCommunityPost(postId, userId) {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .match({ id: postId, user_id: userId });
  return { error };
}

// ── Community Comments ────────────────────────────────────────────────────────

/**
 * Fetch all comments for a community post, enriched with
 * stars, flags, and replies sub-data.
 *
 * @param {string} postId
 * @param {string|null} currentUserId  (to compute _starred / _flagged flags)
 * @returns {Promise<object[]>}
 */
export async function getCommunityComments(postId, currentUserId = null) {
  const { data, error } = await supabase
    .from('community_comments')
    .select(`
      *,
      _replies: community_comment_replies(*),
      _stars:   community_comment_stars(*),
      _flags:   community_comment_flags(*)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCommunityComments error:', error);
    return [];
  }

  return (data || []).map((c) => ({
    ...c,
    _starred: currentUserId ? (c._stars  || []).some((s) => s.user_id === currentUserId) : false,
    _flagged: currentUserId ? (c._flags  || []).some((f) => f.user_id === currentUserId) : false,
    _replies: c._replies || [],
  }));
}

/**
 * Create a community comment.
 *
 * @param {string} postId
 * @param {string} userId
 * @param {{ caption: string, tags: string[], steps: object[] }} fields
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function createCommunityComment(postId, userId, { caption, tags = [], steps = [] }) {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, user_id: userId, caption, tags, steps })
    .select()
    .single();
  return { data, error };
}

/**
 * Delete a community comment (owner only).
 */
export async function deleteCommunityComment(commentId, userId) {
  const { error } = await supabase
    .from('community_comments')
    .delete()
    .match({ id: commentId, user_id: userId });
  return { error };
}

/**
 * Toggle star on a community comment.
 * DB trigger handles the star count.
 */
export async function toggleCommentStar(commentId, userId, currentlyStarred) {
  if (currentlyStarred) {
    const { error } = await supabase
      .from('community_comment_stars')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    return { starred: false, error };
  } else {
    const { error } = await supabase
      .from('community_comment_stars')
      .insert({ comment_id: commentId, user_id: userId });
    return { starred: true, error };
  }
}

/**
 * Toggle flag on a community comment.
 * DB trigger handles the flag count.
 */
export async function toggleCommentFlag(commentId, userId, currentlyFlagged) {
  if (currentlyFlagged) {
    const { error } = await supabase
      .from('community_comment_flags')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    return { flagged: false, error };
  } else {
    const { error } = await supabase
      .from('community_comment_flags')
      .insert({ comment_id: commentId, user_id: userId });
    return { flagged: true, error };
  }
}

/**
 * Mark/unmark a community comment as the accepted solution.
 * Updates the `is_accepted_solution` field and calls the
 * increment/decrement RPC to update the poster's profile counter.
 *
 * @param {string} commentId
 * @param {string} commentAuthorId  (the person whose solution is accepted)
 * @param {boolean} currentState
 */
export async function toggleAcceptedSolution(commentId, commentAuthorId, currentState) {
  const newState = !currentState;

  const { error } = await supabase
    .from('community_comments')
    .update({ is_accepted_solution: newState })
    .eq('id', commentId);

  if (!error) {
    const rpc = newState ? 'increment_accepted_solutions' : 'decrement_accepted_solutions';
    await supabase.rpc(rpc, { target_user_id: commentAuthorId });
  }

  return { accepted: newState, error };
}

/**
 * Post a reply to a community comment.
 */
export async function createCommentReply(commentId, userId, text, stepRef = null) {
  const { data, error } = await supabase
    .from('community_comment_replies')
    .insert({ comment_id: commentId, user_id: userId, text, step_ref: stepRef })
    .select()
    .single();
  return { data, error };
}

// ── Feed fetch (used by Feed.jsx & Explore.jsx) ───────────────────────────────

/**
 * Load the personalised feed for a user (posts from people they follow).
 * Returns shaped, merged, time-sorted posts from all three sources.
 *
 * @param {string[]} followedIds
 * @param {string|null} [selfId]   — current user's own id; their posts are
 *                                   always included in the feed regardless of
 *                                   whether they follow themselves.
 * @returns {Promise<object[]>}
 */
export async function getFollowingFeed(followedIds, selfId = null) {
  // Build the full set of user_ids to include: everyone followed + self
  const allIds = selfId
    ? [...new Set([...followedIds, selfId])]
    : followedIds;

  if (!allIds.length) return [];

  const [
    { data: codePosts },
    { data: projectPosts },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .in('user_id', allIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_posts')
      .select('*')
      .in('user_id', allIds)
      .order('created_at', { ascending: false }),

  ]);

  const shaped = [
    ...(codePosts     || []).map((p) => ({ ...p, type: 'code',    _source: 'feed' })),
    ...(projectPosts  || []).map((p) => ({ ...p, type: 'project', _source: 'feed' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return shaped;
}

/**
 * Load the explore feed — all posts, newest first.
 * Used by Explore.jsx.
 *
 * @returns {Promise<object[]>}
 */
export async function getExploreFeed() {
  const [
    { data: codePosts },
    { data: projectPosts },
    { data: communityPostRows },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('project_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('community_posts')
      .select('*, communities(id, name)')
      .neq('type', 'prompt')
      .is('prompt_id', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const shaped = [
    ...(codePosts     || []).map((p) => ({ ...p, type: 'code',    _source: 'feed' })),
    ...(projectPosts  || []).map((p) => ({ ...p, type: 'project', _source: 'feed' })),
    ...(communityPostRows || []).map((p) => ({
      ...p,
      _source:        'community',
      community_id:   p.communities?.id   ?? p.community_id,
      community_name: p.communities?.name ?? null,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return shaped;
}

/**
 * Fetch all posts for a specific user (for their profile page).
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function getUserPosts(userId) {
  const [
    { data: codePosts },
    { data: projectPosts },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const shaped = [
    ...(codePosts    || []).map((p) => ({ ...p, type: 'code',    _source: 'feed' })),
    ...(projectPosts || []).map((p) => ({ ...p, type: 'project', _source: 'feed' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return shaped;
}
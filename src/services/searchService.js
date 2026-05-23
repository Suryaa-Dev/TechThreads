// src/services/searchService.js
// ─────────────────────────────────────────────────────────────────────────────
// Global search service for TechGram.
// Searches: profiles, posts, project_posts, communities
// All results include enough data to render and navigate.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

/**
 * Run a global search across all four scopes in parallel.
 * Returns at most 5 results per scope.
 *
 * @param {string} query
 * @returns {Promise<{
 *   profiles:    object[],
 *   posts:       object[],
 *   projects:    object[],
 *   communities: object[]
 * }>}
 */
export async function globalSearch(query) {
  const q = (query || '').trim();
  if (!q) return { profiles: [], posts: [], projects: [], communities: [] };

  const [profiles, posts, projects, communities] = await Promise.all([

    // People — match on full_name OR username
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, points, open_to_work, accepted_solutions_count')
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(5),

    // Code posts — match on tag OR caption
    supabase
      .from('posts')
      .select('id, tag, caption, file_name, user_id, likes, comments, created_at')
      .or(`tag.ilike.%${q}%,caption.ilike.%${q}%`)
      .order('likes', { ascending: false })
      .limit(5),

    // Project posts — match on title, stack, or desc
    supabase
      .from('project_posts')
      .select('id, project_title, project_stack, project_type, project_desc, user_id, likes, created_at')
      .or(`project_title.ilike.%${q}%,project_stack.ilike.%${q}%,project_desc.ilike.%${q}%`)
      .order('likes', { ascending: false })
      .limit(5),

    // Communities — match on name or description
    supabase
      .from('communities')
      .select('id, name, description, slug')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(5),
  ]);

  return {
    profiles:    profiles.data    || [],
    posts:       posts.data       || [],
    projects:    projects.data    || [],
    communities: communities.data || [],
  };
}
// src/utils/helpers.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared pure utility functions for TechGram.
// No Supabase calls. No React. Import freely anywhere.
// ─────────────────────────────────────────────────────────────────────────────

// ── Time ──────────────────────────────────────────────────────────────────────

/**
 * Format a timestamp as a human-readable relative string.
 * e.g. "just now", "5m ago", "3h ago", "2d ago"
 *
 * @param {string|Date} timestamp
 * @returns {string}
 */
export function timeAgo(timestamp) {
  if (!timestamp) return '';
  // ── Timezone fix ─────────────────────────────────────────────────────────
  // Supabase `timestamp` columns (without timezone) return strings like
  // "2024-01-15T10:25:00" — no Z, no +00:00. JavaScript's Date constructor
  // treats these as LOCAL time, not UTC. For a user in IST (+5:30) this adds
  // 5h30m to every elapsed-time calculation, making a 5-min-old post appear
  // 5h35m old. Appending 'Z' forces UTC interpretation, which is correct
  // because Supabase always stores in UTC regardless of column type.
  const normalized = typeof timestamp === 'string' && !timestamp.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(timestamp)
    ? timestamp + 'Z'
    : timestamp;
  const diff = Date.now() - new Date(normalized).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10)  return 'just now';
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ── Code Language ─────────────────────────────────────────────────────────────

/**
 * Mapping of common language display names / aliases → Prism language key.
 * Used by both feed/PostCard and communities/PostCard.
 */
export const LANG_MAP = {
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  python: 'python', py: 'python',
  rust: 'rust', rs: 'rust',
  go: 'go', golang: 'go',
  java: 'java',
  kotlin: 'kotlin', kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  'c++': 'cpp', cpp: 'cpp',
  'c#': 'csharp', csharp: 'csharp',
  css: 'css',
  html: 'markup', xml: 'markup',
  sql: 'sql',
  bash: 'bash', shell: 'bash', sh: 'bash',
  ruby: 'ruby', rb: 'ruby',
  php: 'php',
  scala: 'scala',
  r: 'r',
  dart: 'dart',
  haskell: 'haskell', hs: 'haskell',
  lua: 'lua',
  vim: 'vim',
  elixir: 'elixir',
  ex: 'elixir',
  erlang: 'erlang',
  erl: 'erlang',
  clojure: 'clojure',
  clj: 'clojure',
  graphql: 'graphql',
  gql: 'graphql',
  yaml: 'yaml', yml: 'yaml',
  toml: 'toml',
  json: 'json',
  markdown: 'markdown', md: 'markdown',
  solidity: 'solidity', sol: 'solidity',
  react: 'jsx', jsx: 'jsx',
  tsx: 'tsx',
  vue: 'javascript',
  angular: 'typescript',
  svelte: 'javascript',
  prisma: 'javascript',
  terraform: 'javascript',
  dockerfile: 'docker',
};

/**
 * Resolve a Prism language key from a tag string.
 *
 * @param {string} tag  e.g. "React Hooks", "Python", "TypeScript"
 * @returns {string}    Prism language key
 */
export function getPrismLang(tag = '') {
  const key = tag.split(/[\s,/#_-]/)[0].toLowerCase().trim();
  return LANG_MAP[key] ?? 'javascript';
}

/**
 * Get a short canonical display name for a language tag.
 *
 * @param {string} tag
 * @returns {string}
 */
export function getLangLabel(tag = '') {
  const key = tag.split(/[\s,/#_-]/)[0].toLowerCase().trim();
  const prism = LANG_MAP[key];
  if (!prism) return tag || 'Code';
  // Capitalise first letter
  return prism.charAt(0).toUpperCase() + prism.slice(1);
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/**
 * Format a number for compact display: 1200 → "1.2k", 1500000 → "1.5m"
 *
 * @param {number} n
 * @returns {string}
 */
export function formatCount(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Strings ───────────────────────────────────────────────────────────────────

/**
 * Truncate a string to maxLen characters, appending "…" if trimmed.
 *
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 120) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Generate a URL-safe slug from a string.
 * e.g. "My Awesome Community!" → "my-awesome-community"
 *
 * @param {string} str
 * @returns {string}
 */
export function slugify(str = '') {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Check whether a post matches a search query string.
 * Checks all common text fields — used by Feed and Explore.
 *
 * @param {object} post
 * @param {string} query
 * @returns {boolean}
 */
export function postMatchesQuery(post, query) {
  if (!query?.trim()) return true;
  const q = query.toLowerCase();
  const fields = [
    post.caption, post.text, post.file_name, post.fileName, post.tag,
    post.project_title, post.project_desc, post.project_stack,
    post.community_name,
  ];
  return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
}
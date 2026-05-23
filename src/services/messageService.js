// src/services/messageService.js
// ─────────────────────────────────────────────────────────────────────────────
// All DB operations for the Direct Messages feature.
// Conversations are recruiter ↔ developer pairs.
// First message is always structured (role, company, location, salary, note).
// Subsequent messages are plain text ≤ 250 chars.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient';

// ── Conversations ─────────────────────────────────────────────────────────────

/**
 * Check if a conversation already exists between two users.
 * @param {string} recruiterId
 * @param {string} developerId
 * @returns {Promise<object|null>}
 */
export async function getExistingConversation(recruiterId, developerId) {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .eq('developer_id', developerId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Get all conversations for a developer (their inbox), newest first.
 * Joins the recruiter's profile for display.
 * @param {string} developerId
 * @returns {Promise<object[]>}
 */
export async function getDeveloperConversations(developerId) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      recruiter: profiles!recruiter_id (
        id, full_name, username, avatar_url
      )
    `)
    .eq('developer_id', developerId)
    .order('last_message_at', { ascending: false });

  if (error) { console.error('getDeveloperConversations:', error); return []; }
  return data || [];
}

/**
 * Get all conversations for a recruiter (their sent threads), newest first.
 * Joins the developer's profile for display.
 * @param {string} recruiterId
 * @returns {Promise<object[]>}
 */
export async function getRecruiterConversations(recruiterId) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      developer: profiles!developer_id (
        id, full_name, username, avatar_url
      )
    `)
    .eq('recruiter_id', recruiterId)
    .order('last_message_at', { ascending: false });

  if (error) { console.error('getRecruiterConversations:', error); return []; }
  return data || [];
}

// ── Starting a conversation ───────────────────────────────────────────────────

/**
 * Start a new conversation with a structured first message.
 * Creates the conversation row and the first message in one transaction-like pair.
 *
 * @param {string} recruiterId  — person sending (current user)
 * @param {string} developerId  — person receiving
 * @param {{
 *   roleTitle: string,
 *   company:   string,
 *   isRemote:  boolean,
 *   location:  string,
 *   salary:    string,
 *   note:      string        — the actual message body ≤ 250 chars
 * }} fields
 * @returns {Promise<{ conversation: object|null, error: Error|null }>}
 */
export async function startConversation(recruiterId, developerId, fields) {
  const { roleTitle, company, isRemote, location, salary, note } = fields;

  // 1. Create conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({
      recruiter_id: recruiterId,
      developer_id: developerId,
      role_title:   roleTitle || null,
      company:      company   || null,
      is_remote:    !!isRemote,
      location:     isRemote ? null : (location || null),
      salary:       salary   || null,
    })
    .select()
    .single();

  if (convErr) return { conversation: null, error: convErr };

  // 2. Insert the first message
  const { error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      sender_id:       recruiterId,
      content:         note.trim().slice(0, 250),
    });

  if (msgErr) return { conversation: conv, error: msgErr };
  return { conversation: conv, error: null };
}

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * Fetch all messages for a conversation, oldest first.
 * @param {string} conversationId
 * @returns {Promise<object[]>}
 */
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) { console.error('getMessages:', error); return []; }
  return data || [];
}

/**
 * Send a follow-up message in an existing conversation.
 * @param {string} conversationId
 * @param {string} senderId
 * @param {string} content  — ≤ 250 chars (enforced by DB constraint too)
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function sendMessage(conversationId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       senderId,
      content:         content.trim().slice(0, 250),
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Mark all unread messages in a conversation as read
 * (for messages NOT sent by the current user).
 * @param {string} conversationId
 * @param {string} currentUserId
 */
export async function markConversationRead(conversationId, currentUserId) {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false)
    .neq('sender_id', currentUserId);
}

/**
 * Get total unread message count for a user (as developer receiving messages).
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getUnreadMessageCount(userId) {
  // Get all conversations where this user is the developer
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('developer_id', userId);

  if (!convs?.length) return 0;

  const convIds = convs.map(c => c.id);
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .eq('is_read', false)
    .neq('sender_id', userId);

  return count ?? 0;
}

/**
 * Subscribe to new messages in a specific conversation (realtime).
 * Returns the channel — call supabase.removeChannel(ch) to cleanup.
 * @param {string} conversationId
 * @param {(msg: object) => void} onNew
 */
export function subscribeToMessages(conversationId, onNew) {
  const channel = supabase
    .channel(`messages_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNew(payload.new)
    )
    .subscribe();
  return channel;
}
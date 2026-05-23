// src/services/notificationService.js
import { supabase } from './supabaseClient';

/**
 * Fetch notifications for a user, with actor profile joined.
 * @param {string} userId
 * @param {number} limit
 */
export async function getNotifications(userId, limit = 40) {
  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(id, full_name, avatar_url, username)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

/**
 * Get count of unread notifications.
 * @param {string} userId
 */
export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count ?? 0;
}

/**
 * Mark all notifications as read for a user.
 * @param {string} userId
 */
export async function markAllRead(userId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export async function markOneRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

/**
 * Subscribe to realtime new notifications for a user.
 * Returns the channel — call supabase.removeChannel(channel) to cleanup.
 * @param {string} userId
 * @param {(notification: object) => void} onNew
 */
export function subscribeToNotifications(userId, onNew) {
  const channel = supabase
    .channel(`notifications_${userId}_${Date.now()}`) // 🔥 unique name
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new)
    )
    .subscribe();

  return channel;
}
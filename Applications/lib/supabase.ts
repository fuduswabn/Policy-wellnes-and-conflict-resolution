import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://zujvguvveokfuqxbcjqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anZndXZ2ZW9rZnVxeGJjanFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODI4MDEsImV4cCI6MjA4NTQ1ODgwMX0.ahaagF2L22zIhmrkFerpxjPDCgdWyUfqcZAEZzMwkX4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Email notification helper - sends email when user is offline
export async function sendEmailNotification(to: string, subject: string, message: string, fromName?: string) {
  try {
    // First, log the notification attempt
    await supabase.from('email_logs').insert({
      to_email: to,
      subject,
      message,
      from_name: fromName || 'Policy Training',
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Call Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        message,
        fromName: fromName || 'Policy Training',
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Check if user is online (for deciding whether to send email)
export async function checkUserOnlineStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_presence')
      .select('last_seen')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;

    // Consider user offline if last seen more than 5 minutes ago
    const lastSeen = new Date(data.last_seen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastSeen > fiveMinutesAgo;
  } catch {
    return false;
  }
}

// Update user presence (call this periodically when app is open)
export async function updateUserPresence(userId: string) {
  try {
    await supabase.from('user_presence').upsert({
      user_id: userId,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
}

// Store notification for when user comes online
export async function storeOfflineNotification(userId: string, type: string, title: string, body: string, data?: any) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      data: data || {},
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store notification:', error);
  }
}

// Get unread notifications for user
export async function getUnreadNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

// Mark notifications as read
export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', notificationIds);
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
  }
}

/**
 * SUPABASE SETUP - Run this SQL in your Supabase SQL Editor:
 * 
 * -- Email logs table
 * CREATE TABLE email_logs (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   to_email TEXT NOT NULL,
 *   subject TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   from_name TEXT,
 *   status TEXT DEFAULT 'pending',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- User presence table
 * CREATE TABLE user_presence (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id TEXT UNIQUE NOT NULL,
 *   last_seen TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Notifications table
 * CREATE TABLE notifications (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   title TEXT NOT NULL,
 *   body TEXT NOT NULL,
 *   data JSONB DEFAULT '{}',
 *   read BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Enable RLS
 * ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policies (allow all for anon key - adjust for production)
 * CREATE POLICY "Allow all" ON email_logs FOR ALL USING (true);
 * CREATE POLICY "Allow all" ON user_presence FOR ALL USING (true);
 * CREATE POLICY "Allow all" ON notifications FOR ALL USING (true);
 */
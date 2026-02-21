-- ==========================================
-- SUPABASE DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- 1. Email logs table (tracks all email notifications sent)
CREATE TABLE email_logs (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
to_email TEXT NOT NULL,
subject TEXT NOT NULL,
message TEXT NOT NULL,
from_name TEXT,
status TEXT DEFAULT 'pending',
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User presence table (tracks who's online/offline)
CREATE TABLE user_presence (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id TEXT UNIQUE NOT NULL,
last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Notifications table (stores notifications for offline users)
CREATE TABLE notifications (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id TEXT NOT NULL,
type TEXT NOT NULL,
title TEXT NOT NULL,
body TEXT NOT NULL,
data JSONB DEFAULT '{}',
read BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access (adjust for production security)
CREATE POLICY "Allow all operations on email_logs" ON email_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_presence" ON user_presence FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- ==========================================
-- SETUP COMPLETE! ✅
-- ==========================================

-- Next steps:
-- 1. Your tables are now ready
-- 2. Email notifications will be logged
-- 3. User presence tracking is active
-- 4. Offline notifications stored

-- Optional: Create indexes for better performance
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- View all email logs
-- SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;

-- View online users (last seen in last 5 minutes)
-- SELECT * FROM user_presence WHERE last_seen > NOW() - INTERVAL '5 minutes';

-- View unread notifications for a user
-- SELECT * FROM notifications WHERE user_id = 'USER_ID' AND read = FALSE;

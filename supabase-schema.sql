-- AudienceMeter Supabase Database Schema
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- This sets up the free PostgreSQL database with Realtime broadcast for 100-200+ live participants.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Presentations Table
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT true,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for instant lookup by room code (participant join speed)
CREATE INDEX IF NOT EXISTS idx_presentations_code ON presentations(code);

-- 3. Participants Table
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_code);

-- 4. Responses Table (Stores every single answer in real time)
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_whatsapp TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_responses_presentation ON responses(presentation_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_participant ON responses(participant_id);

-- 5. Enable Row Level Security (RLS) & Public Policies for seamless anonymous voting
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Allow public read & write (via anon key)
CREATE POLICY "Allow public read access to presentations" ON presentations FOR SELECT USING (true);
CREATE POLICY "Allow public insert to presentations" ON presentations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to presentations" ON presentations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to presentations" ON presentations FOR DELETE USING (true);

CREATE POLICY "Allow public read access to participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert to participants" ON participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to responses" ON responses FOR SELECT USING (true);
CREATE POLICY "Allow public insert to responses" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to responses" ON responses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to responses" ON responses FOR DELETE USING (true);

-- 6. Enable Supabase Realtime publication
-- This enables live WebSocket pushes to presenter screen & participants without polling!
ALTER PUBLICATION supabase_realtime ADD TABLE presentations;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;

-- Supabase Database Schema for Video Conference App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
-- Rooms: Anyone can read and create
CREATE POLICY "Allow public read access on rooms" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on rooms" ON rooms
  FOR INSERT WITH CHECK (true);

-- Messages: Anyone can read and create
CREATE POLICY "Allow public read access on messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for messages table (for live chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

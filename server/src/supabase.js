import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase credentials not configured. Database features disabled.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Room management functions
export async function createRoom(name, hostId) {
  if (!supabase) return { id: crypto.randomUUID(), name, host_id: hostId };

  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, host_id: hostId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRoom(roomId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) return null;
  return data;
}

export async function saveMessage(roomId, userId, userName, content) {
  if (!supabase) return { id: crypto.randomUUID(), room_id: roomId, user_id: userId, user_name: userName, content, created_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, user_id: userId, user_name: userName, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRoomMessages(roomId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
}

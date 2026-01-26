// API Configuration
// Change this IP to your computer's local network IP
const SERVER_IP = '192.168.110.186';
export const API_URL = `http://${SERVER_IP}:3001`;
export const SOCKET_URL = `http://${SERVER_IP}:3001`;

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// WebRTC Configuration
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// App Theme Colors
export const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#1f2937',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

// API Configuration (from env; use localhost for local dev)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.1.5:3001';

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// WebRTC Configuration
// relay-only 模式：仅使用 TURN，不使用 STUN 兜底。
// 若未配置 TURN，浏览器将无法建立媒体连接（符合“只走远程中继”的验收要求）。
const turnFromEnv =
  process.env.EXPO_PUBLIC_TURN_URL && process.env.EXPO_PUBLIC_TURN_USERNAME && process.env.EXPO_PUBLIC_TURN_CREDENTIAL
    ? [
        {
          urls: process.env.EXPO_PUBLIC_TURN_URL,
          username: process.env.EXPO_PUBLIC_TURN_USERNAME,
          credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : [];

export const ICE_SERVERS = [...turnFromEnv];

// relay-only：无论如何都强制 relay，杜绝 STUN/host 直连路径
export const FORCE_TURN_RELAY = true;

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

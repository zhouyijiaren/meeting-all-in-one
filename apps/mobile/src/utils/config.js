// API Configuration (from env; use localhost for local dev)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.1.5:3001';

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// WebRTC Configuration
// 仅 STUN：同局域网可直连；跨网（不同 WiFi/4G/公司网）易失败，需 TURN 中继。
// 若需跨网互通，请自建 coturn 或使用 Twilio/Xirsys 等，并配置 EXPO_PUBLIC_TURN_* 环境变量。
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

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  ...turnFromEnv,
];

// 设为 true 时强制只走 TURN（用于本地验证 TURN 是否可用，需同时配置 TURN）
export const FORCE_TURN_RELAY =
  process.env.EXPO_PUBLIC_FORCE_TURN === 'true' && turnFromEnv.length > 0;

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

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import cors from 'cors';
import compression from 'compression';
import { setupSocketHandlers, getRoomInfo } from './socket.js';
import { createRoom, getRoom } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 短码 <-> 房间 ID 映射（内存，重启清空）
const shortCodeToRoomId = new Map();
const roomIdToShortCode = new Map();
const SHORT_CODE_CHARS = '0123456789';
const SHORT_CODE_LEN = 4;

function generateShortCode() {
  let code = '';
  for (let i = 0; i < SHORT_CODE_LEN; i++) {
    code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return code;
}

function ensureShortCode(roomId) {
  let code = roomIdToShortCode.get(roomId);
  if (code) return code;
  do {
    code = generateShortCode();
  } while (shortCodeToRoomId.has(code));
  shortCodeToRoomId.set(code, roomId);
  roomIdToShortCode.set(roomId, code);
  return code;
}
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
// 生产环境启用 gzip，大幅减少 JS/CSS 等静态资源传输体积（约 70%）
if (process.env.NODE_ENV === 'production') {
  app.use(compression());
}

// Static frontend：优先 server/public（Docker 会拷入 dist-web），若无则回退到 apps/mobile/dist-web（本地先 build:web:vite）
const publicDir = path.join(__dirname, '..', 'public');
const fallbackWebDir = path.join(__dirname, '..', '..', 'apps', 'mobile', 'dist-web');
const hasPublic = existsSync(publicDir) && existsSync(path.join(publicDir, 'index.html'));
const staticDir = hasPublic ? publicDir : (existsSync(fallbackWebDir) && existsSync(path.join(fallbackWebDir, 'index.html')) ? fallbackWebDir : publicDir);
const isProduction = process.env.NODE_ENV === 'production';
if (existsSync(staticDir)) {
  app.use(
    express.static(staticDir, {
      maxAge: isProduction ? '1y' : 0,
      etag: true,
      lastModified: true,
    })
  );
  if (!hasPublic && staticDir === fallbackWebDir) {
    console.log('Serving web from apps/mobile/dist-web (no server/public/index.html)');
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ICE 配置（含 TURN）由服务端下发，前端不写死
// TURN URL: turn:host:port；若只填 host 则补 3478；同时下发 TCP 以兼容只转发 TCP 的平台
function normalizeTurnUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^turn(s)?:/i.test(s)) return s; // 已带 turn: 或 turns:
  const part = s.replace(/^https?:\/\//, '').split('/')[0];
  const [host, port] = part.includes(':') ? part.split(':') : [part, '3478'];
  return host ? `turn:${host}:${port || 3478}` : null;
}

app.get('/api/ice-servers', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  const rawTurn = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;
  const turnUrl = normalizeTurnUrl(rawTurn);
  if (turnUrl && turnUser && turnCred) {
    // 同时下发 UDP 和 TCP，Zeabur 等平台可能只转发 TCP
    iceServers.push({
      urls: [turnUrl, turnUrl + '?transport=tcp'],
      username: turnUser,
      credential: turnCred,
    });
  }
  const forceRelay = process.env.FORCE_TURN === 'true' && iceServers.some(s => s.urls && String(s.urls).startsWith('turn:'));
  res.json({ iceServers, forceRelay: !!forceRelay });
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, hostId } = req.body;
    const room = await createRoom(name || 'New Meeting', hostId);
    const shortCode = ensureShortCode(room.id);
    res.json({ ...room, shortCode });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// 通过短码解析房间 ID（短链入会用）
app.get('/api/rooms/by-code/:shortCode', (req, res) => {
  const code = (req.params.shortCode || '').toUpperCase().trim();
  const roomId = shortCodeToRoomId.get(code);
  if (!roomId) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ id: roomId });
});

// Get room info（含 shortCode 便于分享）
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getRoom(roomId);
    const liveInfo = getRoomInfo(roomId);
    const shortCode = roomIdToShortCode.get(roomId) || ensureShortCode(roomId);

    res.json({
      ...room,
      shortCode,
      participants: liveInfo?.participants || [],
      participantCount: liveInfo?.count || 0
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// SPA fallback: index.html 不长期缓存，便于发版后及时拿到新资源
const indexPath = path.join(staticDir, 'index.html');
if (existsSync(staticDir) && existsSync(indexPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket')) return next();
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

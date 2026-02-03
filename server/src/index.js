import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import cors from 'cors';
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

// Static frontend (when deployed with Docker; public/ may not exist in local dev)
const publicDir = path.join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// SPA fallback: serve index.html for non-API routes (only when public exists)
if (existsSync(publicDir)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket')) return next();
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

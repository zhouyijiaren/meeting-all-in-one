import { saveMessage, getRoomMessages } from './supabase.js';
import fs from 'fs';

// Store room participants: { roomId: { odIdparticipants: Map<socketId, userInfo> } }
const rooms = new Map();
const DEBUG_LOG_PATH = '/opt/cursor/logs/debug.log';

function writeDebugLog(hypothesisId, location, message, data = {}) {
  try {
    fs.appendFileSync(
      DEBUG_LOG_PATH,
      JSON.stringify({ hypothesisId, location, message, data, timestamp: Date.now() }) + '\n'
    );
  } catch {}
}

function getCandidateType(candidate) {
  const line = candidate?.candidate;
  if (typeof line !== 'string') return null;
  const match = line.match(/\btyp\s+([a-zA-Z0-9]+)/);
  return match?.[1] || null;
}

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    // #region agent log
    writeDebugLog('H3', 'server/src/socket.js:connection', 'socket connected', { socketId: socket.id });
    // #endregion

    let currentRoom = null;
    let currentUser = null;

    // Join a room
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      // #region agent log
      writeDebugLog('H1', 'server/src/socket.js:join-room:entry', 'join-room received', {
        socketId: socket.id,
        roomId,
      });
      // #endregion
      currentRoom = roomId;
      currentUser = { id: userId, name: userName, socketId: socket.id };

      // Initialize room if doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomParticipants = rooms.get(roomId);

      // Notify existing participants about new user
      const existingParticipants = Array.from(roomParticipants.values());
      // #region agent log
      writeDebugLog('H1', 'server/src/socket.js:join-room:participants-before-add', 'existing participants', {
        socketId: socket.id,
        roomId,
        count: existingParticipants.length,
      });
      // #endregion

      // Add new participant
      roomParticipants.set(socket.id, currentUser);

      // Join socket.io room
      socket.join(roomId);

      // Send existing participants to the new user
      socket.emit('room-participants', existingParticipants);

      // Load existing messages
      const messages = await getRoomMessages(roomId);
      socket.emit('room-messages', messages);

      // Notify others about new participant
      socket.to(roomId).emit('user-joined', currentUser);

      console.log(`${userName} joined room ${roomId}`);
    });

    // Leave room
    socket.on('leave-room', () => {
      if (currentRoom && currentUser) {
        handleLeaveRoom(socket, currentRoom, currentUser);
        currentRoom = null;
        currentUser = null;
      }
    });

    // WebRTC Signaling: Offer
    socket.on('offer', ({ to, offer }) => {
      // #region agent log
      writeDebugLog('H4', 'server/src/socket.js:offer', 'forwarding offer', {
        from: socket.id,
        to,
        hasSdp: Boolean(offer?.sdp),
      });
      // #endregion
      socket.to(to).emit('offer', {
        from: socket.id,
        offer,
        user: currentUser
      });
    });

    // WebRTC Signaling: Answer
    socket.on('answer', ({ to, answer }) => {
      // #region agent log
      writeDebugLog('H4', 'server/src/socket.js:answer', 'forwarding answer', {
        from: socket.id,
        to,
        hasSdp: Boolean(answer?.sdp),
      });
      // #endregion
      socket.to(to).emit('answer', {
        from: socket.id,
        answer
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', ({ to, candidate }) => {
      // #region agent log
      writeDebugLog('H4', 'server/src/socket.js:ice-candidate', 'forwarding ice-candidate', {
        from: socket.id,
        to,
        candidateType: getCandidateType(candidate),
      });
      // #endregion
      socket.to(to).emit('ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    // Chat message
    socket.on('chat-message', async ({ content }) => {
      if (!currentRoom || !currentUser) return;

      try {
        const message = await saveMessage(
          currentRoom,
          currentUser.id,
          currentUser.name,
          content
        );

        // Broadcast to all room participants including sender
        io.to(currentRoom).emit('new-message', message);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Screen sharing status
    socket.on('screen-share-started', () => {
      if (currentRoom) {
        socket.to(currentRoom).emit('user-screen-sharing', {
          socketId: socket.id,
          user: currentUser,
          sharing: true
        });
      }
    });

    socket.on('screen-share-stopped', () => {
      if (currentRoom) {
        socket.to(currentRoom).emit('user-screen-sharing', {
          socketId: socket.id,
          user: currentUser,
          sharing: false
        });
      }
    });

    // Media status updates
    socket.on('media-status', ({ audio, video }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit('user-media-status', {
          socketId: socket.id,
          audio,
          video
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentRoom && currentUser) {
        handleLeaveRoom(socket, currentRoom, currentUser);
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  function handleLeaveRoom(socket, roomId, user) {
    const roomParticipants = rooms.get(roomId);

    if (roomParticipants) {
      roomParticipants.delete(socket.id);

      // Clean up empty rooms
      if (roomParticipants.size === 0) {
        rooms.delete(roomId);
      }
    }

    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { socketId: socket.id, user });

    console.log(`${user.name} left room ${roomId}`);
  }
}

export function getRoomInfo(roomId) {
  const roomParticipants = rooms.get(roomId);
  if (!roomParticipants) return null;

  return {
    participants: Array.from(roomParticipants.values()),
    count: roomParticipants.size
  };
}

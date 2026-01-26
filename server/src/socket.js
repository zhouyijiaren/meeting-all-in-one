import { saveMessage, getRoomMessages } from './supabase.js';

// Store room participants: { roomId: { odIdparticipants: Map<socketId, userInfo> } }
const rooms = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    let currentRoom = null;
    let currentUser = null;

    // Join a room
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      currentRoom = roomId;
      currentUser = { id: userId, name: userName, socketId: socket.id };

      // Initialize room if doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomParticipants = rooms.get(roomId);

      // Notify existing participants about new user
      const existingParticipants = Array.from(roomParticipants.values());

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
      }
    });

    // WebRTC Signaling: Offer
    socket.on('offer', ({ to, offer }) => {
      socket.to(to).emit('offer', {
        from: socket.id,
        offer,
        user: currentUser
      });
    });

    // WebRTC Signaling: Answer
    socket.on('answer', ({ to, answer }) => {
      socket.to(to).emit('answer', {
        from: socket.id,
        answer
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', ({ to, candidate }) => {
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

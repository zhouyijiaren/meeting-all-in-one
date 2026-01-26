import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  getSocketId() {
    return this.socket?.id;
  }

  // Room management
  joinRoom(roomId, userId, userName) {
    this.socket?.emit('join-room', { roomId, userId, userName });
  }

  leaveRoom() {
    this.socket?.emit('leave-room');
  }

  // WebRTC Signaling
  sendOffer(to, offer) {
    this.socket?.emit('offer', { to, offer });
  }

  sendAnswer(to, answer) {
    this.socket?.emit('answer', { to, answer });
  }

  sendIceCandidate(to, candidate) {
    this.socket?.emit('ice-candidate', { to, candidate });
  }

  // Chat
  sendMessage(content) {
    this.socket?.emit('chat-message', { content });
  }

  // Media status
  sendMediaStatus(audio, video) {
    this.socket?.emit('media-status', { audio, video });
  }

  // Screen sharing
  notifyScreenShareStarted() {
    this.socket?.emit('screen-share-started');
  }

  notifyScreenShareStopped() {
    this.socket?.emit('screen-share-stopped');
  }

  // Event listeners
  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();

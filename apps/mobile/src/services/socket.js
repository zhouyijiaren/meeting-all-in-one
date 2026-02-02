import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      // 连接建立后补绑「先注册、后连接」的监听器
      this._attachPendingListeners();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // 若已存在 socket（例如重连），立即补绑
    if (this.socket) this._attachPendingListeners();
    return this.socket;
  }

  _attachPendingListeners() {
    if (!this.socket) return;
    const pending = this.listeners;
    this.listeners = new Map();
    pending.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket.on(event, cb));
    });
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

  // Event listeners：支持在 connect 之前注册，连接后会自动绑定
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    } else {
      const list = this.listeners.get(event);
      if (list) {
        const i = list.indexOf(callback);
        if (i !== -1) list.splice(i, 1);
      }
    }
  }
}

export const socketService = new SocketService();

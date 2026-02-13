import { useState, useEffect, useCallback } from 'react';
import { webRTCService } from '../services/webrtc';
import { socketService } from '../services/socket';
import { apiService } from '../services/api';
import { API_URL, SOCKET_URL, ICE_SERVERS as DEFAULT_ICE_SERVERS } from '../utils/config';

export function useWebRTC(roomId, userId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  /** 当前连接配置，用于界面显示（不依赖 console） */
  const [connectionInfo, setConnectionInfo] = useState(null);

  // Initialize connection
  const connect = useCallback(async () => {
    try {
      // 先记下 API/Socket 地址，供界面和 console 显示
      const info = { apiUrl: API_URL, socketUrl: SOCKET_URL, iceLines: [] };
      setConnectionInfo(info);
      console.log('[连接地址] API:', API_URL, '| Socket:', SOCKET_URL);

      // Connect socket
      socketService.connect();

      // Try to get local media stream (may fail on HTTP)
      try {
        const stream = await webRTCService.getLocalStream(true, true);
        setLocalStream(stream);
      } catch (mediaError) {
        console.warn('Could not get media stream (camera/mic):', mediaError.message);
        // Continue without local stream - user can still join and chat
        setIsAudioEnabled(false);
        setIsVideoEnabled(false);
      }

      // Set up remote stream callbacks
      webRTCService.onRemoteStream((socketId, stream) => {
        setRemoteStreams(prev => new Map(prev).set(socketId, stream));
      });

      webRTCService.onRemoteStreamRemoved((socketId) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
      });

      // Socket event handlers
      socketService.on('room-participants', async (existingParticipants) => {
        setParticipants(existingParticipants);

        // Create offers to all existing participants
        for (const participant of existingParticipants) {
          await webRTCService.createOffer(participant.socketId);
        }
      });

      socketService.on('user-joined', (user) => {
        setParticipants(prev => [...prev, user]);
      });

      socketService.on('user-left', ({ socketId }) => {
        webRTCService.closePeerConnection(socketId);
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      });

      socketService.on('offer', async ({ from, offer }) => {
        await webRTCService.handleOffer(from, offer);
      });

      socketService.on('answer', async ({ from, answer }) => {
        await webRTCService.handleAnswer(from, answer);
      });

      socketService.on('ice-candidate', async ({ from, candidate }) => {
        await webRTCService.handleIceCandidate(from, candidate);
      });

      socketService.on('user-media-status', ({ socketId, audio, video }) => {
        setParticipants(prev =>
          prev.map(p =>
            p.socketId === socketId
              ? { ...p, audioEnabled: audio, videoEnabled: video }
              : p
          )
        );
      });

      // 使用服务端下发的 ICE（含 TURN），不写死在前端
      const iceConfig = await apiService.getIceServers();
      const iceLines = [];
      if (iceConfig?.iceServers?.length) {
        webRTCService.setIceServers(iceConfig.iceServers);
        webRTCService.setForceRelay(iceConfig.forceRelay);
        const hasTurn = iceConfig.iceServers.some(s => String(s.urls || '').startsWith('turn:'));
        console.log('[WebRTC] ICE 配置: 服务端下发,', iceConfig.iceServers.length, '个服务器,', hasTurn ? '含 TURN' : '仅 STUN', iceConfig.forceRelay ? ', 强制走 TURN' : '');
        iceConfig.iceServers.forEach((s, i) => {
          const urls = Array.isArray(s.urls) ? s.urls : [s.urls].filter(Boolean);
          urls.forEach(u => {
            const type = String(u).startsWith('turn:') ? 'TURN' : 'STUN';
            const auth = s.username ? ` (user=${s.username})` : '';
            const line = `${type} ${u}${auth}`;
            iceLines.push(line);
            console.log(`  [ICE ${i + 1}] ${line}`);
          });
        });
        setConnectionInfo(prev => (prev ? { ...prev, iceLines } : { apiUrl: API_URL, socketUrl: SOCKET_URL, iceLines }));
      } else {
        console.log('[WebRTC] ICE 配置: 使用前端默认(仅 STUN)');
        DEFAULT_ICE_SERVERS.forEach((s, i) => {
          const urls = Array.isArray(s.urls) ? s.urls : [s.urls].filter(Boolean);
          urls.forEach(u => {
            const type = String(u).startsWith('turn:') ? 'TURN' : 'STUN';
            iceLines.push(`${type} ${u}`);
            console.log(`  [ICE ${i + 1}] ${type} ${u}`);
          });
        });
      }
      setConnectionInfo(prev => (prev ? { ...prev, iceLines } : { apiUrl: API_URL, socketUrl: SOCKET_URL, iceLines }));

      // Join the room
      socketService.joinRoom(roomId, userId, userName);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting:', error);
      throw error;
    }
  }, [roomId, userId, userName]);

  // Disconnect
  const disconnect = useCallback(() => {
    socketService.leaveRoom();
    socketService.disconnect();
    webRTCService.cleanup();
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setIsConnected(false);
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    webRTCService.toggleAudio(newState);
    setIsAudioEnabled(newState);
    socketService.sendMediaStatus(newState, isVideoEnabled);
  }, [isAudioEnabled, isVideoEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    webRTCService.toggleVideo(newState);
    setIsVideoEnabled(newState);
    socketService.sendMediaStatus(isAudioEnabled, newState);
  }, [isAudioEnabled, isVideoEnabled]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await webRTCService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webRTCService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [isScreenSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isConnected,
    connectionInfo,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { webRTCService } from '../services/webrtc';
import { socketService } from '../services/socket';

export function useWebRTC(roomId, userId, userName) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize connection
  const connect = useCallback(async () => {
    try {
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
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}

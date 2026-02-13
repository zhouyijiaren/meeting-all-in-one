import { Platform } from 'react-native';

// WebRTC APIs - use native module on mobile, browser APIs on web
let RTCPeerConnection;
let RTCSessionDescription;
let RTCIceCandidate;
let mediaDevices;

if (Platform.OS === 'web') {
  // Web platform - use browser native APIs
  RTCPeerConnection = window.RTCPeerConnection;
  RTCSessionDescription = window.RTCSessionDescription;
  RTCIceCandidate = window.RTCIceCandidate;
  mediaDevices = navigator.mediaDevices;
} else {
  // Native platforms - use react-native-webrtc
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  mediaDevices = webrtc.mediaDevices;
}

import { ICE_SERVERS, FORCE_TURN_RELAY } from '../utils/config';
import { socketService } from './socket';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.screenStream = null;
    this.peerConnections = new Map(); // socketId -> RTCPeerConnection
    this.remoteStreams = new Map(); // socketId -> MediaStream
    this.onRemoteStreamCallback = null;
    this.onRemoteStreamRemovedCallback = null;
    // 可由服务端下发的 ICE 覆盖（不设则用 config 默认）
    this.iceServers = null;
    this.forceRelay = null;
  }

  /** 使用服务端下发的 ICE 配置（加入房间前由 useWebRTC 拉取并调用） */
  setIceServers(iceServers) {
    this.iceServers = iceServers && iceServers.length ? iceServers : null;
  }

  setForceRelay(forceRelay) {
    this.forceRelay = !!forceRelay;
  }

  /** 连接成功后打印实际使用的协议：host=直连, srflx=STUN, relay=TURN */
  async _logConnectionProtocol(pc, remoteSocketId) {
    try {
      const stats = await pc.getStats();
      let localType = '';
      let remoteType = '';
      for (const report of stats.values()) {
        if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
          const local = stats.get(report.localCandidateId);
          const remote = stats.get(report.remoteCandidateId);
          if (local) localType = local.candidateType || local.type || '';
          if (remote) remoteType = remote.candidateType || remote.type || '';
          break;
        }
      }
      const protocol = localType === 'relay' || remoteType === 'relay' ? 'TURN 中继' : localType === 'srflx' || remoteType === 'srflx' ? 'STUN 公网直连' : '本地/直连';
      console.log(`[WebRTC] 与 ${remoteSocketId} 连接使用: ${protocol} (本地: ${localType || '?'}, 远端: ${remoteType || '?'})`);
    } catch (e) {
      console.warn('[WebRTC] 无法读取连接协议:', e?.message);
    }
  }

  // Initialize local media stream
  async getLocalStream(video = true, audio = true) {
    try {
      const constraints = {
        audio,
        video: video ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Start screen sharing (web only)
  async startScreenShare() {
    try {
      if (Platform.OS === 'web' && navigator.mediaDevices?.getDisplayMedia) {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        // Replace video track in all peer connections
        const videoTrack = this.screenStream.getVideoTracks()[0];

        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Handle screen share stop
        videoTrack.onended = () => {
          this.stopScreenShare();
        };

        socketService.notifyScreenShareStarted();
        return this.screenStream;
      }
      throw new Error('Screen sharing not supported');
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());

      // Restore camera track
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
      }

      this.screenStream = null;
      socketService.notifyScreenShareStopped();
    }
  }

  // Create peer connection for a remote user（优先用服务端下发的 iceServers/forceRelay）
  createPeerConnection(remoteSocketId) {
    const iceServers = this.iceServers ?? ICE_SERVERS;
    const forceRelay = this.forceRelay ?? FORCE_TURN_RELAY;
    const config = {
      iceServers,
      ...(forceRelay && { iceTransportPolicy: 'relay' }),
    };
    const pc = new RTCPeerConnection(config);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate(remoteSocketId, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        this._logConnectionProtocol(pc, remoteSocketId);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(remoteSocketId);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.remoteStreams.set(remoteSocketId, remoteStream);
        this.onRemoteStreamCallback?.(remoteSocketId, remoteStream);
      }
    };

    this.peerConnections.set(remoteSocketId, pc);
    return pc;
  }

  // Create and send offer
  async createOffer(remoteSocketId) {
    const pc = this.peerConnections.get(remoteSocketId) || this.createPeerConnection(remoteSocketId);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socketService.sendOffer(remoteSocketId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // Handle incoming offer
  async handleOffer(fromSocketId, offer) {
    const pc = this.peerConnections.get(fromSocketId) || this.createPeerConnection(fromSocketId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendAnswer(fromSocketId, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle incoming answer
  async handleAnswer(fromSocketId, answer) {
    const pc = this.peerConnections.get(fromSocketId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(fromSocketId, candidate) {
    const pc = this.peerConnections.get(fromSocketId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    }
  }

  // Close a specific peer connection
  closePeerConnection(socketId) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }

    this.remoteStreams.delete(socketId);
    this.onRemoteStreamRemovedCallback?.(socketId);
  }

  // Close all peer connections
  closeAllConnections() {
    this.peerConnections.forEach((pc, socketId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  // Set callback for remote stream events
  onRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }

  onRemoteStreamRemoved(callback) {
    this.onRemoteStreamRemovedCallback = callback;
  }

  // Cleanup
  cleanup() {
    this.stopLocalStream();
    this.stopScreenShare();
    this.closeAllConnections();
  }
}

export const webRTCService = new WebRTCService();

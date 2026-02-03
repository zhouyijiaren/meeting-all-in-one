import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoGrid, ControlBar, ChatPanel } from '../../src/components';
import { useWebRTC, useChat } from '../../src/hooks';
import { apiService } from '../../src/services/api';
import { COLORS } from '../../src/utils/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHAT_WIDTH = 320;

const LAYOUT_MODES = [
  { key: 'grid', label: '九宫格' },
  { key: 'horizontal', label: '横向' },
  { key: 'vertical', label: '纵向' },
  { key: 'speaker', label: '左大右列' },
];

export default function RoomScreen() {
  const { id: roomId, userName, userId } = useLocalSearchParams();
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [focusedId, setFocusedId] = useState(null);
  const [shortCode, setShortCode] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    apiService.getRoom(roomId).then((r) => r.shortCode && setShortCode(r.shortCode)).catch(() => {});
  }, [roomId]);

  const {
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
  } = useWebRTC(roomId, userId, userName);

  const { messages, sendMessage } = useChat();

  useEffect(() => {
    const initConnection = async () => {
      try {
        await connect();
      } catch (err) {
        console.error('Failed to connect:', err);
        setError('Failed to connect to the meeting. Please check your camera/microphone permissions.');
      }
    };

    initConnection();

    return () => {
      disconnect();
    };
  }, []);

  const handleLeave = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to leave the meeting?')) {
        disconnect();
        router.replace('/');
      }
    } else {
      Alert.alert(
        'Leave Meeting',
        'Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              disconnect();
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  const getShareUrl = () => {
    if (shortCode && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/r/${shortCode}`;
    }
    return shortCode ? `/r/${shortCode}` : roomId;
  };

  const handleCopyShareLink = () => {
    const url = getShareUrl();
    const toCopy = url.startsWith('http') ? url : (typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}${url}` : url);
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(toCopy);
      window.alert('分享链接已复制');
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.roomTitle}>Meeting</Text>
          <TouchableOpacity onPress={handleCopyShareLink}>
            <Text style={styles.roomId}>
              {shortCode ? `分享: /r/${shortCode} (点击复制链接)` : `房间: ${roomId} (点击复制)`}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.layoutRow}>
          {LAYOUT_MODES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.layoutButton, layoutMode === key && styles.layoutButtonActive]}
              onPress={() => setLayoutMode(key)}
            >
              <Text style={[styles.layoutLabel, layoutMode === key && styles.layoutLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.participantCount}>
            <Text style={styles.participantCountText}>
              {participants.length + 1} 人
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Video Grid */}
        <View style={[styles.videoArea, isChatVisible && styles.videoAreaWithChat]}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            userName={userName}
            layoutMode={layoutMode}
            focusedId={focusedId}
            onFocusParticipant={setFocusedId}
          />
        </View>

        {/* Chat Panel */}
        {isChatVisible && (
          <View style={styles.chatPanel}>
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              currentUserId={userId}
            />
          </View>
        )}
      </View>

      {/* Control Bar */}
      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeave={handleLeave}
        onToggleChat={() => setIsChatVisible(!isChatVisible)}
        isChatVisible={isChatVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  layoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  layoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  layoutButtonActive: {
    backgroundColor: COLORS.primary,
  },
  layoutLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  layoutLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  roomId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  participantCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  participantCountText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  videoArea: {
    flex: 1,
  },
  videoAreaWithChat: {
    flex: Platform.OS === 'web' ? undefined : 1,
    width: Platform.OS === 'web' ? `calc(100% - ${CHAT_WIDTH}px)` : undefined,
  },
  chatPanel: {
    width: Platform.OS === 'web' ? CHAT_WIDTH : '100%',
    position: Platform.OS === 'web' ? 'relative' : 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.surfaceLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});

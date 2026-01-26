import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../utils/config';

export function ControlBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  onToggleChat,
  isChatVisible,
}) {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !isAudioEnabled && styles.buttonOff]}
        onPress={onToggleAudio}
      >
        <Text style={styles.icon}>{isAudioEnabled ? '🎤' : '🔇'}</Text>
        <Text style={styles.label}>{isAudioEnabled ? 'Mute' : 'Unmute'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !isVideoEnabled && styles.buttonOff]}
        onPress={onToggleVideo}
      >
        <Text style={styles.icon}>{isVideoEnabled ? '📹' : '📷'}</Text>
        <Text style={styles.label}>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</Text>
      </TouchableOpacity>

      {isWeb && (
        <TouchableOpacity
          style={[styles.button, isScreenSharing && styles.buttonActive]}
          onPress={onToggleScreenShare}
        >
          <Text style={styles.icon}>{isScreenSharing ? '🖥️' : '💻'}</Text>
          <Text style={styles.label}>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, isChatVisible && styles.buttonActive]}
        onPress={onToggleChat}
      >
        <Text style={styles.icon}>💬</Text>
        <Text style={styles.label}>Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.leaveButton]}
        onPress={onLeave}
      >
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.label}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
  },
  buttonOff: {
    backgroundColor: COLORS.error + '40',
  },
  buttonActive: {
    backgroundColor: COLORS.primary + '40',
  },
  leaveButton: {
    backgroundColor: COLORS.error,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    color: COLORS.text,
    fontSize: 10,
    textAlign: 'center',
  },
});

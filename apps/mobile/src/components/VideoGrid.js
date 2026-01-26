import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VideoView } from './VideoView';
import { COLORS } from '../utils/config';
import { getInitials } from '../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function VideoGrid({ localStream, remoteStreams, participants, userName }) {
  const totalParticipants = remoteStreams.size + 1; // Include self

  const renderLocalVideo = () => (
    <View style={[styles.videoContainer, getVideoStyle(totalParticipants)]}>
      {localStream ? (
        <VideoView stream={localStream} mirror={true} />
      ) : (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{getInitials(userName || 'Me')}</Text>
        </View>
      )}
      <View style={styles.nameTag}>
        <Text style={styles.nameText}>You</Text>
      </View>
    </View>
  );

  const renderRemoteVideos = () => {
    const entries = Array.from(remoteStreams.entries());
    return entries.map(([socketId, stream], index) => {
      const participant = participants.find(p => p.socketId === socketId);
      return (
        <View key={socketId} style={[styles.videoContainer, getVideoStyle(totalParticipants)]}>
          {stream ? (
            <VideoView stream={stream} />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>
                {getInitials(participant?.name || 'User')}
              </Text>
            </View>
          )}
          <View style={styles.nameTag}>
            <Text style={styles.nameText}>{participant?.name || 'User'}</Text>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {renderLocalVideo()}
      {renderRemoteVideos()}
    </View>
  );
}

function getVideoStyle(total) {
  // Calculate grid layout based on participant count
  if (total === 1) {
    return { width: '100%', height: '100%' };
  }
  if (total === 2) {
    return { width: '100%', height: '50%' };
  }
  if (total <= 4) {
    return { width: '50%', height: '50%' };
  }
  return { width: '50%', height: '33.33%' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.background,
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  avatar: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  nameTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  nameText: {
    color: COLORS.text,
    fontSize: 12,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../src/utils/config';
import { generateId, generateRoomCode } from '../src/utils/helpers';
import { apiService } from '../src/services/api';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      showAlert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const userId = generateId();
      const room = await apiService.createRoom('Meeting', userId);

      router.push({
        pathname: '/room/[id]',
        params: {
          id: room.id,
          userName: userName.trim(),
          userId,
        },
      });
    } catch (error) {
      showAlert('Error', 'Failed to create room. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      showAlert('Error', 'Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      showAlert('Error', 'Please enter a room code');
      return;
    }

    const userId = generateId();

    router.push({
      pathname: '/room/[id]',
      params: {
        id: roomCode.trim(),
        userName: userName.trim(),
        userId,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Meeting</Text>
        <Text style={styles.subtitle}>创建或加入会议</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateRoom}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '创建中...' : '创建会议'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Room Code</Text>
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="Enter room code"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleJoinRoom}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>加入会议</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>
        Built with Expo + WebRTC + Socket.io
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceLight,
  },
  dividerText: {
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

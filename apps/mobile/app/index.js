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
import { generateId, untitledName } from '../src/utils/helpers';
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
    setIsLoading(true);
    try {
      const userId = generateId();
      const room = await apiService.createRoom('Meeting', userId);
      const displayName = (userName || '').trim() || untitledName();

      router.push({
        pathname: '/room/[id]',
        params: {
          id: room.id,
          userName: displayName,
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
    if (!roomCode.trim()) {
      showAlert('Error', '请输入房间码或短链码');
      return;
    }

    const userId = generateId();
    const displayName = (userName || '').trim() || untitledName();
    const code = roomCode.trim();

    // 若是短码（4–8 位字母数字），先按短码解析
    if (/^[A-Za-z0-9]{4,8}$/.test(code)) {
      setIsLoading(true);
      try {
        const data = await apiService.getRoomByShortCode(code);
        router.push({
          pathname: '/room/[id]',
          params: { id: data.id, userName: displayName, userId },
        });
      } catch {
        router.push({
          pathname: '/room/[id]',
          params: { id: code, userName: displayName, userId },
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    router.push({
      pathname: '/room/[id]',
      params: { id: code, userName: displayName, userId },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Meeting</Text>
        <Text style={styles.subtitle}>创建或加入会议</Text>

        <View style={styles.form}>
          <Text style={styles.label}>你的名字（可选）</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="不填则使用随机名称"
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

          <Text style={styles.label}>房间码或短链码</Text>
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="如 ABC12X 或完整房间 ID"
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

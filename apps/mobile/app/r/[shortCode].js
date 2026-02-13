import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '../../src/utils/config';
import { generateId, untitledName } from '../../src/utils/helpers';
import { apiService } from '../../src/services/api';
import { prefetchRoomChunk } from '../../src/utils/prefetchRoom';

export default function ShortJoinScreen() {
  const { shortCode } = useLocalSearchParams();
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const prefetched = useRef(false);
  const onMaybeEnterRoom = () => {
    if (Platform.OS !== 'web' || prefetched.current) return;
    prefetched.current = true;
    prefetchRoomChunk();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shortCode?.trim()) {
        setError('链接无效');
        setLoading(false);
        return;
      }
      try {
        const data = await apiService.getRoomByShortCode(shortCode);
        if (!cancelled) {
          setRoomId(data.id);
        }
      } catch (e) {
        if (!cancelled) setError('会议不存在或已结束');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shortCode]);

  const handleJoin = () => {
    if (!roomId) return;
    const userName = (name || '').trim() || untitledName();
    const userId = generateId();
    router.replace({
      pathname: '/room/[id]',
      params: { id: roomId, userName, userId },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>正在进入会议...</Text>
      </View>
    );
  }

  if (error || !roomId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || '会议不存在'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>返回首页</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>加入会议</Text>
        <Text style={styles.hint}>填写昵称（可选，不填将使用随机名称）</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="你的名字"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleJoin}
          onPressIn={onMaybeEnterRoom}
        >
          <Text style={styles.buttonText}>进入会议</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
});

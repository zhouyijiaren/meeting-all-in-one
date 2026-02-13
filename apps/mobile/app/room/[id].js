import React, { Suspense, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/utils/config';

const RoomContent = React.lazy(() => import('../../src/screens/RoomContent'));

function RoomLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>进入会议中...</Text>
    </View>
  );
}

export default function RoomScreen() {
  const { id: roomId, userName, userId } = useLocalSearchParams();

  if (!roomId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>无效房间</Text>
      </View>
    );
  }

  const content = (
    <Suspense fallback={<RoomLoading />}>
      <RoomContent roomId={roomId} userId={userId} userName={userName} />
    </Suspense>
  );

  return (
    <View style={styles.screenWrap}>
      {Platform.OS === 'web' ? (
        <View style={styles.screenWrap}>{content}</View>
      ) : (
        <SafeAreaProvider style={styles.screenWrap}>{content}</SafeAreaProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    minHeight: 0,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
});

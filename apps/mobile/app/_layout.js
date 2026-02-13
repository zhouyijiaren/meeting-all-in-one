import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, API_URL } from '../src/utils/config';

function WebPreconnect() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      const origin = typeof API_URL === 'string' ? new URL(API_URL).origin : '';
      if (!origin) return;
      let link = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        document.head.appendChild(link);
      }
    } catch (_) {}
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <>
      <WebPreconnect />
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: COLORS.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Video Conference',
          }}
        />
        <Stack.Screen
          name="room/[id]"
          options={{
            title: 'Meeting Room',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

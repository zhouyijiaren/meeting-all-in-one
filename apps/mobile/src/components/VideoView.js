import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../utils/config';

// Conditionally import RTCView only on native platforms
let RTCView = null;
if (Platform.OS !== 'web') {
  try {
    RTCView = require('react-native-webrtc').RTCView;
  } catch (e) {
    console.warn('react-native-webrtc not available');
  }
}

// Web Video Component
function WebVideo({ stream, style, mirror }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={mirror}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        objectFit: 'cover',
        transform: mirror ? 'scaleX(-1)' : 'none',
        backgroundColor: COLORS.surface,
      }}
    />
  );
}

export function VideoView({ stream, style, objectFit = 'cover', mirror = false }) {
  if (!stream) {
    return <View style={[styles.placeholder, style]} />;
  }

  // For web, use native video element
  if (Platform.OS === 'web') {
    return <WebVideo stream={stream} style={style} mirror={mirror} />;
  }

  // For native, use RTCView
  if (RTCView) {
    return (
      <RTCView
        streamURL={stream.toURL()}
        style={[styles.video, style]}
        objectFit={objectFit}
        mirror={mirror}
      />
    );
  }

  return <View style={[styles.placeholder, style]} />;
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { VideoView } from './VideoView';
import { COLORS } from '../utils/config';
import { getInitials } from '../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 布局类型: grid=九宫格, horizontal=横向, vertical=纵向, speaker=左侧大图+右侧列表
export function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  userName,
  layoutMode = 'grid',
  focusedId = null,
  onFocusParticipant = () => {},
}) {
  const totalParticipants = remoteStreams.size + 1;

  const allItems = useMemo(() => {
    const local = {
      socketId: 'local',
      stream: localStream,
      name: 'You',
      isLocal: true,
    };
    const remotes = Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
      const p = participants.find((x) => x.socketId === socketId);
      return {
        socketId,
        stream,
        name: p?.name || 'User',
        isLocal: false,
      };
    });
    return [local, ...remotes];
  }, [localStream, remoteStreams, participants]);

  const renderTile = (item, sizeStyle, mirror = false) => (
    <View key={item.socketId} style={[styles.videoContainer, sizeStyle]}>
      {item.stream ? (
        <VideoView stream={item.stream} mirror={mirror} />
      ) : (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{getInitials(item.name)}</Text>
        </View>
      )}
      <View style={styles.nameTag}>
        <Text style={styles.nameText}>{item.name}</Text>
      </View>
    </View>
  );

  const renderTileTouchable = (item, sizeStyle, mirror = false) => (
    <TouchableOpacity
      key={item.socketId}
      style={[styles.videoContainer, sizeStyle]}
      onPress={() => onFocusParticipant(item.socketId)}
      activeOpacity={1}
    >
      {item.stream ? (
        <VideoView stream={item.stream} mirror={mirror} />
      ) : (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{getInitials(item.name)}</Text>
        </View>
      )}
      <View style={styles.nameTag}>
        <Text style={styles.nameText}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  // 九宫格：2x2、3x3 等
  if (layoutMode === 'grid') {
    const { itemWidth, itemHeight, cols } = getGridSize(totalParticipants);
    return (
      <View style={[styles.container, styles.gridContainer]}>
        {allItems.map((item) =>
          renderTile(item, { width: itemWidth, height: itemHeight }, item.isLocal)
        )}
      </View>
    );
  }

  // 横向排列：一行多列
  if (layoutMode === 'horizontal') {
    const itemWidth = totalParticipants > 0 ? SCREEN_WIDTH / totalParticipants : SCREEN_WIDTH;
    return (
      <View style={[styles.container, styles.horizontalContainer]}>
        {allItems.map((item) =>
          renderTile(item, { width: itemWidth, height: '100%' }, item.isLocal)
        )}
      </View>
    );
  }

  // 纵向排列：一列多行
  if (layoutMode === 'vertical') {
    const itemHeight = totalParticipants > 0 ? SCREEN_HEIGHT / totalParticipants : SCREEN_HEIGHT;
    return (
      <View style={[styles.container, styles.verticalContainer]}>
        {allItems.map((item) =>
          renderTile(item, { width: '100%', height: itemHeight }, item.isLocal)
        )}
      </View>
    );
  }

  // 左侧大图 + 右侧列表（speaker）
  if (layoutMode === 'speaker') {
    const listWidth = 120;
    const mainWidth = SCREEN_WIDTH - listWidth;
    const focusId = focusedId || allItems[0]?.socketId;
    const focused = allItems.find((x) => x.socketId === focusId) || allItems[0];
    const listItems = allItems.filter((x) => x.socketId !== focusId);
    const listItemHeight = 100;

    return (
      <View style={[styles.container, styles.speakerContainer]}>
        <View style={[styles.speakerMain, { width: mainWidth }]}>
          {focused &&
            renderTile(
              focused,
              { width: '100%', height: '100%', flex: 1 },
              focused.isLocal
            )}
        </View>
        <ScrollView
          style={[styles.speakerList, { width: listWidth }]}
          contentContainerStyle={styles.speakerListContent}
          showsVerticalScrollIndicator={false}
        >
          {listItems.map((item) =>
            renderTileTouchable(
              item,
              { width: listWidth - 8, height: listItemHeight },
              item.isLocal
            )
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allItems.map((item) => renderTile(item, { flex: 1 }, item.isLocal))}
    </View>
  );
}

function getGridSize(total) {
  if (total <= 0) return { itemWidth: '100%', itemHeight: '100%', cols: 1 };
  if (total === 1) return { itemWidth: '100%', itemHeight: '100%', cols: 1 };
  if (total === 2) return { itemWidth: '50%', itemHeight: '100%', cols: 2 };
  if (total <= 4) return { itemWidth: '50%', itemHeight: '50%', cols: 2 };
  if (total <= 6) return { itemWidth: '33.33%', itemHeight: '50%', cols: 3 };
  if (total <= 9) return { itemWidth: '33.33%', itemHeight: '33.33%', cols: 3 };
  return { itemWidth: '25%', itemHeight: '25%', cols: 4 };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horizontalContainer: {
    flexDirection: 'row',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  speakerContainer: {
    flexDirection: 'row',
  },
  speakerMain: {
    flex: 1,
    overflow: 'hidden',
  },
  speakerList: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.surfaceLight,
  },
  speakerListContent: {
    paddingVertical: 8,
    gap: 4,
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

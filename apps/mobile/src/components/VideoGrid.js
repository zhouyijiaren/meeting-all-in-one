import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { VideoView } from './VideoView';
import { COLORS } from '../utils/config';
import { getInitials } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZES = {
  grid: 9,
  horizontal: 2,
  vertical: 2,
};

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
  const [currentPage, setCurrentPage] = useState(0);

  const allItems = useMemo(() => {
    const local = {
      socketId: 'local',
      stream: localStream,
      name: 'You',
      isLocal: true,
    };
    const remotes = participants.map((p, index) => {
      const socketId = p?.socketId || `participant-${index}`;
      return {
        socketId,
        stream: p?.socketId ? remoteStreams.get(p.socketId) || null : null,
        name: p?.name || 'User',
        isLocal: false,
      };
    });
    return [local, ...remotes];
  }, [localStream, remoteStreams, participants]);

  const pageSize = PAGE_SIZES[layoutMode] || 0;
  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    return Math.max(1, Math.ceil(allItems.length / pageSize));
  }, [allItems.length, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [layoutMode]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    if (!pageSize) return allItems;
    const start = currentPage * pageSize;
    const current = allItems.slice(start, start + pageSize);
    const filled = [...current];
    for (let i = filled.length; i < pageSize; i += 1) {
      filled.push({
        socketId: `placeholder-${layoutMode}-${currentPage}-${i}`,
        stream: null,
        name: '空位',
        isLocal: false,
        isPlaceholder: true,
      });
    }
    return filled;
  }, [allItems, pageSize, currentPage, layoutMode]);

  const renderTile = (item, sizeStyle, mirror = false) => (
    <View
      key={item.socketId}
      style={[styles.videoContainer, sizeStyle, item.isPlaceholder && styles.emptySlotContainer]}
    >
      {item.stream ? (
        <VideoView stream={item.stream} mirror={mirror} />
      ) : (
        <View style={[styles.avatarContainer, item.isPlaceholder && styles.emptySlotAvatarContainer]}>
          <Text style={[styles.avatar, item.isPlaceholder && styles.emptySlotAvatar]}>
            {item.isPlaceholder ? '空位' : getInitials(item.name)}
          </Text>
        </View>
      )}
      {!item.isPlaceholder && (
        <View style={styles.nameTag}>
          <Text style={styles.nameText}>{item.name}</Text>
        </View>
      )}
    </View>
  );

  const renderTileTouchable = (item, sizeStyle, mirror = false) => (
    <TouchableOpacity
      key={item.socketId}
      style={[styles.videoContainer, sizeStyle, item.isPlaceholder && styles.emptySlotContainer]}
      onPress={() => !item.isPlaceholder && onFocusParticipant(item.socketId)}
      activeOpacity={item.isPlaceholder ? 1 : 0.9}
    >
      {item.stream ? (
        <VideoView stream={item.stream} mirror={mirror} />
      ) : (
        <View style={[styles.avatarContainer, item.isPlaceholder && styles.emptySlotAvatarContainer]}>
          <Text style={[styles.avatar, item.isPlaceholder && styles.emptySlotAvatar]}>
            {item.isPlaceholder ? '空位' : getInitials(item.name)}
          </Text>
        </View>
      )}
      {!item.isPlaceholder && (
        <View style={styles.nameTag}>
          <Text style={styles.nameText}>{item.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPagination = () => {
    if (!pageSize || totalPages <= 1) return null;

    return (
      <View style={styles.paginationBar}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
          disabled={currentPage === 0}
          onPress={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
        >
          <Text style={styles.paginationButtonText}>上一页</Text>
        </TouchableOpacity>
        <Text style={styles.paginationText}>
          {currentPage + 1} / {totalPages}
        </Text>
        <TouchableOpacity
          style={[
            styles.paginationButton,
            currentPage === totalPages - 1 && styles.paginationButtonDisabled,
          ]}
          disabled={currentPage === totalPages - 1}
          onPress={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
        >
          <Text style={styles.paginationButtonText}>下一页</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPagedLayout = (content) => (
    <View style={styles.container}>
      <View style={styles.layoutContent}>{content}</View>
      {renderPagination()}
    </View>
  );

  // 九宫格：固定 3x3，不足补空位，多于 9 人分页
  if (layoutMode === 'grid') {
    return renderPagedLayout(
      <View style={styles.gridContainer}>
        {pageItems.map((item) =>
          renderTile(item, { width: '33.33%', height: '33.33%' }, item.isLocal)
        )}
      </View>
    );
  }

  // 横向排列：固定左右两格，不足补空位，多于 2 人分页
  if (layoutMode === 'horizontal') {
    return renderPagedLayout(
      <View style={styles.horizontalContainer}>
        {pageItems.map((item) => renderTile(item, { width: '50%', height: '100%' }, item.isLocal))}
      </View>
    );
  }

  // 纵向排列：固定上下两格，不足补空位，多于 2 人分页
  if (layoutMode === 'vertical') {
    return renderPagedLayout(
      <View style={styles.verticalContainer}>
        {pageItems.map((item) => renderTile(item, { width: '100%', height: '50%' }, item.isLocal))}
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
          {listItems.length > 0 ? (
            listItems.map((item) =>
              renderTileTouchable(
                item,
                { width: listWidth - 8, height: listItemHeight },
                item.isLocal
              )
            )
          ) : (
            <View style={styles.speakerEmptyList}>
              <Text style={styles.speakerEmptyText}>暂无其他参会者</Text>
            </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  layoutContent: {
    flex: 1,
    minHeight: 0,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horizontalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  verticalContainer: {
    flex: 1,
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
  speakerEmptyList: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  speakerEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  emptySlotContainer: {
    borderStyle: 'dashed',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  emptySlotAvatarContainer: {
    backgroundColor: COLORS.background,
  },
  avatar: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptySlotAvatar: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
  paginationBar: {
    height: 44,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  paginationButtonDisabled: {
    opacity: 0.45,
  },
  paginationButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  paginationText: {
    minWidth: 64,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});

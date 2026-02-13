/**
 * 预取会议页 chunk，与 app/room/[id].js 的 React.lazy 使用同一模块，保证同一 chunk。
 * 在首页/短链页「创建会议」「加入会议」按下时调用，用户真正跳转时 chunk 可能已缓存。
 */
export function prefetchRoomChunk() {
  return import('../screens/RoomContent').catch(() => {});
}

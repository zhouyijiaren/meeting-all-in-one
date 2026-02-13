# Video Conference App

A cross-platform video conference application built with Expo/React Native, WebRTC, and Socket.io.

## Features

- Video/Audio calling with WebRTC
- Real-time text chat with Supabase
- Screen sharing (Web only)
- Cross-platform: iOS, Android, Web
- Room-based meetings

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Expo / React Native |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + Realtime) |
| Real-time | WebRTC (video/audio) + Socket.io (signaling) |
| Screen Share | WebRTC getDisplayMedia API |

## Project Structure

```
video-conference-app/
├── apps/
│   └── mobile/              # Expo React Native frontend
│       ├── app/             # Expo Router pages
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── services/    # API, Socket, WebRTC services
│       │   └── utils/       # Utilities and config
│       └── package.json
├── server/                  # Node.js signaling server
│   ├── src/
│   │   ├── index.js         # Entry point
│   │   ├── socket.js        # Socket.io handlers
│   │   └── supabase.js      # Supabase client
│   └── package.json
├── supabase/
│   └── schema.sql           # Database schema
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (optional, for chat persistence)

## Setup

### 1. Clone and Install

```bash
# Install server dependencies
cd server
npm install

# Install mobile dependencies
cd ../apps/mobile
npm install
```

### 2. Configure Environment

**Server:**
```bash
cd server
cp .env.example .env
# Edit .env with your Supabase credentials (optional)
```

**Mobile:**
```bash
cd apps/mobile
cp .env.example .env
# Edit .env with your server URL and Supabase credentials
```

### 3. Set Up Supabase (Optional)

If you want chat persistence:

1. Create a new Supabase project
2. Run the SQL from `supabase/schema.sql` in the SQL Editor
3. Copy your project URL and anon key to the `.env` files

### 4. Start the Application

**Terminal 1 - Start the signaling server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start the Expo app:**
```bash
cd apps/mobile
npx expo start
```

## 部署（Docker：信令 + 前端 + TURN）

一键跑起应用和 3478 端口的 TURN 服务，环境变量通过 `.env` 注入。

1. **复制环境变量并修改**
   ```bash
   cp .env.example .env
   # 编辑 .env：EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SOCKET_URL 改为你的域名或 IP
   # 若启用 TURN：填 TURN_URL（客户端可访问的地址）、TURN_USERNAME、TURN_CREDENTIAL、EXTERNAL_IP（与 TURN_URL 的 host 一致）
   ```

2. **构建并启动**
   ```bash
   docker compose up -d
   ```
   - 应用：`PORT` 映射（默认 3001）
   - TURN：3478（TCP/UDP）及 49152-49200/udp

3. **说明**
   - 前端 API/Socket 地址在**构建时**由 `EXPO_PUBLIC_*` 决定；服务端 PORT、TURN_* 在**运行时**由 `.env` 注入。
   - 部署到公网时务必设置 `EXTERNAL_IP` 和 `TURN_URL`（同一 host），否则 TURN 分配地址错误。

## Usage

1. Open the app in your browser (press `w` in Expo CLI)
2. Enter your name
3. Create a new meeting or join with a room code
4. Share the room code with others to join
5. Use controls to mute/unmute, toggle camera, share screen, or chat

## Testing

1. Open two browser windows at http://localhost:8081
2. Create a meeting in one window
3. Join with the room code in the other window
4. Verify video/audio connection works
5. Test chat functionality

### TURN 与 ICE 配置（服务端下发）

**TURN 地址由服务端统一下发，前端不写死。** 加入房间前会请求 `GET /api/ice-servers`，用返回的 `iceServers`（含 STUN/TURN）建连；拉取失败时再用前端默认（仅 STUN）。

- **配置位置**：在 **服务端** `server/.env` 里配置（见 `server/.env.example`）：
  - `TURN_URL`、`TURN_USERNAME`、`TURN_CREDENTIAL`：TURN 服务
  - `FORCE_TURN=true`：仅测试时强制只走 TURN
- 前端 `apps/mobile/.env` 里的 `EXPO_PUBLIC_TURN_*` / `EXPO_PUBLIC_FORCE_TURN` 仅作**兜底**（例如接口失败时）。

### TURN 本地测试（强制走 TURN 验证）

**1. 启动本地 TURN（coturn）**

```bash
# 项目根目录
docker compose -f docker-compose.turn.yml up -d
```

本机测保持 `turn/coturn.conf` 里 `external-ip=127.0.0.1`；另一台设备测时改为本机局域网 IP（如 `192.168.1.100`），重启容器。

**2. 服务端配置 TURN（下发用）**

在 `server/.env` 里增加（与 coturn 的 user 一致）。**其他设备要连你的 TURN 时，`TURN_URL` 必须写本机局域网 IP**（如 `turn:192.168.1.100:3478`），否则前端拿到的 TURN 地址连不上。

```bash
# 本机测：127.0.0.1；其他设备测：改成你电脑的局域网 IP
TURN_URL=turn:192.168.1.100:3478
TURN_USERNAME=test
TURN_CREDENTIAL=test123
FORCE_TURN=true
```

**3. 重启服务端与前端**

```bash
# 终端 1
cd server && npm run dev

# 终端 2
cd apps/mobile && npx expo start
```

开两个窗口进同一房间能通即说明 TURN 由服务端下发并生效；之后可去掉 `FORCE_TURN` 正常用「先直连，失败再走 TURN」。

## Notes

- WebRTC requires HTTPS in production (localhost works for development)
- Screen sharing is only available on web platforms
- Mobile screen sharing has platform-specific limitations

## License

MIT

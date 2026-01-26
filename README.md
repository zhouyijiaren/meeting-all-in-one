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

## Notes

- WebRTC requires HTTPS in production (localhost works for development)
- Screen sharing is only available on web platforms
- Mobile screen sharing has platform-specific limitations

## License

MIT

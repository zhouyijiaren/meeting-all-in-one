# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Cross-platform video conferencing app (WebRTC + Socket.io). Two independent packages (no monorepo tooling):

| Package | Path | Purpose |
|---|---|---|
| Signaling server | `server/` | Express + Socket.io signaling, REST APIs, serves built web frontend |
| Frontend | `apps/mobile/` | Expo / React Native app with Vite-based web build |

### Running services

**Signaling server** (required):
```bash
cd server && npm run dev   # port 3001, uses node --watch for hot reload
```

**Frontend web dev server** (Vite, for development):
```bash
cd apps/mobile && npx vite --host 0.0.0.0 --port 8080   # HMR dev server
```

Alternatively, build the web frontend and serve via the signaling server:
```bash
cd apps/mobile && npm run build:web:vite
# Then restart server — it auto-detects apps/mobile/dist-web/
```

### Environment files

Copy `.env.example` to `.env` in both `server/` and `apps/mobile/`. Supabase credentials are optional; without them the server uses in-memory room/chat stubs.

### Key caveats

- No ESLint, Prettier, or test framework is configured. The Vite production build (`npm run build:web:vite`) is the primary build-time validation.
- The server's `node --watch` hot reload does **not** detect new `dist-web` builds; restart the server process after rebuilding the frontend.
- The Vite dev server entry point is `index-vite.html` (not `index.html`), so the root URL returns 404 — use `http://localhost:8080/index-vite.html` when running the Vite dev server directly.
- TURN/coturn is optional and only needed for cross-network WebRTC relay testing. See README for Docker setup.

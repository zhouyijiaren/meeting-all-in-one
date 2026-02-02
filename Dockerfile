# ========== Stage 1: Build frontend (Expo web) ==========
FROM node:20-alpine AS frontend

WORKDIR /app/mobile

# 前端连接后端的地址（部署到 Zeabur 时后端域名）
ARG EXPO_PUBLIC_API_URL=https://socket-io.zeabur.app
ARG EXPO_PUBLIC_SOCKET_URL=https://socket-io.zeabur.app
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SOCKET_URL=$EXPO_PUBLIC_SOCKET_URL

COPY apps/mobile/package.json apps/mobile/package-lock.json ./
RUN npm ci

COPY apps/mobile/ .
RUN npx expo export --platform web

# ========== Stage 2: Backend + serve frontend ==========
FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ .
COPY --from=frontend /app/mobile/dist ./public

EXPOSE 3001

CMD ["node", "src/index.js"]

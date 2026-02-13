# ========== Stage 1: Build frontend (Expo web) ==========
FROM node:20-alpine AS frontend

WORKDIR /app/mobile

# 前端连接后端的地址（构建时传入，或 docker build --build-arg）
ARG EXPO_PUBLIC_API_URL=https://socket-io.zeabur.app
ARG EXPO_PUBLIC_SOCKET_URL=https://socket-io.zeabur.app
ARG EXPO_PUBLIC_SUPABASE_URL=
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY=
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SOCKET_URL=$EXPO_PUBLIC_SOCKET_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

COPY apps/mobile/package.json apps/mobile/package-lock.json ./
RUN npm ci

COPY apps/mobile/ .
RUN npx expo export --platform web

# ========== Stage 2: Backend + 前端静态 + TURN（单镜像单容器）==========
FROM node:20-alpine

WORKDIR /app

# 安装 coturn（Alpine community）
RUN apk add --no-cache coturn

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ .
COPY --from=frontend /app/mobile/dist ./public

# TURN 配置与入口脚本（同容器内跑 Node + turnserver）
COPY turn/coturn.conf /etc/coturn/turnserver.conf
COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 运行时环境变量：PORT, SUPABASE_*, TURN_*, FORCE_TURN, EXTERNAL_IP
EXPOSE 3001 3478

ENTRYPOINT ["/app/entrypoint.sh"]

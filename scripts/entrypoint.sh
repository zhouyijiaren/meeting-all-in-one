#!/bin/sh
set -e
# 同一镜像内：先起 Node 信令服务，再起 TURN（主进程）
node src/index.js &
if [ -n "$EXTERNAL_IP" ]; then
  exec turnserver -c /etc/coturn/turnserver.conf --external-ip="$EXTERNAL_IP"
else
  exec turnserver -c /etc/coturn/turnserver.conf
fi

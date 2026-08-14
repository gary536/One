#!/bin/bash
# 啟動後端 (port 3001)
cd "$(dirname "$0")/server" && npm run dev &
BACKEND_PID=$!

# 啟動前端 (port 5173, /api 反向代理至後端)
cd "$(dirname "$0")/client" && npm run dev

trap "kill $BACKEND_PID" EXIT

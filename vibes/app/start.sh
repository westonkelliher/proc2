#!/usr/bin/env bash
# start.sh — bundle frontend, launch server (:4117), open browser
set -e
cd "$(dirname "$0")"
mkdir -p logs

# kill any existing instance (by port, so we never double-launch)
fuser -k 4117/tcp 2>/dev/null || true
sleep 0.3

npx esbuild frontend.tsx --bundle --outfile=dist/app.js > logs/esbuild.log 2>&1

npx tsx server.ts > logs/server.log 2>&1 &

# wait for server before opening the page
for i in $(seq 1 50); do
    curl -sf -o /dev/null http://localhost:4117/ && break
    sleep 0.2
done

google-chrome http://localhost:4117 >/dev/null 2>&1 &
echo "running on :4117 (logs in logs/)"

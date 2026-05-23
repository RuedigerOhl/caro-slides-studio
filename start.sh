#!/usr/bin/env bash
# Caros Slide Studio — startet Engine + Next.js lokal (foreground, mit wait für launchd)
set -uo pipefail
cd "$(dirname "$0")"

[ -f .env ] && set -a && source .env && set +a

# Kill alte Instanzen
pkill -f "uvicorn engine.server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

mkdir -p logs

echo "→ Engine starten (Port 8001)…"
.venv/bin/uvicorn engine.server:app --host 127.0.0.1 --port 8001 \
    >> logs/engine.log 2>&1 &
ENGINE_PID=$!

echo "→ Next.js starten (Port 3000)…"
( cd app && npm run dev >> ../logs/next.log 2>&1 ) &
NEXT_PID=$!

sleep 5
echo ""
echo "✓ Caros Slide Studio läuft auf http://localhost:3000"
echo "  Engine pid $ENGINE_PID, Next pid $NEXT_PID"

echo "$ENGINE_PID" > logs/engine.pid
echo "$NEXT_PID"   > logs/next.pid

# Bleibe im Vordergrund damit launchd die Children am Leben hält
trap 'pkill -f "uvicorn engine.server"; pkill -f "next dev"; exit 0' SIGTERM SIGINT
wait $ENGINE_PID $NEXT_PID

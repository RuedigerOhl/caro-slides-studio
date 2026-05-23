#!/usr/bin/env bash
cd "$(dirname "$0")"
pkill -f "uvicorn engine.server" 2>/dev/null && echo "Engine gestoppt"
pkill -f "next dev" 2>/dev/null && echo "Next.js gestoppt"
rm -f logs/*.pid

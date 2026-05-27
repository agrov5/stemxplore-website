#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill "$NPM_PID" "$UVICORN_PID" 2>/dev/null
    wait "$NPM_PID" "$UVICORN_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting npm dev server..."
cd "$SCRIPT_DIR" && npm run dev &
NPM_PID=$!

echo "Starting uvicorn server..."
cd "$SCRIPT_DIR/Edyu-Lynk/backend" && uvicorn server:app --port 8001 &
UVICORN_PID=$!

echo "Both servers running. Press Ctrl+C to stop."
wait

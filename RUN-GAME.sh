#!/usr/bin/env bash
# ============================================================
#  HERMETIC COMEDY — One-click runner for Linux
#  Run with: ./RUN-GAME.sh
#  (chmod +x RUN-GAME.sh once if needed)
# ============================================================

cd "$(dirname "$0")" || exit 1

echo ""
echo "==============================================="
echo "  HERMETIC COMEDY"
echo "  Preparing the silver threshold..."
echo "==============================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js is not installed."
    echo "Install via your package manager (e.g. 'sudo apt install nodejs npm')"
    echo "or from https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "First-time setup: installing dependencies..."
    npm install || { echo "[!] Install failed."; exit 1; }
    echo "Dependencies installed."
    echo ""
fi

echo "Starting the game server..."
echo "Open http://localhost:5173 in your browser."
echo "Press Ctrl+C to stop."
echo ""

# Try to open the browser (best-effort)
( sleep 3 && (xdg-open "http://localhost:5173" >/dev/null 2>&1 || true) ) &
npm run dev

#!/usr/bin/env bash
# ============================================================
#  HERMETIC COMEDY — One-click runner for macOS
#  Double-click this file to play the game.
#  First run installs dependencies (takes a few minutes).
#  Subsequent runs start instantly.
#
#  If macOS blocks it: right-click → Open → Open.
#  Or run once in Terminal: chmod +x RUN-GAME.command
# ============================================================

cd "$(dirname "$0")" || exit 1

echo ""
echo "==============================================="
echo "  HERMETIC COMEDY"
echo "  Preparing the silver threshold..."
echo "==============================================="
echo ""

# --- Check Node.js is installed ---
if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js is not installed."
    echo ""
    echo "Please install Node.js LTS from:"
    echo "    https://nodejs.org/"
    echo ""
    echo "Then double-click this file again."
    echo ""
    read -n 1 -s -r -p "Press any key to close..."
    exit 1
fi

# --- Install dependencies if missing ---
if [ ! -d "node_modules" ]; then
    echo "First-time setup: installing dependencies..."
    echo "This will take 2-5 minutes. Please wait."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[!] Install failed. Check your internet connection and try again."
        read -n 1 -s -r -p "Press any key to close..."
        exit 1
    fi
    echo ""
    echo "Dependencies installed."
    echo ""
fi

# --- Open browser, then launch dev server ---
echo "Starting the game server..."
echo "The game will open in your browser shortly."
echo ""
echo "Leave this window open while you play."
echo "Close it (or press Ctrl+C) to stop the game."
echo ""

(sleep 3 && open "http://localhost:5173") &
npm run dev

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_DIR="$ROOT_DIR/chain"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.logs"

mkdir -p "$LOG_DIR"

RPC_URL="http://127.0.0.1:8545"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5000"

node_is_ready() {
  curl -s -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
    "$RPC_URL" >/dev/null 2>&1
}

start_background() {
  local name="$1"
  local workdir="$2"
  local command="$3"
  local logfile="$LOG_DIR/$name.log"

  if pgrep -f "$command" >/dev/null 2>&1; then
    echo "$name already running"
    return
  fi

  nohup bash -lc "cd '$workdir' && $command" >"$logfile" 2>&1 &
  echo "$name started, logging to $logfile"
}

echo "Starting Hardhat node if needed..."
if ! node_is_ready; then
  start_background "hardhat-node" "$CHAIN_DIR" "npm run node"

  echo "Waiting for Hardhat node..."
  until node_is_ready; do
    sleep 1
  done
fi

echo "Deploying local contracts..."
(cd "$CHAIN_DIR" && npm run deploy:local) | tee "$LOG_DIR/deploy.log"

echo "Starting backend and frontend..."
start_background "backend" "$BACKEND_DIR" "npm run dev"
start_background "frontend" "$FRONTEND_DIR" "npm run dev -- --host 0.0.0.0"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FRONTEND_URL" >/dev/null 2>&1 || true
fi

echo ""
echo "Running:"
echo "- Hardhat node: $RPC_URL"
echo "- Backend:      $BACKEND_URL"
echo "- Frontend:     $FRONTEND_URL"
echo ""
echo "Logs:"
echo "- $LOG_DIR/hardhat-node.log"
echo "- $LOG_DIR/deploy.log"
echo "- $LOG_DIR/backend.log"
echo "- $LOG_DIR/frontend.log"
echo ""
echo "Press Ctrl+C to stop this launcher. Background services will keep running."

wait
#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

APP_NAME="Grid Outage Planner"
MIN_NODE_MAJOR=18
PORT="${PORT:-5173}"

info() {
  printf '%s\n' "$1"
}

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

info ""
info "============================================="
info " * ${APP_NAME} start"
info "============================================="
info ""

command -v node >/dev/null 2>&1 || fail "Node.js v${MIN_NODE_MAJOR} or newer is required."
command -v npm >/dev/null 2>&1 || fail "npm is required."

NODE_MAJOR="$(node -e "process.stdout.write(String(parseInt(process.versions.node.split('.')[0], 10)))")"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js v${MIN_NODE_MAJOR} or newer is required. Found $(node -v)."
fi

if [ ! -f dist/index.html ]; then
  info "No production build found. Building first..."
  ./build.sh
  info ""
fi

info "Starting ${APP_NAME} at http://localhost:${PORT}"
info "Press Ctrl+C to stop."
info ""

PORT="$PORT" npm run preview

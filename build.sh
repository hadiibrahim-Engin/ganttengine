#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

APP_NAME="Grid Outage Planner"
MIN_NODE_MAJOR=18

info() {
  printf '%s\n' "$1"
}

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

info ""
info "============================================="
info " * ${APP_NAME} build"
info "============================================="
info ""

command -v node >/dev/null 2>&1 || fail "Node.js v${MIN_NODE_MAJOR} or newer is required."
command -v npm >/dev/null 2>&1 || fail "npm is required."

NODE_MAJOR="$(node -e "process.stdout.write(String(parseInt(process.versions.node.split('.')[0], 10)))")"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js v${MIN_NODE_MAJOR} or newer is required. Found $(node -v)."
fi

info "Node $(node -v) found."
info "npm $(npm -v) found."
info ""

if [ -f package-lock.json ]; then
  info "Installing dependencies with npm ci..."
  npm ci
else
  info "Installing dependencies with npm install..."
  npm install
fi

info ""
info "Building production bundle..."
npm run build

[ -f dist/index.html ] || fail "Build completed, but dist/index.html was not created."

info ""
info "Build complete: $(pwd)/dist"

#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

APP_SLUG="gantt-tool"
STAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="${1:-${APP_SLUG}-source-${STAMP}.zip}"

info() {
  printf '%s\n' "$1"
}

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

case "$ZIP_NAME" in
  *.zip) ;;
  *) ZIP_NAME="${ZIP_NAME}.zip" ;;
esac

command -v zip >/dev/null 2>&1 || fail "zip is required."

info ""
info "============================================="
info " * ${APP_SLUG} source zip"
info "============================================="
info ""

info "Creating ${ZIP_NAME}..."

zip -r "$ZIP_NAME" . \
  -x "$ZIP_NAME" \
  -x "*.zip" \
  -x ".DS_Store" \
  -x "*/.DS_Store" \
  -x "__MACOSX/*" \
  -x "._*" \
  -x "*/._*" \
  -x ".AppleDouble/*" \
  -x "*/.AppleDouble/*" \
  -x ".git/*" \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x "dist/*" \
  -x "*/dist/*" \
  -x "build/*" \
  -x "*/build/*" \
  -x ".cache/*" \
  -x "*/.cache/*" \
  -x ".venv/*" \
  -x "*/.venv/*" \
  -x "venv/*" \
  -x "*/venv/*" \
  -x "env/*" \
  -x "*/env/*" \
  -x "__pycache__/*" \
  -x "*/__pycache__/*"

info ""
info "Archive complete: $(pwd)/${ZIP_NAME}"

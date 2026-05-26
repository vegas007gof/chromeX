#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="${SCRIPT_DIR}/extension"

echo "========================================"
echo " Semantic Search Filter - Extension"
echo "========================================"
echo
echo "Extension folder:"
echo "  ${EXT_DIR}"
echo
echo "Load the unpacked extension in Chrome:"
echo "  1. Start server:  python3 run_server.py"
echo "  2. Open:  chrome://extensions/"
echo "  3. Enable Developer mode"
echo "  4. Load unpacked → select:  ${EXT_DIR}"
echo

if command -v xdg-open >/dev/null 2>&1; then
  read -r -p "Open chrome://extensions/ in the browser? [Y/n] " OPEN
  OPEN="${OPEN:-Y}"
  if [[ ! "${OPEN}" =~ ^[Nn]$ ]]; then
    xdg-open "chrome://extensions/" 2>/dev/null || true
  fi
elif command -v open >/dev/null 2>&1; then
  read -r -p "Open chrome://extensions/ in the browser? [Y/n] " OPEN
  OPEN="${OPEN:-Y}"
  if [[ ! "${OPEN}" =~ ^[Nn]$ ]]; then
    open "chrome://extensions/" 2>/dev/null || true
  fi
fi

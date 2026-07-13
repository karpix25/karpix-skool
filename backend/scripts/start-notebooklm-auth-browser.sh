#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:1}"
export NOTEBOOKLM_HOME="${NOTEBOOKLM_HOME:-/home/app/.notebooklm}"

chrome_profile="${CHROME_USER_DATA_DIR:-$NOTEBOOKLM_HOME/chrome-profile}"
geometry="${NOTEBOOKLM_AUTH_BROWSER_GEOMETRY:-1600x1000x24}"
start_url="${NOTEBOOKLM_AUTH_START_URL:-https://notebooklm.google.com/}"

mkdir -p "$NOTEBOOKLM_HOME" "$chrome_profile" /tmp/notebooklm-auth-browser
chmod 700 "$NOTEBOOKLM_HOME" "$chrome_profile" || true

Xvfb "$DISPLAY" -screen 0 "$geometry" -ac +extension GLX +render -noreset &
fluxbox >/tmp/notebooklm-auth-browser/fluxbox.log 2>&1 &

if [[ -n "${NOTEBOOKLM_AUTH_BROWSER_PASSWORD:-}" ]]; then
    x11vnc -display "$DISPLAY" -forever -shared -rfbport 5900 -passwd "$NOTEBOOKLM_AUTH_BROWSER_PASSWORD" >/tmp/notebooklm-auth-browser/x11vnc.log 2>&1 &
else
    x11vnc -display "$DISPLAY" -forever -shared -rfbport 5900 -nopw >/tmp/notebooklm-auth-browser/x11vnc.log 2>&1 &
fi

websockify --web=/usr/share/novnc/ 6901 localhost:5900 >/tmp/notebooklm-auth-browser/websockify.log 2>&1 &

chromium \
    --no-first-run \
    --disable-dev-shm-usage \
    --disable-gpu \
    --password-store=basic \
    --user-data-dir="$chrome_profile" \
    "$start_url" >/tmp/notebooklm-auth-browser/chromium.log 2>&1 &

wait -n

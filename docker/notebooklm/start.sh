#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"

vnc_port="${NOTEBOOKLM_VNC_PORT:-5900}"
novnc_port="${NOTEBOOKLM_NOVNC_PORT:-6080}"
screen="${NOTEBOOKLM_XVFB_SCREEN:-1440x900x24}"

Xvfb "$DISPLAY" -screen 0 "$screen" -ac +extension GLX +render -noreset &
xvfb_pid=$!

for _ in $(seq 1 30); do
  if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

vnc_auth_args=("-nopw")
if [ -n "${NOTEBOOKLM_VNC_PASSWORD:-}" ]; then
  mkdir -p /root/.vnc
  x11vnc -storepasswd "$NOTEBOOKLM_VNC_PASSWORD" /root/.vnc/passwd >/dev/null
  vnc_auth_args=("-rfbauth" "/root/.vnc/passwd")
fi

x11vnc \
  -display "$DISPLAY" \
  -forever \
  -shared \
  -rfbport "$vnc_port" \
  -quiet \
  -xkb \
  -noxrecord \
  -noxfixes \
  -noxdamage \
  "${vnc_auth_args[@]}" &

websockify --web=/usr/share/novnc/ "$novnc_port" "127.0.0.1:$vnc_port" &

cleanup() {
  kill "$xvfb_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

exec notebooklm-mcp --transport http --host 0.0.0.0 --port 3000

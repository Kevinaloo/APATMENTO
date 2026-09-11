#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Events gate UI test runner.
#
# Same shape as the dashboard rails runner: shared stub server on a free
# port, browser suite against it, teardown on exit. Playwright goes into a
# scratch dir rather than the repo, because this is a static site and a
# node_modules would change how it deploys.
#
#   ./tests/ui/run-event-gate.sh
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT=${UI_TEST_PORT:-8899}
PWDIR=${PW_DIR:-/var/tmp/cabana-pw}

if [ ! -d "$PWDIR/node_modules/playwright" ]; then
  echo "installing playwright into $PWDIR …"
  mkdir -p "$PWDIR"
  ( cd "$PWDIR" && npm init -y >/dev/null 2>&1 && npm i playwright --no-audit --no-fund >/dev/null 2>&1 )
fi

CHROME=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)
[ -z "$CHROME" ] && [ -x /opt/pw-browsers/chromium ] && CHROME=/opt/pw-browsers/chromium

export UI_TEST_PORT="$PORT"
export PW_PATH="$PWDIR/node_modules/playwright"
[ -n "$CHROME" ] && export PW_CHROMIUM="$CHROME"

node tests/ui/stub-server.js >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/events.html" >/dev/null 2>&1 && break
  sleep 0.25
done

node tests/ui/event-gate.test.js

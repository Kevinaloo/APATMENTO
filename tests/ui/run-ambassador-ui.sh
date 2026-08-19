#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Ambassador UI test runner.
#
# Starts the stub server on a free port, runs the browser suite against it,
# and tears everything down. Playwright is installed into a scratch dir
# rather than the repo, because this is a static site with no package.json
# and adding one would change how it deploys.
#
#   ./tests/ui/run-ambassador-ui.sh              # headless, no screenshots
#   UI_TEST_SHOTS=/tmp/shots ./tests/ui/run-ambassador-ui.sh
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

# Chromium ships with the image; PLAYWRIGHT_BROWSERS_PATH points at it.
CHROME=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)

export UI_TEST_PORT="$PORT"
export PW_PATH="$PWDIR/node_modules/playwright"
[ -n "$CHROME" ] && export PW_CHROMIUM="$CHROME"
[ -n "${UI_TEST_SHOTS:-}" ] && mkdir -p "$UI_TEST_SHOTS"

node tests/ui/stub-server.js >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT

# Wait for the port rather than sleeping a guess.
for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/api/ambassadors?action=me" >/dev/null 2>&1 && break
  sleep 0.25
done

node tests/ui/ambassador-ui.test.js

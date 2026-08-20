#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Listing ownership test runner.
#
# Spins a throwaway Postgres, applies the fixture, the migration, then the
# migration AGAIN (idempotency is a property worth testing, not assuming),
# and runs the suite. Leaves nothing behind.
#
#   ./tests/run-ownership-tests.sh
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

MIGRATION=supabase/migrations/20260820100000_listing_ownership_and_transfers.sql

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
export PATH="$PGBIN:$PATH"
DATA=${PGDATA_TMP:-/var/tmp/ownpg-$$}
PORT=${PGPORT_TMP:-55433}
SOCK="$DATA/sock"

cleanup() { pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

rm -rf "$DATA"; mkdir -p "$DATA"
if [ "$(id -u)" = "0" ]; then
  chown -R postgres:postgres "$DATA"; chmod 700 "$DATA"
  RUN() { su postgres -c "PATH=$PGBIN:\$PATH $*"; }
else
  RUN() { eval "$@"; }
fi

RUN "initdb -D $DATA -A trust -U postgres" >/dev/null
mkdir -p "$SOCK"
[ "$(id -u)" = "0" ] && chown postgres:postgres "$SOCK"
RUN "pg_ctl -D $DATA -o '-k $SOCK -p $PORT -c listen_addresses=' -l $DATA/log start -w" >/dev/null

PSQL="psql -h $SOCK -p $PORT -U postgres -v ON_ERROR_STOP=1"
$PSQL -tAqc "create database owntest;" >/dev/null

if ! out=$($PSQL -tAq -d owntest -f tests/fixture-ownership.sql 2>&1); then
  echo "fixture failed to load"; echo "$out" | tail -20; exit 1
fi

# Apply the migration twice. A migration that is only safe the first time is
# a migration that will fail on the day you most need to re-run it.
for pass in 1 2; do
  if ! out=$($PSQL -tAq -d owntest -f "$MIGRATION" 2>&1); then
    echo "  FAIL  migration errored on pass $pass"; echo "$out" | tail -30; exit 1
  fi
done
echo "  PASS  migration is idempotent (applied twice, cleanly)"

$PSQL -tAq -d owntest -f tests/ownership.test.sql 2>&1 \
  | sed -E 's/^psql:[^ ]+:[0-9]+: //' \
  | grep -E 'NOTICE|ERROR|FAIL' \
  | sed 's/^NOTICE:  //'

echo
echo "  ── $($PSQL -tAqc "select 1" -d owntest >/dev/null && echo "suite complete") ──"

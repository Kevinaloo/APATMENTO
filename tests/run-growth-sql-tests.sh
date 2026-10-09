#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Growth engine SQL tests.
#
# Spins a throwaway Postgres, loads tests/fixture-growth.sql (the slice of
# production the migration reads), applies the migration TWICE, then runs
# tests/growth-engine.test.sql. Leaves nothing behind.
#
#   ./tests/run-growth-sql-tests.sh
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
export PATH="$PGBIN:$PATH"
DATA=${PGDATA_TMP:-/var/tmp/growthpg-$$}
PORT=${PGPORT_TMP:-55433}
SOCK="$DATA/sock"
MIGRATION=supabase/migrations/20261009120000_growth_engine.sql

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
$PSQL -tAqc "create database growthtest;" >/dev/null

if ! out=$($PSQL -tAq -d growthtest -f tests/fixture-growth.sql 2>&1); then
  echo "fixture failed to load"; echo "$out" | tail -20; exit 1
fi

for pass in 1 2; do
  if ! out=$($PSQL -tAq -d growthtest -f "$MIGRATION" 2>&1); then
    echo "  FAIL  migration errored on pass $pass"; echo "$out" | tail -20; exit 1
  fi
done
echo "  PASS  migration is idempotent (applied twice, cleanly)"

if ! out=$($PSQL -tAq -d growthtest -f tests/growth-engine.test.sql 2>&1); then
  echo "$out" | sed -E 's/^psql:[^ ]+:[0-9]+: //' | grep -E 'NOTICE|ERROR|FAIL|WARNING' | sed 's/^NOTICE:  //'
  exit 1
fi
echo "$out" | sed -E 's/^psql:[^ ]+:[0-9]+: //' | grep -E 'NOTICE|passed' | sed 's/^NOTICE:  //'

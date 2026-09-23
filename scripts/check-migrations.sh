#!/usr/bin/env bash
# Apply every migration to a throwaway Supabase Postgres, then run the
# behaviour checks in scripts/sql-checks/ as real signed-in users.
#
# Nothing here touches a real project: the container publishes no ports, has
# no volume, and is removed on exit. Needs Docker and the supabase/postgres
# image (pulled on first run).
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.165}"
NAME="choner-migcheck-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; sleep 2; done
sleep 3
psql_in() { docker exec -i "$NAME" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql_in < scripts/sql-checks/00_storage_stub.sql
failed=0
for f in $(ls supabase/migrations/*.sql | sort); do
  if ! out=$(psql_in < "$f" 2>&1); then
    echo "FAIL $f"; echo "$out" | grep -m3 ERROR; failed=1
  fi
done
[ "$failed" = 0 ] && echo "All $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migrations applied."

for f in $(ls scripts/sql-checks/[1-9]*.sql | sort); do
  echo "== $f"
  psql_in < "$f" 2>&1 | grep -v -E '^(SET|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)?$' || failed=1
done
exit "$failed"

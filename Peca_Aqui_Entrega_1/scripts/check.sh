#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for f in database/tests/02_catalog_checks.sql database/tests/01_smoke.sql; do
  echo "==> Validando ${f}"
  docker compose -f compose.database.yaml exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$f"
done
printf '\nTESTES FINALIZADOS\n'

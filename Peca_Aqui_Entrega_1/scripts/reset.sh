#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
printf 'ATENÇÃO: todos os dados locais serão apagados. Digite APAGAR: '
read -r ans
[[ "$ans" == 'APAGAR' ]] || { echo 'Cancelado'; exit 0; }
docker compose -f compose.database.yaml down -v
docker compose -f compose.database.yaml up -d
echo 'Aguarde o healthcheck e execute ./scripts/check.sh'

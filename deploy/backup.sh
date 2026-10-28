#!/bin/sh
set -eu
: "${1:?Pass the host backup directory}"
if [ -z "$(docker compose --env-file .env -f compose.prod.yml ps -q postgres)" ]; then
  printf '%s\n' "No existing PostgreSQL container; skipping first-deploy backup."
  exit 0
fi
mkdir -p "$1"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose --env-file .env -f compose.prod.yml exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$1/freelanceflow-$stamp.dump"
test -s "$1/freelanceflow-$stamp.dump"
printf '%s\n' "$1/freelanceflow-$stamp.dump"

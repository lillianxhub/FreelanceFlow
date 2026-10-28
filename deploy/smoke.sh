#!/bin/sh
set -eu
: "${1:?Pass the public app origin}"
curl --fail --silent --show-error "$1/login" >/dev/null
docker compose --env-file .env -f compose.prod.yml exec -T backend \
  wget -q --spider http://127.0.0.1:8080/actuator/health

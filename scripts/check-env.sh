#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

missing=()
for var in APP_BASE_URL APP_LOGIN APP_PASSWORD; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  printf 'Missing required runtime values:\n' >&2
  for var in "${missing[@]}"; do
    printf ' - %s\n' "$var" >&2
  done
  exit 1
fi

printf 'Environment check passed.\n'

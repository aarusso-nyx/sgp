#!/usr/bin/env bash
set -euo pipefail

if [ -z "${MODULE_NAME:-}" ]; then
  printf 'Missing required runtime value: MODULE_NAME\n' >&2
  printf 'Example: MODULE_NAME=billing npm run crawl:module\n' >&2
  exit 1
fi

bash scripts/check-env.sh
npx playwright test playwright/tests/module-crawl.spec.js --reporter=list

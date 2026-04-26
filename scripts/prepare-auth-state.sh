#!/usr/bin/env bash
set -euo pipefail

bash scripts/check-env.sh
npx playwright test playwright/tests/auth-state.spec.js --reporter=list
printf 'Storage state saved to playwright/auth/storage-state.json\n'

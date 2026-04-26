#!/usr/bin/env bash
set -euo pipefail

bash scripts/check-env.sh
npx playwright test playwright/tests/shell-crawl.spec.js --reporter=list

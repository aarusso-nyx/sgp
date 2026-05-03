# Wave 7 Test Debt Review Checklist

Use this checklist when reviewing changes that affect backend e2e specs, frozen time fixtures, or DTO snapshots.

## 403 Negative Paths

- Confirm new protected controller coverage includes a negative-path assertion that expects HTTP 403 or a `ForbiddenException` with status 403.
- Do not satisfy 403 coverage with 401 unauthenticated cases; 403 must represent an authenticated actor lacking the required permission.
- Run `node scripts/check-test-debt-coverage.mjs` before approving broad e2e additions.

## Frozen Time

- Specs that depend on the current date must use `jest.useFakeTimers().setSystemTime(...)`.
- Do not add `new Date('2025-...')` literals in specs; use named fixture constants or an already-frozen clock.
- Restore real timers inside the spec scope that enabled fake timers.

## DTO Snapshots

- Snapshot updates must be reviewed as API contract changes, not accepted as mechanical churn.
- Keep snapshot payloads serialized and stable: no random IDs, current timestamps, locale-dependent sorting, or live service calls.
- Prefer one snapshot case per stable DTO surface so diffs point to the affected wire contract.

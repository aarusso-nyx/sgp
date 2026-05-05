# Round 6 Gaps

## Blocked

- R6-04 real AWS provisioning: no credentials, account IDs, role ARNs, regions,
  or egress IP allow-list inputs were available.
- R6-09 real pilot: cannot run without R6-04.

## Partial

- R6-02 local repo exists but is not a GitHub repo and the private package is
  not published.
- R6-03 local submission processor exists but does not lift the full SGP
  submission stack or deploy a Lambda.
- R6-08 local publishers/consumers exist but are not wired to EventBridge/SQS.
- R6-11 local migrations enforce the no-SGP-FK boundary but have not replayed
  against stynx Aurora.

## Technical Note

`public.audit_event` is range-partitioned by `occurred_at`, so PostgreSQL cannot
enforce global uniqueness on only `(correlation_id, action)` without including
the partition key. R6 adds `correlation_id` and a supporting index; the consumer
performs an idempotent read-before-insert.

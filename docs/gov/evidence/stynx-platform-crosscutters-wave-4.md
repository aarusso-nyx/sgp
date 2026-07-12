# STYNX Platform Cross-Cutters Wave 4 Evidence

Date: 2026-07-12

Status: in progress.

## Audit slice

`StynxAuditModule` is composed once under `backend/src/stynx/` and its
`STYNX_AUDIT_SINK` resolves to `AuditWriterService`. The writer implements the
STYNX `AuditSink` contract while retaining `public.sgp_append_audit_event`, SGP
metadata redaction, immutable SQL ownership, query/export behavior and the
fail-closed mutation-required interceptor.

There is one SQL writer and no dual-write path. Existing SGP audit calls and
future STYNX audit envelopes converge on the same service and canonical table
function. STYNX retention automation is not enabled, so this slice performs no
retention mutation.

Focused evidence covers sink binding, envelope mapping, authorization-header
redaction, mutation fallback, explicit mutation audit and missing-audit failure.

## Remaining slices

- storage;
- idempotency and rate limits;
- logging and privacy.

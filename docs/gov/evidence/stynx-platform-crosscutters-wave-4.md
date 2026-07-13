# STYNX Platform Cross-Cutters Wave 4 Evidence

Date: 2026-07-12

Status: complete.

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

## Storage slice

`StynxStorageModule` resolves `STYNX_OBJECT_STORAGE` to
`DocumentsStorageService`. The service implements the STYNX
`ObjectStorageService` contract while preserving SGP object-key construction,
tenant authorization, configured presign TTLs, content-type headers, checksum
metadata and request-abort behavior. No real provider call, deletion or
retention mutation is part of the proof.

## Idempotency and rate-limit slice

The STYNX platform-pipeline idempotency and rate-limit switches remain disabled
because the pinned defaults do not implement SGP's accepted durable
`public.idempotency_keys` replay/lease contract or the independent IP and tenant
bucket policy. SGP's implementations are retained as product adapters, not
duplicated by a parallel STYNX engine. Replay/conflict/lease and rate-limit
exhaustion tests remain the authority for these contracts.

## Logging and privacy slice

Runtime bootstrap now installs `StynxLogger` directly. The six parallel
`nestjs-pino` module mounts were removed. STYNX logging consumes the existing
JSON-driven PII and authorization-header redaction paths; SGP OTel trace and
Prometheus correlation remain unchanged.

The STYNX privacy runtime is intentionally not mounted: its export and erasure
controllers require a separate data/storage execution model and could perform
retention or subject-data mutations. SGP retains its deterministic LGPD
inventory, export and erasure planning surfaces. Wave 4 proof is dry-run and
fixture-only, with no provider call or retention change.

## Closeout

No raw STYNX platform composition exists outside `backend/src/stynx/`. Audit,
storage and logging use the shared STYNX contracts/runtime. Incompatible
idempotency, rate-limit and privacy defaults are disabled rather than run in
parallel or weaken accepted SGP behavior.

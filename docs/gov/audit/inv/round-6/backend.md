# Round 6 Backend Inventory

- `backend/src/integrations/stynx-esocial/contracts/` extracts the queue and
  spool/audit contract surface from the old inline mock relay declarations.
- `backend/src/common/adapters/sqs-queue-transport.ts` adds the SQS-backed
  transport while the default remains in-memory.
- `backend/src/esocial-worker/adapters/queue-adapter.ts` now records SGP
  `public.esocial_spool` rows when a spool service is injected.
- `backend/src/integrations/stynx-esocial/*consumer.service.ts` materializes
  stynx audit/spool update envelopes locally.
- `backend/src/system-parameters/esocial-queue-transport-flag.ts` resolves the
  tenant-scoped `esocial.queue.transport` flag.

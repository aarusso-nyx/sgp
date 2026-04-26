# Resume Prompt (SGP) - 2026-04-19

Use this prompt to resume work on another desktop with minimal warm-up.

## Context

You are resuming SGP modernization work in:

- `/Users/aarusso/Downloads/sgp`

Read first:

1. `docs/handoff-2026-04-19.md`
2. `inventories/handoff-state-2026-04-19.json`
3. `source/docs/implementation-status.md`
4. `source/database/legacy-assumptions.md`

## Current State

- Documents workflow is implemented with S3 presigned upload/register/download.
- Canonical register route is:
  - `POST /documents/uploads/:id/register`
- Deprecated alias `POST /documents/register` was removed.
- Permission split is active:
  - `documents:upload`
  - `documents:register`
  - `documents:download`
- IAM permission catalog endpoint is protected with `iam:read`.
- RLS policies are aligned with the document permissions.
- Seed transaction sets `app.bypass_rls=true` for deterministic bootstrapping.

## Validation Baseline

From `source/backend`:

- `npm run build` passes
- `npm test` passes
- `npm run test:e2e` passes
- `npm run lint` has pre-existing failures in `src/audit/*` (not from documents slice)

## Required Environment

At minimum:

- `DATABASE_URL`
- Cognito vars (`COGNITO_*`)
- S3 vars:
  - `S3_REGION`
  - `S3_DOCUMENTS_BUCKET`
  - `S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS`
  - `S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS`
  - `S3_DOCUMENTS_KEY_PREFIX`

## Suggested Next Task

Implement document ownership checks by `owner_type`/`owner_id` so access is not only permission-based.

Target areas:

- `source/backend/src/documents/documents.service.ts`
- `source/database/sql/12-rls-policies.sql`
- tests under `source/backend/src/documents` and `source/backend/test`

## Constraints

- Keep Prisma migrations for schema changes.
- Keep SQL files for RLS/extensions/views/operational DB logic.
- Preserve deterministic seeds.
- Record unverified assumptions in `source/database/legacy-assumptions.md`.

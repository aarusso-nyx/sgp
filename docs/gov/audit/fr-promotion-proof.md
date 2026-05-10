# Functional Requisite Promotion Proof

Round 11 proof discipline for promoting functional-requisite rows out of
generic backlog status. Round 12 adds explicit owner-scoped `DEFERRED` rows for
accepted behavior outside the v0.0.1 MVP closure boundary.

Mapped tests are coverage evidence only. A row can be promoted to `DONE` only
when its `Notes` cell carries explicit proof metadata:

```text
Proof: source=<source-path>; test=<test-path>; command=<gate-command>; audit=<docs/gov/audit/...>; rationale=<status rationale>
```

## Required Fields

| Field       | Requirement                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `source`    | Runtime source, SQL, script, or generated constructor path that implements the accepted behavior. |
| `test`      | Focused spec, e2e spec, or golden path that directly exercises the accepted behavior.             |
| `command`   | Exact command used as proof for the cited test or gate.                                           |
| `audit`     | Retained audit note under `docs/gov/audit/` that explains why the status is accepted.             |
| `rationale` | Short status rationale connecting source, test, command, and audit evidence to the `DONE` claim.  |

## Application Rules

- Do not invent FR IDs. Use the IDs emitted in
  `docs/gov/audit/functional-requisites.md`.
- Do not promote a domain FR from mapped-test presence alone.
- Keep generic `TODO` out of the retained closure ledger. Rows that lack source
  evidence, focused test evidence, a command, or a retained audit note must
  either stay out of the closure tranche or be marked `DEFERRED` with
  `docs/gov/evidence/mvp-scope-ledger.md`.
- Use `DEFERRED` only for accepted product backlog outside v0.0.1 MVP scope,
  with owner, reopen trigger, and retained evidence path in the `Notes` cell.
- Use `DONE` only when the rationale does not depend on deferred, blocked, or
  partial behavior.

## Current Retained Proofs

| FR-ID          | Status | Proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FR-FI-93690B` | `DONE` | `source=backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts:193; test=tests/backend/dctfweb-totalizer-reconciliation.e2e-spec.ts:55; command=npm run test:e2e -- --runInBand tests/backend/dctfweb-totalizer-reconciliation.e2e-spec.ts; audit=docs/gov/audit/fr-promotion-proof.md; rationale=DCTFWeb generation and sandbox transmission preserve accepted S-5011, S-5012, S-5013, EFD-Reinf R-9015, MIT internal XML, CSLL adicional separation, tenant RLS, and mutation audit evidence inside the SGP boundary.`                                                                                      |
| `FR-FI-26241D` | `DONE` | `source=backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.ts:186; test=backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.spec.ts:22; command=npm -w backend run test -- --runInBand backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.spec.ts; audit=docs/gov/audit/efd-reinf-r4000-proof.md; rationale=SGP-owned R-4000 sandbox contract path covers deterministic R-4010/R-4020/R-4040/R-4080/R-4099 builders, tenant-scoped item persistence, and R-9015 DCTFWeb handoff; official RFB layout/homologation remains outside this proof by owner-pinned boundary.` |
| `FR-FI-1F136F` | `DONE` | `source=backend/src/integrations-worker/siafic/siafic-sync.service.ts:64; test=tests/backend/siafic-sync.e2e-spec.ts:78; command=npm run test:e2e -- --runInBand tests/backend/siafic-sync.e2e-spec.ts; audit=docs/gov/audit/fr-promotion-proof.md; rationale=SIAFIC neutral JSON sync is accepted inside the SGP boundary and official layout/homologation is downstream by owner decision.`                                                                                                                                                                                                                             |
| `FR-PT-1244A7` | `DONE` | `source=backend/src/lgpd/dsar.controller.ts:22; test=tests/backend/lgpd-dpo-dsar.e2e-spec.ts:126; command=npm run test:e2e -- --runInBand tests/backend/lgpd-dpo-dsar.e2e-spec.ts tests/backend/lgpd-direitos-titular.e2e-spec.ts; audit=docs/gov/audit/lgpd-dpo-dsar-proof.md; rationale=Public DPO contact, protected DPO designation lifecycle, authenticated portal DSAR submission, protected operator DSAR lifecycle, SLA tracking, tenant RLS posture, mutation audit, and redacted operator envelopes are implemented without adding a new public route family or RBAC string.`                                   |

## FR-FI-93690B — DCTFWeb / MIT

Retained acceptance scope:

- `backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts` builds
  DCTFWeb declarations from accepted S-5011, S-5012, S-5013, EFD-Reinf R-9015,
  and pending MIT tax debits, preserving CSLL adicional as a separate internal
  XML attribute and item amount.
- `backend/src/integrations-worker/dctfweb/mit-inclusion.service.ts` builds the
  deterministic MIT inclusion XML with branch CNPJ, PGD debit identifiers, tax
  code, period, base, amount, due date, deterministic `mitDebitId`, and CSLL
  adicional when present.
- `backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts` maps
  retained MIT XML metadata back into detail DTOs, so `mitStatus`,
  `mitDebitId`, and `cnpjFilial` survive round trips without introducing a
  Receita layout claim beyond `docs/refs/esocial/dctfweb-mit.md`.
- `database/sql/70-fiscal-final.sql` keeps DCTFWeb declaration, item, and
  PGD-DCTF tax debit tables under tenant RLS/write policies; declaration and
  item mutations also have database audit triggers.
- `backend/src/integrations-worker/dctfweb/dctfweb.controller.ts` records
  application audit mutations for generation, MIT generation, signing, and
  transmission.

Focused proof commands:

```bash
npm run test:e2e -- --runInBand tests/backend/dctfweb-totalizer-reconciliation.e2e-spec.ts
npm run test:e2e -- --runInBand tests/backend/dctfweb-fluxo.e2e-spec.ts
npm run test:backend -- --runInBand src/integrations-worker/dctfweb/dctfweb-builder.service.spec.ts src/integrations-worker/dctfweb/dctfweb-mit.service.spec.ts src/integrations-worker/dctfweb/dctfweb-tenant-audit.spec.ts src/integrations-worker/dctfweb/dctfweb.controller.spec.ts
npm run test:backend -- --runInBand
npm run lint:check
npm run format:check
npm run typecheck
npm run governance:check
```

Boundary retained for later owner decisions: official Receita endpoint
homologation, certificate custody changes, and any newer unpinned MIT import
layout claim remain outside this SGP acceptance proof.

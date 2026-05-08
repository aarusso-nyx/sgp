# Portaria 671 Time Export Proof

Round: 11
Worker: R11-08
Functional requisites: `FR-TAS-383663`, `FR-TAS-CBF51F`

## Scope

This proof covers the SGP-owned Portaria 671 ponto foundation and AFD
generation/import primitives:

- work schedule, shift, time-record hash chain, tenant/RLS, and audit base;
- deterministic AFD fixed-width layout generation and parser validation;
- AFD import conversion into append-only `ponto.time_record` rows;
- AFD export request lifecycle and persisted metadata;
- AFDT/ACJEF deterministic fiscal extracts as retained historical outputs.

It does not claim official REP device certification, vendor firmware
integration, production object-store custody, ICP-Brasil signing, or payroll
calculation internals.

## Source Evidence

- `docs/refs/legal/portaria-671-ponto.md` records AFD as the original marking
  reference and AFDT/ACJEF as treated/fiscal outputs.
- `docs/eng/domains/time-attendance-sst.md` defines PONTO-01, PONTO-02, and
  PONTO-03 behavior for schedules, REP ingestion, AFD import/export, AFDT, and
  ACJEF.
- `database/sql/10-08-ponto-ddl.sql` declares `ponto.work_schedule`,
  `ponto.work_shift`, `ponto.day_schedule`,
  `ponto.employee_schedule_assignment`, `ponto.time_record`,
  `ponto.afd_export`, `ponto.afd_import`, and `ponto.afd_import_line`.
- `database/sql/70-ponto-final.sql` forces RLS, creates tenant/permission
  policies, append-only time-record triggers, and audit triggers for the
  covered tables.

## Executable Proof

- `backend/src/ponto/afd/afd-layout.spec.ts` validates fixed-width AFD records,
  trailer seal verification, malformed file rejection, and the deterministic
  `portaria-671-rep-kinds.golden.afd` fixture containing REP-P, REP-A, and
  REP-C type-4 markings.
- `backend/src/ponto/afd/afd-generator.service.spec.ts` proves AFD export
  generation for empty periods and REP-P/REP-A/REP-C markings, including NSR,
  employee identifier, source, record hash, header, and trailer fields.
- `backend/src/ponto/afd/afd-importer.service.spec.ts` proves AFD import parses
  the same fixture and creates time-record inputs with tenant-local employee
  resolution, source mapping, raw-line retention, and AFD metadata.
- `backend/src/ponto/afd/afdt-acjef-generator.service.spec.ts` proves AFDT and
  ACJEF deterministic flat-file generation against golden fixtures.
- `tests/backend/ponto-afd-roundtrip.e2e-spec.ts` keeps protected API proof for
  AFD import/export request envelopes, invalid trailer rejection, and 403
  negative authorization.
- `tests/rls/afd-export-cross-tenant.spec.ts` asserts direct RLS, permission,
  append-only, and audit-trigger evidence for AFD export/import/import-line and
  time-record surfaces.

## Follow-Up Boundary

AFDT and ACJEF are proved as deterministic SGP fiscal/historical extracts in
this slice. Official external layout/version changes, AEJ replacement decisions,
and certified REP-device integration remain outside R11-08.

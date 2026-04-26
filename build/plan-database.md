# Database Plan: SGP PostgreSQL

## Goal

Design a normalized PostgreSQL database for SGP that supports HR, payroll, reporting, security, audit, and document workflows.

## Stack

- PostgreSQL engine.
- Prisma migrations for schema evolution.
- SQL support files under `source/database/sql`.
- Deterministic seeds under `source/database/seed`.

## Model Groups

- Security: users shadow table, Cognito subject mapping, group snapshots, permission catalog.
- Audit: append-only audit events with actor, action, resource, request ID, and metadata.
- Organization: company/branch, filial, lotação, cost center, legal responsible.
- Employee: employee, dependents, status history, professional experience, transfer, frequency, time service, vacation/leave records.
- Master data: cargos, funções, salary ranges/references, motives, document types, contract types, shifts, sindicatos, banks, legal/taxonomy tables.
- Payroll: payroll run, competence, processing type, folha type, verba, employee verba, financial record, remittance file, blocked payment.
- Reports/documents: report request, generated file, attachment metadata, download audit.
- Convênio: institution, program, internship/agreement records.

## Design Rules

- UUID primary keys unless an external immutable code is required.
- Preserve business codes as unique columns, not necessarily primary keys.
- Use explicit foreign keys and indexes on every lookup/filter field.
- Use timestamp columns and optimistic `updated_at` behavior.
- Use soft-delete only where historical references must remain valid.
- Use append-only audit and payroll status history.
- Use check constraints for money, dates, date ranges, and status values.

## Acceptance

- Prisma schema covers all model groups.
- SQL files create required extensions, audit helpers, and operational views.
- Seeds support local development, API tests, and permission matrix tests.
- Migration/test scripts can rebuild a clean local database.


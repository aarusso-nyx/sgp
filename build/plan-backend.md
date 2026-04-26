# Backend Plan: SGP NestJS API

## Goal

Build an idiomatic NestJS backend over PostgreSQL with clean domain modules, Cognito JWT validation, OpenAPI contracts, audit logging, and complete API support for observed and expected SGP mutations.

## Stack

- NestJS project in `source/backend`.
- Prisma for PostgreSQL access and migrations.
- AWS Cognito User Pool JWT validation through JWKS.
- `class-validator`/`class-transformer` DTO validation.
- OpenAPI via `@nestjs/swagger`.

## API Principles

- Use clean REST resources with stable DTOs, not legacy AngularJS payload shapes.
- Standard list queries: `page`, `pageSize`, `sort`, `direction`, filters by explicit field names.
- Standard list responses: `items`, `page`, `pageSize`, `total`, `totalPages`.
- Standard mutations: `POST`, `PATCH`, and `DELETE`; domain actions use explicit endpoints.
- Include request IDs, structured errors, and audit records for every mutation.

## Domain Modules

- `auth`: Cognito JWT validation, current user context, session metadata.
- `iam`: group-to-permission mapping, permission catalog, role matrix.
- `audit`: append-only event log and audit search.
- `gestao`: master data and system administration.
- `rh`: employee lifecycle.
- `folha-pagamento`: payroll, remittance, financial records, payroll reports.
- `convenio`: institutions, programs, internship workflows.
- `relatorio`: cross-module report catalog and generation.
- `documents`: attachments and generated file metadata.
- `notifications`: notification counts and lists.

## Expected Mutations

- Create/update/delete/toggle active for all CRUD master-data resources.
- Create/update users, profiles, and permission assignments.
- Save system parameters and image/attachment references.
- Create/update employee records, dependents, transfers, status history, frequency, vacation/leave records.
- Create payroll runs, change payroll status, generate remittance files, attach return files, manage employee verbas.
- Generate reports and persist generated file metadata.
- Record audit events for all of the above.

## Acceptance

- OpenAPI documents every route, DTO, auth requirement, and error response.
- Unit/API/e2e tests cover permission checks, validation failures, paging, and mutations.
- No endpoint trusts frontend permissions; all permissions are enforced server-side from Cognito groups.


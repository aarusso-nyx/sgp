# Unverified Legacy Assumptions

Status legend: `observed`, `inferred`, `unverified`.

This file records assumptions carried into the Prisma/PostgreSQL design that are not fully confirmed by legacy runtime evidence.

## Keys and Identity

- `unverified`: Most legacy entities exposed `codigo`/`numero` but did not expose immutable PK columns in UI payloads. The modern design standardizes on UUID PKs with unique business codes.
- `unverified`: Legacy numeric-like identifiers (`matricula`, payroll event codes) are treated as business keys, not surrogate keys.

## Deletion and History

- `unverified`: Master-data records are modeled with `RecordStatus` soft-state and append-only historical tables instead of hard delete.
- `inferred`: Audit and payroll run status are append-only histories.

## Relationship Cardinality

- `unverified`: `employee` links to master-data dimensions (`branch`, `cost_center`, `job_position`, `job_function`, `employment_link`, `functional_status`) as optional FKs to support incomplete legacy records seen in screens.
- `unverified`: `report_request` optionally references `branch`, `payroll_run`, and `processing_type` because report screens showed mixed filter combinations.
- `unverified`: `payment_remittance_file` and `blocked_payment` allow nullable links to reason/processing/payroll contexts due to partial legacy list views.

## Domain Coverage Mapping

- `inferred`: `education_institution`, `internship_program`, `agreement`, and `internship_record` represent the convênio surfaces (`instituicao`, `programa`, `convenio`, `convenio estagiario`).
- `inferred`: `payroll_financial_record` is a denormalized operational ledger for reporting filters (`filial`, `lotacao`, `situacao_funcional`) seen in financial screens.
- `inferred`: `document_attachment` is polymorphic (`owner_type`, `owner_id`) because legacy evidence showed attachments across different modules without a single owner table.
- `unverified`: `document_upload_session` stores pre-registration metadata so file upload can be validated before final attachment registration; legacy flow details were not directly observable.
- `unverified`: `document_download_audit.user_id` is currently nullable because Cognito subject to local user-account mapping is not guaranteed in all runtime paths.

## Validation Rules

- `inferred`: Competence month constraints (`1..12`) and nonnegative monetary constraints were not directly observed in UI but are required for payroll consistency.
- `unverified`: Date-range constraints (`end >= start`) were inferred from HR/payroll semantics.

## Seed Fixtures

- `observed`: Seed payloads use deterministic business codes and placeholder identities only.
- `inferred`: Test CPF/CNPJ values in fixtures are synthetic and not tied to external validation services.

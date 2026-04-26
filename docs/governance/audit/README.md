# Audit Governance

Audit signals are written in two layers:

- Domain mutation events in `public.audit_event`.
- Operational document download records in `public.document_download_audit`.

## Required Event Fields

- `occurred_at`
- `action`
- `resource_type`
- `resource_id`
- `request_id`
- actor context (`actor_sub`, `actor_login`) when available

## Current Status

- API mutation controllers append audit events after successful writes.
- Request IDs are propagated via middleware and included in error/audit records.
- Long-term retention and legal-hold procedures are not yet formalized.

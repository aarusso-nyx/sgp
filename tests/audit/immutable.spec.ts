export const immutableAuditSpec = `
-- Exercised by npm run db:smoke in 99-xcut04-audit-immutability.sql.
-- Assertions:
-- UPDATE and DELETE against public.audit_event raise SQLSTATE 0A000 with
-- message "audit_event is immutable".
-- The audit_event_immutable trigger remains attached to the partitioned parent,
-- so monthly partitions inherit the append-only behavior.
-- sgp_app_role has INSERT/SELECT but no UPDATE/DELETE on public.audit_event.
`;

export const hotTablePartitioningSpec = `
-- Exercised by npm run db:smoke in database/sql/checks/hot-table-partitions.sql.
-- Assertions:
-- 1. public.audit_event is RANGE partitioned by occurred_at with default, current, and future monthly partitions.
-- 2. payroll.payroll_financial_record is RANGE partitioned by competence with default, current, and future monthly partitions.
-- 3. ponto.time_record is RANGE partitioned by recorded_at with default, current, and future monthly partitions.
-- 4. public.audit_event keeps the audit_event_immutable trigger on the partitioned parent.
-- 5. ponto.time_record keeps append-only and identity-registration triggers on the partitioned parent.
-- 6. Destructive retention/drop/detach policy is intentionally deferred pending owner decision.
`;

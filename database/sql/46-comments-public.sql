COMMENT ON SCHEMA public IS 'standard public schema';

COMMENT ON TABLE public.audit_event IS 'Immutable audit trail for all mutating SGP transactions. Events are append-only, protected from UPDATE/DELETE, and retained for at least 6 months before administrative retention windows may truncate eligible partitions.';

COMMENT ON COLUMN public.tax_rate.rate_percent IS 'Legal rate/factor value; numeric(18,6); rounded half-away-from-zero only at policy boundary.';

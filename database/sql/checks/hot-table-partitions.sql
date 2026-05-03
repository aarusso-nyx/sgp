DO $$
DECLARE
  v_month date := date_trunc('month', current_date)::date;
  v_next_month date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_future_month date := (date_trunc('month', current_date) + interval '2 months')::date;
  v_table regclass;
  v_partition_key text;
BEGIN
  FOR v_table, v_partition_key IN
    SELECT 'public.audit_event'::regclass, 'RANGE (occurred_at)'
    UNION ALL
    SELECT 'payroll.payroll_financial_record'::regclass, 'RANGE (competence)'
    UNION ALL
    SELECT 'ponto.time_record'::regclass, 'RANGE (recorded_at)'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class
      WHERE oid = v_table
        AND relkind = 'p'
    ) THEN
      RAISE EXCEPTION '% must be a partitioned table', v_table;
    END IF;

    IF pg_get_partkeydef(v_table) <> v_partition_key THEN
      RAISE EXCEPTION '% partition key mismatch: expected %, found %', v_table, v_partition_key, pg_get_partkeydef(v_table);
    END IF;
  END LOOP;

  IF to_regclass('public.audit_event_default') IS NULL THEN
    RAISE EXCEPTION 'public.audit_event_default partition is missing';
  END IF;

  IF to_regclass('payroll.payroll_financial_record_default') IS NULL THEN
    RAISE EXCEPTION 'payroll.payroll_financial_record_default partition is missing';
  END IF;

  IF to_regclass('ponto.time_record_default') IS NULL THEN
    RAISE EXCEPTION 'ponto.time_record_default partition is missing';
  END IF;

  IF to_regclass('public.audit_event_y' || to_char(v_month, 'YYYY') || 'm' || to_char(v_month, 'MM')) IS NULL
    OR to_regclass('public.audit_event_y' || to_char(v_next_month, 'YYYY') || 'm' || to_char(v_next_month, 'MM')) IS NULL
    OR to_regclass('public.audit_event_y' || to_char(v_future_month, 'YYYY') || 'm' || to_char(v_future_month, 'MM')) IS NULL THEN
    RAISE EXCEPTION 'public.audit_event current/future monthly partitions are missing';
  END IF;

  IF to_regclass('payroll.payroll_financial_record_y' || to_char(v_month, 'YYYY') || 'm' || to_char(v_month, 'MM')) IS NULL
    OR to_regclass('payroll.payroll_financial_record_y' || to_char(v_next_month, 'YYYY') || 'm' || to_char(v_next_month, 'MM')) IS NULL
    OR to_regclass('payroll.payroll_financial_record_y' || to_char(v_future_month, 'YYYY') || 'm' || to_char(v_future_month, 'MM')) IS NULL THEN
    RAISE EXCEPTION 'payroll.payroll_financial_record current/future monthly partitions are missing';
  END IF;

  IF to_regclass('ponto.time_record_y' || to_char(v_month, 'YYYY') || 'm' || to_char(v_month, 'MM')) IS NULL
    OR to_regclass('ponto.time_record_y' || to_char(v_next_month, 'YYYY') || 'm' || to_char(v_next_month, 'MM')) IS NULL
    OR to_regclass('ponto.time_record_y' || to_char(v_future_month, 'YYYY') || 'm' || to_char(v_future_month, 'MM')) IS NULL THEN
    RAISE EXCEPTION 'ponto.time_record current/future monthly partitions are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.audit_event'::regclass
      AND tgname = 'audit_event_immutable'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'public.audit_event immutable trigger is missing on the partitioned parent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'ponto.time_record'::regclass
      AND tgname = 'time_record_append_only'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'ponto.time_record append-only trigger is missing on the partitioned parent';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'ponto.time_record'::regclass
      AND tgname = 'time_record_identity_register'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'ponto.time_record identity registration trigger is missing on the partitioned parent';
  END IF;
END
$$;

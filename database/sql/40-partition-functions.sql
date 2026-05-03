CREATE FUNCTION public.sgp_create_audit_event_partition(p_month date) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_partition_name text := 'audit_event_y' || to_char(v_start, 'YYYY') || 'm' || to_char(v_start, 'MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_event FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    v_start,
    v_end
  );
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_partition_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_partition_name);
  RETURN v_partition_name;
END;
$$;

CREATE FUNCTION public.sgp_create_audit_event_partitions(p_from date DEFAULT date_trunc('month', current_date)::date, p_months integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_offset integer;
BEGIN
  IF p_months < 1 THEN
    RAISE EXCEPTION 'p_months must be >= 1';
  END IF;

  FOR v_offset IN 0..(p_months - 1) LOOP
    PERFORM public.sgp_create_audit_event_partition((date_trunc('month', p_from) + make_interval(months => v_offset))::date);
  END LOOP;

  RETURN p_months;
END;
$$;

CREATE FUNCTION public.sgp_audit_event_default_partition_redirect() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.sgp_create_audit_event_partition(date_trunc('month', NEW.occurred_at)::date);
  INSERT INTO public.audit_event SELECT (NEW).*;
  RETURN NULL;
END;
$$;

CREATE FUNCTION payroll.sgp_create_payroll_financial_record_partition(p_competence date) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_start date := date_trunc('month', p_competence)::date;
  v_end date := (date_trunc('month', p_competence) + interval '1 month')::date;
  v_partition_name text := 'payroll_financial_record_y' || to_char(v_start, 'YYYY') || 'm' || to_char(v_start, 'MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS payroll.%I PARTITION OF payroll.payroll_financial_record FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    v_start,
    v_end
  );
  EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', v_partition_name);
  EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', v_partition_name);
  RETURN v_partition_name;
END;
$$;

CREATE FUNCTION payroll.sgp_create_payroll_financial_record_partitions(p_from date DEFAULT date_trunc('month', current_date)::date, p_months integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_offset integer;
BEGIN
  IF p_months < 1 THEN
    RAISE EXCEPTION 'p_months must be >= 1';
  END IF;

  FOR v_offset IN 0..(p_months - 1) LOOP
    PERFORM payroll.sgp_create_payroll_financial_record_partition((date_trunc('month', p_from) + make_interval(months => v_offset))::date);
  END LOOP;

  RETURN p_months;
END;
$$;

CREATE FUNCTION payroll.sgp_payroll_financial_record_default_partition_redirect() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.competence := make_date(NEW.competence_year, NEW.competence_month, 1);
  PERFORM payroll.sgp_create_payroll_financial_record_partition(NEW.competence);
  INSERT INTO payroll.payroll_financial_record SELECT (NEW).*;
  RETURN NULL;
END;
$$;

CREATE FUNCTION payroll.sgp_set_payroll_financial_record_competence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.competence := make_date(NEW.competence_year, NEW.competence_month, 1);
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.sgp_create_time_record_partition(p_recorded_at date) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_start date := date_trunc('month', p_recorded_at)::date;
  v_end date := (date_trunc('month', p_recorded_at) + interval '1 month')::date;
  v_partition_name text := 'time_record_y' || to_char(v_start, 'YYYY') || 'm' || to_char(v_start, 'MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS ponto.%I PARTITION OF ponto.time_record FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    v_start,
    v_end
  );
  EXECUTE format('ALTER TABLE ponto.%I ENABLE ROW LEVEL SECURITY', v_partition_name);
  EXECUTE format('ALTER TABLE ponto.%I FORCE ROW LEVEL SECURITY', v_partition_name);
  RETURN v_partition_name;
END;
$$;

CREATE FUNCTION ponto.sgp_create_time_record_partitions(p_from date DEFAULT date_trunc('month', current_date)::date, p_months integer DEFAULT 3) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_offset integer;
BEGIN
  IF p_months < 1 THEN
    RAISE EXCEPTION 'p_months must be >= 1';
  END IF;

  FOR v_offset IN 0..(p_months - 1) LOOP
    PERFORM ponto.sgp_create_time_record_partition((date_trunc('month', p_from) + make_interval(months => v_offset))::date);
  END LOOP;

  RETURN p_months;
END;
$$;

CREATE FUNCTION ponto.sgp_time_record_default_partition_redirect() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM ponto.sgp_create_time_record_partition(date_trunc('month', NEW.recorded_at)::date);
  INSERT INTO ponto.time_record SELECT (NEW).*;
  RETURN NULL;
END;
$$;

CREATE FUNCTION ponto.sgp_register_time_record_identity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'ponto', 'public', 'pg_catalog'
    AS $$
BEGIN
  INSERT INTO ponto.time_record_identity (
    tenant_id,
    time_record_id,
    employee_id,
    recorded_at,
    nsr
  )
  VALUES (
    NEW.tenant_id,
    NEW.time_record_id,
    NEW.employee_id,
    NEW.recorded_at,
    NEW.nsr
  );

  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.sgp_time_record_identity_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'ponto.time_record_identity is append-only' USING ERRCODE = '0A000';
END;
$$;

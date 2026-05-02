CREATE FUNCTION payroll_calc.f_fol01_venc_32efde4e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_43f75ca7(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_47cd31c3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_4921aed5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_49879ab1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_49bcdf29(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      SELECT fc.amount
      INTO v_result
      FROM payroll_calc.formula_cache fc
      WHERE fc.earning_deduction_id = 'bc78700f-a624-4b18-baa9-0599e96f4210'::uuid
        AND fc.tenant_id = public.sgp_current_tenant_uuid()
        AND fc.employee_id = p_employee_id
        AND fc.competence_month = p_month
        AND fc.competence_year = p_year;

      IF FOUND THEN
        RETURN v_result;
      END IF;

      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1));

      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        employee_id,
        competence_month,
        competence_year,
        amount
      )
      SELECT ped.tenant_id, ped.id, p_employee_id, p_month, p_year, v_result
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id = 'bc78700f-a624-4b18-baa9-0599e96f4210'::uuid
      ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_4d5e250b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_4d795c8f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_4fcccfa8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_553886e6(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_556af985(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_55a2314f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_57a098e3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_5b809f84(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_610cf061(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_622556da(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_73670244(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_74cb540d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_74cd73e2(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_78f81054(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_7963eafb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_79933da8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_7ca5c0fb(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_7fd3b3a3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_8113c96e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      SELECT fc.amount
      INTO v_result
      FROM payroll_calc.formula_cache fc
      WHERE fc.earning_deduction_id = '5c5e4ecf-f6a6-4503-b0e1-3ce6f9f90347'::uuid
        AND fc.tenant_id = public.sgp_current_tenant_uuid()
        AND fc.employee_id = p_employee_id
        AND fc.competence_month = p_month
        AND fc.competence_year = p_year;

      IF FOUND THEN
        RETURN v_result;
      END IF;

      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1));

      INSERT INTO payroll_calc.formula_cache (
        tenant_id,
        earning_deduction_id,
        employee_id,
        competence_month,
        competence_year,
        amount
      )
      SELECT ped.tenant_id, ped.id, p_employee_id, p_month, p_year, v_result
      FROM payroll.payroll_earning_deduction ped
      WHERE ped.id = '5c5e4ecf-f6a6-4503-b0e1-3ce6f9f90347'::uuid
      ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_8243e4a5(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_840bb1c4(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_89f74b36(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_8a3367b1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_8b606b22(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_909bcfcf(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_919e8858(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_92419a21(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9403f543(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_943e80d3(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_95b75c57(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_96839793(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9787bf80(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9b1a30ac(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9c438fee(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9c80540d(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9cd32d8b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_9fc3a049(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_a1b04129(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_a2269d39(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_a40d7def(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_a903464b(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_addee92a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_b34ff4a8(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_b6b182b1(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_bb227d47(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_bf4cf844(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_c0ecfc65(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_c417991e(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_d412ee6c(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_d46f760a(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_d611e466(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_d63a856f(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_d69cd0b9(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_da44b2fe(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_dd759722(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE FUNCTION payroll_calc.f_fol01_venc_df7c4435(p_employee_id uuid, p_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE), p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)) RETURNS numeric
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'payroll_calc', 'hr', 'payroll', 'public', 'pg_catalog'
    AS $$
    DECLARE
      v_result numeric;
    BEGIN
      v_result := base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1;
      RETURN v_result;
    END;
    $$;

CREATE MATERIALIZED VIEW payment.consignment_margin_view AS
 WITH parameters AS (
         SELECT system_parameter.tenant_id,
            max((system_parameter.value)::numeric) FILTER (WHERE (system_parameter.key = 'consignment.margin.general_pct'::text)) AS general_pct,
            max((system_parameter.value)::numeric) FILTER (WHERE (system_parameter.key = 'consignment.margin.card_pct'::text)) AS card_pct
           FROM public.system_parameter
          WHERE (system_parameter.key = ANY (ARRAY['consignment.margin.general_pct'::text, 'consignment.margin.card_pct'::text]))
          GROUP BY system_parameter.tenant_id
        ), base AS (
         SELECT DISTINCT ON (record.tenant_id, record.employee_id, record.competence_year, record.competence_month) record.tenant_id,
            record.employee_id,
            make_date(record.competence_year, record.competence_month, 1) AS reference_competence,
            (record.net_amount)::numeric(14,2) AS net_base
           FROM payroll.payroll_financial_record record
          ORDER BY record.tenant_id, record.employee_id, record.competence_year, record.competence_month, record.generated_at DESC
        ), used AS (
         SELECT loan.tenant_id,
            loan.employee_id,
            base_1.reference_competence,
            (sum(
                CASE
                    WHEN (loan.kind = ANY (ARRAY['PAYROLL_LOAN'::payment.consignment_loan_kind, 'OTHER'::payment.consignment_loan_kind])) THEN loan.monthly_amount
                    ELSE (0)::numeric
                END))::numeric(14,2) AS used_general,
            (sum(
                CASE
                    WHEN (loan.kind = 'CARD'::payment.consignment_loan_kind) THEN loan.monthly_amount
                    ELSE (0)::numeric
                END))::numeric(14,2) AS used_card
           FROM (payment.consignment_loan loan
             JOIN base base_1 ON (((base_1.tenant_id = loan.tenant_id) AND (base_1.employee_id = loan.employee_id) AND ((base_1.reference_competence >= (date_trunc('month'::text, (loan.valid_from)::timestamp with time zone))::date) AND (base_1.reference_competence <= (date_trunc('month'::text, (loan.valid_to)::timestamp with time zone))::date)))))
          WHERE (loan.status = 'ACTIVE'::payment.consignment_loan_status)
          GROUP BY loan.tenant_id, loan.employee_id, base_1.reference_competence
        )
 SELECT base.tenant_id,
    base.employee_id,
    base.reference_competence,
    base.net_base,
    (GREATEST((round((base.net_base * COALESCE(parameters.general_pct, 0.35)), 2) - COALESCE(used.used_general, (0)::numeric)), (0)::numeric))::numeric(14,2) AS available_general,
    (GREATEST((round((base.net_base * COALESCE(parameters.card_pct, 0.05)), 2) - COALESCE(used.used_card, (0)::numeric)), (0)::numeric))::numeric(14,2) AS available_card,
    (COALESCE(used.used_general, (0)::numeric))::numeric(14,2) AS used_general,
    (COALESCE(used.used_card, (0)::numeric))::numeric(14,2) AS used_card
   FROM ((base
     LEFT JOIN parameters ON ((parameters.tenant_id = base.tenant_id)))
     LEFT JOIN used ON (((used.tenant_id = base.tenant_id) AND (used.employee_id = base.employee_id) AND (used.reference_competence = base.reference_competence))))
  WITH NO DATA;

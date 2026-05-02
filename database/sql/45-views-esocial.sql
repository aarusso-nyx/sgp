CREATE VIEW esocial.v_competence_periodics_pending WITH (security_invoker='true') AS
 WITH run_workers AS (
         SELECT DISTINCT run.tenant_id,
            make_date(run.competence_year, run.competence_month, 1) AS competence,
            run.id AS payroll_run_id,
            item.employee_id
           FROM (payroll.payroll_run run
             JOIN payroll.employee_payroll_item item ON (((item.tenant_id = run.tenant_id) AND (item.payroll_run_id = run.id) AND (item.deleted_at IS NULL))))
          WHERE (run.status = ANY (ARRAY['GENERATED'::public."PayrollRunStatus", 'APPROVED'::public."PayrollRunStatus", 'PAID'::public."PayrollRunStatus", 'CLOSED'::public."PayrollRunStatus"]))
        ), paid_workers AS (
         SELECT DISTINCT file.tenant_id,
            make_date(file.competence_year, file.competence_month, 1) AS competence,
            file.payroll_run_id,
            file.id AS payment_batch_id,
            detail.employee_id
           FROM (payroll.payment_remittance_file file
             JOIN payroll.payment_remittance_detail detail ON (((detail.tenant_id = file.tenant_id) AND (detail.file_id = file.id))))
          WHERE ((file.status = 'PAID'::public."PaymentRemittanceStatus") AND (COALESCE(NULLIF(detail.occurrence_code, ''::text), '00'::text) = ANY (ARRAY['0'::text, '00'::text, '000'::text])))
        )
 SELECT run_workers.tenant_id,
    run_workers.competence,
    'S-1200'::text AS event_kind,
    run_workers.payroll_run_id,
    NULL::uuid AS payment_batch_id,
    run_workers.employee_id,
    'missing_s1200_receipt'::text AS reason
   FROM run_workers
  WHERE (NOT (EXISTS ( SELECT 1
           FROM esocial.s1200_emission_state state
          WHERE ((state.tenant_id = run_workers.tenant_id) AND (state.payroll_run_id = run_workers.payroll_run_id) AND (state.employee_id = run_workers.employee_id) AND (NULLIF(btrim(state.recibo), ''::text) IS NOT NULL)))))
UNION ALL
 SELECT paid_workers.tenant_id,
    paid_workers.competence,
    'S-1210'::text AS event_kind,
    paid_workers.payroll_run_id,
    paid_workers.payment_batch_id,
    paid_workers.employee_id,
    'missing_s1210_receipt'::text AS reason
   FROM paid_workers
  WHERE (NOT (EXISTS ( SELECT 1
           FROM esocial.s1210_emission_state state
          WHERE ((state.tenant_id = paid_workers.tenant_id) AND (state.payment_batch_id = paid_workers.payment_batch_id) AND (state.employee_id = paid_workers.employee_id) AND (NULLIF(btrim(state.recibo), ''::text) IS NOT NULL)))));

CREATE VIEW esocial.v_event_failures AS
 SELECT event.tenant_id,
    event.id AS event_id,
    event.event_type,
    event.reference,
    event.competence,
    event.status,
    event.response_code,
    COALESCE(classification.description, event.response_description, event.last_error_message) AS translated_message,
    event.response_description,
    event.response_errors,
    event.last_response_at,
    event.retry_count,
    retry.attempt,
    retry.next_at,
    retry.last_error,
    event.created_at,
    event.updated_at
   FROM ((public.esocial_event event
     LEFT JOIN esocial.response_classification classification ON ((classification.response_code = event.response_code)))
     LEFT JOIN esocial.event_retry_schedule retry ON (((retry.tenant_id = event.tenant_id) AND (retry.event_id = event.id))))
  WHERE (event.status = ANY (ARRAY['PROCESSADO_COM_ERROS'::public."ESocialEventStatus", 'ERRO_TECNICO_RETENTAVEL'::public."ESocialEventStatus", 'ERRO_DEFINITIVO'::public."ESocialEventStatus"]));

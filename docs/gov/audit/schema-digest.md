# Schema Digest

Round: 13

## Counts

| Metric                  | Count |
| ----------------------- | ----- |
| classification_comments | 119   |
| foreign_keys            | 673   |
| indexes                 | 1008  |
| rls_policies            | 587   |
| rls_tables              | 277   |
| tables                  | 281   |
| triggers                | 252   |

## Tables

| Table                                        | Columns | PK                                                  | FKs | RLS | Source                                          |
| -------------------------------------------- | ------- | --------------------------------------------------- | --- | --- | ----------------------------------------------- |
| avaliacao.career_plan                        | 12      | id                                                  | 1   | yes | database/sql/10-01-avaliacao-ddl.sql            |
| avaliacao.career_plan_job_position           | 4       | career_plan_id, job_position_id                     | 3   | yes | database/sql/10-01-avaliacao-ddl.sql            |
| fiscal.dctf_pgd_tax_debit                    | 15      | tenant_id, pgd_debit_id                             | 1   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.dctfweb_declaration                   | 18      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.dctfweb_item                          | 10      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.det_message_projection                | 15      | id                                                  | 1   | yes | database/sql/17-det-projection.sql              |
| fiscal.dirf_arquivo                          | 13      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.dirf_beneficiario                     | 8       | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.dirf_pagamento                        | 9       | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.efd_reinf_event                       | 19      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.efd_reinf_item                        | 11      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.efd_reinf_totalizer                   | 7       | tenant_id, competence, kind, source_event_id        | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.gps_payment_code                      | 9       | id                                                  | 0   | no  | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.gps_remittance                        | 19      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.siafic_sync_batch                     | 16      | tenant_id, id                                       | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.siafic_sync_item                      | 14      | tenant_id, id                                       | 4   | yes | database/sql/10-04-fiscal-ddl.sql               |
| fiscal.yearly_income_aggregate               | 12      | tenant_id, employee_id, year_base                   | 2   | yes | database/sql/10-04-fiscal-ddl.sql               |
| hr.absence_reason                            | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.act_classification                        | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.administrative_process                    | 10      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.administrative_process_function           | 12      | id                                                  | 5   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.agreement                                 | 11      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.bank                                      | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.beneficiary_contact_history               | 7       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.branch                                    | 11      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.business_day                              | 10      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.cadastral_change_request                  | 15      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.career_plan                               | 11      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.cf37_xvi_accumulation_compatibility       | 8       | id                                                  | 0   | no  | database/sql/10-05-hr-ddl.sql                   |
| hr.company                                   | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.competence_period                         | 12      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.consignment_entity                        | 11      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.consignment_import_job                    | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.contract_type                             | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.contribution_time_certificate             | 12      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.cost_center                               | 8       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.education_institution                     | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee                                  | 47      | id                                                  | 15  | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_alimony                          | 27      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_alimony_history                  | 7       | history_id                                          | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_bank_account                     | 17      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_bank_account_history             | 7       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_benefit_dependent                | 14      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_complement_data                  | 11      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_dependent                        | 12      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_exercise                         | 12      | id                                                  | 5   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_frequency                        | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_payroll_item_import_job          | 10      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_status_history                   | 10      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_transfer                         | 21      | id                                                  | 12  | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_transit_benefit                  | 11      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employee_union_contribution               | 12      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employment_contract                       | 14      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.employment_link                           | 14      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.external_life_proof                       | 7       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.file_export_job                           | 10      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.function_nature                           | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.functional_status                         | 11      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.health_exam_provider_exam_link            | 10      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.health_provider_agreement_link            | 10      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.internship_program                        | 11      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.internship_record                         | 25      | id                                                  | 6   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.job_function                              | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.job_function_legislation_history          | 12      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.job_position                              | 16      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.job_structure_employment_link             | 11      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.job_structure_reference_link              | 12      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.leave_record                              | 16      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.legal_nature                              | 8       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.legal_responsible                         | 11      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.legislation                               | 11      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.medical_appointment                       | 14      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.medical_leave                             | 17      | id                                                  | 5   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.medical_record                            | 26      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.merit_progression                         | 20      | id                                                  | 8   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.organic_definition                        | 15      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.pension_compensation                      | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.pension_grant                             | 17      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.performance_evaluation                    | 16      | id                                                  | 6   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.previdentiary_declaration                 | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.probation_evaluation                      | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.professional_experience                   | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.reason                                    | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recertification_beneficiary               | 9       | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recertification_campaign                  | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recertification_record                    | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recruitment_candidate                     | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recruitment_request                       | 13      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.recruitment_request_function              | 10      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.reference_catalog_entry                   | 10      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.reintegration_order                       | 13      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.retirement_grant                          | 12      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.retirement_rule                           | 11      | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.retirement_simulation                     | 8       | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_level_history                      | 15      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_range                              | 12      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_range_level                        | 15      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_reference                          | 13      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_simulation                         | 9       | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.salary_simulation_adjustment              | 8       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.service_provider                          | 17      | id                                                  | 6   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.service_taker                             | 13      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.service_time_record                       | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.shift                                     | 9       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.shift_day_off                             | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.termination_reason                        | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.training_suggestion                       | 12      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.training_suggestion_complement            | 11      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.training_suggestion_cost                  | 10      | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.training_suggestion_employee              | 8       | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.transit_benefit                           | 8       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.tsv_contract                              | 15      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.tsv_contract_change                       | 9       | id                                                  | 2   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.union_entity                              | 8       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.vacation_record                           | 17      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.vacation_type                             | 7       | id                                                  | 1   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.work_accident                             | 10      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.work_location                             | 13      | id                                                  | 3   | yes | database/sql/10-05-hr-ddl.sql                   |
| hr.work_location_structure_assignment        | 11      | id                                                  | 4   | yes | database/sql/10-05-hr-ddl.sql                   |
| lgpd.data_subject_request                    | 15      | id                                                  | 4   | yes | database/sql/10-14-lgpd-ddl.sql                 |
| lgpd.international_transfer                  | 27      | id                                                  | 3   | yes | database/sql/18-lgpd-international-transfer.sql |
| lgpd.international_transfer_country_adequacy | 7       | country_code                                        | 0   | no  | database/sql/18-lgpd-international-transfer.sql |
| lgpd.international_transfer_event            | 13      | id                                                  | 2   | yes | database/sql/18-lgpd-international-transfer.sql |
| lgpd.legal_basis_rule                        | 22      | id                                                  | 0   | no  | database/sql/10-14-lgpd-ddl.sql                 |
| lgpd.public_power_treatment                  | 14      | id                                                  | 4   | yes | database/sql/10-14-lgpd-ddl.sql                 |
| lgpd.ropa_entry                              | 15      | id                                                  | 3   | yes | database/sql/10-14-lgpd-ddl.sql                 |
| lgpd.security_incident                       | 34      | id                                                  | 4   | yes | database/sql/10-14-lgpd-ddl.sql                 |
| payment.consignment_entity                   | 12      | tenant_id, consignment_entity_id                    | 1   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.consignment_loan                     | 17      | tenant_id, loan_id                                  | 5   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.consignment_portability_detail       | 17      | tenant_id, file_id, sequence                        | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.consignment_portability_file         | 10      | tenant_id, file_id                                  | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.dirf_payment_source                  | 14      | tenant_id, id                                       | 1   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_account                         | 9       | tenant_id, fgts_account_id                          | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_caixa_adapter                   | 8       | id                                                  | 1   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_grf                             | 9       | id                                                  | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_grrf                            | 10      | id                                                  | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_movement                        | 11      | tenant_id, fgts_movement_id                         | 3   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.fgts_remittance                      | 17      | id                                                  | 1   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.pis_pasep_base_year                  | 7       | tenant_id, employee_id, year_base                   | 2   | yes | database/sql/10-03-payment-ddl.sql              |
| payment.prior_notice                         | 8       | tenant_id, employment_link_id                       | 2   | yes | database/sql/10-03-payment-ddl.sql              |
| payroll_calc.formula_cache                   | 5       | tenant_id, earning_deduction_id, version            | 2   | yes | database/sql/10-06-payroll_calc-ddl.sql         |
| payroll.accounting_account                   | 15      | id                                                  | 6   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.accounting_account_work_location     | 3       | accounting_account_id, work_location_id             | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.accounting_history                   | 7       | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.advance_payment                      | 11      | id                                                  | 4   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.advance_request                      | 12      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.blocked_payment                      | 12      | id                                                  | 6   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.company_bank_account                 | 21      | id                                                  | 1   | yes | database/sql/10-15-payroll-bank-config-ddl.sql  |
| payroll.employee_payroll_item                | 17      | id                                                  | 4   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.employment_link_earning              | 11      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.formula_attribute                    | 15      | id                                                  | 2   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.gps_payment_code                     | 7       | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.job_function_earning                 | 14      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.job_position_earning                 | 12      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payment_remittance_detail            | 16      | id                                                  | 4   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payment_remittance_file              | 21      | id                                                  | 6   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payment_return_detail                | 10      | return_detail_id                                    | 4   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payment_return_file                  | 11      | return_file_id                                      | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_earning_deduction            | 23      | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_financial_record             | 15      | id, competence                                      | 6   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_run                          | 17      | id                                                  | 5   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_run_status_history           | 8       | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_run_work_location            | 10      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_type                         | 7       | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.payroll_type_earning                 | 11      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.processing_type                      | 9       | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.professional_category_earning        | 14      | id                                                  | 3   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.sefip_code                           | 8       | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| payroll.simple_account                       | 7       | id                                                  | 1   | yes | database/sql/10-07-payroll-ddl.sql              |
| ponto.absence_justification                  | 16      | absence_justification_id                            | 6   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.afd_export                             | 14      | afd_export_id                                       | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.afd_import                             | 12      | afd_import_id                                       | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.afd_import_line                        | 12      | afd_import_id, line_no                              | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.biometric_consent                      | 8       | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.biometric_match                        | 11      | id                                                  | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.day_schedule                           | 11      | day_schedule_id                                     | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.duty_roster                            | 8       | duty_roster_id                                      | 1   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.duty_roster_entry                      | 11      | duty_roster_id, employee_id, work_date              | 3   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.employee_biometric_template            | 11      | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.employee_face_template                 | 11      | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.employee_schedule_assignment           | 8       | assignment_id                                       | 3   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.face_consent                           | 8       | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.face_match                             | 11      | id                                                  | 3   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.face_threshold_config                  | 4       | tenant_id                                           | 1   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.hour_bank                              | 10      | hour_bank_id                                        | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.hour_bank_movement                     | 10      | hour_bank_movement_id                               | 5   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.mobile_clock_in_attempt                | 13      | id                                                  | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.mobile_device_registration             | 10      | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.mobile_geolocation_consent             | 8       | id                                                  | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.payroll_bridge_event                   | 7       | payroll_bridge_event_id                             | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.rep_device                             | 12      | rep_device_id                                       | 1   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.rep_ingestion_batch                    | 13      | batch_id                                            | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.rep_ingestion_line                     | 11      | batch_id, line_no                                   | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.shift_assignment                       | 9       | shift_assignment_id                                 | 3   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.shift_pattern                          | 8       | shift_pattern_id                                    | 1   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.shift_pattern_day                      | 11      | shift_pattern_id, day_index                         | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.time_record                            | 10      | time_record_id, recorded_at                         | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.time_record_identity                   | 6       | time_record_id                                      | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.time_record_justification_link         | 4       | tenant_id, time_record_id, absence_justification_id | 4   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.timesheet_period                       | 13      | timesheet_period_id                                 | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.work_schedule                          | 11      | work_schedule_id                                    | 1   | yes | database/sql/10-08-ponto-ddl.sql                |
| ponto.work_shift                             | 7       | work_shift_id                                       | 2   | yes | database/sql/10-08-ponto-ddl.sql                |
| public_data.lai_request                      | 16      | id                                                  | 1   | yes | database/sql/10-09-public_data-ddl.sql          |
| public_data.lai_request_event                | 9       | id                                                  | 2   | yes | database/sql/10-09-public_data-ddl.sql          |
| public_data.transparency_access_log          | 8       | id                                                  | 1   | yes | database/sql/10-09-public_data-ddl.sql          |
| public_data.transparency_payroll_snapshot    | 11      | tenant_id, competence, employee_public_id           | 1   | yes | database/sql/10-09-public_data-ddl.sql          |
| public_data.transparency_publish_event       | 7       | id                                                  | 2   | yes | database/sql/10-09-public_data-ddl.sql          |
| public.access_profile                        | 8       | id                                                  | 1   | yes | database/sql/10-10-public-ddl.sql               |
| public.audit_event                           | 15      | id, occurred_at                                     | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.document_attachment                   | 14      | id                                                  | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.document_download_audit               | 7       | id                                                  | 3   | yes | database/sql/10-10-public-ddl.sql               |
| public.document_request                      | 13      | id                                                  | 3   | yes | database/sql/19-portal-document-requests.sql    |
| public.document_type                         | 7       | id                                                  | 1   | yes | database/sql/10-10-public-ddl.sql               |
| public.document_upload_session               | 19      | id                                                  | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.esocial_events                        | 20      | message_id                                          | 1   | yes | database/sql/16-esocial-events.sql              |
| public.generated_report_file                 | 15      | id                                                  | 5   | yes | database/sql/10-10-public-ddl.sql               |
| public.menu_item                             | 12      | id                                                  | 3   | yes | database/sql/10-10-public-ddl.sql               |
| public.notification                          | 9       | id                                                  | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.payslip_batch                         | 11      | batch_id                                            | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.permission                            | 9       | id                                                  | 0   | no  | database/sql/10-10-public-ddl.sql               |
| public.profile_assignment                    | 7       | id                                                  | 3   | yes | database/sql/10-10-public-ddl.sql               |
| public.profile_permission                    | 5       | id                                                  | 2   | no  | database/sql/10-10-public-ddl.sql               |
| public.report_definition                     | 9       | id                                                  | 1   | yes | database/sql/10-10-public-ddl.sql               |
| public.report_request                        | 14      | id                                                  | 6   | yes | database/sql/10-10-public-ddl.sql               |
| public.system_parameter                      | 9       | id                                                  | 2   | yes | database/sql/10-10-public-ddl.sql               |
| public.tax_rate                              | 20      | id                                                  | 1   | yes | database/sql/10-10-public-ddl.sql               |
| public.tenant                                | 9       | id                                                  | 0   | no  | database/sql/10-10-public-ddl.sql               |
| public.user_account                          | 14      | id                                                  | 1   | yes | database/sql/10-10-public-ddl.sql               |
| public.user_group_snapshot                   | 8       | id                                                  | 2   | yes | database/sql/10-10-public-ddl.sql               |
| recrutamento.banca_membro                    | 11      | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.biometric_consent               | 7       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.biometric_match_attempt         | 9       | tenant_id, id                                       | 2   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.candidate_biometric             | 11      | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.candidato                       | 16      | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.classificacao_item              | 11      | tenant_id, snapshot_id, vaga_id, inscricao_id       | 3   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.classificacao_snapshot          | 6       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.concurso                        | 8       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.convocacao                      | 6       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.document_signature              | 9       | tenant_id, id                                       | 2   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.edital                          | 10      | tenant_id, concurso_id, version                     | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.gabarito                        | 7       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.inscricao                       | 12      | tenant_id, id                                       | 4   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.nomeacao                        | 12      | tenant_id, id                                       | 4   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.nota                            | 7       | tenant_id, id                                       | 2   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.online_exam_session             | 12      | tenant_id, id                                       | 2   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.payment_charge                  | 8       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.posse                           | 12      | tenant_id, id                                       | 3   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.proctoring_artifact             | 7       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.proctoring_event                | 9       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.prova                           | 10      | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.questao                         | 6       | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.recurso                         | 10      | tenant_id, id                                       | 3   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.resposta_candidato              | 9       | tenant_id, id                                       | 3   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.signed_document                 | 12      | tenant_id, id                                       | 1   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| recrutamento.vaga                            | 10      | tenant_id, concurso_id, position_id                 | 3   | yes | database/sql/10-11-recrutamento-ddl.sql         |
| saude.aso_attachment                         | 9       | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.aso_exam_item                          | 7       | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.aso_record                             | 15      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.cat_emission                           | 13      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.cipa_committee                         | 10      | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.cipa_member                            | 11      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.cipa_minute                            | 10      | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.environmental_exposure                 | 15      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.epi_delivery                           | 11      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.epi_inventory                          | 8       | id                                                  | 1   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.health_program                         | 11      | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.medical_exam                           | 11      | id                                                  | 1   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.pcmso_required_exam                    | 8       | id                                                  | 4   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.ppp_record                             | 7       | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.program_revision                       | 10      | id                                                  | 1   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.risk_management_program                | 10      | id                                                  | 3   | yes | database/sql/10-12-saude-ddl.sql                |
| saude.work_accident                          | 14      | id                                                  | 2   | yes | database/sql/10-12-saude-ddl.sql                |
| tce.adapter_circuit_state                    | 9       | id                                                  | 0   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.adapter_lifecycle_event                  | 5       | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.adapter_registry                         | 11      | id                                                  | 0   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.layout_field                             | 13      | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.layout_version                           | 11      | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.state                                    | 10      | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.submission                               | 18      | id                                                  | 2   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.submission_attempt                       | 8       | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |
| tce.submission_queue                         | 15      | id                                                  | 1   | yes | database/sql/10-13-tce-ddl.sql                  |

## Indexes

| Index                                                      | Table                                    | Unique | Columns                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| absence_justification_employee_idx                         | ponto.absence_justification              | no     | tenant_id, employee_id, absence_start                                                   |
| absence_justification_status_idx                           | ponto.absence_justification              | no     | tenant_id, status, absence_start                                                        |
| absence_reason_code_key                                    | hr.absence_reason                        | yes    | tenant_id, code                                                                         |
| absence_reason_status_idx                                  | hr.absence_reason                        | no     | status                                                                                  |
| access_profile_code_key                                    | public.access_profile                    | yes    | tenant_id, code                                                                         |
| access_profile_status_idx                                  | public.access_profile                    | no     | status                                                                                  |
| access_profile_tenant_code_idx                             | public.access_profile                    | no     | tenant_id, code                                                                         |
| accounting_account_accounting_history_id_idx               | payroll.accounting_account               | no     | accounting_history_id                                                                   |
| accounting_account_branch_id_idx                           | payroll.accounting_account               | no     | branch_id                                                                               |
| accounting_account_cost_center_id_idx                      | payroll.accounting_account               | no     | cost_center_id                                                                          |
| accounting_account_earning_deduction_id_idx                | payroll.accounting_account               | no     | earning_deduction_id                                                                    |
| accounting_account_simple_account_id_idx                   | payroll.accounting_account               | no     | simple_account_id                                                                       |
| accounting_account_status_idx                              | payroll.accounting_account               | no     | status                                                                                  |
| accounting_account_work_location_work_location_id_idx      | payroll.accounting_account_work_location | no     | work_location_id                                                                        |
| accounting_history_status_idx                              | payroll.accounting_history               | no     | status                                                                                  |
| accounting_history_tenant_code_key                         | payroll.accounting_history               | yes    | tenant_id, code                                                                         |
| act_classification_code_key                                | hr.act_classification                    | yes    | tenant_id, code                                                                         |
| act_classification_status_idx                              | hr.act_classification                    | no     | status                                                                                  |
| adapter_lifecycle_event_adapter_time_idx                   | tce.adapter_lifecycle_event              | no     | adapter_id, occurred_at                                                                 |
| adapter_registry_state_organ_idx                           | tce.adapter_registry                     | no     | state_code, organ_kind, status                                                          |
| administrative_process_filed_on_idx                        | hr.administrative_process                | no     | filed_on                                                                                |
| administrative_process_function_branch_id_idx              | hr.administrative_process_function       | no     | branch_id                                                                               |
| administrative_process_function_job_function_id_idx        | hr.administrative_process_function       | no     | job_function_id                                                                         |
| administrative_process_function_process_id_assigned_on_idx | hr.administrative_process_function       | no     | process_id, assigned_on                                                                 |
| administrative_process_function_status_idx                 | hr.administrative_process_function       | no     | status                                                                                  |
| administrative_process_function_work_location_id_idx       | hr.administrative_process_function       | no     | work_location_id                                                                        |
| administrative_process_status_idx                          | hr.administrative_process                | no     | status                                                                                  |
| administrative_process_tenant_process_number_key           | hr.administrative_process                | yes    | tenant_id, process_number                                                               |
| advance_payment_employee_id_payment_date_idx               | payroll.advance_payment                  | no     | employee_id, payment_date                                                               |
| advance_payment_payroll_run_id_idx                         | payroll.advance_payment                  | no     | payroll_run_id                                                                          |
| advance_payment_request_id_idx                             | payroll.advance_payment                  | no     | request_id                                                                              |
| advance_payment_status_idx                                 | payroll.advance_payment                  | no     | status                                                                                  |
| advance_request_employee_id_requested_on_idx               | payroll.advance_request                  | no     | employee_id, requested_on                                                               |
| advance_request_payroll_run_id_idx                         | payroll.advance_request                  | no     | payroll_run_id                                                                          |
| advance_request_status_idx                                 | payroll.advance_request                  | no     | status                                                                                  |
| afd_export_device_period_idx                               | ponto.afd_export                         | no     | tenant_id, rep_device_id, period_start, period_end                                      |
| afd_import_device_imported_idx                             | ponto.afd_import                         | no     | tenant_id, rep_device_id, imported_at                                                   |
| afd_import_line_device_period_idx                          | ponto.afd_import_line                    | no     | tenant_id, rep_device_id, recorded_at, nsr                                              |
| agreement_code_key                                         | hr.agreement                             | yes    | tenant_id, code                                                                         |
| agreement_institution_id_idx                               | hr.agreement                             | no     | institution_id                                                                          |
| agreement_program_id_idx                                   | hr.agreement                             | no     | program_id                                                                              |
| agreement_status_idx                                       | hr.agreement                             | no     | status                                                                                  |
| agreement_tenant_code_idx                                  | hr.agreement                             | no     | tenant_id, code                                                                         |
| aso_attachment_record_idx                                  | saude.aso_attachment                     | no     | tenant_id, aso_record_id                                                                |
| aso_exam_item_record_idx                                   | saude.aso_exam_item                      | no     | tenant_id, aso_record_id                                                                |
| aso_record_employee_due_idx                                | saude.aso_record                         | no     | tenant_id, employee_id, next_exam_due_at                                                |
| aso_record_s2220_missing_idx                               | saude.aso_record                         | no     | tenant_id, status, s2220_spool_message_id) WHERE (status = 'ARCHIVED'::saude.aso_status |
| aso_record_status_due_idx                                  | saude.aso_record                         | no     | tenant_id, status, next_exam_due_at                                                     |
| audit_event_actor_login_idx                                | public.audit_event                       | no     | actor_login                                                                             |
| audit_event_actor_user_id_occurred_at_idx                  | public.audit_event                       | no     | actor_user_id, occurred_at                                                              |
| audit_event_metadata_gin_idx                               | public.audit_event                       | no     | metadata                                                                                |
| audit_event_occurred_at_idx                                | public.audit_event                       | no     | occurred_at                                                                             |
| audit_event_request_id_idx                                 | public.audit_event                       | no     | request_id                                                                              |
| audit_event_resource_type_resource_id_idx                  | public.audit_event                       | no     | resource_type, resource_id                                                              |
| audit_event_tenant_occurred_at_idx                         | public.audit_event                       | no     | tenant_id, occurred_at                                                                  |
| banca_membro_concurso_idx                                  | recrutamento.banca_membro                | no     | tenant_id, concurso_id, active                                                          |
| bank_blocked_idx                                           | hr.bank                                  | no     | blocked                                                                                 |
| bank_code_key                                              | hr.bank                                  | yes    | tenant_id, code                                                                         |
| bank_status_idx                                            | hr.bank                                  | no     | status                                                                                  |
| beneficiary_contact_history_tenant_beneficiary_idx         | hr.beneficiary_contact_history           | no     | tenant_id, beneficiary_id, contacted_on                                                 |
| biometric_consent_active_idx                               | recrutamento.biometric_consent           | no     | tenant_id, candidato_id, consent_at ) WHERE (withdrawn_at IS NULL                       |
| biometric_consent_employee_idx                             | ponto.biometric_consent                  | no     | tenant_id, employee_id, consent_at ) WHERE (withdrawn_at IS NULL                        |
| biometric_match_attempt_candidate_idx                      | recrutamento.biometric_match_attempt     | no     | tenant_id, candidato_id, occurred_at                                                    |
| biometric_match_employee_idx                               | ponto.biometric_match                    | no     | tenant_id, employee_id, occurred_at                                                     |
| biometric_match_time_record_idx                            | ponto.biometric_match                    | no     | tenant_id, time_record_id                                                               |
| blocked_payment_branch_id_idx                              | payroll.blocked_payment                  | no     | branch_id                                                                               |
| blocked_payment_competence_year_competence_month_idx       | payroll.blocked_payment                  | no     | competence_year, competence_month                                                       |
| blocked_payment_employee_id_idx                            | payroll.blocked_payment                  | no     | employee_id                                                                             |
| blocked_payment_functional_status_id_idx                   | payroll.blocked_payment                  | no     | functional_status_id                                                                    |
| blocked_payment_payroll_run_id_idx                         | payroll.blocked_payment                  | no     | payroll_run_id                                                                          |
| blocked_payment_reason_id_idx                              | payroll.blocked_payment                  | no     | reason_id                                                                               |
| blocked_payment_released_at_idx                            | payroll.blocked_payment                  | no     | released_at                                                                             |
| blocked_payment_tenant_competence_idx                      | payroll.blocked_payment                  | no     | tenant_id, competence_year, competence_month, employee_id                               |
| branch_cnpj_key                                            | hr.branch                                | yes    | tenant_id, cnpj                                                                         |
| branch_code_key                                            | hr.branch                                | yes    | tenant_id, code                                                                         |
| branch_company_id_idx                                      | hr.branch                                | no     | company_id                                                                              |
| branch_status_idx                                          | hr.branch                                | no     | status                                                                                  |
| branch_tenant_code_idx                                     | hr.branch                                | no     | tenant_id, code                                                                         |
| business_day_business_date_idx                             | hr.business_day                          | no     | business_date                                                                           |
| business_day_code_key                                      | hr.business_day                          | yes    | tenant_id, code                                                                         |

## Classification Comments

| Target                                                        | PII | Classification            | Category                     |
| ------------------------------------------------------------- | --- | ------------------------- | ---------------------------- |
| fiscal.dirf_beneficiario.cpf_cnpj                             | yes | tax_identifier            | CPF_CNPJ                     |
| fiscal.dirf_beneficiario.cpf_cnpj_cipher                      | no  | tax_identifier            | -                            |
| fiscal.dirf_beneficiario.name                                 | yes | personal_name             | beneficiary_identity         |
| fiscal.efd_reinf_item.beneficiary_name                        | yes | personal_name             | beneficiary_identity         |
| hr.branch.cnpj                                                | yes | organization_identifier   | CNPJ                         |
| hr.company.cnpj                                               | yes | organization_identifier   | CNPJ                         |
| hr.education_institution.address                              | yes | address                   | address                      |
| hr.education_institution.cnpj                                 | yes | organization_identifier   | CNPJ                         |
| hr.employee_alimony.beneficiary_cpf                           | yes | national_identifier       | CPF                          |
| hr.employee_alimony.beneficiary_cpf_cipher                    | no  | national_identifier       | -                            |
| hr.employee_alimony.beneficiary_name                          | yes | personal_name             | beneficiary_identity         |
| hr.employee_alimony.judge_name                                | yes | personal_name             | judicial_actor               |
| hr.employee_bank_account.account_number                       | yes | banking                   | bank_account                 |
| hr.employee_bank_account.account_number_cipher                | no  | banking                   | -                            |
| hr.employee_bank_account.holder_cpf                           | yes | national_identifier       | CPF                          |
| hr.employee_bank_account.holder_cpf_cipher                    | no  | national_identifier       | -                            |
| hr.employee_benefit_dependent.dependent_cpf                   | yes | national_identifier       | CPF                          |
| hr.employee_benefit_dependent.dependent_cpf_cipher            | no  | national_identifier       | -                            |
| hr.employee_benefit_dependent.dependent_name                  | yes | personal_name             | dependent_identity           |
| hr.employee_complement_data.address                           | yes | address                   | address                      |
| hr.employee_complement_data.emergency_contact                 | yes | contact                   | emergency_contact            |
| hr.employee_complement_data.emergency_contact_cipher          | no  | contact                   | -                            |
| hr.employee_complement_data.pis_pasep                         | yes | social_program_identifier | PIS_PASEP                    |
| hr.employee_complement_data.pis_pasep_cipher                  | no  | social_program_identifier | -                            |
| hr.employee_complement_data.rg                                | yes | national_identifier       | RG                           |
| hr.employee_complement_data.rg_cipher                         | no  | national_identifier       | -                            |
| hr.employee_complement_data.voter_registration                | yes | national_identifier       | voter_registration           |
| hr.employee_complement_data.voter_registration_cipher         | no  | national_identifier       | -                            |
| hr.employee_dependent.birth_date                              | yes | demographic               | birth_date                   |
| hr.employee_dependent.cpf                                     | yes | national_identifier       | CPF                          |
| hr.employee_dependent.cpf_cipher                              | no  | national_identifier       | -                            |
| hr.employee_dependent.name                                    | yes | personal_name             | dependent_identity           |
| hr.employee.address                                           | yes | address                   | address                      |
| hr.employee.bank_account                                      | yes | banking                   | bank_account                 |
| hr.employee.bank_account_cipher                               | no  | banking                   | -                            |
| hr.employee.bank_agency                                       | yes | banking                   | bank_agency                  |
| hr.employee.bank_agency_cipher                                | no  | banking                   | -                            |
| hr.employee.birth_city_code                                   | yes | demographic               | birth_city                   |
| hr.employee.birth_date                                        | yes | demographic               | birth_date                   |
| hr.employee.cpf                                               | yes | national_identifier       | CPF                          |
| hr.employee.cpf_cipher                                        | no  | national_identifier       | -                            |
| hr.employee.email                                             | yes | contact                   | email                        |
| hr.employee.email_cipher                                      | no  | contact                   | -                            |
| hr.employee.father_name                                       | yes | family_name               | parent_name                  |
| hr.employee.mother_name                                       | yes | family_name               | parent_name                  |
| hr.employee.name                                              | yes | personal_name             | identity                     |
| hr.employee.phone                                             | yes | contact                   | phone                        |
| hr.employee.phone_cipher                                      | no  | contact                   | -                            |
| hr.employee.pis_pasep                                         | yes | social_program_identifier | PIS_PASEP                    |
| hr.employee.pis_pasep_cipher                                  | no  | social_program_identifier | -                            |
| hr.employee.rg                                                | yes | national_identifier       | RG                           |
| hr.employee.rg_cipher                                         | no  | national_identifier       | -                            |
| hr.employee.rg_issuer                                         | yes | document_metadata         | RG_issuer                    |
| hr.employee.social_name                                       | yes | personal_name             | identity                     |
| hr.internship_record.intern_cpf                               | yes | national_identifier       | CPF                          |
| hr.internship_record.intern_cpf_cipher                        | no  | national_identifier       | -                            |
| hr.internship_record.intern_name                              | yes | personal_name             | intern_identity              |
| hr.internship_record.supervisor_name                          | yes | personal_name             | supervisor_identity          |
| hr.legal_responsible.cpf                                      | yes | national_identifier       | CPF                          |
| hr.legal_responsible.cpf_cipher                               | no  | national_identifier       | -                            |
| hr.legal_responsible.name                                     | yes | personal_name             | legal_responsible_identity   |
| hr.medical_appointment.contact_phone                          | yes | contact                   | phone                        |
| hr.medical_appointment.contact_phone_cipher                   | no  | contact                   | -                            |
| hr.pension_grant.beneficiary_cpf                              | yes | national_identifier       | CPF                          |
| hr.pension_grant.beneficiary_cpf_cipher                       | no  | national_identifier       | -                            |
| hr.pension_grant.beneficiary_name                             | yes | personal_name             | beneficiary_identity         |
| hr.recruitment_candidate.curriculum_s3_key                    | yes | document_reference        | curriculum                   |
| hr.recruitment_candidate.person_ref                           | yes | pseudonymous_identifier   | recruitment_person_ref       |
| hr.service_provider.address                                   | yes | address                   | address                      |
| hr.service_provider.cpf_cnpj                                  | yes | tax_identifier            | CPF_CNPJ                     |
| hr.service_provider.cpf_cnpj_cipher                           | no  | tax_identifier            | -                            |
| hr.service_provider.email                                     | yes | contact                   | email                        |
| hr.service_provider.email_cipher                              | no  | contact                   | -                            |
| hr.service_provider.name                                      | yes | personal_name             | service_provider_identity    |
| hr.service_provider.phone                                     | yes | contact                   | phone                        |
| hr.service_provider.phone_cipher                              | no  | contact                   | -                            |
| hr.service_taker.address                                      | yes | address                   | address                      |
| hr.service_taker.cnpj                                         | yes | organization_identifier   | CNPJ                         |
| hr.service_taker.contact                                      | yes | representative_contact    | service_taker_contact        |
| hr.union_entity.cnpj                                          | yes | organization_identifier   | CNPJ                         |
| payment.consignment_entity.cnpj                               | yes | organization_identifier   | CNPJ                         |
| payment.dirf_payment_source.beneficiary_name                  | yes | personal_name             | beneficiary_identity         |
| public_data.lai_request.request_text                          | yes | request_free_text         | public_information_request   |
| public_data.lai_request.requester_document_hash               | yes | pseudonymous_identifier   | requester_document_hash      |
| public_data.lai_request.requester_name                        | yes | personal_name             | lai_requester_identity       |
| public_data.transparency_payroll_snapshot.full_name           | yes | personal_name             | public_payroll_identity      |
| public_data.transparency_payroll_snapshot.registration_number | yes | employee_identifier       | public_payroll_registration  |
| public.esocial_events.actor_login                             | yes | login_identifier          | actor_login                  |
| public.esocial_events.actor_sub                               | yes | pseudonymous_identifier   | actor_subject                |
| public.esocial_events.error                                   | yes | operational_error         | esocial_transport_error      |
| public.esocial_events.payload                                 | yes | regulatory_payload        | esocial_message_payload      |
| public.esocial_events.response                                | yes | regulatory_payload        | esocial_message_response     |
| public.esocial_events.source_ref                              | yes | pseudonymous_identifier   | esocial_source_reference     |
| public.user_account.cpf                                       | yes | national_identifier       | CPF                          |
| public.user_account.cpf_cipher                                | no  | national_identifier       | -                            |
| public.user_account.email                                     | yes | contact                   | email                        |
| public.user_account.email_cipher                              | no  | contact                   | -                            |
| public.user_account.name                                      | yes | personal_name             | user_identity                |
| recrutamento.banca_membro.cpf                                 | yes | national_identifier       | CPF                          |
| recrutamento.banca_membro.cpf_cipher                          | no  | national_identifier       | -                            |
| recrutamento.banca_membro.full_name                           | yes | personal_name             | selection_board_identity     |
| recrutamento.candidato.address                                | yes | address                   | address                      |
| recrutamento.candidato.birth_date                             | yes | demographic               | birth_date                   |
| recrutamento.candidato.cpf                                    | yes | national_identifier       | CPF                          |
| recrutamento.candidato.cpf_cipher                             | no  | national_identifier       | -                            |
| recrutamento.candidato.curriculum_s3_key                      | yes | document_reference        | curriculum                   |
| recrutamento.candidato.email                                  | yes | contact                   | email                        |
| recrutamento.candidato.email_cipher                           | no  | contact                   | -                            |
| recrutamento.candidato.full_name                              | yes | personal_name             | candidate_identity           |
| recrutamento.candidato.phone                                  | yes | contact                   | phone                        |
| recrutamento.candidato.phone_cipher                           | no  | contact                   | -                            |
| recrutamento.candidato.profile_summary                        | yes | profile                   | talent_pool                  |
| recrutamento.candidato.skills                                 | yes | profile                   | talent_pool                  |
| saude.aso_record.doctor_crm                                   | yes | professional_identifier   | CRM                          |
| saude.aso_record.doctor_name                                  | yes | personal_name             | health_professional_identity |
| saude.cat_emission.doctor_crm                                 | yes | professional_identifier   | CRM                          |
| saude.cat_emission.doctor_name                                | yes | personal_name             | health_professional_identity |
| saude.health_program.responsible_doctor_crm                   | yes | professional_identifier   | CRM                          |
| saude.health_program.responsible_doctor_name                  | yes | personal_name             | health_professional_identity |

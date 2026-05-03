# LGPD legal-basis registry per data flow

**Status:** Accepted for v0.0.1 R2-40.
**Law source:** Lei 13.709/2018 (LGPD), especially Art. 7 for ordinary personal data and Art. 11 for sensitive personal data.
**Canonical rule table:** `lgpd.legal_basis_rule`.
**Backend enforcement point:** `LgpdLegalBasisService.assertPiiReadAllowed(flowKey)` is called before report-service PII reads for payslips and yearly income; further R2 waves must reuse the same service instead of inventing parallel registries.

This file is not ROPA. R2-39 must derive operation records from this registry and add operation owners, processor/receiver details, risk classification, and lifecycle evidence.

## Decision Model

Each data flow has one stable `flow_key`, one ordinary-data basis from LGPD Art. 7, and, when the flow includes sensitive data, one Art. 11 basis. Consent is recorded only where the product flow needs highlighted operational evidence; it is not used as the default basis for statutory HR, payroll, fiscal, health, or regulator reporting duties of a public controller.

Sensitive or mixed flows set `requires_dpia = true` as a planning flag for R2-39/R2-41 governance evidence. This flag does not itself implement RCIS, ROPA, or titular-rights workflows.

## Data-Flow Registry

| ADR          | flow_key                                | Flow                                            | Data category | Ordinary basis | Sensitive basis | Consent evidence | Backend/current surface                                                            |
| ------------ | --------------------------------------- | ----------------------------------------------- | ------------- | -------------- | --------------- | ---------------- | ---------------------------------------------------------------------------------- |
| ADR-LGPD-001 | `payroll.payslip_pdf`                   | Contracheque oficial PDF/A                      | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | `report-service/payslip` calls legal-basis service before source PII read          |
| ADR-LGPD-002 | `fiscal.yearly_income_pdf`              | Comprovante anual de rendimentos e IRRF         | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | `report-service/yearly-income` calls legal-basis service before aggregate PII read |
| ADR-LGPD-003 | `time.attendance_register`              | Registro de jornada e banco de horas            | Personal      | Art. 7, II     | n/a             | No               | Ponto services must bind reads to this key when R2-39 instruments ROPA             |
| ADR-LGPD-004 | `time.biometric_clock`                  | Biometria para controle de ponto                | Sensitive     | Art. 7, II     | Art. 11, II, a  | Yes              | Existing ponto biometric/face consent services remain flow evidence                |
| ADR-LGPD-005 | `recruitment.public_application`        | Inscricao publica em concurso/processo seletivo | Mixed         | Art. 7, V      | Art. 11, II, d  | Yes              | Existing public inscription consent remains flow evidence                          |
| ADR-LGPD-006 | `recruitment.online_exam_proctoring`    | Proctoring e biometria em prova online          | Sensitive     | Art. 7, VI     | Art. 11, II, d  | Yes              | Existing prova-online LGPD exclusion/consent tests remain flow evidence            |
| ADR-LGPD-007 | `health.medical_record`                 | Prontuario, ASO e PCMSO/PGR                     | Sensitive     | Art. 7, II     | Art. 11, II, f  | No               | Saude/pericia reads must bind to this key before ROPA closure                      |
| ADR-LGPD-008 | `regulatory.esocial_reporting`          | eSocial, DCTFWeb, DIRF/Reinf e TCE              | Mixed         | Art. 7, II     | Art. 11, II, a  | No               | Worker/regulatory submissions must bind to this key before ROPA closure            |
| ADR-LGPD-009 | `transparency.remuneration_publication` | Transparencia ativa de remuneracao              | Personal      | Art. 7, III    | n/a             | No               | Transparency output keeps minimization with `employee_public_id`                   |

## ADR-LGPD-001: Contracheque oficial PDF/A

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Payslip generation is a statutory payroll and employment-administration obligation. The flow reads CPF, bank information, functional identity, earnings, deductions, and tax/social-security bases. Consent is inappropriate as the primary basis because the controller must issue and retain the official demonstrative independently of optional employee consent.

**Rule table mapping.** `payroll.payslip_pdf` covers `hr.employee`, `payroll.payroll_run`, `payroll.payroll_financial_record`, `payroll.v_payroll_run_line_active`, and `public.generated_report_file`.

## ADR-LGPD-002: Comprovante anual de rendimentos e IRRF

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Annual income certificates support tax compliance and delivery to the beneficiary. The flow reads CPF, income, withholding, and dependent totals. Consent is not the legal basis because fiscal issuance and retention are legal/regulatory duties.

**Rule table mapping.** `fiscal.yearly_income_pdf` covers `fiscal.v_yearly_income`, `fiscal.yearly_income_aggregate`, and `public.generated_report_file`.

## ADR-LGPD-003: Registro de jornada e banco de horas

**Decision.** Use LGPD Art. 7, II.

**Rationale.** Attendance recording, AFDT/ACJEF formation, payroll integration, and auditability are employment and statutory-control obligations. Ordinary attendance data does not require Art. 11 unless biometric or health data enters the flow.

**Rule table mapping.** `time.attendance_register` covers `ponto.time_record`, `ponto.mobile_clock_in_attempt`, and `hr.employee`.

## ADR-LGPD-004: Biometria para controle de ponto

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a; keep highlighted consent/acknowledgement as operational evidence, not as the sole legal basis.

**Rationale.** Biometric templates are sensitive personal data. In this product context they serve authenticity of statutory time records. Consent evidence remains necessary for transparency and product control, but the statutory attendance obligation is the primary basis.

**Rule table mapping.** `time.biometric_clock` covers biometric template, face template, match, and consent tables under `ponto`.

## ADR-LGPD-005: Inscricao publica em concurso/processo seletivo

**Decision.** Use LGPD Art. 7, V for ordinary application data and Art. 11, II, d for quota/sensitive declarations used in administrative selection proceedings.

**Rationale.** The candidate initiates the application and asks for preliminary selection procedures. When quota declarations or other sensitive evidence are processed, the controller must preserve the administrative record and exercise/defend regular rights during the certame.

**Rule table mapping.** `recruitment.public_application` covers candidate, inscription, and payment-charge tables under `recrutamento`.

## ADR-LGPD-006: Proctoring e biometria em prova online

**Decision.** Use LGPD Art. 7, VI and Art. 11, II, d.

**Rationale.** Online exam artifacts exist to prevent fraud, audit the administrative competition, and support appeals. Deletion requests before the end of appeal/control deadlines must be handled by R2-43 policy and cannot remove evidence still needed for the administrative process.

**Rule table mapping.** `recruitment.online_exam_proctoring` covers online exam session, artifact, and biometric-template records.

## ADR-LGPD-007: Prontuario, ASO e PCMSO/PGR

**Decision.** Use LGPD Art. 7, II and Art. 11, II, f.

**Rationale.** Occupational health records are sensitive health data. Processing is tied to legal workplace-health obligations and performed by health professionals/services or under sanitary/occupational-health authority constraints.

**Rule table mapping.** `health.medical_record` covers health/pericia, ASO, medical leave, and work-accident tables.

## ADR-LGPD-008: eSocial, DCTFWeb, DIRF/Reinf e TCE

**Decision.** Use LGPD Art. 7, II and Art. 11, II, a.

**Rationale.** Regulatory transmissions are mandatory government reporting. They may include payroll, tax, functional, and SST facts, including sensitive data in specific official layouts.

**Rule table mapping.** `regulatory.esocial_reporting` covers generated eSocial events, fiscal debits, payroll financial records, and employee identifiers used by worker/regulatory adapters.

## ADR-LGPD-009: Transparencia ativa de remuneracao

**Decision.** Use LGPD Art. 7, III.

**Rationale.** Remuneration transparency is a public-policy/public-administration disclosure flow. It must keep minimization: publish public identifiers and remuneration aggregates without exposing CPF or private bank/contact fields.

**Rule table mapping.** `transparency.remuneration_publication` covers transparency snapshots and minimized employee references.

## R2 Follow-ups

- R2-39 creates tenant ROPA entries in `lgpd.ropa_entry`, exposed at `/api/v1/admin/lgpd/ropa`, referencing `lgpd.legal_basis_rule.flow_key` without duplicating legal-basis text in a second registry. See `docs/eng/lgpd/ropa.md`.
- R2-41 uses `requires_dpia`, `data_category`, and `sharing_scope` as classification inputs for RCIS triage while keeping incident workflow and deadlines in `lgpd.security_incident`. See `docs/eng/lgpd/rcis.md`.
- R2-43 creates tenant Art. 18 request tickets in `lgpd.data_subject_request`, exposed at `POST /api/portal/v1/lgpd/direitos`, referencing an active `lgpd.ropa_entry` and snapshotting this registry's retention/sharing rules without duplicating legal-basis text. See `docs/eng/lgpd/titular-rights.md`.

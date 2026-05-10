# Promise vs Delivery

Round: 11

| Metric  | Count |
| ------- | ----- |
| checked | 10    |
| failed  | 0     |

| FR-ID         | Status | Result | Notes                                                                                                                                                                                                                                                                                        |
| ------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-FI-93690B  | DONE   | ok     | DCTFWeb generation and sandbox transmission preserve accepted S-5011, S-5012, S-5013, EFD-Reinf R-9015, MIT internal XML, CSLL adicional separation, tenant RLS, and mutation audit evidence inside the SGP boundary.                                                                        |
| FR-FI-26241D  | DONE   | ok     | SGP-owned R-4000 sandbox contract path covers deterministic R-4010/R-4020/R-4040/R-4080/R-4099 builders, tenant-scoped item persistence, and R-9015 DCTFWeb handoff                                                                                                                          |
| FR-FI-1F136F  | DONE   | ok     | SIAFIC neutral JSON sync is accepted inside the SGP boundary and official layout/homologation is downstream by owner decision.                                                                                                                                                               |
| FR-PR-E68857  | DONE   | ok     | Published concursos expose public no-JWT registration and token follow-up while administrative concurso creation remains permission-protected, invalid slugs and requirements are rejected, and the payment boundary remains the existing abstract gateway.                                  |
| FR-PR-BE041B  | DONE   | ok     | Public registration requires explicit LGPD consent, persists the consent version, accepts only explicit affirmative quota declarations, rejects missing consent and invalid quota payloads, and scopes public lookup to the matching inscricao id plus token hash.                           |
| FR-PT-1244A7  | DONE   | ok     | Public DPO contact, protected DPO designation lifecycle, authenticated portal DSAR submission, protected operator DSAR lifecycle, SLA tracking, tenant RLS posture, mutation audit, and redacted operator envelopes are implemented without adding a new public route family or RBAC string. |
| FR-PT-42F0B5  | DONE   | ok     | RCIS incidents resolve active ROPA/legal-basis evidence, cover triage, risk, ANPD timers, reporting, complementation, closure, audit metadata, and structured-log minimization without public notification or ANPD submission behavior.                                                      |
| FR-PT-64E409  | DONE   | ok     | ROPA CRUD and audit coverage now proves active legal-basis linkage for payroll, recruitment, time, and regulatory flows with tenant-scoped protected administration and no duplicate legal-basis registry.                                                                                   |
| FR-TAS-383663 | DONE   | ok     | PONTO base preserves tenant-scoped schedules, append-only hashed time records, REP-P/REP-A/REP-C source fields, RLS policies, and audit triggers needed by Portaria 671 export/import primitives.                                                                                            |
| FR-TAS-CBF51F | DONE   | ok     | AFD import/export now has deterministic fixed-width golden coverage, trailer hash rejection, REP-P/REP-A/REP-C field preservation, persisted export/import metadata, tenant/RLS proof, audit triggers, and explicit AFDT/ACJEF scope.                                                        |

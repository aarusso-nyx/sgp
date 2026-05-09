# SGP-Only B Closure Proof

Status date: 2026-05-09

This retained audit note closes only the feature-audit rows where `Owner=SGP`
and `Presence=B` in `docs/work/feature-audit/05-feature-matrix.md`. Rows owned
by `SGP+stynx-admin`, `SGP+stynx-esocial`, `SGP+stynx-det`, and
`SGP+stynx-framework` are intentionally unchanged.

## Scope

| Track               |   Rows | Result                                                                      |
| ------------------- | -----: | --------------------------------------------------------------------------- |
| Evidence promotion  |     16 | Promoted from `B` to `P` from retained source/test evidence.                |
| Recent Wave refresh |      3 | Promoted from `B` to `P` from portal self-service and approval evidence.    |
| Hardening closure   |      2 | Promoted from `B` to `P` after logging-redaction and ICP certificate proof. |
| **Total**           | **21** | **All SGP-only B rows in this slice are now `P`.**                          |

## Closure Ledger

| ID   | Before | After | Evidence                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D.22 | B      | P     | `backend/src/ponto/payroll-bridge/payroll-bridge.controller.ts`; `frontend/src/app/features/ponto/folha/ponto-folha.ts`; `tests/backend/ponto-payroll-bridge-idempotency.e2e-spec.ts`                                                                                                                                                                                              |
| E.05 | B      | P     | `backend/src/ponto/hour-bank/hour-bank.controller.ts`; `frontend/src/app/features/ponto/banco-horas/ponto-banco-horas.ts`; `tests/backend/ponto-hour-bank-cenarios.e2e-spec.ts`                                                                                                                                                                                                    |
| E.10 | B      | P     | `backend/src/ponto/hour-bank/hour-bank.controller.ts`; `frontend/src/app/features/ponto/banco-horas/ponto-banco-horas.ts`; `tests/backend/ponto-hour-bank-cenarios.e2e-spec.ts`                                                                                                                                                                                                    |
| F.02 | B      | P     | `backend/src/rh/workflows/vacation/vacation.controller.ts`; `frontend/src/app/features/rh/ferias/ferias.ts`; `tests/backend/vacation.e2e-spec.ts`                                                                                                                                                                                                                                  |
| F.03 | B      | P     | `backend/src/rh/workflows/vacation/vacation.service.ts`; `frontend/src/app/features/rh/ferias/ferias.ts`; `tests/backend/calc-ferias.e2e-spec.ts`                                                                                                                                                                                                                                  |
| F.04 | B      | P     | `backend/src/rh/workflows/vacation/vacation.controller.ts`; `frontend/src/app/features/rh/ferias/ferias.ts`; `tests/backend/vacation.e2e-spec.ts`                                                                                                                                                                                                                                  |
| F.08 | B      | P     | `backend/src/rh/workflows/vacation/vacation.controller.ts`; `frontend/src/app/features/rh/ferias/ferias.ts`; `tests/backend/vacation.e2e-spec.ts`                                                                                                                                                                                                                                  |
| G.03 | B      | P     | `backend/src/rh/workflows/leaves/leaves.controller.ts`; `frontend/src/app/features/rh/licencas/licencas.ts`; `tests/backend/leaves.e2e-spec.ts`                                                                                                                                                                                                                                    |
| G.05 | B      | P     | `backend/src/rh/workflows/leaves/leaves.controller.ts`; `frontend/src/app/features/rh/licencas/licencas.ts`; `tests/backend/leaves.e2e-spec.ts`                                                                                                                                                                                                                                    |
| G.06 | B      | P     | `backend/src/rh/workflows/leaves/leaves.controller.ts`; `frontend/src/app/features/rh/licencas/licencas.ts`; `tests/backend/leaves.e2e-spec.ts`                                                                                                                                                                                                                                    |
| G.07 | B      | P     | `backend/src/rh/workflows/leaves/leaves.controller.ts`; `frontend/src/app/features/rh/licencas/licencas.ts`; `tests/backend/leaves.e2e-spec.ts`                                                                                                                                                                                                                                    |
| G.08 | B      | P     | `backend/src/rh/workflows/leaves/leaves.controller.ts`; `frontend/src/app/features/rh/licencas/licencas.ts`; `tests/backend/leaves.e2e-spec.ts`                                                                                                                                                                                                                                    |
| I.03 | B      | P     | `backend/src/avaliacao/progression/progression.controller.ts`; `frontend/src/app/features/avaliacao/progressoes/progressoes.ts`; `tests/backend/progression.e2e-spec.ts`                                                                                                                                                                                                           |
| K.12 | B      | P     | `backend/src/folha-pagamento/fgts/fgts.controller.ts`; `frontend/src/app/features/folha-pagamento/fgts/fgts.ts`; `tests/backend/bank-fgts-grrf.e2e-spec.ts`                                                                                                                                                                                                                        |
| P.06 | B      | P     | `backend/src/ponto/biometria/consent.service.ts`; `backend/src/recrutamento/biometria/consent.service.ts`; `frontend/src/app/features/ponto/biometria/ponto-biometria.ts`; `tests/backend/prova-online-lgpd-consent.e2e-spec.ts`                                                                                                                                                   |
| P.09 | B      | P     | `docs/gov/privacy/redactions.json`; `backend/src/common/logging/logging.config.ts`; `backend/src/common/logging/logging.config.spec.ts`; `backend/src/common/bootstrap/runtime-entrypoint-contract.spec.ts`                                                                                                                                                                        |
| Q.07 | B      | P     | `backend/src/portal/portal.controller.ts`; `frontend/portal/src/app/pages/documentos/documentos.ts`; `frontend/portal/src/app/pages/documentos/documentos.spec.ts`; `docs/user/portal-self-service.md`                                                                                                                                                                             |
| Q.11 | B      | P     | `backend/src/portal/portal.controller.ts`; `backend/src/portal/portal.service.spec.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.spec.ts`; `docs/user/portal-self-service.md`                                                                                                                        |
| Q.12 | B      | P     | `backend/src/portal/portal.controller.ts`; `backend/src/portal/portal.service.spec.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.spec.ts`; `docs/user/portal-self-service.md`                                                                                                                        |
| R.07 | B      | P     | `docs/eng/decisions/adr-021-icp-signer-software-certificate.md`; `backend/src/external/signature/icp-signer.service.ts`; `backend/src/external/signature/tenant-fiscal-certificate.service.ts`; `backend/src/external/signature/icp-signer.service.spec.ts`; `backend/src/external/signature/tenant-fiscal-certificate.service.spec.ts`; `tests/backend/esocial-pades.e2e-spec.ts` |
| T.08 | B      | P     | `backend/src/ponto/payroll-bridge/payroll-bridge.service.ts`; `frontend/src/app/features/ponto/folha/ponto-folha.ts`; `tests/backend/ponto-payroll-bridge-tz.e2e-spec.ts`                                                                                                                                                                                                          |

## Hardening Evidence

P.09 is closed because every runtime uses `createLoggingModule(...)` and the
runtime logger is driven by `docs/gov/privacy/redactions.json`. The focused
logging specs prove redaction for CPF/CNPJ, PIS/PASEP, email, bank account
fields, authorization headers, and nested PII.

R.07 is closed within ADR-021's accepted boundary. SGP supports software
A1/PKCS#12 signing and verification; HSM/A3 remains outside SGP scope. The
certificate status surface returns only alias, subject, validity dates, days
until expiry, and expired/near-expiry flags. It does not return PKCS#12 bytes,
passwords, private keys, or certificate PEM values.

## Gates

Focused closure gate:

```bash
npm run test:backend -- --runInBand --runTestsByPath src/common/logging/logging.config.spec.ts src/common/bootstrap/runtime-entrypoint-contract.spec.ts src/external/signature/icp-signer.service.spec.ts src/external/signature/tenant-fiscal-certificate.service.spec.ts
```

Result: passed, 4 suites / 12 tests.

Broad publication gates remain separate from this retained proof because the
checkout already contained unrelated dirty CI and coverage-hardening work before
this closure pass.

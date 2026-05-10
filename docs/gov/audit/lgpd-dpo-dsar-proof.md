# LGPD DPO and DSAR Proof

Round: 11
FR: FR-PT-1244A7
Status: DONE

## Accepted SGP Boundary

SGP exposes the LGPD encarregado contact publicly, keeps the tenant DPO
designation lifecycle under protected administration, accepts authenticated
portal Art. 18 requests as DSAR tickets, and gives LGPD operators a protected
ticket lifecycle surface with SLA state and minimized response envelopes.

This proof does not add a new public DSAR route family, new RBAC strings, ROPA
internals, RCIS behavior, retention-policy decisions, or automatic mutation of
personal data. Portal submission remains authenticated through the existing
`portal.profile.write` permission; operator reads use `auditoria.read`; operator
updates use `gestao.write`.

## Runtime Evidence

| Behavior                        | Evidence                                       |
| ------------------------------- | ---------------------------------------------- |
| Public DPO contact              | `backend/src/publico/lgpd-dpo.controller.ts`   |
| DPO designation lifecycle       | `backend/src/lgpd/dpo.controller.ts`           |
| Portal DSAR ticket submission   | `backend/src/portal/lgpd-rights.controller.ts` |
| Protected DSAR administration   | `backend/src/lgpd/dsar.controller.ts`          |
| DSAR SLA/redacted operator DTO  | `backend/src/lgpd/dsar.service.ts`             |
| DSAR RLS update posture         | `database/sql/70-lgpd-final.sql`               |
| Operator workflow documentation | `docs/user/lgpd.md`                            |

## Test Evidence

| Behavior                         | Evidence                                          |
| -------------------------------- | ------------------------------------------------- |
| DSAR admin service redaction/SLA | `backend/src/lgpd/dsar.service.spec.ts`           |
| DSAR admin audit delegation      | `backend/src/lgpd/dsar.controller.spec.ts`        |
| Public DPO + DSAR e2e flow       | `tests/backend/lgpd-dpo-dsar.e2e-spec.ts`         |
| Six LGPD right types             | `tests/backend/lgpd-direitos-titular.e2e-spec.ts` |

## Commands

- `npm -w backend run test -- --runInBand backend/src/lgpd/dpo.service.spec.ts backend/src/lgpd/dpo.controller.spec.ts backend/src/lgpd/dsar.service.spec.ts backend/src/lgpd/dsar.controller.spec.ts`
- `npm run test:e2e -- --runInBand tests/backend/lgpd-dpo-dsar.e2e-spec.ts tests/backend/lgpd-direitos-titular.e2e-spec.ts`
- `npm run test:backend -- --runInBand`
- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run governance:check`

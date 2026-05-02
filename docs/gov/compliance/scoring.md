# Compliance Scoring

Scoring scale: `0` (missing), `1` (partial), `2` (implemented), `3` (implemented + tested).

| Control Area           | Score | Notes                                                                             |
| ---------------------- | ----- | --------------------------------------------------------------------------------- |
| Cognito JWT validation | 3     | JWKS verification active; unsigned tokens only for explicit test mode.            |
| Permission enforcement | 3     | Guards + decorators on protected routes, including IAM catalog.                   |
| Request ID propagation | 3     | Middleware + standard error envelope propagation.                                 |
| Audit logging          | 2     | Mutation logging implemented; retention/export policy still pending.              |
| RLS isolation          | 2     | Runtime context and SQL policies implemented; production role hardening pending.  |
| S3 document workflow   | 2     | Presigned upload/register/download flow implemented; malware scan policy pending. |
| Deterministic seeds    | 2     | Seed fixtures + RLS bypass in seed transaction implemented.                       |

## Open Risks

- Object-level malware scanning and quarantine flow is unverified.
- Formal retention/archival policy for `audit_event` is not yet codified.
- Production PostgreSQL role grants for strict least privilege are unverified.

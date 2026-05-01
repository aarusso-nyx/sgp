# Prompt 02 XCUT-05 failure

Failing gate: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm --workspace backend run test:e2e`

Prior gates passed before this failure:
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run lint`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run typecheck`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test`
- `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run db:smoke`
- `npm run prebuild` plus generated catalog diff check

Diagnostic output:

```text
FAIL test/app.e2e-spec.ts
  SGP backend foundation (e2e)
    maps Cognito groups to permissions in the session endpoint
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:472

    returns a representative paged master-data endpoint
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:508

    creates, updates, and deactivates a Gestao master-data record
      expected 201 "Created", got 403 "Forbidden"
      at test/app.e2e-spec.ts:533

    validates standard pagination input
      expected 400 "Bad Request", got 403 "Forbidden"
      at test/app.e2e-spec.ts:587

    returns paged RH workflow records for RH readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:606

    returns another RH workflow route for RH readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:620

    returns paged payroll runs for Folha readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:630

    returns paged agreements for Convenio readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:639

    returns report catalog for Relatorio readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:648

    returns audit events for Auditoria readers
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:657

    returns notifications and documents endpoints
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:668

    creates and registers document uploads with relatorio generate permission
      expected 201 "Created", got 403 "Forbidden"
      at test/app.e2e-spec.ts:692

    creates document presigned download links and enforces iam catalog permissions
      expected 200 "OK", got 403 "Forbidden"
      at test/app.e2e-spec.ts:714

Test Suites: 1 failed, 3 passed, 4 total
Tests: 13 failed, 11 passed, 24 total
```

Likely local cause: `PermissionGuard` now resolves Cognito groups through `PermissionsService` and the e2e `FakeDatabaseService` in `test/app.e2e-spec.ts` does not return `public.access_profile`/`profile_permission`/`permission` rows for that lookup, so test actors resolve with no permissions and the global default-deny guard correctly returns 403.

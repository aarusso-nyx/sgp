# Frontend Inventory — Round 13

Frontend is **one** npm workspace at `frontend/` housing two Angular apps:

- **Admin app** under `frontend/src/` (entry `frontend/src/main.ts`, app `frontend/src/app/`).
- **Portal app** under `frontend/portal/src/` (entry `frontend/portal/src/main.ts`, app `frontend/portal/src/app/`).

Combined: **2 894 `.ts` files**. Admin `frontend/src/app/` has roughly
3 441 LOC at the app shell level; portal app totals ~24 614 LOC including
generated/spec content.

> Correction vs B0 §3 fan-out hint: there is no separate `frontend/admin/` —
> the admin app lives directly under `frontend/src/`. Downstream prompts
> should not target `frontend/admin/**` paths.

## Admin Feature Surfaces (`frontend/src/app/features/`)

Top-level feature folders:

`admin`, `admin-feature`, `auditoria`, `avaliacao`, `convenio`, `fiscal`,
`folha-pagamento`, `gestao`, `ponto`, `portal`, `portal-empregado`,
`portal-publico`, `portal-transparencia`, `publico`, `recrutamento`,
`relatorio`, `rh`, `saude`, `security`, `tce`.

Companion roots:

- `frontend/src/app/core/` — shared singletons (api client, auth, routing).
- `frontend/src/app/reports/` — admin reports landing.
- `frontend/src/app/shared/`, `shared-platform/` — components/pipes/utilities.

## Portal Pages (`frontend/portal/src/app/pages/`)

`auth-callback`, `contracheque`, `documentos`, `ferias`,
`govbr-sign-callback`, `licencas`, `meus-dados`, `minha-equipe`, `ponto`,
`portal-feature-page`, `portal-home`, `portal-shell`.

Portal core under `frontend/portal/src/app/core/` carries auth interceptor and
route endpoints; spec coverage in `portal-route-endpoints.spec.ts` and
`app.routes.spec.ts`.

## API Client Migration (FR R2-109)

- Files importing `ApiClient`: **102** (admin + portal combined) —
  `grep -rEl "ApiClient" frontend/src/app frontend/portal/src/app | wc -l`.
- Remaining raw `this.http.*` call sites: **11** —
  `grep -r "this.http\." frontend/src/app frontend/portal/src/app | wc -l`.
- These 11 sites should be reviewed in B1: either migrate to `ApiClient` or
  classify as legitimate exemptions (e.g. uploading binaries, file downloads).
  Verify against R2-109 acceptance before declaring the FR complete in any
  future round.

## Change Detection / Signals (FR R2-130)

- Spec coverage: `frontend/src/app/admin-angular-metadata.spec.ts` and
  `frontend/portal/src/app/portal-change-detection.spec.ts`. These enforce
  OnPush + signals + async-pipe posture across both apps.

## i18n (FR R2-131)

- `frontend/src/locale/` exists (admin); portal i18n status verified by
  spec presence (round-13 inventory does not enumerate locale files; see
  `tests` map for spec coverage).

## Playwright e2e (FR R2-133, R2-134)

- Portal: `tests/frontend/portal/portal-playwright.spec.ts`.
- Admin: `tests/frontend/admin/admin-playwright.spec.ts`.
- Vitest unit specs: `tests/frontend/{unit,api}` plus `frontend/src/app/**/*.spec.ts`.

## a11y / Accessibility

- No standalone a11y scanner spec located by file globbing. Round 13 does not
  open a new FR; absent in accepted v0.0.1 scope per
  `docs/gov/evidence/mvp-scope-ledger.md` (cited by deferred FRs).

## Notes for downstream prompts

- The split admin (under `frontend/src/`) vs portal (under
  `frontend/portal/src/`) means workspace globs must include both roots.
- The 11 raw `http` call sites are the only regression risk indicator on the
  ApiClient migration FR. Recommend a B1 grooming line item to confirm exempt
  vs non-exempt before round 14.

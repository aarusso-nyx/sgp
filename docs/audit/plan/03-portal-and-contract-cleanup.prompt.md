# Prompt 03 - Portal And Contract Cleanup

## Goal

Fix frontend and contract drift identified by the reassessment:

- portal build failure caused by generated OpenAPI client use of `ApiClient.put()`;
- missing `test:portal` script in the frontend workspace;
- compatibility alias wording and behavior around `UpsertGlobalParameterDto.valor`.

## Read First

- `AGENTS.md`
- `docs/eng/10-uc-administracao-seguranca.md`
- `docs/eng/40-divisao-modular.md`
- `docs/eng/42-contratos-integracao.md`
- `docs/audit/diag/portal-build-and-frontend-tests.md`
- `docs/audit/diag/compatibility-surface.md`
- `docs/audit/diag/raw-portal-build.log`
- `docs/audit/diag/raw-test-portal.log`
- `frontend/package.json`
- `frontend/portal/src/app`
- `frontend/src/app/core/api/api-client.ts`
- `backend/src/system-parameters/system-parameters.dto.ts`

## Work Items

1. Reproduce or re-check the portal build failure before editing if dependencies are available.
2. Align the portal API client with generated client usage:
   - add a typed `put` method if PUT is a documented canonical method; or
   - regenerate/fix generated calls if PUT is not canonical for those endpoints.
3. Add a real `test:portal` script to the frontend workspace using the repository's Angular test conventions.
4. Fix the `UpsertGlobalParameterDto.valor` compatibility surface:
   - if `valor` is canonical, document it as canonical and remove legacy/compatibility wording;
   - if `value` is canonical, remove the `valor` fallback and update generated contracts/tests accordingly.
5. Do not add backward-compatibility schemas, dual-route shims, or compatibility-only DTO fields for v0.0.1.
6. Keep documented route prefixes as the target contract; do not preserve undocumented legacy paths by default.
7. Update `docs/eng/` if the canonical field or frontend contract changes acceptance behavior.

## Acceptance Gates

```bash
cd . # repository root
npm --workspace frontend run build:portal
npm run test:portal
npm --workspace backend test -- --runInBand
```

If browser test dependencies are unavailable locally, document the exact blocker and keep the script/config changes verifiable from package metadata.

## Deliverable

Portal build/test fixes, contract cleanup, and focused tests or snapshots proving the canonical field/client behavior.

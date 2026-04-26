# Compatibility Surface Diagnostic

Generated at: 2026-04-25T23:24:29.504Z

## Resolution

`source/backend/src/system-parameters/system-parameters.dto.ts` now exposes only `value?: unknown` for `UpsertGlobalParameterDto`. The previous `valor` fallback was removed from the DTO and service because it was compatibility-only surface for v0.0.1.

## Contract Decision

`value` is the canonical JSON field for `PUT /api/v1/admin/parametros/globais/:chave`. Portuguese domain attributes can still live inside that value object, but the envelope field is not aliased.

# STYNX and DEVAI Version Matrix

Captured: 2026-07-11 at baseline SHA `9364dea6b4f6b25da98497bacab1c82327184d49`

Owner: SGP platform maintainers. Updates are matrix changes: query GitHub
Packages with the configured read-only token, update manifests and the root
lockfile together, then run registry, type, build, consumer-contract, and
concern-specific parity gates. Wave 0 did not change dependencies.

| Package family                                                    | Declared range | Lockfile versions | Latest published | Compatibility evidence                            |
| ----------------------------------------------------------------- | -------------- | ----------------- | ---------------- | ------------------------------------------------- |
| backend core: audit, auth, backend, contracts                     | `^1.0.0`       | `1.0.2`           | `1.0.3`          | backend auth/audit consumer tests                 |
| backend base: core, data, health, i18n, logging, sessions         | `^1.0.0`       | `1.0.1`           | `1.0.2`          | future runtime factory plus health/context probes |
| backend policy: idempotency, privacy, ratelimit, storage, tenancy | `^1.0.0`       | `1.0.2`           | `1.0.3`          | concern parity, DB/RLS and storage tests          |
| feature flags                                                     | `^0.1.0`       | `0.1.0`           | `0.2.2`          | system-parameter feature-flag tests               |
| integration adapter                                               | `^0.1.0`       | `0.1.0`           | `0.2.2`          | deterministic integration worker tests            |
| PDF                                                               | `^0.1.0`       | `0.1.0`           | `1.0.2`          | PDF and PDF/A golden tests                        |
| PDF/A and VeraPDF adapter                                         | `^0.1.0`       | `0.1.0`           | `0.2.2`          | conformance and telemetry tests                   |
| signature                                                         | `^0.1.0`       | `0.1.0`           | `0.2.2`          | XML/PDF signature goldens and signer tests        |
| Angular core/auth/profile/sessions/storage/trash/UI               | `^1.0.0`       | `1.0.2`           | `1.0.3`          | Admin and Portal provider/journey tests           |
| Angular i18n and SDK                                              | `^1.0.0`       | `1.0.1`           | `1.0.2`          | frontend i18n and generated-client gates          |
| Angular tenancy                                                   | `^0.1.0`       | `0.1.2`           | `0.1.3`          | tenant switch and guarded-route tests             |
| `@devai-nyx/cli`                                                  | not declared   | absent            | `0.2.1`          | Wave 1 doctor, spec, inventory and scorecard      |

All 31 declared STYNX packages and the DEVAI CLI returned a published version
from GitHub Packages with `NODE_AUTH_TOKEN` configured. No credential value was
printed. The sibling STYNX checkout at `f2a6d5891a765e25c4aff89ced7b039d9a433cca`
was inspected only as non-authoritative context and was dirty on
`fix/publish-token-fallback`.

The root lockfile SHA-256 is
`a8acd1a577d124cb4ce7e900fb346e0e0dca779f3f6cec47d1864c484914500a`.

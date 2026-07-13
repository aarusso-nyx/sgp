# STYNX and DEVAI Version Matrix

Captured: 2026-07-12 for Wave 7 closeout.

Owner: SGP platform maintainers. Updates are matrix changes: query GitHub
Packages with the configured read-only token, update manifests and the root
lockfile together, then run registry, type, build, consumer-contract, and
concern-specific parity gates. Wave 0 did not change dependencies.

| Package family                              | Declared range | Lockfile versions | Latest published | Compatibility evidence                                                       |
| ------------------------------------------- | -------------- | ----------------- | ---------------- | ---------------------------------------------------------------------------- |
| backend contracts: auth, backend, contracts | `^1.0.0`       | `1.0.2`           | Wave 0 snapshot  | backend auth, authorization and adapter tests                                |
| backend runtime: core, health, logging      | `^1.0.0`       | `1.0.1`           | Wave 0 snapshot  | runtime factory and health/context probes                                    |
| feature flags                               | `^0.1.0`       | `0.1.0`           | `0.2.2`          | system-parameter feature-flag tests                                          |
| integration adapter                         | `^0.1.0`       | `0.1.0`           | `0.2.2`          | deterministic integration worker tests                                       |
| PDF                                         | `^0.1.0`       | `0.1.0`           | `1.0.2`          | PDF and PDF/A golden tests                                                   |
| PDF/A and VeraPDF adapter                   | `^0.1.0`       | `0.1.0`           | `0.2.2`          | conformance and telemetry tests                                              |
| signature                                   | `^0.1.0`       | `0.1.0`           | `0.2.2`          | XML/PDF signature goldens and signer tests                                   |
| Angular core/auth/storage                   | `^1.0.0`       | `1.0.2`           | Wave 0 snapshot  | Admin and Portal provider/journey tests                                      |
| Angular i18n                                | `^1.0.0`       | `1.0.1`           | Wave 0 snapshot  | frontend i18n gates                                                          |
| Angular tenancy                             | `^0.1.0`       | `0.1.2`           | `0.1.3`          | tenant switch and guarded-route tests                                        |
| `@devai-nyx/cli`                            | exact `0.2.1`  | `0.2.1`           | `0.2.1`          | Wave 1 doctor, spec, inventory, sensors, scorecard and evidence-chain health |

Wave 0 verified every then-declared package through GitHub Packages. Wave 7
removed direct declarations with no SGP import: backend audit, data, i18n,
idempotency, privacy, ratelimit, sessions, storage and tenancy packages, plus
frontend profile, sessions, trash, UI and SDK packages. Shared contracts remain
consumed through the imported aggregate/adapters; no local artifact replaced a
removed declaration.

The root lockfile SHA-256 is
`b5dbcaada07548742cceb1e1bd2217b7ca26bb415d0477398cdaebfc0e0bb6bd`.

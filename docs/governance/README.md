# Governance Artifacts

This folder tracks governance controls and operational readiness for SGP v0.0.1.

## Key policies

- `docs/eng` is authoritative for engineering/product behavior.
- Code artifacts are authoritative in English.
- Runtime implementation must not add backward compatibility layers or legacy shim schemas.

## Files

- `governance-manifest.json`: machine-readable governance inventory.
- `compliance/scoring.md`: current control scoring and known gaps.
- `health/preflight.md`: preflight checks before deploy or migration.
- `audit/README.md`: audit logging model and retention notes.

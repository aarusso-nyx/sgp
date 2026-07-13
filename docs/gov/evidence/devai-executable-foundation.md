# DEVAI Executable Foundation

Captured: 2026-07-11 on branch `codex/stynx-devai-adoption`.

SGP installs `@devai-nyx/cli` version `0.2.1` from GitHub Packages and exposes
dispatcher-backed `devai:*` commands for doctor, spec validation, inventory,
pack resolution, sensor preparation and execution, scorecard computation, test
recording, evidence emission, and evidence-chain health.

The SGP sensor driver executes canonical repository commands rather than
deriving claims from documentation. Its first run persisted schema-validated
readings for lint, typecheck, registry dependency policy, governance, and
runtime topology health. All five readings passed. The first inventory found 70
modules, 604 routes, and 508 tests. The first scorecard rendered with an overall
`UNKNOWN` verdict and retained every unknown cell; no N/A override was added.

## Owner resolution

- On 2026-07-11 the owner declared DEVAI authoritative over SGP's legacy
  constitution. The required framework/meta roots and reading-order references
  were adopted through the registry CLI initializer and retained authority
  record.
- `npm run devai:pack` reports that no bundled stack-adapter pack matches SGP.
  No sibling checkout, local tarball, global install, or fabricated match was
  used.
- `npm run devai:spec` passes but scans zero DEVAI invariants, journeys, trace,
  and glossary files. This is executable substrate evidence, not a completeness
  claim.

Pack resolution remains explicit evidence: an applicable pack must be published
or an SGP pack design accepted; no match is fabricated.

## Exit status

Wave 1 exit commands passed: doctor, spec validation, inventory, sensors,
scorecard, lint, typecheck, and SGP governance. The generated scorecard remains
an initial baseline with UNKNOWN cells and does not claim full adoption.

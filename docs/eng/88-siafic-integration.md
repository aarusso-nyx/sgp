# SIAFIC integration

## Scope

The integrations worker owns the SIAFIC outbound bridge for payroll accounting facts required by Decreto 10.540/2020 and Decreto 11.453/2023. The runtime does not implement a public API contract for SIAFIC in v0.0.1; it exposes an internal worker service that can be scheduled or invoked by an operator workflow after payroll accounting mappings are closed.

## Source of truth

SIAFIC sync is derived from the canonical payroll accounting model:

- `payroll.payroll_run` provides competence and lifecycle state.
- `payroll.v_payroll_run_line_active` provides active payroll lines only.
- `payroll.accounting_account` maps payroll rubrics to accounting accounts.

The sync requires the payroll run to be `GENERATED`, `APPROVED`, `PAID`, or `CLOSED` and requires active accounting mappings for the payroll lines. Missing accounting mappings block sync instead of producing partial accounting payloads.

## Runtime state

Canonical SQL state lives under `fiscal`:

- `fiscal.siafic_sync_batch` stores per-run batch state, ente code, per-stage status, receipt, retry count, and circuit state.
- `fiscal.siafic_sync_item` stores each emitted accounting item for `EMPENHO`, `LIQUIDACAO`, and `PAGAMENTO`.
- RLS reuses the fiscal DCTFWeb read/write permissions. No new RBAC strings are introduced in this wave.

## Connector behavior

The connector sends JSON payloads to `SIAFIC_ENDPOINT_URL` when configured. If the endpoint is not configured, it runs in local sandbox mode and returns deterministic receipts.

Retry and circuit defaults:

- `SIAFIC_MAX_ATTEMPTS`: defaults to `3`.
- `SIAFIC_TIMEOUT_MS`: defaults to `15000`.
- `SIAFIC_CIRCUIT_FAILURE_THRESHOLD`: defaults to `3`.
- `SIAFIC_CIRCUIT_RESET_TIMEOUT_MS`: defaults to `60000`.

Circuit state is keyed by ente code. When the failure threshold is reached, the ente circuit opens and rejects new transmissions until the reset timeout allows a half-open probe. Any successful probe closes the circuit and resets the failure count.

## Regulatory assumptions

The implementation treats Decreto 10.540/2020 plus Decreto 11.453/2023 as requiring outbound interoperability for payroll expense accounting facts, but it does not select a vendor-specific SIAFI, SIAFEM, or municipal SIAFIC layout. The payload is a neutral JSON contract containing competence, ente code, payroll run, stage, account code/type, rubric code/description, and amount. A production adapter may map that contract to the ente's official SIAFIC endpoint without changing payroll accounting source semantics.

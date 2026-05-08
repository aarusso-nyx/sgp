# MVP Scope Ledger

Status: owner-accepted MVP closure scope for QA scorecard lift
Last updated: 2026-05-08

This ledger explains how `docs/gov/audit/functional-requisites.md` is scored
after the Round 12 QA lift. It does not override `docs/eng`; it records which
accepted requirements are implemented now and which remain outside the v0.0.1
MVP closure surface.

## Scope Rule

Functional requisite rows may use these statuses:

| Status     | Meaning                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DONE`     | Source, test, command, and retained audit evidence prove the SGP-owned behavior.                                              |
| `DEFERRED` | The row is accepted documentation scope but outside the v0.0.1 MVP closure boundary until a future owner decision reopens it. |

Generic `TODO` rows are not allowed in the retained FR ledger for the QA
scorecard closure. A missing implementation must either be promoted with proof
or marked `DEFERRED` with this ledger as the evidence path.

## Focused MVP Tranche

The current MVP tranche keeps SGP-owned runtime, portal/public, fiscal sandbox,
LGPD, and time-attendance proof in scope:

| Area                              | FR rows promoted or retained as `DONE`                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Fiscal and integration boundaries | `FR-FI-75588D`, `FR-FI-90930A`, `FR-FI-7A4DE7`, `FR-FI-93690B`, `FR-FI-06B611`, `FR-FI-26241D`, `FR-FI-1F136F`, `FR-FI-7732F5` |
| Operations and observability      | `FR-OO-3BF7E1`, `FR-OO-C0F479`, `FR-OO-CBCC31`                                                                                 |
| Payroll and fiscal outputs        | `FR-PB-FFE071`                                                                                                                 |
| People and recruitment            | `FR-PR-E68857`, `FR-PR-BE041B`                                                                                                 |
| Privacy and transparency          | `FR-PT-1244A7`, `FR-PT-1F254E`, `FR-PT-42F0B5`, `FR-PT-64E409`, `FR-PT-C65640`                                                 |
| Time, attendance, and SST         | `FR-TAS-866093`, `FR-TAS-383663`, `FR-TAS-B89144`, `FR-TAS-CBF51F`                                                             |

## Deferred Non-MVP Surface

Rows outside the focused tranche remain accepted product backlog, but are not
current QA blockers. Reopen requires a future owner decision, a changed
`docs/eng` acceptance boundary, implementation, tests, and retained proof.

This includes broad payroll expansion, official external homologations,
state-specific TCE production conformance, advanced SST, full admin parity,
and non-MVP privacy/transparency expansion beyond the implemented LGPD and
public evidence surfaces.

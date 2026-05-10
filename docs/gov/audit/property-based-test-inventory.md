# Property-Based Test Inventory

Status: retained evidence for robustness scoring.

SGP uses property-style tests narrowly where randomized or generated input adds
material value beyond fixtures.

| Surface             | File                                                         | Invariant                                                                                                                        |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Money rounding      | `backend/src/common/money/money.property.spec.ts`            | Round-trip and add/subtract invariants around the canonical money helper.                                                        |
| Money formatting    | `backend/src/common/money/money.invariants.property.spec.ts` | Idempotency, sign symmetry, bounded decimal places, integer round-trip, and bounded multi-addend drift.                          |
| Payroll calculation | `backend/src/payroll-engine/payroll-calc.property.spec.ts`   | Net-line linearity, INSS proportionality, IRRF monotonicity and bracket boundaries, RPPS ceiling behavior, and ATS monotonicity. |

Expansion rule: add property tests only for domain rules with meaningful input
spaces, such as payroll brackets, eligibility windows, allocation totals,
ranking tie-breakers, retention limits, and regulatory file totals. Do not use
generated tests for byte-sensitive regulatory goldens where exact fixtures are
the contract.

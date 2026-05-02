# Folia Payroll Engine Reconciliation

**Status:** active implementation guideline for v0.0.1.

## Purpose

Define how folia payroll engine improvements are applied in SGP runtime implementation.

## Precedence

- Folia engine behavior is authoritative for payroll formula/engine internals.
- `docs/eng` remains authoritative for product scope and architecture boundaries.

## Engine capabilities to preserve from folia

- Formula compilation pipeline with input validation and token safety checks.
- Dependency extraction and circular dependency protection.
- Deterministic evaluation strategy with cache-aware execution.
- Runtime diagnostics suitable for audit and reconciliation.

## Reverse evidence folded in on 2026-04-26

The legacy formula artifacts under `docs/legacy-reverse/modules/folha/calculo/` are evidence inputs for the SGP engine port. They do not override folia precedence, but they define the legacy behavior that the engine must reconcile during shadow mode:

- `formulas-lista-completa.csv`: raw legacy formula inventory by restored database.
- `formulas-dependencias.csv` and `formulas-grafo.csv`: dependency graph evidence used to validate extraction and cycle detection.
- `formulas-dependencias-analise.md`: semantic reading of relevant chains such as salary, base remuneration, INSS, transport allowance, and qualification additions.
- `formulas-ordem-calculo.md`: probable topological execution order; the SGP runtime must record the actual evaluated order per calculation.
- `verbas-formulas-atributos.md`: observed formula tokens, persisted attributes, aliquot usage, and differences between `rhlinkcon` and `rhlinkcon_motor`.

Any high-impact difference between the folia engine behavior and these legacy outputs must be handled through the conflict rule below.

## Port target inside SGP

- Runtime SQL implementation: `database/sql/25-payroll-formula-engine.sql`
- Runtime notes: `database/formula-engine.md`
- Money/rounding boundary: `docs/eng/72-money-decimal-policy.md`

## FOL-01 contract with CALC-01

FOL-01 is the official administrative interface for rubricas consumed by CALC-01. The contract is:

- Rubricas live in `payroll.payroll_earning_deduction`, scoped by `tenant_id`, with unique `(tenant_id, code)`, type in `PayrollEntryKind`, incidence flags in `incidences jsonb`, validity dates, eSocial/offical rubric codes, and the `formula_*` compilation columns.
- Formula attributes live in `payroll.formula_attribute` and are linked to one rubrica through `earning_deduction_id`; supported value types are `decimal`, `int`, `bool`, `date`, and `text`.
- Cargo-based eligibility lives in `payroll.job_position_earning`, with validity dates and `application_condition`; CALC-01 can use this bridge to select rubricas for the servidor's current cargo without inventing a parallel mapping.
- Formula validation uses `payroll_calc.compile_formula(...)`; persisted formula changes still recompile through the `trg_compile_formula_expression` trigger and expose readiness through `formula_ready` / `formula_error`.
- Preview and later calculation paths call `payroll_calc.evaluate_earning_deduction(...)`. The admin preview removes transient cache rows after the call, while full calculation may keep `payroll_calc.formula_cache` as the engine cache.

## Money boundary

Folia-first formula evaluation must preserve decimal precision through intermediate calculation and apply the SGP money policy only at the rubrica boundary. SQL `payroll_calc.evaluate_earning_deduction(...)` and TypeScript payroll paths must reconcile to `numeric(14,2)` / `Decimal(14,2)` using half-away-from-zero rounding.

## Conflict handling

- If folia and specs disagree on payroll engine internals, folia behavior is default.
- If the conflict changes external business outcomes or compliance-sensitive outputs, escalate to owner decision before merge.

## Non-goals

- No compatibility shim layer for legacy naming.
- No runtime `sgp_legacy` compatibility schema.

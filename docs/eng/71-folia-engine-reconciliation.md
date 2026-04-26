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

## Port target inside SGP

- Runtime SQL implementation: `source/database/sql/25-payroll-formula-engine.sql`
- Runtime notes: `source/database/formula-engine.md`

## Conflict handling

- If folia and specs disagree on payroll engine internals, folia behavior is default.
- If the conflict changes external business outcomes or compliance-sensitive outputs, escalate to owner decision before merge.

## Non-goals

- No compatibility shim layer for legacy naming.
- No runtime `sgp_legacy` compatibility schema.

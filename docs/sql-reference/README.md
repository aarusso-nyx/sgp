# SQL Reference Archive

This directory contains a full-fidelity PostgreSQL migration reference generated from SQL Server-compatible source inventory (`rhlinkcon`, 2026-04-21).

Status: reference archive for analysis and migration traceability.

It is not the runtime schema source for SGP v0.0.1. Runtime schema lives under `database/` and Prisma migrations.

## Layout

- `00_inventory`: frozen source inventory and dependency analysis
- `01_prelude`: canonical migration rules and schema bootstrap
- `10_core_ddl`: tables, constraints, indexes
- `20_programmability`: programmable objects and gap handling
- `30_seed_data`: deterministic lookup/configuration seed set
- `40_validation`: inventory-driven validation scripts
- `99_orchestration`: build/rebuild orchestration and gap report

## Notes

- Timestamp-like columns were translated as `TIMESTAMP WITH TIME ZONE` in this reference tree.
- SQL Server character/string columns were translated as `TEXT` in this reference tree.
- `sysdiagrams` helper routines are intentionally documented as non-migrated in the archived gap report.

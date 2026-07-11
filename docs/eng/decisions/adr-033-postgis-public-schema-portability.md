---
controllers: []
migrations:
  - database/sql/00-extensions.sql
  - database/sql/10-05-hr-ddl.sql
infra: []
runbooks: []
---

# ADR-033: PostGIS Public Schema Portability

Status: Accepted

Date: 2026-07-11

## Context

The supported PostGIS container image installs the PostGIS extension in the
`public` schema. SGP's canonical SQL instead qualified geometry types and
functions as `postgis.*`, which prevented a clean database bootstrap despite
the extension being present.

## Decision

SGP treats the PostGIS extension schema supplied by the supported PostgreSQL
image as `public`. Canonical SQL and database-facing runtime queries therefore
qualify PostGIS types and functions as `public.geometry` and `public.ST_*`.

SGP does not attempt to relocate an already installed extension. Relocation is
not portable across the supported PostGIS image and would make bootstrap depend
on mutable service-image state.

## Consequences

- `npm run db:smoke` validates the same extension layout used in CI.
- Geofencing SQL keeps explicit qualification even though application search
  paths are intentionally restrictive.
- Any future image change that installs PostGIS elsewhere requires an ADR
  amendment and a bootstrap-smoke update before adoption.

## Verification

- The PostgreSQL 16/PostGIS CI service completes canonical SQL bootstrap.
- Geofence unit tests assert the explicit `public.ST_*` query contract.
- Database alignment checks remain green.

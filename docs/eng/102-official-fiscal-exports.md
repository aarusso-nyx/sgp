# Official Fiscal Export Primitives

**Status:** Implementado como geradores determinísticos com layout selecionado pelo chamador

## Scope

Wave 9 adds export primitives for:

- Siconfi RREO/RGF under `backend/src/integrations-worker/siconfi/`
- SIOPE under `backend/src/integrations-worker/siope/`
- SIOPS under `backend/src/integrations-worker/siops/`

The generators produce deterministic CSV goldens and require the caller to provide `sourceStatus=CALLER_SELECTED_OFFICIAL_LAYOUT`, `layoutEdition`, and `sourceUrl`. They do not choose a regulatory layout version internally.

## Source anchors

- RREO/RGF: LC 101/2000 and Tesouro Nacional MDF/Siconfi material. The Tesouro page identified the 15th MDF edition as the current edition on 2026-05-03.
- SIOPE: Decreto 6.253/2007, Lei 10.832/2003, and FNDE SIOPE downloads. The FNDE downloads page listed 2026 annual version `26.0.1.2` dated 2026-04-10.
- SIOPS: LC 141/2012 and Ministry of Health/FNS SIOPS material. The FNS notice published 2026 first-bimester structure availability on 2026-04-01.

## Safety boundary

These generators are contract primitives, not final government transmitters. They are safe to use for internal evidence packages when the caller records the official layout source. They must not be branded as accepted Siconfi, SIOPE, or SIOPS transmissions until the target system import/export contract is verified and covered by an official-layout golden.

## Evidence

- `backend/src/integrations-worker/siconfi/rreo-rgf.generator.spec.ts`
- `backend/src/integrations-worker/siope/siope-export.generator.spec.ts`
- `backend/src/integrations-worker/siops/siops-export.generator.spec.ts`
- `tests/backend/fixtures/official-exports/`

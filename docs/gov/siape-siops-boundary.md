# SIAPE/SIOPS Boundary

Status: owner-decided boundary for v0.0.1
Last updated: 2026-05-09

This document records what SGP owns for SIAPE and SIOPS after the 2026-05-09
owner decision. It is a side document for governance and does not expand product
scope by itself.

## Accepted Boundary

| Surface | SGP-owned                                                                                                                         | Outside SGP                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| SIAPE   | Deterministic mock/export contract notes, feature-audit evidence, and reopen criteria.                                            | Production SIAPE integration, active SIAPE routes, workers, adapters, polling, credentials, homologation, and official acceptance. |
| SIOPS   | Local deterministic export/mock primitives and operator evidence that clearly states `officialConformance=false` unless reopened. | DATASUS polling/transmission, production credentials, official SIOPS acceptance, and active external service ownership.            |

## Mock/Export Status

- SIAPE has no accepted active SGP runtime. Any future SGP-side evidence must be
  contract-only until the owner reopens the boundary.
- SIOPS has SGP-local export/mock primitives for deterministic evidence. They
  are not official DATASUS transmissions and must not be marketed as accepted
  homologation.
- eSocial homologation is not part of this document; it belongs to
  `../stynx-esocial`.
- DET is not part of this document; SGP keeps only local typed projection and
  acknowledgement-request surfaces.

## Reopen Conditions

Reopen SIAPE or SIOPS only when an owner-approved change defines all of:

- runtime owner and repository boundary;
- provider endpoint, credential custody, and data protection model;
- contract fixtures, mock relay behavior, and official acceptance evidence;
- operator runbook, failure modes, retry/DLQ posture, and audit events;
- governance gates that distinguish internal mock success from external
  homologation.

Until reopened, SGP implementation work must stay limited to local exports,
mock contracts, docs, and retained evidence.

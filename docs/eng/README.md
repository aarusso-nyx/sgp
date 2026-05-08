# Engineering Authority

`docs/eng` is the authoritative engineering root for SGP v0.0.1. It contains only semantic authority: human-authored product/engineering specifications and developer-facing regulatory facts. Generated contract artifacts and mutable implementation evidence live under `docs/gov`.

## Authority Layers

- Root files: human-authored product and engineering authority. These files define scope, architecture, user experience, quality, migration rules, and domain behavior.
- `domains/`: dense human-authored domain authority packs.
- `decisions/`: standalone ADRs for accepted decisions that should remain easy to link from status ledgers and operator docs.
- `facts/`: authoritative developer facts derived from primary regulatory references. Raw legal and regulatory text stays under `docs/refs/**/law/`; `facts/` contains only implementation-facing semantic facts.

## Authored Specs

- `product.md`: mission, glossary, scope, domain map, and binding decisions.
- `platform.md`: architecture, modularity, integration contracts, async jobs, authorization, parameters, ADRs, and money policy.
- `architecture.md`: live layout map, runtime entrypoints, layout waivers, and boundary rules.
- `api/README.md`: OpenAPI generation, client drift gate, route alignment gate, and generated API artifact locations.
- `experience.md`: menu tree, operator workflows, manual guidance, and official outputs.
- `quality-migration.md`: test strategy, migration rules, and acceptance gates.
- `decisions/adr-021-icp-signer-software-certificate.md`: accepted ICP signer boundary for software certificates and out-of-scope HSM/A3 ownership.
- `domains/people-recruitment.md`: people, recruitment, concursos, appointment, quotas, and related workflows.
- `domains/payroll-benefits.md`: folia-first payroll, benefits, FGTS, CNAB, payslip, consignments, and payment policies.
- `domains/fiscal-integrations.md`: eSocial, EFD-Reinf, DCTFWeb, DIRF, SIAFIC, TCE, signatures, queues, and official exports.
- `domains/time-attendance-sst.md`: Portaria 671 time capture, REP/AFD, banked hours, justifications, payroll integration, and SST.
- `domains/privacy-transparency.md`: LGPD, biometrics, transparency, LAI, ROPA, RCIS, legal bases, and data-subject rights.
- `domains/operations-observability.md`: audit implementation, workers, queues, backpressure, and operational observability.

## Facts And Governance Surfaces

- `facts/law-esocial.md`, `facts/law-legal.md`, `facts/law-lgpd.md`, and `facts/law-tce.md` are the regulatory developer-fact authority derived from `docs/refs`.
- `docs/gov/generated/api/route-alignment.json` is the generated API route-contract surface.
- `docs/gov/generated/database/alignment-matrix.json` is the generated database alignment surface.
- `docs/gov/generated/runtime-topology.json` and `docs/gov/generated/governance-manifest.json` are persistent generated governance surfaces consumed by scripts and gates.
- `docs/gov/evidence/implementation-status.md`, `docs/gov/evidence/deferred-decision-ledger.md`, `docs/gov/evidence/backend-surface-notes.md`, and `docs/gov/evidence/database-alignment-*.md` are status and closure evidence only.

## External And Scratch Material

`docs/refs` stores external primary references and raw legal/regulatory source text. `docs/gov` stores governance controls, generated gate surfaces, and implementation evidence. `docs/user` stores operator guidance. `docs/leg` is archival legacy evidence. `docs/work` is scratch space and must not be used as acceptance authority.

## Maintenance Rules

- Behavior changes update root specs, `domains/`, or `facts/`, depending on whether the source is product/engineering intent or external regulation.
- Generated JSON under `docs/gov/generated/` is refreshed through the canonical root commands, especially `npm run api:alignment:sync`, `npm run api:alignment:check -- --json`, and `npm run db:alignment:check -- --json`.
- API contract drift is governed through `docs/eng/api/README.md`, generated frontend artifacts, and `docs/gov/generated/api/route-alignment.json`.
- Evidence/status updates go under `docs/gov/evidence/` and must not introduce new product obligations that are absent from `docs/eng` authority.
- Backticked live paths in `docs/eng`, `docs/gov`, and `docs/user` must resolve in the repository and are checked by `npm run governance:check`.

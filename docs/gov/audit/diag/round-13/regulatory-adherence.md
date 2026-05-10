# Regulatory Adherence — Round 13

Score per regulatory family. Anchor obligations in `docs/refs/<domain>/`;
anchor implementation in `path:line`. No primary-source refresh requested
this round (per B0 §5: "Do **not** re-fetch primary sources unless the user
explicitly says 'refresh refs'").

## eSocial

References observed in `docs/refs/esocial/`:

- `events-periodicos.md`, `events-nao-periodicos.md`,
  `events-tabelas.md`, `events-totalizadores.md`,
  `events-exclusao-fechamento.md`, `dctfweb-mit.md`, `efd-reinf.md`,
  `transmission-soap-ws.md`, `00-index.md`, plus `law/` subfolder.

Implementation status (from refreshed FR ledger):

| Sub-area                                             | FR-ID(s)     | Status                                                                              |
| ---------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| Stynx eSocial boundary contract                      | FR-FI-7A4DE7 | DONE — `backend/src/integrations/stynx-esocial/stynx-esocial.client.ts`             |
| DCTFWeb (incl. EFD-Reinf R-9015 + MIT)               | FR-FI-93690B | DONE — `backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts:193`     |
| EFD-Reinf R-4000 series (R-4010/4020/4040/4080/4099) | FR-FI-26241D | DONE — `backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.ts:186` |
| DIRF (pre-2025)                                      | FR-FI-06B611 | DONE — `backend/src/integrations-worker/dirf/dirf-builder.service.ts`               |
| Validação/assinatura eSocial hub                     | FR-FI-976867 | DEFERRED (owner)                                                                    |
| Submissão eSocial SOAP                               | FR-FI-A98E24 | DEFERRED (owner)                                                                    |
| Eventos cadastro/tabelas eSocial                     | FR-FI-0A7819 | DEFERRED (owner)                                                                    |
| Parser de retorno eSocial                            | FR-FI-ADD57D | DEFERRED (owner)                                                                    |
| TS-V (S-2306)                                        | FR-FI-AA7847 | DEFERRED (owner)                                                                    |
| Reintegração (S-2298)                                | FR-FI-C592B5 | DEFERRED (owner)                                                                    |

**Score:** 4/10 sub-areas implemented end-to-end inside SGP; 6 owner-pinned
deferrals scoped to `docs/gov/evidence/mvp-scope-ledger.md`. The 4 done
sub-areas carry full sandbox/golden test evidence (PvD round 13: ok).

Round-14 owner-spike outcome: R14-10 reaffirmed the eSocial runtime boundary in
`docs/gov/evidence/deferred-decision-ledger.md` on 2026-05-10. No retained
evidence in the SGP docs/source pass changed the Stynx-eSocial ownership model,
introduced a new RFB deadline that changes SGP-owned obligations, or recorded a
customer commitment requiring SGP to own XML/XSD/signing/SOAP/return-parser,
totalizer, retry, or DLQ runtime. The six eSocial FRs remain deferred for SGP;
round-15 B1 should plan only SGP-owned source-data mapping, producer DTO,
`public.esocial_events`, status/audit consumer, and operator-display work unless
an owner decision reopens the runtime boundary first.

## LGPD / ANPD

References observed in `docs/refs/lgpd/`:
`anpd-guidelines.md`, `dpo-dsar.md`, `international-transfers.md`,
`lei-13709.md`, `pii-categorias-cpf-bio.md`, `ropa-rcis.md`,
`tratamento-poder-publico.md`, `law/`.

Implementation:

| Sub-area                                   | FR-ID                      | Status / Evidence                                        |
| ------------------------------------------ | -------------------------- | -------------------------------------------------------- |
| ROPA + legal-basis registry                | FR-PT-1F254E, FR-PT-64E409 | DONE; PvD ok                                             |
| DSAR + DPO designation/contact             | FR-PT-1244A7, FR-PT-C65640 | DONE; PvD ok                                             |
| RCIS incident workflow (Res. ANPD 15/2024) | FR-PT-42F0B5               | DONE; PvD ok                                             |
| International transfers metadata           | FR-PT-06B7EB               | DONE; PvD ok                                             |
| PII encryption (high/medium)               | FR-PT-F21679               | DONE non-destructive; plaintext cutover deferred (owner) |
| LGPD reference cross-link tail             | FR-PT-EC4F9F               | DEFERRED; lowest spec count (29)                         |

**Score:** 6/7 LGPD sub-areas implemented and proven; 1 deferred. ANPD
notification dispatch is intentionally out of scope per FR-PT-42F0B5
rationale.

## Legal (CLT / Portarias / Concursos)

References under `docs/refs/legal/`:
`clt-rescisao-aviso-fgts.md`, `concursos-publicos.md`,
`consignacoes-margem-lei-14509.md`, `decimo-terceiro-ferias.md`,
`ec-103-previdencia.md`, `lei-14133-licitacoes.md`,
`licencas-estatutarias.md`, `pensao-alimenticia.md`,
`portaria-671-ponto.md`, `law/`.

Implementation:

| Sub-area                                       | FR-ID                        | Status   |
| ---------------------------------------------- | ---------------------------- | -------- |
| Portaria 671 — AFD/AFDT/ACJEF generators       | FR-TAS-CBF51F + R2-82        | DONE     |
| REP-P/REP-A/REP-C ingestion                    | FR-TAS-B89144, FR-TAS-383663 | DONE     |
| Mobile clock-in geofence                       | FR-TAS-866093                | DONE     |
| Concursos Públicos (registro + LGPD)           | FR-PR-E68857, FR-PR-BE041B   | DONE     |
| Pensão alimentícia + GPS residual              | FR-PB-FFE071                 | DONE     |
| Consignações Lei 14.509 (margem/portabilidade) | (PB-\* deferreds)            | DEFERRED |

**Score:** Core MTE/CLT obligations implemented for in-scope surface;
licenças/consignações/aviso prévio variants remain deferred.

## TCE / TCM / TCU

References under `docs/refs/tce/`:
`00-pluggable-contract.md`, `lai-portal-transparencia.md`, `rreo-rgf.md`,
`siafic.md`, `siope-siops.md`, `state-catalog.md`, `law/`.

Implementation:

| Sub-area                       | FR-ID        | Status                    |
| ------------------------------ | ------------ | ------------------------- |
| Mock TCE relay (sandbox)       | FR-FI-90930A | DONE                      |
| TCE submission queue           | FR-FI-7732F5 | DONE                      |
| SIAFIC neutral JSON sync       | FR-FI-1F136F | DONE                      |
| LAI portal transparência       | (R2-83)      | DONE per round-12 closure |
| Pluggable TCE/TCM/TCU contract | FR-FI-87AB14 | DEFERRED                  |
| TCE state/layout catalog       | FR-FI-9FDB83 | DEFERRED                  |
| AUDESP/SP reference adapter    | FR-FI-EC93C5 | DEFERRED                  |
| RREO/RGF builders              | FR-FI-94021B | DEFERRED                  |

**Score:** Sandbox + SIAFIC + LAI in production form; official-court
transmission and adapter catalogs are owner-postponed.

## Aggregate Verdict

| Family    |               DONE |   DEFERRED | Coverage                                  |
| --------- | -----------------: | ---------: | ----------------------------------------- |
| eSocial   |                  4 |          6 | Sandbox + DCTFWeb + EFD-Reinf + DIRF      |
| LGPD/ANPD |                  6 |          1 | ROPA, DSAR, RCIS, intl transfers, PII enc |
| Legal/CLT | 5 (representative) | n DEFERRED | Portaria 671, concursos, GPS residual     |
| TCE       |                  4 |          4 | Sandbox + SIAFIC + LAI                    |

No new regulatory regressions detected in round 13. All deferred items remain
scope-pinned to `docs/gov/evidence/mvp-scope-ledger.md`.

# Admin Menu Install Plan

Round: 11

## Baseline

Round 10 inventory recorded 181 documented `sgp-admin` menu routes, with all 181
postponed under `ADMIN_INSTALL_LATER`. Round 11 keeps the broad postponement for
unproved groups and installs one bounded group as the first route-to-feature
slice.

## Route-To-Feature Matrix

| Module                 | Status    | Documented routes | Installed route proof          | Frontend proof                                                                                                                                                                                 |
| ---------------------- | --------- | ----------------: | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditoria              | INSTALLED |                 6 | `docs/eng/experience.md` §3.9  | `frontend/src/app/core/navigation/module-route-groups.spec.ts`; `frontend/src/app/core/navigation/navigation-filter.spec.ts`; `frontend/src/app/core/navigation/admin-feature-catalog.spec.ts` |
| Gestão                 | PLANNED   |                32 | `docs/eng/experience.md` §3.1  | Pending bounded slice                                                                                                                                                                          |
| Módulo RH              | PLANNED   |                39 | `docs/eng/experience.md` §3.2  | Pending bounded slice                                                                                                                                                                          |
| Folha de Pgt           | PLANNED   |                24 | `docs/eng/experience.md` §3.3  | Pending bounded slice                                                                                                                                                                          |
| Módulo Avaliação       | PLANNED   |                10 | `docs/eng/experience.md` §3.4  | Pending bounded slice                                                                                                                                                                          |
| Recrutamento e Seleção | PLANNED   |                14 | `docs/eng/experience.md` §3.5  | Pending bounded slice                                                                                                                                                                          |
| Consultas Gerenciais   | PLANNED   |                 7 | `docs/eng/experience.md` §3.6  | Pending bounded slice                                                                                                                                                                          |
| Relatório              | PLANNED   |                10 | `docs/eng/experience.md` §3.7  | Pending bounded slice                                                                                                                                                                          |
| Módulo Previdenciário  | PLANNED   |                12 | `docs/eng/experience.md` §3.8  | Pending bounded slice                                                                                                                                                                          |
| Área de Saúde          | PLANNED   |                15 | `docs/eng/experience.md` §3.10 | Pending bounded slice                                                                                                                                                                          |
| Convênio               | PLANNED   |                 5 | `docs/eng/experience.md` §3.11 | Pending bounded slice                                                                                                                                                                          |
| Ponto Eletrônico       | PLANNED   |                 7 | `docs/eng/experience.md` §3.12 | Pending bounded slice                                                                                                                                                                          |

## Installed Slice

Auditoria is the first installed group. The menu labels are materialized from
the admin feature catalog, navigation visibility requires `auditoria.read`, and
generated route entries use `permissionGuard` with route data for
`/auditoria/trilha/gestao`, `/auditoria/trilha/detalhes/:id`,
`/auditoria/relatorio/gestao`, `/auditoria/entidade/gestao`,
`/auditoria/usuario/gestao`, and `/auditoria/periodo/gestao`.

Remaining admin menu groups stay explicitly staged under `ADMIN_INSTALL_LATER`;
installing them requires the same route, permission, label, and test proof.

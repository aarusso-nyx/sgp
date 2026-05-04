# Functional Requisites Ledger

## Basal Snapshot Metadata

- Snapshot date: 2026-05-03.
- Live HEAD: 63f67c79ecff5745b7370ea1e7af4e0f1d010572.
- Workspaces: npm workspaces with roots backend/, frontend/; sgp-admin source is frontend/src/ and sgp-portal source is frontend/portal/.
- Backend: NestJS TypeScript with 7 entrypoints including backend/src/main-report-worker.ts; strict-mode posture is part of the accepted stack contract.
- Frontend: Angular ^21.2.0 admin and portal apps.
- DB: PostgreSQL; canonical SQL lives in database/sql/; backend/prisma/schema.prisma is informational and not runtime authority.
- Test runners: Jest backend, Vitest frontend, Playwright e2e.
- Package manager: npm@11.12.1; engine Node >=24.0.0 <25.
- CI: .github/workflows/source-ci.yml. Dispatcher: scripts/run.mjs plus scripts/lib/workspace-commands.mjs.

## Source Inputs

- docs/gov/evidence/implementation-status.md.
- docs/work/round-1/05-feature-matrix.md.
- docs/work/round-2/05-feature-matrix.md.
- docs/work/round-3/00-snapshot.md.
- docs/gov/evidence/deferred-decision-ledger.md.
- Regulatory anchors use the current docs/refs corpus.

## Domain Coverage

| domain                   | FR rows |
| ------------------------ | ------- |
| Cadastro                 | 20      |
| Folha                    | 37      |
| Pontuação/Frequência     | 11      |
| Férias/Licenças          | 18      |
| Benefícios               | 11      |
| Carreira                 | 12      |
| Aposentadoria/Pensão     | 14      |
| Recrutamento             | 1       |
| Compliance/eSocial       | 51      |
| Compliance/Fiscal        | 11      |
| Compliance/TCE           | 4       |
| Compliance/Transparência | 11      |
| Self-Service             | 14      |
| BI/Relatórios            | 8       |
| Cross-cutting            | 21      |

## Ledger

| FR-ID        | domain                   | description                    | status   | regulatory anchor                                | evidence (path:line)                       | last-touched round |
| ------------ | ------------------------ | ------------------------------ | -------- | ------------------------------------------------ | ------------------------------------------ | ------------------ |
| FR-ID        | domain                   | description                    | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | evidence (path:line)                       | last-touched round |
| FR-CAD-001   | Cadastro                 | cadastro-pessoa-fisica         | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:30  | R2                 |
| FR-CAD-002   | Cadastro                 | cadastro-dependentes           | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:31  | R2                 |
| FR-CAD-003   | Cadastro                 | cadastro-vinculo               | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:32  | R2                 |
| FR-CAD-004   | Cadastro                 | regime-juridico-estatutario    | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:33  | R2                 |
| FR-CAD-005   | Cadastro                 | regime-juridico-celetista      | PARTIAL  | docs/refs/legal/clt-rescisao-aviso-fgts.md       | docs/work/round-2/05-feature-matrix.md:34  | R2                 |
| FR-CAD-006   | Cadastro                 | regime-comissionado            | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:35  | R2                 |
| FR-CAD-007   | Cadastro                 | contratacao-temporaria         | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:36  | R2                 |
| FR-CAD-008   | Cadastro                 | terceirizados-prestadores      | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:37  | R2                 |
| FR-CAD-009   | Cadastro                 | estagiarios                    | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:38  | R2                 |
| FR-CAD-010   | Cadastro                 | cargos-empregos-funcoes        | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:39  | R2                 |
| FR-CAD-011   | Cadastro                 | tabela-rubricas                | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:40  | R2                 |
| FR-CAD-012   | Cadastro                 | tabela-lotacoes                | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:41  | R2                 |
| FR-CAD-013   | Cadastro                 | tabela-estabelecimentos        | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:42  | R2                 |
| FR-CAD-014   | Cadastro                 | tabela-horarios-jornadas       | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:43  | R2                 |
| FR-CAD-015   | Cadastro                 | tabela-ambientes-trabalho      | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:44  | R2                 |
| FR-CAD-016   | Cadastro                 | tabela-processos               | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:45  | R2                 |
| FR-CAD-017   | Cadastro                 | dados-bancarios                | DONE     | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-2/05-feature-matrix.md:46  | R2                 |
| FR-CAD-018   | Cadastro                 | endereco-contato               | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:47  | R2                 |
| FR-CAD-019   | Cadastro                 | documentos-digitalizados       | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:48  | R2                 |
| FR-CAD-020   | Cadastro                 | historico-funcional            | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:49  | R2                 |
| FR-FOL-001   | Folha                    | calculo-folha-mensal           | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:55  | R2                 |
| FR-FOL-002   | Folha                    | folha-13-salario               | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:56  | R2                 |
| FR-FOL-003   | Folha                    | folha-ferias                   | DONE     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:57  | R2                 |
| FR-FOL-004   | Folha                    | abono-pecuniario               | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:58  | R2                 |
| FR-FOL-005   | Folha                    | folha-rescisao                 | DONE     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:59  | R2                 |
| FR-FOL-006   | Folha                    | folha-complementar             | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:60  | R2                 |
| FR-FOL-007   | Folha                    | folha-suplementar-acordo       | TODO     | docs/refs/legal/clt-rescisao-aviso-fgts.md       | docs/work/round-2/05-feature-matrix.md:61  | R2                 |
| FR-FOL-008   | Folha                    | rubricas-proventos             | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:62  | R2                 |
| FR-FOL-009   | Folha                    | rubricas-descontos             | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:63  | R2                 |
| FR-FOL-010   | Folha                    | adicional-noturno              | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:64  | R2                 |
| FR-FOL-011   | Folha                    | adicional-insalubridade        | TODO     | docs/refs/legal/clt-rescisao-aviso-fgts.md       | docs/work/round-2/05-feature-matrix.md:65  | R2                 |
| FR-FOL-012   | Folha                    | adicional-periculosidade       | TODO     | docs/refs/legal/clt-rescisao-aviso-fgts.md       | docs/work/round-2/05-feature-matrix.md:66  | R2                 |
| FR-FOL-013   | Folha                    | adicional-tempo-servico        | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:67  | R2                 |
| FR-FOL-014   | Folha                    | gratificacao-natalina          | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:68  | R2                 |
| FR-FOL-015   | Folha                    | gratificacao-funcao            | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:69  | R2                 |
| FR-FOL-016   | Folha                    | salario-familia                | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:70  | R2                 |
| FR-FOL-017   | Folha                    | irrf-progressivo               | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:71  | R2                 |
| FR-FOL-018   | Folha                    | irrf-13-salario                | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:72  | R2                 |
| FR-FOL-019   | Folha                    | rpps-aliquota-progressiva      | DONE     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:73  | R2                 |
| FR-FOL-020   | Folha                    | rgps-aliquota                  | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:74  | R2                 |
| FR-FOL-021   | Folha                    | abono-permanencia              | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:75  | R2                 |
| FR-FOL-022   | Folha                    | teto-remuneratorio             | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:76  | R2                 |
| FR-FOL-023   | Folha                    | redutor-teto                   | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:77  | R2                 |
| FR-FOL-024   | Folha                    | acumulacao-licita              | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:78  | R2                 |
| FR-FOL-025   | Folha                    | pensao-alimenticia             | DONE     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:79  | R2                 |
| FR-FOL-026   | Folha                    | margem-consignavel             | DONE     | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-2/05-feature-matrix.md:80  | R2                 |
| FR-FOL-027   | Folha                    | consignacoes                   | DONE     | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-2/05-feature-matrix.md:81  | R2                 |
| FR-FOL-028   | Folha                    | media-vantagens                | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:82  | R2                 |
| FR-FOL-029   | Folha                    | rateio-orcamentario            | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:83  | R2                 |
| FR-FOL-030   | Folha                    | empenho-liquidacao             | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:84  | R2                 |
| FR-FOL-031   | Folha                    | bancarizacao-pagamento         | DONE     | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-2/05-feature-matrix.md:85  | R2                 |
| FR-FOL-032   | Folha                    | reprocessamento-folha          | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:86  | R2                 |
| FR-FOL-033   | Folha                    | simulacao-folha                | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:87  | R2                 |
| FR-FOL-034   | Folha                    | limite-despesa-pessoal         | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:88  | R2                 |
| FR-FOL-035   | Folha                    | reajuste-data-base             | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:89  | R2                 |
| FR-FOL-036   | Folha                    | s-2501-tributos-trabalhista    | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:90  | R2                 |
| FR-FOL-037   | Folha                    | s-2555-totalizacao-trabalhista | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-2/05-feature-matrix.md:91  | R2                 |
| FR-FREQ-001  | Pontuação/Frequência     | rep-p-integracao               | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:97  | R2                 |
| FR-FREQ-002  | Pontuação/Frequência     | rep-a-rep-c-integracao         | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:98  | R2                 |
| FR-FREQ-003  | Pontuação/Frequência     | afd-geracao                    | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:99  | R2                 |
| FR-FREQ-004  | Pontuação/Frequência     | afdt-acjef                     | TODO     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:100 | R2                 |
| FR-FREQ-005  | Pontuação/Frequência     | banco-de-horas                 | DONE     | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-2/05-feature-matrix.md:101 | R2                 |
| FR-FREQ-006  | Pontuação/Frequência     | escalas-plantoes               | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:102 | R2                 |
| FR-FREQ-007  | Pontuação/Frequência     | apuracao-frequencia            | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:103 | R2                 |
| FR-FREQ-008  | Pontuação/Frequência     | horas-extras                   | PARTIAL  | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:104 | R2                 |
| FR-FREQ-009  | Pontuação/Frequência     | adicional-noturno-apuracao     | TODO     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:105 | R2                 |
| FR-FREQ-010  | Pontuação/Frequência     | abono-justificativa            | DONE     | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-2/05-feature-matrix.md:106 | R2                 |
| FR-FREQ-011  | Pontuação/Frequência     | ponto-biometrico               | DONE     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-2/05-feature-matrix.md:107 | R2                 |
| FR-LIC-001   | Férias/Licenças          | programacao-ferias             | DONE     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:113 | R2                 |
| FR-LIC-002   | Férias/Licenças          | parcelamento-ferias            | PARTIAL  | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:114 | R2                 |
| FR-LIC-003   | Férias/Licenças          | abono-pecuniario-ferias        | PARTIAL  | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:115 | R2                 |
| FR-LIC-004   | Férias/Licenças          | licenca-saude-pericia          | DONE     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:116 | R2                 |
| FR-LIC-005   | Férias/Licenças          | licenca-maternidade            | PARTIAL  | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:117 | R2                 |
| FR-LIC-006   | Férias/Licenças          | empresa-cidada                 | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:118 | R2                 |
| FR-LIC-007   | Férias/Licenças          | licenca-paternidade            | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:119 | R2                 |
| FR-LIC-008   | Férias/Licenças          | licenca-adotante               | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:120 | R2                 |
| FR-LIC-009   | Férias/Licenças          | licenca-premio-capacitacao     | DEFERRED | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:121 | R2                 |
| FR-LIC-010   | Férias/Licenças          | licenca-interesse-particular   | PARTIAL  | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:122 | R2                 |
| FR-LIC-011   | Férias/Licenças          | licenca-acompanhar-conjuge     | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:123 | R2                 |
| FR-LIC-012   | Férias/Licenças          | licenca-mandato-classista      | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:124 | R2                 |
| FR-LIC-013   | Férias/Licenças          | licenca-atividade-politica     | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:125 | R2                 |
| FR-LIC-014   | Férias/Licenças          | licenca-mandato-eletivo        | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:126 | R2                 |
| FR-LIC-015   | Férias/Licenças          | afastamento-estudo-missao      | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:127 | R2                 |
| FR-LIC-016   | Férias/Licenças          | licenca-falecimento            | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:128 | R2                 |
| FR-LIC-017   | Férias/Licenças          | licenca-doacao-sangue          | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:129 | R2                 |
| FR-LIC-018   | Férias/Licenças          | licenca-pessoa-familia         | TODO     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-2/05-feature-matrix.md:130 | R2                 |
| FR-BEN-001   | Benefícios               | auxilio-alimentacao            | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:136 | R2                 |
| FR-BEN-002   | Benefícios               | vale-transporte                | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:137 | R2                 |
| FR-BEN-003   | Benefícios               | auxilio-saude                  | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:138 | R2                 |
| FR-BEN-004   | Benefícios               | auxilio-creche-pre-escolar     | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:139 | R2                 |
| FR-BEN-005   | Benefícios               | auxilio-funeral                | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:140 | R2                 |
| FR-BEN-006   | Benefícios               | auxilio-natalidade             | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:141 | R2                 |
| FR-BEN-007   | Benefícios               | auxilio-reclusao               | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:142 | R2                 |
| FR-BEN-008   | Benefícios               | auxilio-moradia                | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:143 | R2                 |
| FR-BEN-009   | Benefícios               | diarias-passagens              | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:144 | R2                 |
| FR-BEN-010   | Benefícios               | indenizacao-transporte         | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:145 | R2                 |
| FR-BEN-011   | Benefícios               | ajuda-custo                    | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:146 | R2                 |
| FR-CAR-001   | Carreira                 | concurso-publico-integracao    | DONE     | docs/refs/legal/concursos-publicos.md            | docs/work/round-2/05-feature-matrix.md:152 | R2                 |
| FR-CAR-002   | Carreira                 | nomeacao-posse-exercicio       | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:153 | R2                 |
| FR-CAR-003   | Carreira                 | estagio-probatorio             | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:154 | R2                 |
| FR-CAR-004   | Carreira                 | avaliacao-desempenho           | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:155 | R2                 |
| FR-CAR-005   | Carreira                 | progressao-funcional           | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:156 | R2                 |
| FR-CAR-006   | Carreira                 | promocao-vertical              | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:157 | R2                 |
| FR-CAR-007   | Carreira                 | pccs-tabela-vencimentos        | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:158 | R2                 |
| FR-CAR-008   | Carreira                 | capacitacao-treinamento        | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:159 | R2                 |
| FR-CAR-009   | Carreira                 | certificacoes-titulacao        | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:160 | R2                 |
| FR-CAR-010   | Carreira                 | movimentacao-remocao           | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:161 | R2                 |
| FR-CAR-011   | Carreira                 | substituicao-funcional         | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:162 | R2                 |
| FR-CAR-012   | Carreira                 | pad-sindicancia                | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-2/05-feature-matrix.md:163 | R2                 |
| FR-PREV-001  | Aposentadoria/Pensão     | aposentadoria-voluntaria-tempo | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:169 | R2                 |
| FR-PREV-002  | Aposentadoria/Pensão     | aposentadoria-voluntaria-idade | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:170 | R2                 |
| FR-PREV-003  | Aposentadoria/Pensão     | aposentadoria-compulsoria      | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:171 | R2                 |
| FR-PREV-004  | Aposentadoria/Pensão     | aposentadoria-invalidez        | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:172 | R2                 |
| FR-PREV-005  | Aposentadoria/Pensão     | aposentadoria-especial         | TODO     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:173 | R2                 |
| FR-PREV-006  | Aposentadoria/Pensão     | calculo-proventos-ec103        | DONE     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:174 | R2                 |
| FR-PREV-007  | Aposentadoria/Pensão     | regras-transicao-ec103         | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:175 | R2                 |
| FR-PREV-008  | Aposentadoria/Pensão     | paridade-integralidade         | TODO     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:176 | R2                 |
| FR-PREV-009  | Aposentadoria/Pensão     | revisao-proventos              | TODO     | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:177 | R2                 |
| FR-PREV-010  | Aposentadoria/Pensão     | pensao-por-morte               | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:178 | R2                 |
| FR-PREV-011  | Aposentadoria/Pensão     | dependentes-pensao             | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:179 | R2                 |
| FR-PREV-012  | Aposentadoria/Pensão     | rateio-pensao                  | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:180 | R2                 |
| FR-PREV-013  | Aposentadoria/Pensão     | comprev-rpps                   | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:181 | R2                 |
| FR-PREV-014  | Aposentadoria/Pensão     | ctc-tempo-contribuicao         | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-2/05-feature-matrix.md:182 | R2                 |
| FR-REC-001   | Recrutamento             | banco-de-talentos-crud         | PARTIAL  | docs/refs/legal/concursos-publicos.md            | docs/work/round-3/00-snapshot.md:30        | R3                 |
| FR-ESOC-001  | Compliance/eSocial       | esocial-baseline-S13           | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:180 | R1                 |
| FR-ESOC-002  | Compliance/eSocial       | esocial-s1000                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:181 | R1                 |
| FR-ESOC-003  | Compliance/eSocial       | esocial-s1005                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:182 | R1                 |
| FR-ESOC-004  | Compliance/eSocial       | esocial-s1010                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:183 | R1                 |
| FR-ESOC-005  | Compliance/eSocial       | esocial-s1020                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:184 | R1                 |
| FR-ESOC-006  | Compliance/eSocial       | esocial-s1030                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:185 | R1                 |
| FR-ESOC-007  | Compliance/eSocial       | esocial-s1035                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:186 | R1                 |
| FR-ESOC-008  | Compliance/eSocial       | esocial-s1040                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:187 | R1                 |
| FR-ESOC-009  | Compliance/eSocial       | esocial-s1050                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:188 | R1                 |
| FR-ESOC-010  | Compliance/eSocial       | esocial-s1060                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:189 | R1                 |
| FR-ESOC-011  | Compliance/eSocial       | esocial-s1070                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:190 | R1                 |
| FR-ESOC-012  | Compliance/eSocial       | esocial-s2200                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:191 | R1                 |
| FR-ESOC-013  | Compliance/eSocial       | esocial-s2205                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:192 | R1                 |
| FR-ESOC-014  | Compliance/eSocial       | esocial-s2206                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:193 | R1                 |
| FR-ESOC-015  | Compliance/eSocial       | esocial-s2210                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:194 | R1                 |
| FR-ESOC-016  | Compliance/eSocial       | esocial-s2220                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:195 | R1                 |
| FR-ESOC-017  | Compliance/eSocial       | esocial-s2230                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:196 | R1                 |
| FR-ESOC-018  | Compliance/eSocial       | esocial-s2231                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:197 | R1                 |
| FR-ESOC-019  | Compliance/eSocial       | esocial-s2240                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:198 | R1                 |
| FR-ESOC-020  | Compliance/eSocial       | esocial-s2250                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:199 | R1                 |
| FR-ESOC-021  | Compliance/eSocial       | esocial-s2260                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:200 | R1                 |
| FR-ESOC-022  | Compliance/eSocial       | esocial-s2298                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:201 | R1                 |
| FR-ESOC-023  | Compliance/eSocial       | esocial-s2299                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:202 | R1                 |
| FR-ESOC-024  | Compliance/eSocial       | esocial-s2300                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:203 | R1                 |
| FR-ESOC-025  | Compliance/eSocial       | esocial-s2306                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:204 | R1                 |
| FR-ESOC-026  | Compliance/eSocial       | esocial-s2399                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:205 | R1                 |
| FR-ESOC-027  | Compliance/eSocial       | esocial-s2400                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:206 | R1                 |
| FR-ESOC-028  | Compliance/eSocial       | esocial-s2405                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:207 | R1                 |
| FR-ESOC-029  | Compliance/eSocial       | esocial-s2410                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:208 | R1                 |
| FR-ESOC-030  | Compliance/eSocial       | esocial-s2416                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:209 | R1                 |
| FR-ESOC-031  | Compliance/eSocial       | esocial-s2418                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:210 | R1                 |
| FR-ESOC-032  | Compliance/eSocial       | esocial-s2420                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:211 | R1                 |
| FR-ESOC-033  | Compliance/eSocial       | esocial-s1200                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:212 | R1                 |
| FR-ESOC-034  | Compliance/eSocial       | esocial-s1202                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:213 | R1                 |
| FR-ESOC-035  | Compliance/eSocial       | esocial-s1207                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:214 | R1                 |
| FR-ESOC-036  | Compliance/eSocial       | esocial-s1210                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:215 | R1                 |
| FR-ESOC-037  | Compliance/eSocial       | esocial-s1260                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:216 | R1                 |
| FR-ESOC-038  | Compliance/eSocial       | esocial-s1270                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:217 | R1                 |
| FR-ESOC-039  | Compliance/eSocial       | esocial-s1280                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:218 | R1                 |
| FR-ESOC-040  | Compliance/eSocial       | esocial-s1295                  | TODO     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:219 | R1                 |
| FR-ESOC-041  | Compliance/eSocial       | esocial-s1298                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:220 | R1                 |
| FR-ESOC-042  | Compliance/eSocial       | esocial-s1299                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:221 | R1                 |
| FR-ESOC-043  | Compliance/eSocial       | esocial-s5001                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:222 | R1                 |
| FR-ESOC-044  | Compliance/eSocial       | esocial-s5002                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:223 | R1                 |
| FR-ESOC-045  | Compliance/eSocial       | esocial-s5003                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:224 | R1                 |
| FR-ESOC-046  | Compliance/eSocial       | esocial-s5011                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:225 | R1                 |
| FR-ESOC-047  | Compliance/eSocial       | esocial-s5012                  | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:226 | R1                 |
| FR-ESOC-048  | Compliance/eSocial       | esocial-s5013                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:227 | R1                 |
| FR-ESOC-049  | Compliance/eSocial       | esocial-s3000                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:228 | R1                 |
| FR-ESOC-050  | Compliance/eSocial       | esocial-assinatura-digital     | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:229 | R1                 |
| FR-ESOC-051  | Compliance/eSocial       | esocial-trilha-retorno         | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:230 | R1                 |
| FR-FISC-001  | Compliance/Fiscal        | dctfweb                        | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:236 | R3                 |
| FR-FISC-002  | Compliance/Fiscal        | dctfweb-mit                    | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:237 | R1                 |
| FR-FISC-003  | Compliance/Fiscal        | darf-previdenciario            | PARTIAL  | docs/refs/legal/ec-103-previdencia.md            | docs/work/round-1/05-feature-matrix.md:238 | R1                 |
| FR-FISC-004  | Compliance/Fiscal        | dirf-anual                     | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:239 | R1                 |
| FR-FISC-005  | Compliance/Fiscal        | comprovante-rendimentos        | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:240 | R1                 |
| FR-FISC-006  | Compliance/Fiscal        | rais-historico                 | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:241 | R1                 |
| FR-FISC-007  | Compliance/Fiscal        | manad                          | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:242 | R1                 |
| FR-FISC-008  | Compliance/Fiscal        | siope                          | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:243 | R1                 |
| FR-FISC-009  | Compliance/Fiscal        | siops                          | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:244 | R1                 |
| FR-FISC-010  | Compliance/Fiscal        | efd-reinf                      | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:245 | R3                 |
| FR-FISC-011  | Compliance/Fiscal        | per-dcomp                      | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:246 | R1                 |
| FR-TCE-001   | Compliance/TCE           | tce-export-pluggable           | DONE     | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:252 | R1                 |
| FR-TCE-002   | Compliance/TCE           | tce-folha-mensal               | DONE     | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:253 | R1                 |
| FR-TCE-003   | Compliance/TCE           | tce-atos-pessoal               | DEFERRED | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:254 | R1                 |
| FR-TCE-004   | Compliance/TCE           | tce-rreo-rgf                   | DEFERRED | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:255 | R1                 |
| FR-TRANS-001 | Compliance/Transparência | portal-transparencia-folha     | DONE     | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:261 | R1                 |
| FR-TRANS-002 | Compliance/Transparência | lai-pedidos-acesso             | TODO     | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:262 | R1                 |
| FR-TRANS-003 | Compliance/Transparência | transparencia-ativa            | DONE     | docs/refs/tce/00-pluggable-contract.md           | docs/work/round-1/05-feature-matrix.md:263 | R1                 |
| FR-TRANS-004 | Compliance/Transparência | lgpd-base-legal                | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:264 | R1                 |
| FR-TRANS-005 | Compliance/Transparência | lgpd-rop                       | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:265 | R1                 |
| FR-TRANS-006 | Compliance/Transparência | lgpd-direitos-titular          | PARTIAL  | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:266 | R1                 |
| FR-TRANS-007 | Compliance/Transparência | lgpd-retencao                  | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:267 | R1                 |
| FR-TRANS-008 | Compliance/Transparência | lgpd-anonimizacao              | DONE     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:268 | R1                 |
| FR-TRANS-009 | Compliance/Transparência | lgpd-incidente-rcis            | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:269 | R1                 |
| FR-TRANS-010 | Compliance/Transparência | lgpd-dpo                       | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:270 | R1                 |
| FR-TRANS-011 | Compliance/Transparência | lgpd-tratamento-poder-publico  | TODO     | docs/refs/lgpd/lei-13709.md                      | docs/work/round-1/05-feature-matrix.md:271 | R1                 |
| FR-SELF-001  | Self-Service             | portal-servidor-contracheque   | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:277 | R1                 |
| FR-SELF-002  | Self-Service             | portal-comprovante-anual       | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:278 | R1                 |
| FR-SELF-003  | Self-Service             | portal-margem-consignavel      | PARTIAL  | docs/refs/legal/consignacoes-margem-lei-14509.md | docs/work/round-1/05-feature-matrix.md:279 | R1                 |
| FR-SELF-004  | Self-Service             | portal-ferias                  | DONE     | docs/refs/legal/decimo-terceiro-ferias.md        | docs/work/round-1/05-feature-matrix.md:280 | R1                 |
| FR-SELF-005  | Self-Service             | portal-atualizacao-cadastral   | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:281 | R1                 |
| FR-SELF-006  | Self-Service             | portal-declaracoes             | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:282 | R1                 |
| FR-SELF-007  | Self-Service             | portal-aso                     | PARTIAL  | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:283 | R1                 |
| FR-SELF-008  | Self-Service             | portal-licencas-solicitacao    | DONE     | docs/refs/legal/licencas-estatutarias.md         | docs/work/round-1/05-feature-matrix.md:284 | R1                 |
| FR-SELF-009  | Self-Service             | portal-historico-funcional     | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:285 | R1                 |
| FR-SELF-010  | Self-Service             | portal-autenticacao-govbr      | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:286 | R1                 |
| FR-SELF-011  | Self-Service             | portal-assinatura-govbr        | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:287 | R1                 |
| FR-SELF-012  | Self-Service             | manager-self-service           | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:288 | R1                 |
| FR-SELF-013  | Self-Service             | manager-equipe-dashboard       | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:289 | R1                 |
| FR-SELF-014  | Self-Service             | workflow-multi-nivel           | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:290 | R1                 |
| FR-BI-001    | BI/Relatórios            | folha-resumo-financeiro        | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:296 | R1                 |
| FR-BI-002    | BI/Relatórios            | demonstrativo-pessoal-lrf      | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:297 | R1                 |
| FR-BI-003    | BI/Relatórios            | quadro-pessoal                 | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:298 | R1                 |
| FR-BI-004    | BI/Relatórios            | relatorios-gerenciais          | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:299 | R1                 |
| FR-BI-005    | BI/Relatórios            | folha-comparativa              | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:300 | R1                 |
| FR-BI-006    | BI/Relatórios            | indicadores-rh                 | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:301 | R1                 |
| FR-BI-007    | BI/Relatórios            | relatorios-fiscalizacao        | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:302 | R1                 |
| FR-BI-008    | BI/Relatórios            | exportacao-csv-xlsx-pdf        | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:303 | R1                 |
| FR-XCUT-001  | Cross-cutting            | trilha-auditoria               | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:309 | R1                 |
| FR-XCUT-002  | Cross-cutting            | controle-acesso-rbac           | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:310 | R1                 |
| FR-XCUT-003  | Cross-cutting            | autenticacao-mfa               | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:311 | R1                 |
| FR-XCUT-004  | Cross-cutting            | criptografia-em-repouso        | PARTIAL  | docs/refs/legal/portaria-671-ponto.md            | docs/work/round-1/05-feature-matrix.md:312 | R1                 |
| FR-XCUT-005  | Cross-cutting            | backup-disaster-recovery       | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:313 | R1                 |
| FR-XCUT-006  | Cross-cutting            | gestao-documentos              | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:314 | R1                 |
| FR-XCUT-007  | Cross-cutting            | assinatura-icp-brasil          | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:315 | R1                 |
| FR-XCUT-008  | Cross-cutting            | assinatura-govbr-avancada      | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:316 | R1                 |
| FR-XCUT-009  | Cross-cutting            | integracao-siape-equiv         | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:317 | R1                 |
| FR-XCUT-010  | Cross-cutting            | integracao-siafi-equiv         | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:318 | R1                 |
| FR-XCUT-011  | Cross-cutting            | siafic-conformidade            | DEFERRED | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:319 | R1                 |
| FR-XCUT-012  | Cross-cutting            | api-publica-integracao         | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:320 | R1                 |
| FR-XCUT-013  | Cross-cutting            | versionamento-parametros       | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:321 | R1                 |
| FR-XCUT-014  | Cross-cutting            | calendario-competencia         | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:322 | R1                 |
| FR-XCUT-015  | Cross-cutting            | multi-orgao-tenancy            | DONE     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:323 | R1                 |
| FR-XCUT-016  | Cross-cutting            | acessibilidade-emag            | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:324 | R1                 |
| FR-XCUT-017  | Cross-cutting            | logs-retencao                  | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:325 | R1                 |
| FR-XCUT-018  | Cross-cutting            | sst-pgr-pcmso                  | DONE     | docs/refs/esocial/00-index.md                    | docs/work/round-1/05-feature-matrix.md:326 | R1                 |
| FR-XCUT-019  | Cross-cutting            | cipa-eleicao                   | TODO     | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:327 | R1                 |
| FR-XCUT-020  | Cross-cutting            | onboarding-checklist           | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:328 | R1                 |
| FR-XCUT-021  | Cross-cutting            | offboarding-checklist          | PARTIAL  | docs/refs/legal/lei-14133-licitacoes.md          | docs/work/round-1/05-feature-matrix.md:329 | R1                 |

## 1. Mission

Produce a single authoritative answer to the question:

> _Is SPG a complete full-featured HR/Payroll platform for both Brazilian corporate (CLT-based) and governmental (estatutário-based) employers, including all legally required features and integrations?_
> The output is a **feature matrix** with these columns:
> | ID | Domain | Feature | Description | Applies to | Tier (M1/M2/M3/O1/O2/O3) | Legal/regulatory citation | Presence in SPG | Evidence | Notes |
> Plus aggregate coverage metrics broken down by tier and applicability.

## **Out of scope for this prompt:** code quality, DRY, idiomatics, error handling, test quality, performance, round-0 delta, legacy parity, velocity. Those belong to other audits. This audit reports **feature presence only**.

## 2. Stack Recap

## npm + NestJS (TypeScript) + PostgreSQL + Angular. Detect ORM, test runners, and workspace tool empirically.

## 3. Operating Principles

1. **Read-only.** No code modification, no migration runs, no `npm run build`, no execution of code with side-effects.
2. **Evidence over assumption.** Every "present" claim cites `relative/path.ts:LINE` (preferring the most representative file: a controller, a service method, a migration, an Angular route). Absence of evidence → mark `Absent` and write `not located`.
3. **Three places to look** for a feature, in this order: (a) database migrations, (b) NestJS modules/controllers/services, (c) Angular routes/components. A feature is `Present` only when all three layers exist; otherwise use the partial-presence labels in §6.
4. **Strict classification.** A feature is M1 only if a federal law, constitutional article, RFB/SPREV/MTP normative, NR, eSocial obligatory event, or ANPD resolution requires it. Cite the source. No M1 claim without citation.
5. **Conservative presence.** When uncertain between two presence levels, pick the lower. Do not infer business behavior from identifier names alone — a table called `folha_calculo` with no service methods and no UI is `D` (DB-stub), not `P` (Present).
6. **No fabrication.** `(unverified)` is mandatory when proof is missing.
7. **Web research is mandatory in Phase 1.B.** Do not rely on training-data memory for current eSocial layout version, NR/Portaria currency, or recent ANPD resolutions.
8. **Structured deliverables only.** Markdown under `./docs/work/feature-audit/`.

---

## 4. Model Assignment

The orchestrator (the main agent) is **Claude Opus 4.7** at high effort. Sub-agent dispatch:

| Phase                                                                                                          | Task                                 | Model      | Effort | Rationale                               |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------- | ------ | --------------------------------------- |
| **Orchestrator**                                                                                               | Coordination, dispatch, gating       | Opus 4.7   | high   | Multi-phase synthesis                   |
| 0                                                                                                              | Snapshot                             | Haiku 4.5  | low    | Mechanical                              |
| 1.A                                                                                                            | Load embedded catalog                | Haiku 4.5  | low    | Copy + structure                        |
| 1.B                                                                                                            | Catalog extension via web research   | Sonnet 4.6 | medium | Web search, primary-source verification |
| 2.A                                                                                                            | DB schema enumeration                | Haiku 4.5  | low    | Mechanical migration scan               |
| 2.B                                                                                                            | Backend module/route inventory       | Sonnet 4.6 | medium | Walk @Module/@Controller/@Injectable    |
| 2.C                                                                                                            | Frontend route/screen inventory      | Sonnet 4.6 | medium | Walk Angular routes/components          |
| 3                                                                                                              | Cross-reference (presence detection) | Sonnet 4.6 | medium | Match catalog items to inventory        |
| 4                                                                                                              | Tier classification (M/O assignment) | Opus 4.7   | high   | Legal judgment with citation            |
| 5                                                                                                              | Master feature matrix synthesis      | Opus 4.7   | high   | Aggregate, format, validate             |
| 6                                                                                                              | Coverage summary + go-live verdict   | Opus 4.7   | high   | Judgment-heavy                          |
| §11                                                                                                            | Self-check                           | Haiku 4.5  | low    | File-existence checks                   |
| Effort: low ≈ minimal extended thinking; medium ≈ standard; high ≈ extended budget for multi-source synthesis. |

---

## 5. Phase 0 — Snapshot

`[Model: Haiku 4.5 · Effort: low]`

- `git rev-parse HEAD`, current branch, `git status --porcelain`.
- Detect ORM (TypeORM / Prisma / Knex), test runners, workspace tool.
- Top-level layout depth 3, ignoring `node_modules`, `dist`, `.git`, `coverage`.
- Root configs: `package.json`, `tsconfig*.json`, `nest-cli.json`, `angular.json`.
  **Deliverable:** `docs/work/feature-audit/00-snapshot.md`.

---

## 6. Presence Taxonomy (authoritative)

Each feature is classified into exactly one of:

| Code                                                                                                                                                                                                                                                                                        | Label                  | Definition                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| **P**                                                                                                                                                                                                                                                                                       | Present                | Backend logic + DB schema + UI surface all exist; happy path is wired end-to-end. |
| **B**                                                                                                                                                                                                                                                                                       | Backend-only           | Backend logic and DB exist; no Angular surface.                                   |
| **F**                                                                                                                                                                                                                                                                                       | Frontend-only          | Angular surface exists; no backend logic (rare; usually a partial WIP).           |
| **D**                                                                                                                                                                                                                                                                                       | DB-stub                | Tables exist; no service methods or controller routes that exercise the domain.   |
| **A**                                                                                                                                                                                                                                                                                       | Absent                 | No evidence in DB, backend, or frontend.                                          |
| **X**                                                                                                                                                                                                                                                                                       | Out-of-scope by design | Explicitly excluded; cite ADR or `BACKLOG.md` entry stating the exclusion.        |
| **Disambiguation.** When evidence is consistent with two adjacent codes, pick the lower-presence one (e.g., B over P, D over B). Identifier names alone do not establish presence — a table called `aposentadoria` with no migrations populating it and no service methods is `A`, not `D`. |

---

## 7. Tier Taxonomy (authoritative)

Each feature carries exactly one tier:

| Tier                                                                                                                                                                                                                                                                                   | Label                               | Definition                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**                                                                                                                                                                                                                                                                                 | Legally mandatory                   | Required by federal law, constitutional article, RFB/SPREV/MTP/ANPD normative, NR, or eSocial obligatory event for the applicable regime. **Must cite the source.**                             |
| **M2**                                                                                                                                                                                                                                                                                 | Practically mandatory               | The system cannot operate as a payroll platform without it (e.g., banco integration for crédito em conta, cadastro de pessoa física). Not legally cited, but no real-world deployment lacks it. |
| **M3**                                                                                                                                                                                                                                                                                 | Mandatory by ETP/TR/Edital/Contrato | Required by the project's contractual instruments (the procurement spec). Cite the contract clause.                                                                                             |
| **O1**                                                                                                                                                                                                                                                                                 | Standard market expectation         | Modern HR/Payroll products commonly include it (BI, self-service, manager workflows). Not legally required.                                                                                     |
| **O2**                                                                                                                                                                                                                                                                                 | Differentiator                      | Adds value beyond market baseline (advanced BI, mobile, AI assistance).                                                                                                                         |
| **O3**                                                                                                                                                                                                                                                                                 | Out-of-scope by SPG design          | Explicitly excluded by ADR / project decision; cite the document.                                                                                                                               |
| **Strict rule.** No M1 claim is valid without a primary-source citation (`Lei NNN/AAAA, art. N`, `IN RFB N/AAAA`, `Portaria MTP NNN/AAAA`, `NR-N`, `eSocial Manual de Orientação versão X`, `Resolução ANPD N/AAAA`). Unsourced "obviously mandatory" claims must be downgraded to M2. |

---

## 8. Phase 1 — Authoritative Feature Catalog

### 8.A Load embedded catalog

`[Model: Haiku 4.5 · Effort: low]`
The catalog below is the **starter spine**. Copy it verbatim into `docs/work/feature-audit/01a-catalog-embedded.md`, normalized to the row schema:

```
| ID | Domain | Feature | Description | Applies to | Provisional tier |
```

Where `Applies to ∈ {Corp, Gov, Both}`.

#### A. Cadastro Pessoal

- A.01 Cadastro de pessoa física (nome, CPF, RG, PIS/PASEP/NIT, dados de nascimento, filiação, naturalidade) — Both — M2
- A.02 Endereço residencial e correspondência — Both — M2
- A.03 Contato (telefone, email) — Both — M2
- A.04 Documentos digitalizados (RG, CPF, comprovante de residência, título eleitor, reservista, CTPS digital) — Both — M2
- A.05 Estado civil e dependentes (com documentação) — Both — M1 _(IRPF dependents: IN RFB)_
- A.06 PCD com CID e laudo — Both — M1 _(LBI; eSocial S-2200/S-2206)_
- A.07 Conta bancária com validação — Both — M2
- A.08 Formação acadêmica — Both — O1
- A.09 Experiência profissional anterior — Both — O1
- A.10 Cônjuge / dependentes para IR — Both — M1 _(IN RFB Comprovante de Rendimentos)_
- A.11 Beneficiários de pensão — Both — M1 _(EC 103; CPC para alimentos)_
- A.12 Foto / digital / biometria — Both — O1

#### B. Cadastro Funcional (Vínculo)

- B.01 Múltiplos vínculos por pessoa (acumulação lícita) — Gov — M1 _(CF 37 XVI)_
- B.02 Regime jurídico (estatutário, CLT, comissionado, temporário, estagiário, aprendiz, intermitente) — Both — M1 _(CF; Lei 8.112; CLT; Lei 11.788; Lei 10.097; Lei 13.467)_
- B.03 Cargo / função / especialidade — Both — M2
- B.04 Lotação / unidade organizacional — Both — M2
- B.05 Histórico funcional (todas movimentações) — Both — M1 _(eSocial S-2206; Lei 8.112 art. 13)_
- B.06 Datas de admissão, posse, exercício — Both — M1 _(Lei 8.112; CLT)_
- B.07 Tempo de serviço (computação, averbações) — Both — M1 _(EC 103; Lei 8.213)_
- B.08 Estabilidade — Gov — M1 _(CF 41)_
- B.09 Estágio probatório — Gov — M1 _(CF 41 §4º; Lei 8.112)_
- B.10 Vínculo previdenciário (RGPS / RPPS) e regime de entrada — Both — M1 _(Lei 8.213; Lei 9.717; EC 103)_

#### C. Cargos, Carreiras, Tabela Salarial

- C.01 Cadastro de cargos — Both — M2
- C.02 Plano de carreira / PCCS — Both — M2
- C.03 Tabela salarial (níveis, classes, padrões) — Both — M2
- C.04 Vencimentos básicos vs gratificações — Both — M2
- C.05 Reajustes salariais (lei, dissídio, CCT/ACT) — Both — M1 _(CLT 611-A para CCT/ACT; CF 37 X para gov)_
- C.06 Histórico de tabelas — Both — M2

#### D. Folha de Pagamento — Núcleo

- D.01 Cadastro de rubricas com bases de incidência — Both — M2
- D.02 Cálculo de folha mensal — Both — M1 _(CLT 459; Lei 8.112 art. 41-)_
- D.03 Folha de 13º (1ª e 2ª parcelas) — Both — M1 _(CF 7º VIII; Lei 4.090/1962)_
- D.04 Folha de férias — Both — M1 _(CF 7º XVII)_
- D.05 Folhas suplementares / extraordinárias — Both — M2
- D.06 Folha de rescisão — Corp — M1 _(CLT 477)_
- D.07 Folha de adiantamento — Both — O1
- D.08 Cálculo retroativo (qualquer competência fechada) — Both — M2
- D.09 Reprocessamento idempotente — Both — M2
- D.10 Fechamento e reabertura de competência — Both — M2
- D.11 Lançamentos manuais (eventuais) — Both — M2
- D.12 Lançamentos via importação (CSV/Excel) — Both — O1
- D.13 Conferência prévia ("simulação") — Both — O1
- D.14 Cálculo de IRRF (tabela progressiva, dependentes, pensão alimentícia, deduções) — Both — M1 _(IN RFB 1500/2014; Lei 7.713/1988)_
- D.15 Cálculo de INSS RGPS (alíquota progressiva pós-EC 103) — Corp — M1 _(EC 103; Portaria SEPRT 477/2021)_
- D.16 Cálculo de RPPS (alíquotas progressivas, contribuição patronal) — Gov — M1 _(EC 103; Lei 9.717)_
- D.17 Cálculo de FGTS (8%) — Corp — M1 _(Lei 8.036/1990)_
- D.18 Adicional noturno — Both — M1 _(CF 7º IX; CLT 73; Lei 8.112 art. 75)_
- D.19 Insalubridade (10/20/40%) — Both — M1 _(CF 7º XXIII; CLT 192; Lei 8.112 art. 68)_
- D.20 Periculosidade (30%) — Both — M1 _(CF 7º XXIII; CLT 193; Lei 8.112 art. 68)_
- D.21 ATS / triênios / quinquênios / sexta-parte — Gov — M1 _(varia por estatuto; CF 39 §1º)_
- D.22 Horas extras (50%, 100%, dobradas) — Corp — M1 _(CF 7º XVI; CLT 59)_
- D.23 Adicional de função / chefia / encargos especiais — Both — M2
- D.24 Gratificação natalina — Both — M1 _(Lei 4.090/1962; estatutos)_
- D.25 Auxílio-doença (15 dias empresa + INSS) — Corp — M1 _(Lei 8.213 art. 60)_
- D.26 Salário-maternidade — Both — M1 _(CF 7º XVIII; Lei 8.213)_
- D.27 Salário-família (RGPS) — Corp — M1 _(CF 7º XII; Lei 8.213)_
- D.28 Pensão alimentícia judicial (% ou valor; múltiplos beneficiários) — Both — M1 _(CPC; CC arts. 1.694-)_
- D.29 Empréstimos consignados (controle de margem; averbação) — Both — M1 _(Lei 14.131/2021; Lei 10.820/2003)_
- D.30 Teto remuneratório com abate-teto — Gov — M1 _(CF 37 XI)_
- D.31 Subtetos (estados, municípios, poderes) — Gov — M1 _(CF 37 XI)_
- D.32 Acumulação lícita — soma para teto — Gov — M1 _(CF 37 XVI; STF jurisprudência)_
- D.33 Devolução ao erário / parcelamento — Gov — M1 _(Lei 8.112 art. 46)_
- D.34 Benefícios in natura tributáveis — Both — M1 _(IN RFB)_
- D.35 Reembolsos não tributáveis — Both — M2

#### E. Tempo e Frequência (Ponto)

- E.01 Importação AFD (REP-P / REP-A / REP-C) — Both — M1 _(Portaria MTP 671/2021)_
- E.02 Apuração de marcações — Both — M1
- E.03 Tratamento de exceções (atrasos, faltas, abonos) — Both — M2
- E.04 Banco de horas — Both — M1 _(CLT 59 §2º)_
- E.05 Compensação — Both — M2
- E.06 Escalas e turnos — Both — M2
- E.07 Plantões — Both — M2
- E.08 Sobreaviso — Both — M1 _(CLT 244)_
- E.09 Adicional noturno apurado por marcação — Both — M2
- E.10 Horas extras autorizadas — Both — M2
- E.11 Justificativa de ausência — Both — M2
- E.12 Espelho de ponto — Both — M1 _(Portaria MTP 671)_

#### F. Férias

- F.01 Programação anual de férias — Both — M2
- F.02 Aquisição (período aquisitivo) — Both — M1 _(CLT 130; Lei 8.112)_
- F.03 Cálculo de avos — Both — M1
- F.04 Gozo (parcelado em até 3 períodos para CLT) — Both — M1 _(CLT 134; Lei 13.467/2017)_
- F.05 Abono pecuniário (até 10 dias) — Both — M1 _(CLT 143)_
- F.06 Adicional 1/3 constitucional — Both — M1 _(CF 7º XVII)_
- F.07 Adiantamento de férias — Both — M1 _(CLT 145)_
- F.08 Cancelamento e suspensão — Both — M2
- F.09 Aviso de férias — Both — M1 _(CLT 135)_

#### G. Licenças e Afastamentos

- G.01 Licença saúde (perícia) — Both — M1 _(Lei 8.213; Lei 8.112)_
- G.02 Licença maternidade (120/180 dias; Empresa Cidadã) — Both — M1 _(Lei 8.213; Lei 11.770/2008)_
- G.03 Licença paternidade (5/20 dias) — Both — M1 _(CF 7º XIX; Lei 13.257/2016)_
- G.04 Licença prêmio — Gov — M1 _(estatutos diversos)_
- G.05 Licença para capacitação — Gov — M1 _(Lei 8.112 art. 87)_
- G.06 Licença para tratar interesses particulares — Gov — M1 _(Lei 8.112 art. 91)_
- G.07 Licença para acompanhar cônjuge — Gov — M1 _(Lei 8.112 art. 84)_
- G.08 Licença por motivo de doença em pessoa da família — Gov — M1 _(Lei 8.112 art. 83)_
- G.09 Afastamento para cargo eletivo — Gov — M1 _(Lei 8.112 art. 94)_
- G.10 Afastamento para mandato classista — Gov — M1
- G.11 Afastamento para serviço militar — Both — M1
- G.12 Cessão / disposição (entre órgãos) — Gov — M1 _(Lei 8.112 art. 93)_
- G.13 Suspensão disciplinar — Both — M1 _(CLT 474; Lei 8.112)_

#### H. Benefícios

- H.01 Vale-transporte (desconto até 6%) — Corp — M1 _(Lei 7.418/1985; Decreto 95.247)_
- H.02 Vale-alimentação / refeição (PAT) — Corp — O1 _(Lei 6.321/1976 — opcional, fiscal)_
- H.03 Plano de saúde (titular + dependentes) — Both — O1
- H.04 Plano odontológico — Both — O1
- H.05 Auxílio-creche / pré-escolar — Both — O1
- H.06 Seguro de vida em grupo — Both — O1
- H.07 Previdência privada / complementar — Both — O1
- H.08 Auxílio-funeral — Gov — M1 _(estatutos)_
- H.09 Auxílio-moradia — Gov — M3
- H.10 Auxílio-fardamento — Gov — M3

#### I. Carreira e Desenvolvimento

- I.01 Avaliação de desempenho funcional — Gov — M1 _(CF 41 §1º III; Lei 8.112)_
- I.02 Progressão (horizontal — referência/padrão) — Gov — M1 _(planos de carreira)_
- I.03 Promoção (vertical — classe) — Gov — M1
- I.04 Estágio probatório com avaliações periódicas — Gov — M1 _(CF 41; Lei 8.112)_
- I.05 Concursos públicos — integration com listas e classificação — Gov — M1 _(CF 37 II)_
- I.06 Nomeação, posse, exercício — Gov — M1 _(Lei 8.112 art. 13)_
- I.07 Recrutamento e seleção — Corp — O1
- I.08 Treinamento e capacitação — Both — O1
- I.09 Certificações — Both — O1
- I.10 Plano de desenvolvimento individual — Both — O2

#### J. Aposentadoria e Pensão (governamental)

- J.01 Cálculo de proventos de aposentadoria — Gov — M1 _(EC 103; Lei 9.717)_
- J.02 Aposentadoria voluntária (tempo / idade) — Gov — M1 _(CF 40; EC 103)_
- J.03 Aposentadoria por invalidez — Gov — M1 _(CF 40; EC 103)_
- J.04 Aposentadoria compulsória (75 anos) — Gov — M1 _(CF 40 §1º II; LC 152/2015)_
- J.05 Abono permanência — Gov — M1 _(EC 103 art. 3º §1º)_
- J.06 Pensão por morte (cálculo, regras EC 103) — Gov — M1 _(EC 103 art. 23)_
- J.07 Cota individual / cota familiar — Gov — M1 _(EC 103)_
- J.08 Cessação de cota — Gov — M1
- J.09 Revisão de aposentadoria — Gov — M1
- J.10 Recadastramento de inativos e pensionistas (prova de vida) — Gov — M1 _(varia por ente; Lei 9.527/1997)_

#### K. Rescisões (corporate)

- K.01 Rescisão sem justa causa (empregador) — Corp — M1 _(CLT 477)_
- K.02 Rescisão com justa causa — Corp — M1 _(CLT 482)_
- K.03 Pedido de demissão — Corp — M1 _(CLT 487)_
- K.04 Acordo (Lei 13.467) — Corp — M1 _(CLT 484-A)_
- K.05 Rescisão indireta — Corp — M1 _(CLT 483)_
- K.06 Término de contrato a termo — Corp — M1 _(CLT 479)_
- K.07 Aposentadoria — Corp — M1
- K.08 Falecimento — Both — M1
- K.09 TRCT (Termo de Rescisão de Contrato de Trabalho) — Corp — M1 _(CLT 477; Portaria MTE)_
- K.10 Aviso prévio proporcional — Corp — M1 _(Lei 12.506/2011)_
- K.11 Multa rescisória de FGTS (40% / 20% acordo) — Corp — M1 _(Lei 8.036)_
- K.12 Liberação do saque do FGTS (chave de movimentação) — Corp — M1

#### L. Compliance — eSocial

- L.01 S-1000 Cadastro de empregador — Both — M1
- L.02 Tabelas S-1005 a S-1070 — Both — M1
- L.03 S-2200 Admissão — Both — M1
- L.04 S-2205 Alteração cadastral — Both — M1
- L.05 S-2206 Alteração contratual — Both — M1
- L.06 S-2299 Desligamento / S-2399 Término TSV — Both — M1
- L.07 S-2250 Aviso prévio — Corp — M1
- L.08 S-2230 Afastamento temporário — Both — M1
- L.09 S-2220 ASO — Both — M1
- L.10 S-2210 CAT — Both — M1
- L.11 S-2240 Condições ambientais — Both — M1
- L.12 S-2300 / S-2306 / S-2399 TSV — Both — M1
- L.13 S-2400 / S-2405 / S-2410 / S-2416 / S-2418 / S-2420 Aposentadoria — Gov — M1
- L.14 S-1200 Remuneração de trabalhador vinculado — Both — M1
- L.15 S-1210 Pagamento — Both — M1
- L.16 S-1202 TSV — folha — Both — M1
- L.17 S-1207 Bolsista / estagiário — pagamento — Both — M1
- L.18 S-1260 / S-1270 / S-1280 — Both — M1
- L.19 S-1295 / S-1299 Fechamento — Both — M1
- L.20 S-1298 Reabertura — Both — M1
- L.21 S-3000 Exclusão de evento — Both — M1
- L.22 S-5001 / S-5002 / S-5003 / S-5011 / S-5012 / S-5013 Totalizadores recebidos — Both — M1
- L.23 Validação contra XSD oficial — Both — M2
- L.24 Retransmissão automática em caso de rejeição — Both — M2
- L.25 Reconciliação totalizadores vs periódicos — Both — M2
- L.26 Dashboard de status de eventos — Both — O1

#### M. Compliance — Fiscal/Previdenciário

- M.01 DCTFWeb (declaração mensal) — Both — M1 _(IN RFB 2005/2021)_
- M.02 DIRF anual (onde aplicável) — Both — M1 _(IN RFB)_
- M.03 Comprovante de Rendimentos anual — Both — M1 _(IN RFB)_
- M.04 RAIS (legacy ou via eSocial) — Corp — M1 _(Decreto 76.900/1975 — convergência eSocial)_
- M.05 CAGED (legacy ou via eSocial) — Corp — M1 _(Lei 4.923/1965 — convergência eSocial)_
- M.06 MANAD (Manual Normativo de Arquivos Digitais) — Both — M1 _(IN RFB)_
- M.07 GPS / DARF (recolhimentos) — Both — M2
- M.08 PERDCOMP (compensação previdenciária) — Both — O1

#### N. Compliance — Trabalhista (corporate)

- N.01 CCT/ACT aplicável por categoria — Corp — M1 _(CLT 611-A; CF 7º XXVI)_
- N.02 Cláusulas de CCT/ACT propagadas para cálculo — Corp — M1
- N.03 Reajustes por dissídio — Corp — M1
- N.04 PCMSO — Corp — M1 _(NR-7)_
- N.05 PGR (substituiu PPRA) — Corp — M1 _(NR-1)_
- N.06 PCMAT (construção civil) — Corp — M1 _(NR-18)_ — aplicável por setor
- N.07 CIPA — Corp — M1 _(NR-5)_
- N.08 ASO (admissional, periódico, demissional, retorno, mudança de função) — Both — M1 _(NR-7)_
- N.09 eSocial SST (S-2210, S-2220, S-2240) — duplicado em L mas é dever trabalhista também — Both — M1

#### O. Compliance — TCE / Transparência (governmental)

- O.01 Layout TCE estado(s) atendido(s) — pluggable adapter — Gov — M3 _(varia por TCE)_
- O.02 Portal da Transparência — folha aberta — Gov — M1 _(Lei 12.527/2011 art. 8º; LC 131/2009)_
- O.03 Anonimização para Portal (sem CPF; com cargo/lotação/remuneração) — Gov — M1 _(LGPD vs LAI; Resolução ANPD)_
- O.04 SIOPE (educação) — Gov — M1 _(Lei 9.394/1996 art. 72; Portaria FNDE)_ — quando aplicável
- O.05 SIOPS (saúde) — Gov — M1 _(LC 141/2012)_ — quando aplicável
- O.06 SIAPE / SIGEPE integration — Gov — M3 — federal somente

#### P. LGPD e Auditoria

- P.01 Base legal de tratamento documentada por finalidade — Both — M1 _(Lei 13.709 arts. 7º, 11)_
- P.02 Registro de operações de tratamento — Both — M1 _(Lei 13.709 art. 37)_
- P.03 Atendimento ao titular (acesso, correção, exclusão, portabilidade) — Both — M1 _(Lei 13.709 art. 18)_
- P.04 Política de retenção e descarte — Both — M1 _(Lei 13.709 art. 16)_
- P.05 Anonimização para BI / transparência — Both — M1
- P.06 Consentimento quando necessário — Both — M1
- P.07 Audit log imutável (quem, quando, antes, depois) — Both — M1
- P.08 Trilha de auditoria por entidade — Both — M2
- P.09 Mascaramento de PII em logs — Both — M1 _(Lei 13.709 art. 46)_
- P.10 Encryption at rest para PII — Both — M1 _(Lei 13.709 art. 46; ANPD orientações)_

#### Q. Self-Service

- Q.01 Portal do Servidor / Colaborador — Both — O1
- Q.02 Contracheque online — Both — O1
- Q.03 Comprovante de Rendimentos online — Both — M1 _(IN RFB — disponibilização ao beneficiário)_
- Q.04 Margem consignável online — Both — M1 _(Lei 14.131; regulamentações estaduais)_
- Q.05 Marcação / consulta de férias — Both — O1
- Q.06 Atualização cadastral — Both — O1
- Q.07 Solicitação de documentos — Both — O1
- Q.08 Solicitação de licenças — Both — O1
- Q.09 Espelho de ponto online — Both — M1 _(Portaria MTP 671 — disponibilização ao trabalhador)_
- Q.10 ASO / convocação para perícia — Both — O1
- Q.11 Manager self-service (aprovações, gestão de equipe) — Both — O1
- Q.12 Workflow de aprovações multi-nível — Both — O1

#### R. Integrações externas

- R.01 Bancos (crédito em folha, conciliação) — Both — M2
- R.02 Consignatárias (reserva, averbação, baixa) — Both — M1 _(Lei 14.131)_
- R.03 eSocial WS-2 — Both — M1
- R.04 DCTFWeb / e-CAC — Both — M1
- R.05 REP-P / catraca / coletor de ponto — Both — M2
- R.06 GovBR (autenticação) — Both — O1
- R.07 ICP-Brasil (assinatura digital) — Both — M1 _(MP 2.200-2/2001)_ — quando documentos exigem
- R.08 Operadoras de plano de saúde — Both — O1
- R.09 ERPs / sistemas contábeis — Both — M2
- R.10 ATS / LMS / outros sistemas RH — Both — O1

#### S. BI / Relatórios

- S.01 Relatório de folha por unidade/cargo/lotação — Both — M2
- S.02 Relatório de absenteísmo — Both — O1
- S.03 Headcount e turnover — Both — O1
- S.04 Custo de pessoal (mensal, anual, projetado) — Both — M2
- S.05 Distribuição salarial — Both — O1
- S.06 Compliance dashboard (eSocial, CCT, vencimentos) — Both — O1
- S.07 Diversidade e inclusão — Both — O1
- S.08 Exportação ad hoc (Excel / CSV) — Both — O1
- S.09 Relatórios fixos legais (RAIS, CAGED, etc.) — Corp — M1

#### T. Cross-cutting

- T.01 Multi-tenancy (vários órgãos / empresas) — Both — M3 — depende de modelo de negócio
- T.02 RBAC fino (campo-a-campo, por unidade) — Both — M1 _(LGPD art. 46)_
- T.03 Workflow engine — Both — O1
- T.04 Notificações (email, push, dashboard) — Both — O1
- T.05 Calendário / dias úteis / feriados — Both — M2
- T.06 Tabelas de domínio configuráveis — Both — M2
- T.07 Cálculo monetário consistente (numeric(p,s), arredondamento centralizado) — Both — M2
- T.08 Time-zone correto para ponto — Both — M2
- T.09 Idempotência em folha — Both — M2
- T.10 Lock otimista / pessimista em registros críticos — Both — M2
  **Deliverable:** `docs/work/feature-audit/01a-catalog-embedded.md`.

### 8.B Catalog extension via web research

`[Model: Sonnet 4.6 · Effort: medium]`
The embedded catalog is a baseline. Verify and extend:

1. **Refresh regulatory currency.** For every `M1` row, confirm the cited source is still in force. Flag superseded laws (e.g., NRs revised, ANPD resolutions issued since this prompt was written).
2. **Confirm eSocial layout version.** Locate the current Manual de Orientação and confirm the event list above is complete and current. Add any obligatory event missing from L.
3. **Confirm payroll regime additions.** Search for: `eSocial 2026 entes públicos`, `EC 103 alíquotas RPPS atual`, `tabela IRRF vigente`, `tabela INSS vigente`, `salário-mínimo vigente`, `teto INSS vigente`. Cite each.
4. **Identify gaps.** If web research surfaces a feature class not present in §8.A (e.g., a new compliance obligation), append it as `[new]` rows.
5. **Mark deprecations.** If a feature is being phased out (RAIS / CAGED converging into eSocial is a known ongoing process), mark it `[deprecated-pending]` with the convergence date.
   **Deliverable:** `docs/work/feature-audit/01-catalog.md` — full catalog (embedded + extensions) with delta tags `[unchanged]`, `[updated]`, `[new]`, `[deprecated-pending]`.

---

## 9. Phase 2 — SPG Implementation Inventory

### 9.A Database schema enumeration

`[Model: Haiku 4.5 · Effort: low]`
From migrations (TypeORM/Prisma/Knex/raw SQL), list every table with: columns, PK, FKs, unique constraints, indices. No interpretation; raw inventory.
**Deliverable:** `docs/work/feature-audit/02a-db-tables.md`.

### 9.B Backend module/route inventory

`[Model: Sonnet 4.6 · Effort: medium]`
Walk every `@Module`, `@Controller`, `@Injectable` provider, BullMQ producer/consumer, scheduled job. Per controller, list HTTP routes (verb + path + DTO). Per service, list public methods and entities/repositories touched. Per worker, list job names and triggers.
**Deliverable:** `docs/work/feature-audit/02b-backend-routes.md`.

### 9.C Frontend route/screen inventory

`[Model: Sonnet 4.6 · Effort: medium]`
Walk Angular `Routes` arrays, lazy-loaded feature modules, route guards. Per feature module, list components and which backend endpoints they call (via `HttpClient` call sites).
**Deliverable:** `docs/work/feature-audit/02c-frontend-screens.md`.

---

## 10. Phase 3 — Cross-Reference (presence detection)

`[Model: Sonnet 4.6 · Effort: medium]`
For every catalog row in `01-catalog.md`, search the inventories from Phase 2 for evidence and assign exactly one presence code from §6.
Matching heuristics, in order:

1. **DB evidence.** Does at least one table in `02a-db-tables.md` correspond to the feature's domain? (e.g., `licenca_*`, `ferias_*`, `aposentadoria_*`, `rubrica_*`).
2. **Backend evidence.** Are there `@Controller` routes or `@Injectable` service methods exercising the domain logic? Cite verb + path + file:line.
3. **Frontend evidence.** Is there an Angular route or component with screens for the feature? Cite route + file:line.
4. **Test evidence (presence-only signal).** Is there at least one test file referencing the feature? Cite file:line. _Test quality is not in scope; presence of any test is recorded as a binary signal._
   Presence rules:

- All three layers + at least one test → `P` (Present).
- All three layers, no test → `P` (Present, but flag in Notes).
- Backend + DB, no UI → `B`.
- UI + DB, no backend → `F`.
- DB tables only, no service methods exercising domain rules, no UI → `D`.
- Nothing → `A`. Cite the searches that returned empty.
- Explicit ADR / BACKLOG.md exclusion → `X`. Cite the document.
  **Deliverable:** `docs/work/feature-audit/03-presence.md` — one row per catalog feature with presence code and evidence column.

---

## 11. Phase 4 — Tier Classification

`[Model: Opus 4.7 · Effort: high]`
Each catalog row carries a provisional tier from §8.A. This phase finalizes it with these rules:

1. **Validate every M1.** Confirm the legal/regulatory citation is real, in force, and applicable to the feature's `Applies to` (Corp/Gov/Both). If not, downgrade to M2 or O1 and explain in Notes.
2. **Promote to M3 where ETP/TR/Edital evidence exists.** Read `docs/work/feature-audit/02b-backend-routes.md` for any references to contractual specifications, plus any `/docs/legal/`, `/docs/contrato/`, `/docs/edital/` artifacts in the repo. If a feature is named in those documents, mark M3 (in addition to or instead of provisional tier).
3. **Confirm O3 with citation.** Any feature claimed `Out-of-scope by SPG design` requires citing an ADR or `BACKLOG.md` entry. Without a citation, do not classify O3 — leave at provisional tier.
4. **Resolve applicability conflicts.** A feature applicable only to Gov but absent from a Corp-only deployment is _not_ a gap; record it as `Not applicable`.
   **Deliverable:** `docs/work/feature-audit/04-tier-classification.md` — final tier per feature with citation.

---

## 12. Phase 5 — Master Feature Matrix

`[Model: Opus 4.7 · Effort: high]`
Synthesize Phases 1, 3, 4 into a single matrix at `docs/work/feature-audit/05-feature-matrix.md`:
| ID | Domain | Feature | Description | Applies to | Tier | Legal/regulatory citation | Presence | Evidence (path:line) | Notes |
Sort by `Domain`, then by `ID`. Every row from `01-catalog.md` must appear (no silent drops). Every row must have a presence code and (if M-tier) a citation.

---

## 13. Phase 6 — Coverage Summary and Go-Live Verdict

`[Model: Opus 4.7 · Effort: high]`
`docs/work/feature-audit/06-summary.md`:

### 13.1 Coverage metrics

For each combination of `(Tier, Applies-to)`:

- `total` = number of features in the matrix matching the combination.
- `present` = features with code `P`.
- `partial` = features with code `B`, `F`, or `D`.
- `absent` = features with code `A`.
- `out_of_scope` = features with code `X`.
- `coverage_pct = (present + 0.5·partial) / (total - out_of_scope)`.
  Produce three tables: Corporate-only, Governmental-only, Both.

### 13.2 Headline numbers

- **M1 coverage** (Corp, Gov, Both, Overall) — coverage on legally mandatory features. **The single most important number in the audit.**
- **M1 + M2 coverage** — operational readiness.
- **All-tiers coverage** — full ambition.

### 13.3 Go-live verdict

Three explicit verdicts, each Yes / No / Conditional with conditions enumerated:

1. **Corporate-only deployment.** All M1-Corp features `P`? All M1-Both features `P`?
2. **Governmental-only deployment.** All M1-Gov features `P`? All M1-Both features `P`?
3. **Hybrid (entity with both regimes).** All M1 features across all applicabilities `P`?
   Any M1 feature at `A` (absent) is a hard blocker for the corresponding verdict.

### 13.4 Blocking-features list

Enumerate every M1 feature with presence `A` or `D`, sorted by `Applies to`. This is the to-do list for legal go-live.

### 13.5 Near-miss list

Every M1 feature at `B` or `F` — feature exists but not end-to-end. Typically these are 1–2 sprints away from `P`.

### 13.6 Optional-but-expected gaps

## M2 + O1 features at `A`. Not legal blockers, but customers will notice their absence.

## 14. Hard Rules

- **Read-only** with respect to source code. The audit may only write to `./docs/work/feature-audit/`.
- **No fabrication.** `(unverified)` is mandatory when proof is missing.
- **No M1 without citation.** Unsourced "obviously mandatory" claims are downgraded to M2.
- **Conservative presence.** When uncertain between two presence codes, pick the lower.
- Cite paths as `relative/path.ts:LINE`.
- Cite regulations as `Lei NNN.NNN/AAAA, art. N`, `IN RFB N/AAAA`, `Portaria MTP NNN/AAAA`, `NR-N`, `eSocial Manual de Orientação versão X`, `Resolução ANPD N/AAAA`, or full primary-source URL.
- Portuguese terminology must follow official Brazilian usage.

---

## 15. Execution Order

```
Phase 0   [Haiku · low]
   │
   ├── Phase 1.A [Haiku · low]    embed catalog
   │     └── Phase 1.B [Sonnet · medium] research extension
   ├── Phase 2.A [Haiku · low]    db enumeration
   ├── Phase 2.B [Sonnet · medium] backend routes
   └── Phase 2.C [Sonnet · medium] frontend screens
              │
              ▼
        Phase 3 [Sonnet · medium]   presence detection
              │
              ▼
        Phase 4 [Opus · high]       tier classification
              │
              ▼
        Phase 5 [Opus · high]       master matrix
              │
              ▼
        Phase 6 [Opus · high]       coverage summary + verdict
              │
              ▼
        §16 self-check [Haiku · low]
```

---

## 16. Final Self-Check

`[Model: Haiku 4.5 · Effort: low]`

- [ ] `git status --porcelain` matches Phase 0 except for `./docs/work/feature-audit/`.
- [ ] Every catalog row in `01-catalog.md` appears as a row in `05-feature-matrix.md`.
- [ ] Every M1 row has a primary-source citation.
- [ ] Every M3 row has an ETP/TR/Edital/Contrato citation.
- [ ] Every O3 row has an ADR/BACKLOG citation.
- [ ] Every "Present" claim has a path:line citation.
- [ ] Every coverage metric in `06-summary.md` is computed from `05-feature-matrix.md` (not free-typed).
- [ ] All deliverables exist and are non-empty:
  - `00-snapshot.md`
  - `01a-catalog-embedded.md`
  - `01-catalog.md`
  - `02a-db-tables.md`
  - `02b-backend-routes.md`
  - `02c-frontend-screens.md`
  - `03-presence.md`
  - `04-tier-classification.md`
  - `05-feature-matrix.md`
  - `06-summary.md`
    If any check fails, return to the failing phase before reporting.

Take these decicions on account while computing missing gaps:

Treat eSocial, DET as external services. Limit SGP scope to integration with ../stynx-esocial (and a future, analogous, stynx-det service).

In same way, treat - by now - SIAPE and SIOPS as a deferred external integration.

Also, consider all ADMIN (and most shared machinery as tokens, rbac, storage, etc...) are owned by ../stynx/ framework. Remove related topics from plan.

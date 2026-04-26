# BRIEF — SGP Moderno (Sistema de Gestão de Pessoas)

> **Este é o documento mestre para produção da documentação formal.** Todos os agentes que produzirem artefatos desta pasta devem considerar este arquivo como **única fonte da verdade** para as decisões de arquitetura, escopo, stack, domínio, regras e glossário.
>
> O conteúdo abaixo foi consolidado a partir dos 62 documentos legados em `/Users/aarusso/Downloads/interno-rh/docs/` e das decisões de arquitetura aprovadas pelo product owner.

---

## 1. Identidade e escopo do produto

**Nome do produto:** SGP — Sistema de Gestão de Pessoas.
**Tipo:** ERP de Recursos Humanos e Folha de Pagamento para entes públicos e organizações com regime próprio de previdência (RPPS).
**Domínios cobertos:** cadastro de pessoas e vínculos, vida funcional, folha de pagamento, benefícios previdenciários, saúde ocupacional e perícia, recrutamento e seleção, estágio, integrações fiscais e oficiais, transparência.
**Usuários-alvo:** prefeituras, autarquias, fundos e institutos de previdência, órgãos da administração pública direta e indireta.

**Substitui:** legado Java/Spring + AngularJS com 643 estados de navegação, 192 controladores, ~1.200 endpoints, 159 diretórios de páginas. O escopo do novo SGP **cobre paridade funcional completa** com o legado, distribuído nos 11 menus de primeiro nível.

---

**Escopo de versão futura:** Arrecadação Previdenciária fica integralmente fora do v0.0.1. Nenhuma rota, módulo backend, módulo frontend, objeto de banco, teste ou gate de aceite de Arrecadação deve ser exigido no pacote atual. A retomada exige nova decisão de escopo e atualização coordenada dos contratos, menus, autorização, testes e migração.

**Decisões temporárias de escopo (2026-04-26):**
- A árvore frontend do `sgp-admin`, rotas backend administrativas (`/api/v1/admin`, `/api/admin/v1`), gestão corporativa de usuários/perfis/permissões e fluxos OAuth/Cognito/Gov.br seguem instaláveis posteriormente e não são bloqueadores do pacote atual.
- O armazenamento de documentos oficiais continua S3-compatible. Em produção/homologação, S3 real é obrigatório; em testes locais/CI sem configuração S3, é permitido usar MiniIO em Docker como substituto S3-compatible. Fallback para disco local não é aceite de runtime.
- eSocial permanece tratado como provedor externo stubado/sandbox no pacote atual. Geração de payload e persistência interna são escopo corrente; transmissão real, certificados de produção e homologação externa ficam para etapa posterior.
- A exigência de `./infra` fica temporariamente afrouxada: CloudFormation, Terraform, AWS SDK ou scripts AWS CLI continuam alternativas em aberto. A escolha definitiva deve ser registrada antes de qualquer release produtiva.
- Gates de governança/release (GitHub Actions completos, Pact broker/provider, scanners e observabilidade produtiva) ficam postergados e não bloqueiam a reavaliação de código atual.

## 2. Decisões de arquitetura aprovadas

| # | Tema | Decisão |
|---|---|---|
| 1 | **Multi-tenancy** | **SaaS multi-tenant** com `tenant_id` em todas as tabelas (row-level isolation). Cada tenant = 1 ente contratante. PostgreSQL Row-Level Security obrigatória. |
| 2 | **Motor de folha** | **Implementação separada** (`sgp-payroll-engine`) com execução independente (inclusive em servidor dedicado), acionamento por cron e por requisição de cálculo, consulta de progresso de lote e in-lote, e camada de gestão fina sobre rotinas parametrizadas em PostgreSQL (`plpgsql`). |
| 3 | **Escopo de domínios** | **Todos os 11 menus de 1º nível** cobertos em profundidade equivalente: Gestão, Módulo RH, Folha de Pgt, Módulo Avaliação, Recrutamento e Seleção, Consultas Gerenciais, Relatório, Módulo Previdenciário, Auditoria, Area de Saúde (Junta Médica/SST), Convênio. |
| 4 | **Autenticação / SSO** | **User pools separados por contexto**: `SGP-CORE` (staff) e `SGP-PORTAL` (employees/beneficiários/candidatos). OAuth2/OIDC com RBAC; API-externa via client-credentials (substitui `SGP-API-KEY`). |
| 5 | **Portal do Funcionário** | **Aplicação separada do core** (`sgp-portal-ui` + `sgp-portal-api`), com backend próprio, acesso **somente leitura** ao banco com menor privilégio possível e escopo funcional de autoatendimento. |
| 6 | **Armazenamento de arquivos** | **S3-compatible exclusivamente**; AWS S3 em produção/homologação, MiniIO em Docker permitido apenas em testes sem S3 configurado. Sem fallback para disco local. |
| 7 | **eSocial** | Apenas **leiaute S-1.2**. No pacote atual, geração de payload e adapter sandbox/stub; envio real via serviços AWS e homologação externa ficam para decisão posterior. |
| 8 | **Motor de fórmulas de verbas** | **SQL-based**: fórmulas são traduzidas/compiladas para SQL no momento do cálculo, executando sobre a base consolidada de competência. DSL declarativa é validada e transpiladas a expressões SQL parametrizadas. |
| 9 | **Auditoria** | Somente em **domínios sensíveis** (folha, verbas, vida funcional, previdenciário, perícia, usuários/papéis). Tabela única `audit_log` com diff JSONB. |
| 10 | **i18n / Terminologia** | Mantém parametrização `termo_funcionario` / `termo_funcionario_plural` (Funcionário ↔ Servidor) como chaves de i18n injetadas em runtime. pt-BR é o único idioma suportado no MVP. |

**Stack de referência:**

- **Banco:** PostgreSQL 16+ (RLS, JSONB, particionamento por competência em tabelas de folha, pg_trgm para busca textual).
- **Backend:** NestJS (TypeScript) em arquitetura modular; monorepo (nx ou turborepo) com apps:
  - `sgp-core-api` — API principal administrativa (staff).
  - `sgp-portal-api` — API do portal (somente leitura, privilégios mínimos no banco).
  - `sgp-payroll-engine` — implementação separada de cálculo de folha.
  - `sgp-esocial-worker` — worker assíncrono eSocial S-1.2.
  - `sgp-integrations-worker` — workers de remessa/retorno bancário, SIPREV e DIRF.
- **Frontend:** Angular (última LTS) em monorepo nx, duas SPAs:
  - `sgp-admin` — aplicação administrativa (back-office).
  - `sgp-portal-ui` — Portal do Funcionário / Pensionista / Candidato.
- **Infra AWS:** RDS Postgres Multi-AZ, ECS Fargate (ou EKS), S3, SNS/SQS/EventBridge, Cognito, Secrets Manager, CloudWatch, KMS, API Gateway, CloudFront + WAF.
- **Observabilidade:** OpenTelemetry → CloudWatch/X-Ray; logs estruturados JSON; métricas de negócio (folhas fechadas/mês, contracheques emitidos, eventos eSocial).
- **Testes:** Jest (unit/integration), Playwright (e2e), Pact (contract testing), testes de migração do legado com dumps SQL Server.
- **CI/CD:** GitHub Actions; ambientes dev → staging → homologação → prod; migrations versionadas (Flyway ou Prisma Migrate).
- **Frameworks corporativos obrigatórios:** autenticação/autorização (RBAC), login, gestão de usuários/papéis/permissões e armazenamento/recuperação documental são fornecidos por framework interno comum e tratados como dependências externas.

---

## 3. Menus de 1º nível e módulos (visão geral)

| Menu legado | Categoria técnica | Módulo NestJS | Lib Angular | Contexto delimitado |
|---|---|---|---|---|
| Gestão | `GESTAO` | `gestao` | `@sgp/gestao` | Estrutura Corporativa & Parametrizações |
| Módulo RH | `MODULO_RH` | `rh` | `@sgp/rh` | Cadastro Funcional e Vida Laboral |
| Folha de Pgt | `FOLHA_PAGAMENTO` | `folha` | `@sgp/folha` | Folha e Financeiro |
| Módulo Avaliação | `MODULO_AVALIACAO` | `avaliacao` | `@sgp/avaliacao` | Avaliação e Progressão |
| Recrutamento e Seleção | `RECRUTAMENTO_SELECAO` | `recrutamento` | `@sgp/recrutamento` | Recrutamento, Seleção e Estágio |
| Consultas Gerenciais | `CONSULTAS_GERENCIAIS` | `consultas` | `@sgp/consultas` | Consultas e BI |
| Relatório | `RELATORIO` | `relatorios` | `@sgp/relatorios` | Emissão de Relatórios |
| Módulo Previdenciário | `MODULO_PREVIDENCIARIO` | `previdenciario` | `@sgp/previdenciario` | Previdenciário e Benefícios |
| Auditoria | `AUDITORIA` | `auditoria` | `@sgp/auditoria` | Trilha de Auditoria |
| Area de Saúde | `JUNTA_MEDICA` | `saude` | `@sgp/saude` | Saúde Ocupacional e Perícia |
| Convênio | `CONVENIO` | `convenio` | `@sgp/convenio` | Convênios e Descontos |

**Módulos transversais (cross-cutting):**
- `auth` — integração ao framework interno corporativo (login, RBAC, user/roles/permissions).
- `pessoa` — núcleo civil compartilhado (Pessoa, Documentos, Endereço, Contato).
- `organizacao` — Tenant, Empresa Matriz, Filial, Lotação, Centro de Custo.
- `arquivos` — integração ao framework interno corporativo de storage/documentos.
- `notificacoes` — e-mail, push, in-app.
- `integracoes` — eSocial, SIPREV, DIRF, Neoconsig, bancos, Gov.br, prefeitura.
- `parametros` — `ParametroSistema`, `ParametroGlobal`, feature flags.
- `enums-catalogo` — listas enumeradas parametrizáveis (tipo vínculo, situação funcional, etc.).

---

## 4. Modelo de autorização

**RBAC com 4 camadas:**

1. **Tenant** — isolamento row-level (`tenant_id`).
2. **Perfil** (`perfil`) — agrupador administrativo; herda múltiplos papéis.
3. **Papel** (`papel`) — capacidade autorizada (`ROLE_<MODULO>_<ACAO>`).
4. **Usuário** (`usuario`) — sujeito final; pertence a perfis; herda papéis.

**Ações padrão por módulo:** `VISUALIZAR`, `CADASTRAR`, `ATUALIZAR`, `EXCLUIR`, `GESTAO` (gestão integral).

**Módulos em GESTAO integral (sem CRUD granular):**
`RECADASTRAMENTO`, `PERICIA_MEDICA`, `AGENDA_MEDICA`, `ARQUIVO_REMESSA`, `FOLHA_DE_PGT`, `RELATORIO_FOLHA_PAGAMENTO`, `AUDITORIA`, `RELATORIO_VERBAS`, `RELATORIO_APOSENTADO_PENSAO`, `RELATORIO_SERV_PAG_BLOQUEADO`, `ARQUIVO_EXPORTACAO_SIPREV`, `DIRF`, `RELATORIO_BATIMENTO_FOLHA`, `RELATORIO_PROVENTOS_DESCONTOS`, `RELATORIO_REPASSE_FUNDO_RH`, `RELATORIO_GERENCIAL`, `ESPECIALIDADE_MEDICA`, `MEDICO`.

**Posse desdobrada:** `POSSE_EFETIVO`, `POSSE_COMISSIONADO`, `POSSE_CONTRATADO`.

**API externa:** `ROLE_EXTERNAL_SYSTEM` via client-credentials Cognito (substitui `SGP-API-KEY` legado).

**Feature flags:** `esocial.enabled`, `PORTAL_SERVIDOR_ENABLED`, `GOV_BR_SSO_ENABLED`, `PROVA_VIDA_PUBLIC_API_ENABLED`.

**Implementação NestJS:**
- Guards: `AuthGuard` (JWT Cognito) → `TenantGuard` (injeta `tenant_id` no contexto) → `PermissionsGuard` (verifica papéis via `@RequirePermissions('MODULO.ACAO')`).
- `@PreAuthorize` legado vira decorator `@Permissions('FOLHA_DE_PGT.GESTAO')`.
- Front-end: `AuthzService.can(modulo, acao)` controla exposição de menus/botões; servidor revalida sempre.

---

## 5. Domínios — entidades, regras, lifecycles

> Esta seção lista as entidades principais que devem aparecer no modelo lógico/físico e nos casos de uso. Ordem canônica dos nomes: **pt-BR, singular, snake_case na base.**

### 5.1 Pessoa e Vínculo (Módulo RH)

**Entidades principais:**
- `pessoa` (CPF, nome, nome_social, sexo, data_nascimento, estado_civil, filiacao_mae, filiacao_pai, raca_cor, grau_instrucao, tipo_sanguineo, nacionalidade, naturalizado, data_chegada_pais, casamento_brasileiro, filho_brasileiro, foto_s3_key).
- `documento_pessoa` — polimórfico por tipo: `RG`, `CTPS`, `PIS_PASEP`, `SUS`, `TITULO_ELEITOR`, `CNH`, `ALISTAMENTO`, `CONSELHO_PROFISSIONAL`, `DOC_NOMEACAO`.
- `endereco` (CEP, logradouro, numero, complemento, bairro, uf, municipio_id, uf_registro, municipio_registro_id).
- `contato` (email_pessoal, email_corporativo, telefone_principal, telefone_opcional).
- `dependente` (pessoa_id, parentesco, finalidade ∈ {IR, SALARIO_FAMILIA, PENSAO, SAUDE}, data_inicio, data_fim).
- `funcionario` / `matricula` / `vinculo` (matricula, matricula_oficial, filial_id, lotacao_id, centro_custo_id, vinculo_tipo ∈ {EFETIVO, COMISSIONADO, CONTRATADO, PRESTADOR, CEDIDO, ESTAGIARIO, TEMPORARIO}, tipo_ingresso, data_posse, data_exercicio, cargo_id, funcao_id, nivel_salarial_id, referencia_salarial_id, jornada_id, carga_horaria, turno, tipo_folha_id, fgts, ats_adts, abono_permanencia, estado_probatorio, tipo_conta_banco, banco_id, agencia, conta, digito, operacao, dependentes_ir_count, dependentes_salario_familia_count, sindicato_id, vale_transporte).
- `situacao_funcional` (histórico: tipo ∈ {ATIVO, AFASTAMENTO, DESLIGAMENTO, SUSTADO, A_DISPOSICAO}, motivo_id, data_inicio, data_fim, justificativa).
- `cedido_detalhe` (orgao_origem, cargo_origem, documento_amparo {numero, data, tipo, observacao}, publicacao {numero, data, pagina, meio}, sigilo, anexo_s3_key).
- `posse` (funcionario_id, cargo_id, funcao_id, nivel_salarial_id, referencia_salarial_id, filial_id, lotacao_id, centro_custo_id, banco_id, tipo_conta, conta, carga_horaria, turno_id, opcao_remuneracao, bens_declarados, termo_s3_key, data_posse, data_fim_contrato).
- `transferencia` (funcionario_id, filial_origem_id, filial_destino_id, lotacao_origem_id, lotacao_destino_id, centro_custo_destino_id, designado, com_onus, data_transferencia, justificativa).
- `anexo_funcionario` / `dossie` (funcionario_id, tipo_documento_id, s3_key, observacao, data_emissao, numero_documento, publicacao).
- `observacao_funcional` (funcionario_id, texto_historico, data, usuario_id).
- `ficha_funcional` — *view* materializada consolidando ferias, licenças, transferências, licença-prêmio, vencimentos, desligamentos, observação geral.

**Lifecycle vínculo:** CADASTRO_BASE → POSSE → ATIVO → (AFASTAMENTO ↔ ATIVO)* → TRANSFERÊNCIA* → DESLIGAMENTO.

**Regras-chave:**
- CPF obrigatório e único por tenant; idade < 14 anos bloqueia.
- PIS/PASEP único por CPF (validação cross-tenant opcional).
- Matrícula: automática (parametrizada) ou manual; travada após criação.
- Filial → Lotação (cascata); Lotação → Centro de Custo (cascata).
- Cedido força vínculo `A_DISPOSICAO`/`EFETIVO`; documento de amparo obrigatório.
- Afastamento novo valida limite anual por motivo; excedente rejeitado; sem retorno → sustação automática.
- Transferência designada: origem mantém custos; sem ônus: centro de custo opcional.
- Reaproveitamento por CPF: ao detectar vínculo prévio, oferece reuso de dados pessoais/documentais.
- `funcionarioEtapas`: parâmetro que bloqueia enquadramento na etapa 1 (mantém compat. legado).

### 5.2 Folha de Pagamento (Módulo Folha)

**Entidades principais:**
- `competencia` (tenant_id, mes, ano, estado ∈ {ABERTA, PROGRAMADA_FECHAR, FECHADA}, data_abertura, data_programada_fechamento, usuario_abriu).
- `folha_pagamento` (competencia_id, empresa_matriz_id, filial_id, tipo_processamento_id, periodo_inicial, periodo_final, status ∈ {DESBLOQUEADO, BLOQUEADO}, situacao ∈ {PENDENTE, EM_CALCULO, CALCULADO, EXCLUINDO, ERRO}, data_abertura, data_fechamento). **Chave composta:** (competencia, empresa_matriz, filial, tipo_processamento).
- `tipo_processamento` (MENSAL, DECIMO_TERCEIRO_ADIANTAMENTO, DECIMO_TERCEIRO_INTEGRACAO, FERIAS, RESCISAO, COMPLEMENTAR, ADIANTAMENTO_SALARIAL).
- `contracheque` (folha_pagamento_id, funcionario_id OR pensionista_id, referencia_folha, data_calculo, situacao ∈ {CONCLUIDO, ERRO, PENDENTE}, template ∈ {SERVIDOR, PENSIONISTA}, marca_dagua_flag). Particionado por competência (mês/ano).
- `lancamento` (contracheque_id, verba_id, valor_calculado, tipo ∈ {MANUAL, IMPORTADO, CALCULADO}, origem ∈ {DIRETO, IMPORTADOR, CONSIGNADO, FORMULA}, memoria_calculo JSONB).
- `verba` / `rubrica` (codigo, descricao, tipo ∈ {PROVENTO, DESCONTO, BASE, APOIO_CALCULO}, recorrencia, parcelas_padrao).
- `formula` (verba_id, texto_dsl, texto_sql_compilado, versao, data_vigencia_inicio, data_vigencia_fim, ativa).
- `atributo_formula` (chave, path_semantico, tipo_valor, origem_tabela, origem_coluna).
- `aliquota` (tributo ∈ {INSS, IRRF, PREVIDENCIA_PROPRIA}, ano, faixa_inicial, faixa_final, aliquota_pct, deducao_valor).
- **Elegibilidade (N:N):** `funcionario_verba`, `cargo_verba`, `funcao_verba`, `vinculo_verba`, `categoria_profissional_verba`, `tipo_folha_verbas`.
- `funcionario_verba` (funcionario_id, verba_id, tipo_valor, recorrencia, valor, parcelas_totais, parcelas_pagas, tipo_folha_id, competencia_inicial_mes, competencia_inicial_ano, observacao).
- `consignado` (descricao, contrato, banco_id, agencia, validado).
- `importacao_consignado` (competencia_id, arquivo_s3_key, data_importacao, status ∈ {NAO_IMPORTADO, IMPORTADO, IMPORTADO_PARCIALMENTE}).
- `importacao_lancamento_manual` (folha_pagamento_id, arquivo_s3_key, data_importacao, status).
- `importacao_verba_servidor` / `importacao_verba_pensionista`.
- `lote_processamento` (competencia_id, tipo_processamento_id, filiais[], periodo_inicial, periodo_final, status_global, progresso_folhas_pct, progresso_contracheques_pct).
- `relatorio_financeiro` (competencia_id, status ∈ {NAO_SALVO, SALVO}, data_criacao, conteudo_json).

**Lifecycle folha:**
1. ABRIR_COMPETENCIA → estado ABERTA.
2. CRIAR_FOLHA (por filial × tipo_processamento) → `DESBLOQUEADO` + `PENDENTE`.
3. COMPOR_MASSA (auto + inclusões tardias).
4. APLICAR_LANÇAMENTOS (manual, importado, consignado).
5. CALCULAR_LOTE → `EM_CALCULO` → `CALCULADO`.
6. CONFERIR (relatórios, batimento).
7. FECHAR_COMPETENCIA (programada ou imediata) → `FECHADA` + folha `BLOQUEADO`.
8. REABRIR_ANTERIOR (opcional, para reprocessamento).

**Regras-chave:**
- Competência deve estar `ABERTA` para criar folha.
- Status `BLOQUEADO` trava inclusão, lançamento, remoção, recálculo.
- Situacao `PENDENTE` bloqueia recálculo.
- Valor de lançamento > 0 obrigatório.
- Inclusão tardia de servidor dispara cálculo imediato.
- Importação de verbas é **saneadora** (substitui existentes).
- Reprocessamento em 3 modos: seletivo (contracheques marcados), total (folha inteira), pendentes apenas.
- Três linhas paralelas de folha: mensal, 13º, férias/rescisão/complementar.

**Saídas:**
- Contracheque individual (PDF templates SERVIDOR/PENSIONISTA) com feedback de fórmula por verba.
- Resumo da folha (Excel).
- Relatório de folha (PDF/Excel).
- Relatório financeiro (persistido com status NAO_SALVO/SALVO).
- Batimento (PDF).
- Remessa bancária, retorno bancário, DIRF, SIPREV, eSocial (integrações).

### 5.3 Previdenciário (Módulo Previdenciário + Recadastramento)

**Entidades:**
- `regra_aposentadoria` (nome, fundamento_legal, criterios_idade, criterios_tempo_contribuicao, criterios_carencia, aplicavel_vinculo).
- `simulacao_aposentadoria` (funcionario_id, regra_id, resultado, detalhe_json, data_simulacao).
- `aposentadoria` (funcionario_id, regra_id, data_concessao, fundamento, ato_nomeacao, status ∈ {CONCEDIDA, REVISADA, CASSADA}).
- `pensao` (instituidor_pessoa_id, beneficiario_pessoa_id, tipo_beneficio, tipo_rateio, cota_parte, forma_reajuste, natureza, data_concessao, data_cessacao).
- `certidao_tempo_contribuicao` (pessoa_id, periodo_inicio, periodo_fim, orgao, ato_emissao, s3_key).
- `compensacao_previdenciaria` (certidao_id, regime_origem, valor, status).
- `declaracao_aposentadoria` / `declaracao_ex_servidor` (pessoa_id, data_emissao, s3_key).
- `campanha_recadastramento` (tipo ∈ {APOSENTADO, PENSIONISTA, PENSIONISTA_UNIVERSITARIO}, ciclo_inicio, ciclo_fim, filtro_json).
- `beneficiario_recadastramento` (pessoa_id, tipo, data_proxima, status ∈ {RECADASTRADO, PERTO_VENCER, NAO_RECADASTRADO}).
- `recadastramento` (beneficiario_id, data, operador_id, dados_snapshot_json, comprovante_s3_key).
- `historico_ligacao` (beneficiario_id, data, usuario_id, observacao).
- `prova_vida_externa` (beneficiario_id, canal ∈ {PORTAL_COLABORADOR, PREFEITURA_PUBLICA, GOV_BR}, autenticacao, data).

**Lifecycle recadastramento:** PRIMEIRO_CICLO (6m após concessão) → ATIVO (anual aposentado / semestral pensionista) → status derivado {NAO_RECADASTRADO ↔ PERTO_VENCER ↔ RECADASTRADO}.

**Regras-chave:**
- Pensionista universitário: alerta aos 25 anos (não bloqueante no legado; manter configurável).
- Novo recadastramento desativa anterior; retroalimenta cadastro base (endereço, telefone, estado civil).
- Comprovante emitido apenas se status = RECADASTRADO.
- Histórico de ligações exige observação.

### 5.4 Saúde Ocupacional e Perícia (Junta Médica + SST)

**Entidades:**
- `especialidade_medica`, `medico` (crm, uf_crm, especialidades, vinculos_filiais), `profissional_saude` (conselho, numero, uf).
- `agenda_medica` (medico_id, especialidades[], data_inicial, data_final, hora_inicial, hora_final, intervalo_min, periodicidade).
- `janela_agenda` (agenda_id, data, hora_inicio, hora_fim, status).
- `agendamento_pericia` (funcionario_id, especialidade_id, agenda_id, janela_id, data, hora, status ∈ {PENDENTE, CANCELADO, CONCLUIDO, AGENDADO, COMPARECEU, NAO_COMPARECEU}, observacao, telefone_contato, anexo_s3_key).
- `prontuario_pericia` (agendamento_id, medico_id, motivo, hda, exame_fisico, diagnostico, observacao, acao_pericial ∈ {APOSENTAR, NAO_APOSENTAR, DESAPOSENTAR, REMARCAR, RETORNO, ENCAMINHAR_ESPECIALISTA}, tipo_laudo, situacao_laudo ∈ {PENDENTE_ENVIO, PENDENTE_VALIDACAO, APROVADO, REPROVADO}, cid_principal_id, cid_secundarios[]).
- `licenca_medica` (funcionario_id, prontuario_id, tipo_avaliacao, beneficio_previdenciario, motivo_afastamento_id, cid_id, dias_concedidos, data_inicio, data_fim, dependente_id, restricoes_json, readaptacao_json, invalidez_json, justificativa, equipe_multiprofissional[]).
- `cid` (codigo, descricao).
- `restricao_ocupacional` (funcionario_id, tipos[], data_inicio, data_fim, observacao).
- `readaptacao` (funcionario_id, atividades_compativeis, data_inicio, data_fim, dias).
- `invalidez_pericia` (funcionario_id, decisao, grupo_doenca_grave, data_enquadramento, processo_numero).
- `acidente_trabalho` (funcionario_id, data, local, cat_numero, cid, dias_afastamento, atestado_s3_key).
- `exame_ocupacional`, `entidade_exame`, `epi`, `epc`, `agente_nocivo`, `categoria_doenca`, `subcategoria_doenca`.

**Lifecycle perícia:**
PARAMETRIZAR (especialidade + médico + agenda) → AGENDAR (PENDENTE/AGENDADO) → ATENDER (COMPARECEU/NAO_COMPARECEU) → PRONTUÁRIO + LAUDO (PENDENTE_ENVIO → PENDENTE_VALIDACAO → APROVADO/REPROVADO) → LICENÇA (se aplicável) → REPLICAR para outras matrículas do CPF → EFEITO FUNCIONAL (altera situação_funcional).

**Regras-chave:**
- Servidor deve estar ATIVO/EM_EXERCICIO para agendamento.
- Dias concedidos ≤ 720 (24 meses acumulado) para afastamento remunerado.
- Parecer exige ≥1 profissional saúde na equipe, CID, motivo afastamento.
- Benefício previdenciário XOR motivo afastamento remunerado (exclusão mútua, um obrigatório).
- Licença de tratamento família → dependente obrigatório.
- Réplica por CPF alcança todas as matrículas do mesmo indivíduo.
- Comparecimento zera contador de faltas.

### 5.5 Recrutamento e Seleção (Módulo Recrutamento + Estágio)

**Entidades:**
- `requisicao_pessoal` (solicitante_id, filial_id, lotacao_id, situacao ∈ {RASCUNHO, EM_PROCESSO, APROVADO, REJEITADO, CANCELADA, CONCLUIDO}, justificativa, data_entrada, data_limite, motivo ∈ {AUMENTO_QUADRO, SUBSTITUICAO}, colaborador_substituido_id, data_prevista_admissao).
- `funcao_requisitada` (requisicao_id, funcao_id, tipo_contratacao, quantidade_vagas, custo_vaga, turno_id, requisitos, cursos[], habilidades[], atividades[]).
- `candidato_requisicao` (requisicao_id, pessoa_id, comentario_inicial, comentario_analise, situacao ∈ {PENDENTE, APROVADO, REPROVADO}, curriculo_s3_key).
- `banco_talentos` (pessoa_id, dados_pessoais_json, historico_profissional_json, formacao_json, habilidades[], idiomas[], certificados[], cursos[], links_json, curriculo_s3_key).
- `programa_estagio` (nome, vigencia_inicio, vigencia_fim, periodo_maximo_meses, renovacoes_permitidas, candidatos_por_vaga, idade_minima, bolsa_valor, carga_horaria, relacao_trabalho, normativo_s3_key).
- `estagiario` (pessoa_id, programa_id, filial_id, lotacao_id, instituicao_ensino_id, curso_id, turno_id, centro_custo_id, banco_id, agencia, conta, pne_flag, situacao_funcional, data_inicio, data_fim).
- `prorrogacao_estagio` (estagiario_id, data_solicitacao, duracao_adicional_meses, aprovado_por).
- `recesso_estagio` (estagiario_id, data_inicio, duracao_dias).
- `instituicao_ensino`, `curso`, `turno`.

**Regras-chave:**
- Requisição em RASCUNHO editável só pelo solicitante; encaminhamento → EM_PROCESSO (notifica RH por e-mail).
- Substituição exige colaborador_substituido.
- Candidato nasce PENDENTE; remoção remove currículo S3.
- Conclusão da análise → requisição CONCLUIDO; notifica solicitante.
- Estagiário: vínculo acumulado ≤ 2 anos no programa.
- Desligamento de estágio: inativa verbas ativas; automação ao atingir data_fim.


**Entidades:**

### 5.7 Avaliação e Progressão (Módulo Avaliação)

**Entidades:**
- `avaliacao_desempenho` (funcionario_id, periodo, nota, criterios_json, avaliador_id, data).
- `progressao_merito` (funcionario_id, nivel_origem, nivel_destino, data_vigencia, ato_nomeacao, tipo ∈ {MERITO, TITULARIDADE, JUDICIAL, CORRECAO_SALARIAL}).
- `plano_cargos_carreira` (nome, versao, data_vigencia, niveis_json, referencias_json).
- `simulador_nivel_salarial` (funcionario_id, cenario, resultado_json).

### 5.8 Convênio

**Entidades:**
- `convenio` (tenant_id, nome, tipo, contrato, vigencia, banco_id_cobranca).
- `convenio_beneficiario` (convenio_id, pessoa_id, valor_mensal, inicio, fim).
- `convenio_desconto_folha` (convenio_id, competencia_id, pessoa_id, valor, status).

### 5.9 Auditoria

**Entidade única:**
- `audit_log` (id, tenant_id, timestamp, usuario_id, dominio, entidade, entidade_id, acao ∈ {CREATE, UPDATE, DELETE, LOGIN, EXPORT, PRINT}, diff_jsonb, ip, user_agent, request_id).

**Política:** popular somente em domínios sensíveis (ver decisão #9).

---

## 6. Integrações externas — contratos e protocolos

| Integração | Direção | Protocolo | Leiaute/Contrato | Autenticação |
|---|---|---|---|---|
| **eSocial S-1.2** | Out/In | WebService SOAP + XML | Eventos S-1000, S-1005, S-1010, S-1020, S-1030, S-1035, S-1040, S-1050, S-1060, S-1070, S-1080 + S-2xxx/S-3xxx (não-periódicos/periódicos). | Certificado digital A1/A3 (e-CNPJ). |
| **SIPREV** | Out | XML export (arquivo) | Leiaute MPS/SIPREV vigente. | Upload manual no portal SIPREV. |
| **DIRF** | Out | Arquivo TXT | Leiaute RFB anual. | Upload via PGD-DIRF. |
| **Prefeitura (Portal)** | In/Out | REST | Endpoints `/publico/prefeitura/{autenticacao,dependente,endereco,incorretos,imagem}`. | API-key (legado) → OAuth2 client-credentials. |
| **API Externa (dicionário)** | Out | REST | `/externo/dados`, `/externo/dicionario/{entidades,enums}`. | OAuth2 client-credentials (substitui `SGP-API-KEY`). |
| **Neoconsig/Consignado** | In | Arquivo CSV | Layout Neoconsig. | Upload manual. |
| **Remessa/Retorno bancário** | Out/In | CNAB 240/400 | CNAB por banco. | Upload/download via SFTP ou portal banco. |
| **Portal Transparência** | Out | CSV | Layout municipal. | Upload agendado. |
| **Gov.br SSO** (fase 2) | In | OIDC | OAuth2 + OpenID Connect. | Gov.br como IdP federado Cognito. |
| **AWS Cognito** | In | OIDC | OAuth2 authorization code + client-credentials. | Cognito User Pool + App Client. |

---

## 7. Saídas oficiais (documentos)

**Funcionais:**
- Ficha funcional (PDF).
- Dossiê (zip de anexos).
- Termo de posse (PDF gerado).

**Folha:**
- Contracheque servidor (PDF, com ou sem marca d'água).
- Contracheque pensionista (PDF).
- Contracheques em massa (PDF consolidado).
- Resumo da folha (XLSX).
- Relatório de folha (PDF/XLSX).
- Relatório financeiro (PDF/XLSX persistido como `relatorio_financeiro`).
- Batimento de folha (PDF).
- Ficha financeira (PDF/XLSX).
- Relatório de verbas, proventos/descontos, repasse fundo RH.

**Previdenciário:**
- Comprovante de recadastramento (PDF).
- Relatório da carteira (XLSX).
- Certidão de compensação (PDF/XLSX).
- Certidão de ex-segurado, tempo de contribuição (PDF).
- Declaração aposentado/ex-servidor (PDF).
- Relatório aposentado/pensionista.

**Saúde ocupacional:**
- Laudo pericial padrão (PDF).
- Laudo pericial aposentadoria (PDF).
- Relatório de agenda médica.

**Recrutamento/Estágio:**
- Relatório de recrutamento e seleção (PDF/gráficos).
- Relatório de estágio (PDF/XLSX com limite de registros).
- Relatório de recesso (fonte distinta).

**Fiscal/Obrigações:**
- DIRF (PDF + TXT).
- SIPREV (XML).
- Remessa CNAB (TXT).
- SEFIP.

**Geração:** todos os PDFs via serviço `sgp-report-service` (puppeteer/headless-chrome ou wkhtmltopdf); templates em Handlebars/HBS ou Angular Universal server-side. Arquivos TXT/XML gerados por builders typesafe; persistidos no S3 com chave determinística `{tenant}/outputs/{dominio}/{ano}/{mes}/{id}.{ext}`.

---

## 8. Jobs, rotinas assíncronas e eventos

**Jobs agendados (cron):**
- `daily:situacao-funcional-retorno-afastamento` — atualiza retorno de afastamento, reflete encerramento de licenças.
- `daily:licenca-medica-vencida` — inativa licenças vencidas.
- `daily:ferias-programadas` — manutenção automática.
- `daily:competencia-programada-fechamento` — executa fechamento agendado.
- `daily:estagio-desligamento-automatico` — desliga estagiários ao atingir data_fim.
- `monthly:controle-anual-afastamentos` — atualização da tabela de controle anual.
- `daily:prova-vida-proxima-vencer` — atualiza status `PERTO_VENCER`.

**Filas (SQS) / tópicos (SNS):**
- `folha.calculo.solicitada` → `sgp-payroll-engine` consome.
- `folha.calculo.concluida` → `sgp-core-api` atualiza UI.
- `contracheque.gerar.pdf` → `sgp-report-service`.
- `esocial.evento.pendente` → `sgp-esocial-worker` (retry até 3, backoff exponencial).
- `remessa.gerar` / `retorno.processar` → `sgp-integrations-worker`.
- `audit.evento.criado` → consumidor grava em `audit_log`.

**Step Functions:**
- `payroll-lote` — orquestra cálculo em lote por filial/competência, paraleliza cálculos, agrega progresso.
- `esocial-envio` — orquestra geração XML → assinatura → envio → poll status → recibo.

---

## 9. Parametrização crítica

**`ParametroSistema` (identidade do tenant):**
- `termo_funcionario`, `termo_funcionario_plural`.
- `matricula_automatica` (bool), `matricula_formato`, `matricula_prefixo`, `matricula_sufixo`.
- `logo_principal_s3_key`, `logo_secundario_s3_key`, `sigla`, `frase_inicial`.
- `funcionario_etapas` (bool).
- `esocial_url`, `esocial_cnpj_empregador`, `esocial_certificado_s3_key`.
- `cognito_user_pool_id`, `cognito_app_client_id`.

**`ParametroGlobal` (chaves operacionais):**
- `TETO_PREFEITURA`, `TETO_INSS`, `VALOR_DEPENDENTE_IRRF`, `SALARIO_MINIMO`.
- `NUMERO_REMESSA`, `FOLHA_13_SALARIO`.
- `VINCULO_EFETIVO`.

**Feature flags (`feature_flag`):**
- `esocial.enabled`, `PORTAL_SERVIDOR_ENABLED`, `GOV_BR_SSO_ENABLED`, `PROVA_VIDA_PUBLIC_API_ENABLED`, `AUDIT_FULL_TRACE_ENABLED`.

**Cadastros mestres estruturantes:** banco, agência, empresa_filial, lotacao, centro_custo, cargo, funcao, natureza, plano_cargos, turno, tipo_contratacao, tipo_folha, tipo_processamento, verba, referencia_salarial, faixa_salarial, grupo_salarial, municipio, uf, nacionalidade, motivo_afastamento, causa_afastamento, situacao_funcional, especialidade_medica, medico, exame, entidade_exame, programa_estagio, convenio, consignado.

**Enums parametrizáveis** (carregados como catálogos):
tipos vínculo / ingresso / estabilidade / folha / processamento / recorrência / reflexo / arredondamento / pensão / rateio / cota / incidência / férias / perícia / restrição / doença / CID / afastamento / lotação / função / remuneração.

---

## 10. Golden scenarios (regressão funcional)

Derivados da matriz do legado `35-cenarios-dourados-de-regressao-funcional.md`:

- **A. Cadastro e ingresso** — A1/A2 matrícula auto/manual, A3 posse efetiva, A4 verba individual.
- **B. Folha** — B1 abertura/criação, B2 inclusão + cálculo, B3 reprocessar pendências, B4 fechamento programado.
- **C. Recadastramento** — C1 aposentado, C2 pensionista universitário, C3 diligência telefone.
- **D. Perícia** — D1 agendar, D2 atender+licença, D3 validar, D4 réplica multi-vínculo.
- **E. Requisição** — E1 abrir+gestão, E2 currículo+análise, E3 estágio (programa/prorrogação/recesso).
- **F. Integrações** — F1 contracheque oficial, F2 remessa, F3 retorno, F4 SIPREV, F5 eSocial ativo.
- **G. Autorização** — G1 usuário sem alteração, G2 usuário com gestão, G3 menu eSocial oculto.

---

## 11. Convenções de codificação e nomenclatura

**Banco:**
- snake_case; PKs `id` UUID (gen_random_uuid); tenant_id em todas as tabelas de negócio; timestamps `created_at`/`updated_at`/`deleted_at` (soft delete).
- FKs: `<entidade>_id`; enums em tabelas `enum_*` (seed-driven) ou `CHECK`/Postgres ENUM para fechados.
- Particionamento: `contracheque`, `lancamento`, `audit_log` particionados por ano/mês.
- Índices: FKs indexadas; busca textual via `pg_trgm` em `pessoa.nome`, `pessoa.cpf`, `funcionario.matricula`.
- Views materializadas: `ficha_funcional`, `resumo_folha`, `carteira_recadastramento`.

**Backend (NestJS):**
- Estrutura modular por bounded context: `src/modules/<contexto>/{controllers,services,repositories,dto,entities,events}`.
- DTO com class-validator; OpenAPI gerado via `@nestjs/swagger`.
- Repositories via Prisma OU TypeORM (decidir no ADR); transações explícitas em fluxos de folha/perícia.
- Eventos de domínio via EventEmitter2 interno + publicação em EventBridge.
- Guards: AuthGuard → TenantGuard → PermissionsGuard.

**Frontend (Angular):**
- Standalone components, signals, control flow `@if`/`@for`.
- State management: NgRx Signal Store OR Akita (escolher em ADR).
- Feature libs por domínio em nx monorepo; lazy loading por rota.
- i18n: `@angular/localize` com chaves pt-BR; placeholders `{{ termoFuncionario }}`.

**REST:**
- `/api/v1/<recurso>` convenção REST; paginação `page`, `limit`, `sort`; filtros query-string.
- Erros em RFC 7807 (problem+json).
- IDs UUID na URL.
- Endpoints administrativos em `/api/admin/v1/...`; endpoints externos em `/api/external/v1/...` (OAuth2 client credentials).
- Endpoints do portal do servidor em `/api/portal/v1/...`.

---

## 12. Referências cruzadas com o legado

Para qualquer detalhe não coberto aqui, consultar em `/Users/aarusso/Downloads/interno-rh/docs/`:

- **Visão geral:** `01-visao-geral-legado.md`, `05-dominios-funcionais-e-navegacao.md`.
- **Módulos prioritários detalhados:** `06-modulos-prioritarios-detalhados.md`.
- **Domínios mapa fino:** `11` (funcionário), `12` (folha), `13` (recadastramento), `14` (perícia), `15` (requisição).
- **Autorização:** `31-autorizacao-menu-e-capacidades-funcionais.md`, `57-autorizacao-estatica-completa.md`.
- **Parametrização:** `32-catalogo-de-parametrizacoes-criticas.md`, `61-parametros-defaults-e-seeds-locais.md`.
- **Saídas:** `33-catalogo-de-saidas-oficiais-e-arquivos.md`, `58-importacoes-exportacoes-e-documentos-estaticos.md`.
- **Jobs/integrações:** `34-rotinas-operacionais-jobs-e-integracoes.md`, `59-integracoes-e-contratos-estaticos.md`.
- **Cenários:** `35-cenarios-dourados-de-regressao-funcional.md`.
- **Fórmulas de folha:** `52-folha-verbas-formulas-atributos.md`.
- **Menus e tabelas:** `44-inventario-real-menus-rhlinkcon.csv`, `50-inventario-tabelas-relacionadas-funcionario-verba-folha.csv`.

---

## 13. Convenções desta documentação

- Todos os arquivos em **pt-BR**, com terminologia RH/Folha/Previdenciária brasileira.
- Diagramas em **Mermaid** (embutidos no markdown).
- DDL em PostgreSQL 16+ padrão.
- OpenAPI 3.1.
- Ajustes e refinamentos posteriores devem ser registrados em ADRs sequenciais (`adr/0001-*.md`).
- Cada artefato começa com cabeçalho padrão:
  ```
  # <Título>
  **Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Draft
  **Escopo:** <bounded context(s)> | **Depende de:** BRIEF.md, <outros>.
  ```

---

**Fim do BRIEF.** Os agentes podem complementar leituras diretas nos 62 documentos legados quando necessitarem de detalhe adicional não capturado aqui.

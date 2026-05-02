# TCE-03 — Adapter de Referencia AUDESP/SP

## Escopo

O adapter `audesp-sp` e a referencia concreta do contrato TCE para o sistema AUDESP do TCE-SP, categoria publica "Folha de Pagamento". Ele consome uma `payroll.payroll_run` com status `APPROVED`, gera um envelope XML local e persiste o ciclo em `tce.submission`. A versao inicial usa o placeholder publico `AUDESP 0.0.1` criado no catalogo TCE-02; nenhum dicionario proprietario do TCE-SP e embarcado.

## Mapeamento

O mapeamento parte de `payroll.payroll_run` e `payroll.v_payroll_run_line_active`, agrupando itens por servidor:

| AUDESP placeholder                  | Origem SGP                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| `AudespFolha.Cabecalho.OrgaoCodigo` | `hr.company.code`, com fallback controlado para CNPJ ou tenant |
| `CompetenciaAno` / `CompetenciaMes` | `payroll.payroll_run.competence_year/month`                    |
| `TipoRemessa`                       | constante `FOLHA_PAGAMENTO`                                    |
| `Servidor.Matricula`                | `hr.employee.registration`                                     |
| `Servidor.Cpf`                      | `hr.employee.cpf` somente digitos                              |
| `Servidor.Cargo`                    | `hr.job_position.name`, com fallback `NAO_INFORMADO`           |
| `Servidor.Proventos`                | soma de rubricas `EARNING`                                     |
| `Servidor.Descontos`                | soma de rubricas `DEDUCTION`                                   |
| `Servidor.Liquido`                  | proventos menos descontos                                      |

Valores monetarios sao tratados como `Decimal` e serializados em escala 2, sem `Math.round`.

## Stub e fail-safe

`TCE_STUB_MODE` tem default logico `true`. Nesse modo, `POST /api/v1/tce/audesp-sp/submissions/:id/submit` serializa o XML, calcula SHA-256, grava tamanho do request e chama `AudespStubServerService`, que gera protocolo deterministico `AUDESP-STUB-*`. A flag opcional `TCE_AUDESP_SP_FIXTURE_RESPONSE` permite fixar a resposta em teste.

Quando `TCE_STUB_MODE=false`, o adapter falha em modo seguro com erro explicito. O SGP v0.0.1 nao possui envio real ao TCE-SP; producao exige adapter especifico por instalacao, credenciais, homologacao e decisao de owner antes de habilitar rede.

## Persistencia, RLS e auditoria

`tce.submission` e tenant-scoped e referencia `tce.layout_version` e `payroll.payroll_run`. A tabela forca RLS com:

`sgp_tenant_matches(tenant_id) AND sgp_has_any_permission('tce.submission.read'|'tce.submission.manage')`

Mutacoes disparam trigger que chama `public.sgp_append_audit_event(...)`; os endpoints tambem usam `AuditService.auditMutation` para manter a trilha de API. Permissoes novas vivem no catalogo como `tce.submission.read` e `tce.submission.manage`.

## Superficie

Backend:

- `backend/src/tce/adapters/audesp-sp/audesp-sp.adapter.ts`
- `mapping/payroll-to-audesp.mapper.ts`
- `serializer/audesp-xml.serializer.ts`
- `validator/audesp-validator.service.ts`
- `stub/audesp-stub-server.service.ts`
- `audesp-sp.controller.ts`

Frontend:

- `frontend/src/app/features/tce/audesp-sp/`
- rota admin `tce/audesp-sp`

Testes:

- Mapper, serializer com fixture XML, validator, stub e fail-safe do adapter.
- E2E `tests/backend/tce-03-audesp-sp.e2e-spec.ts`.
- Probe RLS `tests/rls/tce-submission-cross-tenant.spec.ts`.

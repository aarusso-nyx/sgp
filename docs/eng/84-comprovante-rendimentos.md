# Comprovante de Rendimentos Anual

**Escopo:** FISC-03 — comprovante anual de rendimentos pagos e de Imposto sobre a Renda Retido na Fonte para servidores, com geração em lote no admin e download pelo Portal do Servidor.

## Fundamento e Cobertura

O comprovante segue a IN RFB n.º 2.060/2021, art. 16 e Anexo I, para ano-calendário fechado. A fonte de dados é a folha do SGP já calculada: folha mensal completa, 13.º salário, férias pagas no ano e rescisão quando houver desligamento. Pagamentos a terceiros, PJ/autônomos e beneficiários no exterior continuam cobertos pela DIRF transicional de FISC-02.

## Totalizadores

`fiscal.recompute_yearly_income(tenant_id, employee_id, year_base)` consolida os itens ativos de `payroll.v_payroll_run_line_active` vinculados a `payroll.payroll_run` em status final (`GENERATED`, `APPROVED`, `PAID` ou `CLOSED`) e grava `fiscal.yearly_income_aggregate`.

| Campo | Regra |
|---|---|
| `taxable_total` | Soma de proventos tributáveis do ano-base. |
| `thirteenth_salary` | Parcela tributável identificada como 13.º salário. |
| `vacation_total` | Parcela tributável identificada como férias. |
| `severance_total` | Parcela tributável identificada como rescisão. |
| `exempt_total` | Proventos não tributáveis do ano-base. |
| `inss_rpps_total` | Descontos previdenciários oficiais/RPPS. |
| `irrf_total` | Descontos de IRRF. |
| `dependents_count` | Dependentes marcados para imposto de renda. |

A geração do PDF valida que `taxable_total + exempt_total` coincide com o total anual S-1210 do mesmo CPF exposto pela view fiscal para o comprovante.

## Segurança

`fiscal.yearly_income_aggregate` é tenant-scoped, com RLS por `sgp_tenant_matches(tenant_id)`. Administração exige `fiscal.yearly_income.read` ou `fiscal.yearly_income.write`; o portal exige `portal.yearly_income.read` e `employee_id = sgp_current_employee_id()`. O arquivo persistido em `public.generated_report_file` usa `report_kind = YEARLY_INCOME_REPORT` e políticas específicas para impedir download cruzado entre empregados.

## Saída Oficial

O PDF é produzido por `backend/src/report-service/yearly-income/` com a mesma biblioteca real de XCUT-01 (`pdf-lib` via `PdfABuilderService`), metadados PDF/A-1b, armazenamento S3-compatible e hash SHA-256 em `public.generated_report_file.file_hash`. A chave lógica é `{tenant}/outputs/yearly-income/{ano_base}/{employee_id}.pdf`, com retenção de 10 anos.

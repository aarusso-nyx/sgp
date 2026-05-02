# Base anual PIS/PASEP

## Escopo

CLT-03 materializa a base anual cumulativa de PIS/PASEP por tenant, empregado e ano-base em `payment.pis_pasep_base_year`. A base serve para conferencia fiscal, verificacao de abono salarial e integracao operacional com eSocial S-1010/S-1200. O pagamento do abono e a geracao RAIS transicional permanecem fora do produto.

## Programa

O programa e derivado do regime juridico atual do vinculo em `hr.employment_link.contract_type`:

| Regime                                                              | Programa |
| ------------------------------------------------------------------- | -------- |
| `celetista` ou `clt`                                                | `PIS`    |
| demais regimes, incluindo `statutory`, `commissioned` e `temporary` | `PASEP`  |

## Recomposicao

`payment.recompute_pis_pasep_base(tenant_id, employee_id, year_base)` recompõe o ano inteiro a partir dos S-1200 publicados. A funcao soma, por competencia, os itens de folha do empregado cujo `payroll_run` possui `esocial.s1200_emission_state` e evento `public.esocial_event` S-1200 nao excluido.

Rubricas com `incidences.codIncPisPasep` ou equivalentes `pisPasep`/`pis_pasep` controlam a inclusao. Valores `00`, `0`, `false`, `none` e `nao_base` excluem a rubrica; valores `11`, `12`, `base`, `monthly` e `mensal` incluem. Na ausencia de classificacao explicita, rubricas `EARNING` e `BASE` entram na base para manter a folha publicada conferivel ate a classificacao refinada no S-1010.

O resultado persistido contem `monthly_base` como mapa de meses `01` a `12`, `total_base numeric(14,2)` e `updated_at`. A soma dos meses deve ser sempre igual a `total_base`.

## Integracao eSocial

S-1010 passa a expor `codIncPisPasep` conforme a classificacao da rubrica, mantendo `00` para rubricas excluidas da base. A publicacao de S-1200 chama a recomposicao anual apos gravar `esocial.s1200_emission_state`.

A aceitacao de S-3000 marca o evento alvo como `EXCLUIDO` e aciona recomposicao para o empregado/ano do S-1200 excluido. Como a funcao recompõe o ano completo, retroativos, reemissoes e reclassificacoes de rubrica ficam idempotentes: a linha anual e atualizada em vez de acumulada incrementalmente.

## Seguranca e auditoria

`payment.pis_pasep_base_year` tem RLS forçado com `sgp_tenant_matches(tenant_id)` e permissoes `payroll.payroll.read` / `payroll.payroll.write`. Toda mutacao dispara `public.sgp_append_audit_event(...)`; a view `payment.v_pis_pasep_year` usa `security_invoker` e preserva o mesmo predicado de tenant/permissao.

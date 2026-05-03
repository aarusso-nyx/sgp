# EFD-Reinf R-4000

**Escopo:** FISC-05 — eventos R-4010, R-4020, R-4040, R-4080 e R-4099 para retencoes federais substitutivas da DIRF em fatos geradores a partir de 2025-01.

O SGP gera eventos da serie R-4000 no `integrations-worker/efd-reinf`. R-4010 le pagamentos a beneficiario pessoa fisica, R-4020 le pagamentos a pessoa juridica, R-4040 e R-4080 aceitam itens explicitos de retencao quando nao houver fonte mensal consolidada, e R-4099 fecha a competencia a partir dos eventos R-4000 aceitos.

O ciclo operacional espelha DCTFWeb: gerar XML, assinar com o certificado ICP-Brasil ativo do tenant, transmitir ao endpoint RFB configurado por `EFD_REINF_RFB_ENDPOINT_URL` ou ao sandbox local, e registrar recibo/hash do XML transmitido. O XML interno nao fixa versao de leiaute regulatorio; a selecao oficial de leiaute permanece decisao de owner antes de homologacao externa.

Dados persistidos:

- `fiscal.efd_reinf_event` guarda evento, status, XML, assinatura, recibo e payload de retorno.
- `fiscal.efd_reinf_item` guarda beneficiario, codigo de receita, valor bruto e valor retido.
- `fiscal.efd_reinf_totalizer` materializa o totalizador R-9015 gerado a partir do R-4099 aceito para consumo pela DCTFWeb.

As tabelas sao tenant-scoped, usam RLS forcado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`, e reutilizam temporariamente as permissoes `fiscal.dctfweb.read` e `fiscal.dctfweb.write` porque a criacao de novas strings RBAC foi deferida para decisao de owner. Toda mutacao dispara auditoria pela trilha fiscal.

## Referencia cruzada: DCTFWeb e DIRF

A DCTFWeb passa a consumir totalizadores Reinf R-9015 junto dos totalizadores eSocial S-5011, S-5012 e S-5013. A DIRF permanece documentada em `docs/eng/83-dirf.md` como fluxo transicional para competencias anteriores ao corte legal.

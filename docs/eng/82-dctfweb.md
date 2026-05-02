# DCTFWeb

**Escopo:** FISC-01 — geração e transmissão da DCTFWeb a partir de S-5011/S-5012/S-5013.

## Decisão

A DCTFWeb do SGP é gerada no `integrations-worker/dctfweb` a partir de totalizadores eSocial aceitos na competência. O módulo consome `esocial.esocial_totalizer` para S-5011, S-5012 e S-5013, exige que o S-1299 de origem esteja `ACCEPTED`, grava a declaração em `fiscal.dctfweb_declaration` e materializa cada débito em `fiscal.dctfweb_item`.

## Pré-requisitos

- S-1299 aceito para a competência.
- Totalizadores S-5011, S-5012 e/ou S-5013 persistidos com recibo de origem.
- Certificado ICP-Brasil A1/A3 ativo no tenant, mantido por `esocial.tenant_certificate`.
- Permissões `fiscal.dctfweb.read` e `fiscal.dctfweb.write` no catálogo canônico.

## Fluxo

1. O operador informa ano, mês e tipo de declaração no admin em `source/frontend/src/app/features/fiscal/dctfweb/`.
2. `POST /api/v1/admin/fiscal/dctfweb/gerar` cria o XML e os itens fiscais com valores `numeric(14,2)`.
3. `POST /api/v1/admin/fiscal/dctfweb/:id/assinar` assina o XML com o certificado ativo reutilizando o material ICP-Brasil do ES-07.
4. `POST /api/v1/admin/fiscal/dctfweb/:id/transmitir` envia o XML assinado ao endpoint RFB configurado por `DCTFWEB_RFB_ENDPOINT_URL`; sem endpoint, usa sandbox local.
5. O recibo grava número, horário, payload de retorno e hash do XML transmitido. O hash deve ser igual ao hash do XML assinado.

## Retificadora

Declarações `RETIFICADORA` devem preencher `original_declaration_id`. A regra é aplicada pela API e por constraint física em `fiscal.dctfweb_declaration`; não existe retificadora solta no v0.0.1.

## Segurança e auditoria

`fiscal.dctfweb_declaration` e `fiscal.dctfweb_item` usam RLS forçado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`. Toda mutação dispara trigger com `public.sgp_append_audit_event(...)`, e os controladores também registram evento de aplicação para geração, assinatura e transmissão.

## Referências oficiais

- IN RFB 2.005/2021 — apresentação da DCTFWeb.
- Manual de Orientação da DCTFWeb 2025, Receita Federal.
- MP 2.200-2/2001 — ICP-Brasil.

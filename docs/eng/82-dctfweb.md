# DCTFWeb

**Escopo:** FISC-01 — geração e transmissão da DCTFWeb a partir de S-5011/S-5012/S-5013 e MIT.

## Decisão

A DCTFWeb do SGP é gerada no `integrations-worker/dctfweb` a partir de totalizadores aceitos na competência. O módulo consome `esocial.esocial_totalizer` para S-5011, S-5012 e S-5013, exige que o S-1299 de origem esteja `ACCEPTED`, consome `fiscal.efd_reinf_totalizer` para R-9015 quando houver fechamento EFD-Reinf R-4099 aceito, grava a declaração em `fiscal.dctfweb_declaration` e materializa cada débito em `fiscal.dctfweb_item`.

Para fatos geradores a partir de 2025, `MitInclusionService` emite o XML de inclusão MIT para débitos que antes eram declarados via DCTF PGD. A origem operacional esperada é `fiscal.dctf_pgd_tax_debit`, com uma linha por débito, `cnpj_filial` de 14 dígitos, código de tributo, período, base, valor, vencimento e status MIT. O XML MIT agrupa débitos por `cnpj_filial`, preserva identificadores PGD por débito e gera `mitDebitId` determinístico para rastrear a inclusão dentro da DCTFWeb.

## Pré-requisitos

- S-1299 aceito para a competência.
- Totalizadores S-5011, S-5012 e/ou S-5013 persistidos com recibo de origem.
- Débitos PGD-DCTF pendentes em `fiscal.dctf_pgd_tax_debit` quando houver obrigação MIT para a competência.
- Certificado ICP-Brasil A1/A3 ativo no tenant, mantido por `esocial.tenant_certificate`.
- Permissões `fiscal.dctfweb.read` e `fiscal.dctfweb.write` no catálogo canônico.

## Fluxo

1. O operador informa ano, mês e tipo de declaração no admin em `frontend/src/app/features/fiscal/dctfweb/`.
2. `POST /api/v1/admin/fiscal/dctfweb/gerar` cria o XML e os itens fiscais com valores `numeric(14,2)`.
3. `POST /api/v1/admin/fiscal/dctfweb/:id/assinar` assina o XML com o certificado ativo reutilizando o material ICP-Brasil do ES-07.
4. `POST /api/v1/admin/fiscal/dctfweb/:id/transmitir` envia o XML assinado ao endpoint RFB configurado por `DCTFWEB_RFB_ENDPOINT_URL`; sem endpoint, usa sandbox local.
5. O recibo grava número, horário, payload de retorno e hash do XML transmitido. O hash deve ser igual ao hash do XML assinado.

## MIT

O MIT é tratado como origem `sourceEvent="MIT"` nos DTOs e no XML interno. Cada débito possui `mitStatus`, `mitDebitId` e `cnpjFilial`; o status de emissão do serviço é `INCLUDED` quando o XML MIT é produzido. O serviço aceita filtro opcional por `cnpj_filial` para que unidades gestoras inscritas como filiais apresentem DCTFWeb própria, sem misturar débitos de outra filial na mesma inclusão.

O layout regulatório final importável pela Receita ainda é uma fronteira externa: o SGP preserva os campos e identificadores necessários no XML interno e nos testes de contrato, sem escolher versão de leiaute pública nova fora dos documentos oficiais.

## Retificadora

Declarações `RETIFICADORA` devem preencher `original_declaration_id`. A regra é aplicada pela API e por constraint física em `fiscal.dctfweb_declaration`; não existe retificadora solta no v0.0.1.

## Segurança e auditoria

`fiscal.dctfweb_declaration` e `fiscal.dctfweb_item` usam RLS forçado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`. Toda mutação dispara trigger com `public.sgp_append_audit_event(...)`, e os controladores também registram evento de aplicação para geração, assinatura e transmissão.

## Referência cruzada: DIRF

A DIRF anual transicional esta documentada em `docs/eng/83-dirf.md`. Ela nao substitui a DCTFWeb: FISC-02 cobre apenas rendimentos de terceiros ainda nao integralmente cobertos pelo S-1210/eSocial, enquanto FISC-01 permanece baseado nos totalizadores S-5011/S-5012/S-5013 aceitos e na declaracao DCTFWeb por competencia.

## Referência cruzada: EFD-Reinf R-4000

A EFD-Reinf R-4000 esta documentada em `docs/eng/87-efd-reinf-r4000.md`. O totalizador R-9015 produzido pelo fechamento R-4099 aceito alimenta a DCTFWeb na mesma competencia e substitui a dependencia operacional de DIRF para fatos geradores a partir do corte legal.

## Referências oficiais

- IN RFB 2.005/2021 — apresentação da DCTFWeb.
- IN RFB 2.237/2024 — MIT e substituição da DCTF PGD pela DCTFWeb para fatos geradores a partir de 2025.
- Manual de Orientação da DCTFWeb 2025, Receita Federal.
- MP 2.200-2/2001 — ICP-Brasil.

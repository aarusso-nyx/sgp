# Hub de Validação e Assinatura eSocial

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-07, validação XSD S-1.3, assinatura ICP-Brasil e rotação de certificados.

## Decisão

O SGP v0.0.1 passa a ter um hub obrigatório para emissão eSocial: `ESocialEmitService.emit(tenantId, eventKind, xml)`. Nenhum builder ES-01..ES-06 deve inserir diretamente na fila; o XML deve ser entregue ao hub, que valida contra XSD S-1.3, assina com XML-DSig enveloped usando certificado ICP-Brasil do tenant e grava somente o XML assinado em `public.esocial_event`.

## Bundle XSD

O bundle oficial está commitado em `backend/src/esocial-worker/xsd/`, baixado da página oficial de documentação técnica do eSocial em 2026-05-02. O pacote usado é **Leiautes v. S-1.3 até NT 06/2026 rev. 09/04/2026, produção em 27/04/2026**. O manifesto `xsd-bundle.manifest.json` registra a URL oficial, hash SHA-256 do zip e hashes dos arquivos críticos `evtInfoEmpregador.xsd`, `tipos.xsd` e `xmldsig-core-schema.xsd`.

## Assinatura

`backend/src/esocial-worker/signature/icp-signer.service.ts` lê PKCS#12 com `node-forge` e assina com `xml-crypto`, usando canonicalização C14N, RSA-SHA256 e transform enveloped-signature. Não há uso de `child_process`, OpenSSL externo ou download em runtime.

## Certificados

`esocial.tenant_certificate` armazena certificados A1/A3 por tenant com blob PKCS#12 cifrado em repouso, `blob_kms_key_id`, vigência, status e `rotation_due_at = valid_to - 30 dias`. A API administrativa fica em `/api/v1/esocial/certificados` e exige `esocial.certificate.read` para leitura e `esocial.certificate.write` para upload, rotação e revogação.

## Falhas e auditoria

Falhas XSD são persistidas em `esocial.xsd_validation_failure` e impedem inserção na fila. As tabelas ES-07 têm RLS forçado por `tenant_id` e permissões eSocial; mutações disparam `public.sgp_append_audit_event(...)` por trigger, preservando a política de auditoria imutável.

## Frontend

O painel administrativo fica em `frontend/src/app/features/esocial/certificados/` e permite upload PKCS#12, listagem de validade, destaque de expiração em até 30 dias e ação de rotação. Não há página de portal para este recurso.

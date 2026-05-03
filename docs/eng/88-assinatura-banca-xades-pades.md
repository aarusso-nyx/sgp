# Assinatura Digital da Banca Examinadora — XAdES/PAdES

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** `recrutamento/banca` | **Base:** Lei 14.063/2020, MP 2.200-2/2001, CF art. 37 II, Lei 8.112/1990 art. 5-15

**Truth banner:** The current runtime preserves sequential signature evidence
and public verification metadata. Real CMS/PKCS#7/PAdES signing, certificate
chain validation, and production Gov.br provider integration remain deferred in
`103-deferred-decision-ledger.md#deferred-decision-ledger`.

## Decisão

O SGP registra membros da banca examinadora por concurso e permite assinatura sequencial com evidência verificável para documentos formais: gabarito final, ata da banca, lista de aprovados e outros atos correlatos. Cada assinatura gera uma linha própria em `recrutamento.document_signature`, preserva a ordem de assinatura e atualiza o hash público do documento assinado. A validade legal de XAdES/PAdES real depende da decisão pendente de provedor/assinador.

## Fluxo

1. Usuário com `recrutamento.banca.write` cadastra membros ativos da banca com tipo de certificado `ICP_A1`, `ICP_A3`, `GOVBR_OURO` ou `GOVBR_PRATA`.
2. O documento oficial é criado em `recrutamento.signed_document` com token público de verificação e QR/link embutido antes da assinatura.
3. Cada membro assina uma vez. O backend bloqueia a linha do documento, valida o estado do certificado, anexa a assinatura seguinte e grava auditoria por `sgp_append_audit_event(...)`.
4. Após três assinaturas sequenciais, o documento passa para `SIGNED` e pode ser publicado.
5. A rota anônima `GET /api/v1/publico/banca/verify/:token` retorna somente metadados públicos: hash, tipo, formato, status, nomes/funções dos signatários, data de assinatura e validade da cadeia. CPF e material privado de certificado não são expostos.

## Segurança e Auditoria

As tabelas são tenant-scoped e usam RLS com `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. Leituras exigem `recrutamento.banca.read` ou `recrutamento.banca.write`; mutações exigem `recrutamento.banca.write`. Toda mutação é auditada por trigger SQL e pelos controllers decorados com `@AuditMutation`.

## Verificação Pública

A verificação pública recalcula a cadeia sequencial de assinaturas a partir do payload assinado. Qualquer alteração posterior no PDF/XML ou no envelope de assinatura torna o resultado `valid=false`, mantendo a publicidade do ato e a impugnabilidade do concurso sem revelar dados pessoais sensíveis dos membros da banca.

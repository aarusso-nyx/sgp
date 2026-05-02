# LGPD no recrutamento

## Escopo

Este documento define o tratamento de dados pessoais do portal publico de inscricao em concursos do SGP v0.0.1. A inscricao coleta CPF, nome, nascimento, contato, endereco, evidencias de requisito do cargo, autodeclaracao de cota e evidencias de isencao quando solicitadas.

## Base legal e consentimento

O fluxo exige consentimento explicito antes da inscricao, persistindo `lgpd_consent_at` e `lgpd_consent_version` em `recrutamento.candidato`. A base operacional combina consentimento do titular, execucao de politica publica de concurso e cumprimento de obrigacao legal, conforme Lei 13.709/2018 art. 7. A ausencia de consentimento bloqueia a inscricao com resposta 422.

## Finalidade

Os dados sao usados exclusivamente para identificar o candidato, validar requisitos objetivos da vaga, registrar autodeclaracoes de cota, avaliar isencoes previstas no Decreto 6.593/2008 e na Lei 13.656/2018, gerar cobranca via gateway abstrato e permitir acompanhamento da inscricao por token.

## Retencao e direitos do titular

Os dados de inscricao ficam vinculados ao concurso e ao tenant responsavel. A retencao deve seguir o edital, normas arquivisticas e prazos de controle externo. O titular pode solicitar confirmacao de tratamento, acesso, correcao e informacoes sobre compartilhamento pelos canais definidos pelo controlador municipal. Exclusao ou anonimizacao so ocorre quando compativel com as obrigacoes legais do concurso e com a preservacao de auditoria.

## Seguranca

As tabelas de candidato, inscricao e cobranca sao tenant-scoped, protegidas por RLS e auditadas por `sgp_append_audit_event(...)`. A rota publica de consulta nao expõe busca livre por CPF; exige identificador da inscricao e token gerado na criacao. Gateways de pagamento concretos devem manter o mesmo contrato sem armazenar segredos no repositorio.

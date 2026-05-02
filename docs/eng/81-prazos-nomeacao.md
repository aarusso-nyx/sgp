# Prazos de nomeacao e convocacao

## Escopo

Este documento define a politica REC-05 para nomeacao, convocacao e controle do prazo de comparecimento em concursos publicos. A posse e o exercicio funcional permanecem em REC-06; REC-05 nao cria servidor ativo nem vinculo em `hr.employee`.

## Validade do concurso

O campo `recrutamento.concurso.valid_until` e a data-limite administrativa do certame. A API de nomeacao rejeita qualquer ato cuja publicacao ocorra depois dessa data, retornando 422. A prorrogacao da validade nao e automatica: exige ato administrativo previo e atualizacao manual de `valid_until`, respeitando a Constituicao Federal art. 37 III e IV.

## Prazo de comparecimento

Cada registro em `recrutamento.nomeacao` guarda `published_at` e `comparecimento_until`. O prazo padrao e de 30 dias corridos a partir da publicacao do ato, alinhado a Lei 8.112/1990 art. 13 para posse. Enquanto o prazo nao vence, a nomeacao pode estar `NOMEADO` ou `CONVOCADO`; a convocacao por publicacao oficial, email ou postal fica evidenciada em `recrutamento.convocacao`.

## Expiracao e reexecucao

O worker de integracoes executa a rotina de expiracao antes de processar filas documentais. A funcao `recrutamento.expirar_prazo_nomeacao(nomeacao_id)` altera somente nomeacoes vencidas em `NOMEADO` ou `CONVOCADO` para `EXONERADO_POR_NAO_POSSE`; reexecutar a funcao para o mesmo registro nao gera nova mudanca de estado nem duplica evento operacional. A proxima chamada continua derivada da classificacao publicada por `recrutamento.proxima_chamada(concurso_id, vaga_id)`.

## Evidencias de convocacao

Convocacao por `PUBLICACAO_OFICIAL` registra a referencia do diario oficial ou URL institucional. Convocacao por `EMAIL` registra `evidence_ref` com `messageId` do provedor. Convocacao por `POSTAL` registra AR, protocolo ou outro comprovante manual. Todos os registros sao tenant-scoped, protegidos por RLS e auditados por `sgp_append_audit_event(...)`.

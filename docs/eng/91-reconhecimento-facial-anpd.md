# Reconhecimento Facial no Ponto Eletronico

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** PONTO-10, LGPD art. 7, 11, 18 e 46, Portaria MTP 671/2021, diretrizes ANPD sobre biometria e reconhecimento facial.

## Decisao

O SGP permite reconhecimento facial como modalidade adicional de identificacao no ponto eletronico, sem substituir o identificador primario do servidor. A tecnologia usa embedding facial gerado por modelo open-source executado localmente no backend ou no dispositivo homologado. Imagens e embeddings nunca sao enviados para servico externo de visao computacional.

## Base Legal e Consentimento

O rosto e dado pessoal sensivel. O tratamento exige consentimento especifico e destacado em `ponto.face_consent`, com versao do termo, data de aceite e retirada. Sem consentimento ativo, o matching facial e bloqueado e o sistema registra evento de auditoria, mas a jornada continua podendo ser registrada por mecanismo primario autorizado.

O registro de operacoes de tratamento deve incluir finalidade, categorias de titulares, base legal, modelo usado, prazo de retencao, controles de seguranca, criterios de compartilhamento inexistente para servicos externos de visao e canal de direitos do titular.

## Modelo Local, Threshold e Liveness

O embedding e persistido em `ponto.employee_face_template.embedding_cipher` com envelope cifrado e `embedding_kms_key_id`. `model_id` e `model_version` sao gravados para reprodutibilidade. A decisao de matching usa similaridade local contra template ativo, threshold default `0.700000` e configuracao por tenant em `ponto.face_threshold_config`.

O liveness e obrigatorio por padrao. A sequencia de captura deve conter piscada e virada de cabeca. Foto impressa, frame estatico ou video que nao satisfaça o desafio resulta em `ponto.face_match.liveness_passed=false` e `decision='REJECT'`.

## Vies e Mitigacao

Como reconhecimento facial pode apresentar vies por raca, genero e idade, o SGP trata a decisao facial como fator auxiliar. Rejeicao facial nao gera sancao automatica e pode ser resolvida por fluxo alternativo de ponto. Thresholds devem ser calibrados por tenant com amostras representativas, revisao humana quando houver `MANUAL_REVIEW` e monitoramento periodico de falso aceite e falsa rejeicao.

## Direitos do Titular e Retencao

O portal `/meus-dados/face` mostra status, data de captura, modelo e versao. A solicitacao de exclusao executa cripto-shredding: a chave logica e marcada como destruida, o embedding cifrado e substituido por material irreversivel e o template passa para `REVOKED`. Novos matchings apos a exclusao resultam em rejeicao ate novo consentimento e recaptura.

## Auditoria e RLS

Todas as tabelas sao tenant-scoped, usam RLS com `public.sgp_tenant_matches(tenant_id)` e permissoes `ponto.face.read` / `ponto.face.write`. Mutacoes disparam `public.sgp_append_audit_event(...)` sem armazenar imagem original ou embedding em claro nos metadados.

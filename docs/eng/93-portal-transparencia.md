# Portal da Transparencia

## Base legal

O portal publico de transparencia ativa publica remuneracao de servidores conforme Lei 12.527/2011, Decreto 7.724/2012 e entendimento do STF no Tema 483. A exposicao usa as bases legais da LGPD para cumprimento de obrigacao legal e execucao de politicas publicas, especialmente os arts. 7o, III, e 23.

## Dados publicados

O snapshot mensal e gerado somente a partir de `payroll.payroll_run` com status `APPROVED` e apenas para tenants com `transparency_enabled=true`. A competencia publicada fica congelada em `public_data.transparency_payroll_snapshot` com os campos: identificador publico do servidor, nome, matricula funcional, cargo, lotacao, total de proventos, total de descontos, liquido e data de captura.

CPF, RG, PIS/PASEP, dependentes, endereco, telefone, e-mail, dados bancarios e demais dados pessoais sensiveis ou nao necessarios a transparencia remuneratoria nao fazem parte da superficie publica.

## Publicacao e auditoria

A publicacao e executada por `public_data.publish_transparency_snapshot(...)`, que recalcula a competencia aprovada, registra `public_data.transparency_publish_event`, calcula hash deterministico do snapshot e chama `sgp_append_audit_event(...)`. Mutacoes exigem a permissao `transparency.publish`.

Cada requisicao publica em `/api/v1/public/transparency/*` registra `public_data.transparency_access_log` com hash SHA-256 de IP e user-agent, caminho, query e status HTTP, preservando evidencia de acesso sem armazenar identificadores diretos.

## Consulta, cache e retencao

A API publica aplica teto de 200 itens por pagina e 50 paginas, com erro 400 para tentativas acima do limite. As respostas usam `Cache-Control` publico e `ETag` baseado no `snapshot_hash`; o CSV e emitido em UTF-8 com BOM e exatamente as colunas do snapshot.

Snapshots devem ser retidos pelo prazo definido na politica arquivistica municipal aplicavel ao registro financeiro e de transparencia ativa. A remocao ou retificacao de snapshot publicado deve ocorrer por nova publicacao auditada, preservando trilha de eventos.

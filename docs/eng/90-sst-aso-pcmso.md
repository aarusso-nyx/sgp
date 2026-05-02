# SST - ASO e exames ocupacionais

**Status:** implemented
**Slice:** SST-01 ASO e Exames Ocupacionais

## Escopo

O modulo `saude` passa a manter o catalogo de exames ocupacionais e o ciclo de vida do ASO: agendamento, realizacao, conclusao medica, anexacao do PDF restrito e arquivamento. O fluxo cobre ASO admissional, periodico, retorno ao trabalho, mudanca de funcao e demissional. A emissao do evento eSocial S-2220 permanece fora do escopo deste slice, mas `saude.aso_record` e a fonte estruturada para SST-04.

## Modelo de dados

- `saude.medical_exam`: catalogo tenant-scoped de exames clinicos, laboratoriais, complementares e de imagem, com marcadores de obrigatoriedade admissional/periodica e periodicidade em meses.
- `saude.aso_record`: registro principal do ASO por servidor, tipo, datas, medico responsavel, conclusao, restricoes resumidas, proximo vencimento e status.
- `saude.aso_exam_item`: resultados resumidos por exame vinculado ao ASO. Laudos brutos nao sao armazenados neste campo.
- `saude.aso_attachment`: metadados do PDF de laudo/exames, com `sha256`, MIME `application/pdf` e `encrypted_at_rest=true`.

Novos servidores admitidos pelo fluxo `POST /api/v1/funcionarios` recebem automaticamente um ASO admissional pendente (`SCHEDULED`) na mesma transacao de admissao.

## Acesso e LGPD

Dados de ASO sao dados pessoais sensiveis de saude. Todas as tabelas sao tenant-scoped, com RLS forçada baseada em `sgp_tenant_matches(tenant_id)` e permissoes:

- `saude.aso.read`: leitura administrativa/RH com conteudo clinico resumido.
- `saude.aso.write`: criacao, realizacao, anexacao e arquivamento.
- `saude.aso.self_read`: portal do servidor, limitado por `employee_id = sgp_current_employee_id()`.

O portal expõe somente tipo, datas, conclusao, vencimento e status. Conteudo clinico detalhado, texto de restricao e dados de anexo permanecem restritos a perfis com permissao administrativa dedicada.

## Retencao

Metadados e trilha de auditoria de ASO seguem a politica geral de retencao de prontuario funcional enquanto houver relacao juridica ativa e pelo prazo legal aplicavel apos desligamento. PDFs devem ser armazenados apenas em repositorio criptografado, com controle de acesso por tenant e auditoria de download; a tabela registra somente URI, hash e flag de criptografia, nao o binario do laudo.

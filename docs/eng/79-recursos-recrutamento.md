# Recursos de prova em concursos

## Escopo

Este documento define o fluxo REC-03 para provas, gabaritos, recursos e notas. A classificacao final e criterios de desempate pertencem ao REC-04.

## Fluxo operacional

1. A banca cria `recrutamento.prova` para o concurso e cadastra suas questoes em `recrutamento.questao`.
2. As respostas dos candidatos confirmados sao lancadas em `recrutamento.resposta_candidato`.
3. O gabarito preliminar e publicado em `recrutamento.gabarito` com `status = PRELIMINARY`.
4. Candidatos podem abrir `recrutamento.recurso` ate `recrutamento.edital.resource_deadline_at`.
5. A banca decide cada recurso com parecer, marcando `UPHELD` ou `REJECTED`.
6. Quando o gabarito final e republicado, uma nova versao e criada; versoes finais nao podem ser alteradas in-place.
7. `recrutamento.recompute_notas(prova_id, gabarito_version)` reaplica o gabarito, atualiza `recrutamento.nota` e registra auditoria por candidato cuja nota mudou.

## Regras juridicas

O fluxo preserva publicidade, impessoalidade e motivacao administrativa, em alinhamento com CF art. 37 II. A decisao do recurso deve registrar parecer objetivo e rastreavel. Conforme a tese do STF no RE 632.853, revisao judicial ordinaria nao substitui a banca examinadora, ressalvadas ilegalidades, erro grosseiro ou violacao do edital.

## Seguranca e auditoria

As tabelas de avaliacao sao tenant-scoped e protegidas por RLS com `sgp_tenant_matches(tenant_id)` e permissoes `recrutamento.avaliacao.read` / `recrutamento.avaliacao.write`, alem das permissoes amplas `recrutamento.read` / `recrutamento.write`. Toda mutacao dispara `sgp_append_audit_event(...)`. A consulta publica de notas exige id da inscricao e token; nao ha busca publica livre por CPF, prova ou concurso.

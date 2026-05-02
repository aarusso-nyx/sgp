# Cotas de recrutamento

## Escopo

Este documento define a alocacao de cotas em concursos publicos no REC-04. A heteroidentificacao racial, pericia biopsicossocial PCD e bancas especificas ficam para fase posterior; o REC-04 usa somente autodeclaracoes explicitas ja registradas na inscricao.

## Regras gerais

Cada vaga de concurso registra total de vagas e reservas PCD, racial e indigena/quilombola. A reserva total nao pode exceder o total de vagas. Para concursos com tres ou mais vagas, a reserva racial minima e de 20% conforme Lei 12.990/2014. Para cargos com cinco ou mais vagas, a reserva PCD minima e de 5%, em alinhamento com CF art. 37 VIII, LBI 13.146/2015 e Decreto 9.508/2018.

O candidato sempre participa da lista geral. Quando uma pessoa autodeclarada cotista alcanca vaga pela lista geral, ela permanece na ampla concorrencia e nao consome a reserva. As listas de cota sao derivadas da mesma classificacao, preservando nota total, prioridade do idoso em empate, maior idade e chave estavel de inscricao.

## Ordem de chamada

A chamada racial segue a Lei 12.990/2014 art. 3o: quando houver reserva racial e candidatos habilitados, as vagas reservadas sao intercaladas nas posicoes 3, 8, 13 e assim sucessivamente. Se nao houver candidato racial habilitado disponivel para a posicao reservada, a posicao e preenchida pela proxima pessoa da lista geral.

A chamada PCD usa a reserva configurada da vaga e seleciona a proxima pessoa PCD habilitada quando a posicao reservada estiver disponivel. O snapshot registra `allocation_bucket` e `call_order` para deixar auditavel se uma chamada veio da ampla concorrencia ou de lista reservada.

## Reprodutibilidade

`recrutamento.classificacao_snapshot` congela a versao gerada com `tiebreak_rules`. Publicar um snapshot torna seus itens imutaveis. Nova revisao administrativa deve gerar outro snapshot, publicar a nova versao e marcar a anterior como `SUPERSEDED`; nao ha edicao in-place de resultado publicado.

## Exemplo

Em uma vaga com 10 chamadas e duas reservas raciais, a lista publica usa as posicoes 3 e 8 para a lista racial, caso existam candidatos habilitados ainda nao chamados pela ampla concorrencia. As demais posicoes seguem a lista geral, exceto reservas PCD configuradas.

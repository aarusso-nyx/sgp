# Proctoring Online em Concursos Publicos

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** Recrutamento e Selecao / Portal Publico | **Depende de:** REC-03, REC-07, XCUT-04

---

## 1. Modelo de Sessao

A prova online usa uma sessao tenant-scoped em `recrutamento.online_exam_session`, vinculada a uma inscricao confirmada e a uma prova do mesmo concurso. A abertura exige consentimento especifico para gravacao de audio, video e tela, camera, microfone, compartilhamento de tela e verificacao biometrica positiva do candidato. Se qualquer constraint obrigatoria for negada, a sessao nao inicia e a tentativa rejeitada entra na trilha de auditoria.

## 2. Proctoring Hibrido

O portal publico mantem indicador permanente de gravacao, contador regressivo e captura periodica de snapshots. O backend recebe eventos e artefatos em `recrutamento.proctoring_event` e `recrutamento.proctoring_artifact`. A perda de screen-share e sempre severa. As heuristicas locais registram flags como `VOICE_MISMATCH`, `GAZE_OFF_SCREEN`, `PROHIBITED_APP` e `LIVENESS_FAIL` com score `numeric(18,6)`.

## 3. Revisao Humana

Flags de IA ficam inicialmente `PENDING`. A banca revisora pode aceitar os eventos ou anular a sessao. A anulacao e atomica: a sessao original passa para `VOIDED`, recebe motivo, os eventos pendentes passam para `REJECT` e uma nova sessao `SCHEDULED` e criada para re-agendamento.

## 4. Retencao e LGPD

Artefatos de snapshot, audio e frame de tela recebem `retention_until` igual ou posterior a data do edital mais cinco anos. Pedidos de exclusao antes do fim da retencao ficam `PENDING` com base legal de exercicio regular de direitos em processo administrativo de concurso publico. Depois do prazo recursal/legal, os artefatos podem ser apagados.

## 5. Autorizacao e Auditoria

As permissoes sao `recrutamento.exam.read`, `recrutamento.exam.write` e `recrutamento.exam.review`. Todas as tabelas REC-08 tem RLS forcado por `sgp_tenant_matches(tenant_id)` e permissao de prova online. Toda mutacao passa por `sgp_append_audit_event(...)`.

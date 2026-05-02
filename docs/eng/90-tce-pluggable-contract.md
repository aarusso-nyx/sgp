# Contrato Pluggável TCE/TCM/TCU

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** TCE-01, contrato de adapter, descoberta, registro e lifecycle.

## Decisão

O SGP v0.0.1 usa um contrato pluggável para Tribunais de Contas em `source/backend/src/tce/`. O core não conhece leiautes estaduais, municipais ou federais específicos; ele descobre providers NestJS anotados com `@TceAdapter({ id, state_code, organ_kind })`, valida que implementam `TceAdapter` e registra o catálogo global em `tce.adapter_registry`.

## Contrato

Todo adapter deve implementar:

- `id()`: identificador estável e único do plugin.
- `state_code()`: UF de dois caracteres; `XX` é reservado para stubs/contratos.
- `organ_kind()`: `TCE`, `TCM` ou `TCU`.
- `supported_layouts()`: códigos e versões semver de leiaute.
- `validate(payload, layout_version)`: valida payload antes de serializar.
- `serialize(payload, layout_version)`: produz envelope assinado/serializável pelo adapter.
- `submit(envelope)`: envia para o destino do adapter ou sandbox.
- `parseResponse(raw)`: normaliza retorno em protocolo, status e mensagem.
- `health()`: valida disponibilidade do adapter sem acionar envio real.

## Lifecycle

O lifecycle mínimo é `REGISTERED -> VALIDATION_OK/VALIDATION_FAIL -> SUBMISSION_OK/SUBMISSION_FAIL -> HEALTH_OK/HEALTH_FAIL`. Transições são persistidas em `tce.adapter_lifecycle_event` com payload JSONB e auditoria por trigger via `public.sgp_append_audit_event(...)`.

O adapter `noop` é o stub determinístico de contrato. Ele suporta o leiaute `NOOP 0.0.1`, valida payload JSON object, serializa para JSON, retorna recibo local `NOOP-*` e não faz chamadas externas.

## Registro e Segurança

`tce.adapter_registry` e `tce.adapter_lifecycle_event` são globais, não tenant-scoped. RLS é forçado nas duas tabelas: usuários com `tce.adapter.read` ou `tce.adapter.manage` podem ler, mas mutações exigem o caminho controlado de backend/worker com `app.bypass_rls=true`. Endpoints administrativos usam `@RequirePermission`:

- `GET /api/v1/tce/adapters`: `tce.adapter.read`.
- `GET /api/v1/tce/adapters/:id/events`: `tce.adapter.read`.
- `POST /api/v1/tce/adapters/:id/enable`: `tce.adapter.manage`.
- `POST /api/v1/tce/adapters/:id/disable`: `tce.adapter.manage`.

## Frontend

A tela admin fica em `source/frontend/src/app/features/tce/adapters/` e consome o catálogo registrado. Ela lista UF, órgão, versão, status, health e lifecycle, e expõe ações de habilitar/desabilitar para operadores com permissão `tce.adapter.read` na rota e `tce.adapter.manage` no backend.

## Fora do Escopo

TCE-01 não cria catálogo completo de UFs, versões por layout ou adapters reais como AUDESP/SP, SIM-AM/PR, SAGRES/PB ou SIAP/CE. Esses contratos entram nas fatias TCE-02 e TCE-03.

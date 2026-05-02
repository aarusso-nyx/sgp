# Catálogo de Estados e Leiautes TCE

O SGP v0.0.1 mantém um catálogo global, público e não tenant-scoped para Tribunais de Contas em `tce.state`, `tce.layout_version` e `tce.layout_field`. O objetivo é separar a fonte de verdade de metadados públicos do contrato pluggável de adapters: o core sabe quais órgãos, sistemas e versões existem, mas não embarca dicionários proprietários nem baixa leiautes externos.

## Modelo

`tce.state` registra as 26 UFs, o Distrito Federal, o TCU (`BR`) e TCMs relevantes com código interno de dois caracteres, UF pai quando municipal, tipo de órgão e URL oficial. As entradas municipais usam códigos internos distintos da UF pai para preservar unicidade física e mantêm `parent_state_code` apontando para a UF real.

`tce.layout_version` registra sistema, versão semântica, vigência, status, URL pública e observações. A semente inicial cria placeholders `DRAFT` para `SIM-AM`/PR, `AUDESP`/SP, `SAGRES`/PB e `SIAP`/CE. Esses registros existem apenas para roteamento e governança inicial; campos permanecem vazios até adapters concretos aprovados preencherem `tce.layout_field`.

`tce.layout_field` descreve campos por caminho lógico, tipo, obrigatoriedade, tamanho, precisão decimal, regra de transformação e dica de origem. Campos decimais exigem `decimal_precision` e `decimal_scale`; tipos não decimais não podem declarar precisão.

## Vigência e Status

As versões seguem o fluxo `DRAFT -> ACTIVE -> SUPERSEDED -> RETIRED`. Uma versão só pode ser criada como `DRAFT`. Ao ativar uma versão, o banco bloqueia sobreposição de vigência para o mesmo `state_id + system_name` quando já existir outra versão `ACTIVE`. A vigência usa intervalo fechado entre `effective_from` e `effective_to`; `effective_to = NULL` representa vigência aberta.

## Segurança e Auditoria

As três tabelas forçam RLS. Leitura exige `tce.catalog.read` ou `tce.catalog.manage`; mutação exige `tce.catalog.manage`. Como o catálogo é global, as políticas não usam `tenant_id`, mas todas as mutações disparam trigger de auditoria via `public.sgp_append_audit_event(...)`.

Os endpoints administrativos ficam em `source/backend/src/tce/catalog/` e usam `@RequirePermission`. A tela administrativa fica em `source/frontend/src/app/features/tce/catalog/`, com navegação UF -> sistemas -> versões -> campos. Operadores veem o catálogo em modo leitura; ações de ativar ou superar versão são protegidas no backend por `tce.catalog.manage`.

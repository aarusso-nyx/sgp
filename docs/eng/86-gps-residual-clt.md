# GPS residual CLT

FISC-04 implementa a GPS residual como safety-net para recolhimentos ao RGPS que não estejam cobertos pelo fluxo regular DCTFWeb. A base normativa é a Lei 8.212/1991, a IN RFB 2.110/2022 e, para o TXT de transição, a IN RFB 925/2009. O caminho padrão de débitos previdenciários continua sendo FISC-01/DCTFWeb; GPS só pode ser invocada de forma explícita.

## Escopo restrito

A geração é permitida para competências retroativas anteriores à adesão eSocial, janelas transitórias de entes ainda em fase escalonada ou competências em malha fina que precisam de recolhimento isolado. Antes de gravar a remessa, `fiscal.assert_no_dctfweb_for_competence(tenant_id, competence)` bloqueia qualquer competência que já possua DCTFWeb `TRANSMITTED` ou `ACCEPTED`.

## Persistência e governança

O catálogo RFB fica em `fiscal.gps_payment_code` com códigos vigentes como `2100`, `2402`, `2003` e `2909`. As remessas ficam em `fiscal.gps_remittance`, protegidas por RLS com `sgp_tenant_matches(tenant_id)` e permissões `fiscal.gps.read` / `fiscal.gps.write`. Toda mutação de remessa dispara auditoria via `public.sgp_append_audit_event(...)`.

## Cálculo e arquivo

O backend `integrations-worker/gps` usa `pg.Pool` por meio de `DatabaseService`, lê totalizadores RGPS de folha, calcula juros e multa com `decimal.js` sem `Math.round`, e mantém um ponto de integração com `payroll_calc.evaluate_earning_deduction(...)` quando houver rubrica preparada para encargos de GPS. O TXT gerado usa registros de transição `GPS-IN925-2009`, com round-trip validado pelo serializer.

## Diferença para DCTFWeb

DCTFWeb consolida totalizadores eSocial aceitos e é o fluxo regular. GPS residual não transmite declaração, não substitui FISC-01 e não pode coexistir com DCTFWeb transmitida/aceita para a mesma competência. A tela administrativa exibe aviso operacional para verificação prévia contra recolhimento DCTFWeb.

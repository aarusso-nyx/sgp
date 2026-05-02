# Política de decimais monetários e arredondamento

## Escopo

Esta política é obrigatória para cálculo de folha, rubricas, rescisão, cache de fórmulas e qualquer persistência monetária do SGP v0.0.1. Ela fecha a lacuna de arredondamento indicada em `audit/06-gaps.md` §3.3 e sustenta os itens `audit/01-reference-checklist.md` #217, #229 e #230: memória de cálculo determinística, parâmetros versionáveis por vigência e consistência mensal de competência.

## Tipos

- Valores monetários unitários usam `numeric(14,2)` no PostgreSQL e `Decimal @db.Decimal(14, 2)` no Prisma.
- Agregados de folha usam `numeric(16,2)` / `Decimal(16, 2)`.
- Alíquotas, percentuais legais e fatores usam `numeric(18,6)` / `Decimal(18, 6)`.
- Código TypeScript de cálculo deve usar `Decimal` por meio de `backend/src/common/money/money.ts`; valores monetários não podem ser calculados com `Float`, `Int`, `number` como representação persistente, nem `Math.round`.

## Arredondamento

O arredondamento monetário padrão é `half-away-from-zero`, com escala 2, e ocorre apenas no contorno da rubrica: entrada/saída de `payroll_earning_deduction`, retorno de `payroll_calc.evaluate_earning_deduction(...)`, gravação de `employee_payroll_item.amount` e agregados derivados. O `payroll_calc.formula_cache` armazena SQL compilado/versionado, não valores monetários calculados. Cálculos intermediários preservam precisão decimal plena até esse contorno.

Alíquotas e fatores usam escala 6 com a mesma regra de desempate. O helper `roundRate(...)` existe para fronteiras de parametrização; ele não substitui a seleção por vigência, que continua fora deste slice.

## Reconciliação SQL e TS

O caminho SQL oficial de rubricas é `payroll_calc.evaluate_earning_deduction(...)`, definido em `database/sql/25-payroll-formula-engine.sql`, com retorno `numeric(14,2)`. O compilador em `backend/src/payroll-engine/formula-compiler.service.ts` emite funções `payroll_calc.f_<alias>(uuid, int, int)` que retornam nesse mesmo contorno decimal. Caminhos TypeScript remanescentes, como rescisão, devem chamar `roundMoney(...)` somente na fronteira da rubrica para manter paridade centavo-a-centavo com o SQL.

O ESLint local `sgp/no-math-round-money` falha qualquer uso de `Math.round` e `Number(...).toFixed(...)` em `src/folha-pagamento/**`, `src/payroll-engine/**` e `src/common/money/**`.

## Matriz rubrica → modo

| Tipo de fronteira | Modo |
| --- | --- |
| Rubricas de vencimento, vantagens e rescisão | `roundMoney(valor, 'half_up')` |
| Deduções não tributárias e descontos operacionais | `roundMoney(valor, 'half_up')` |
| Impostos/contribuições quando a regra legal exigir desempate bancário | `roundMoney(valor, 'half_even')` |
| Alíquotas e fatores legais | `roundRate(valor)` |

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';

type TokenKind =
  | 'number'
  | 'identifier'
  | 'operator'
  | 'comparator'
  | 'paren'
  | 'comma'
  | 'eof';

interface Token {
  kind: TokenKind;
  value: string;
}

export type AstNode =
  | { kind: 'number'; value: string }
  | { kind: 'attribute'; name: string }
  | { kind: 'unary'; operator: '-'; operand: AstNode }
  | { kind: 'binary'; operator: string; left: AstNode; right: AstNode }
  | { kind: 'comparison'; operator: string; left: AstNode; right: AstNode }
  | { kind: 'call'; name: string; args: AstNode[] };

interface FormulaAttributeRow extends QueryResultRow {
  name: string | null;
  code: string;
}

interface FormulaAliasRow extends QueryResultRow {
  id: string;
  formula_alias: string;
  formula_function_name: string | null;
}

interface EarningFormulaRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  formula_alias: string | null;
  formula_expression: string | null;
  formula_version: number;
}

export interface FormulaCompileResult {
  ast: AstNode;
  ready: boolean;
  error: string | null;
  dependencies: string[];
  compiledSql: string;
}

export interface FormulaMaterializationResult extends FormulaCompileResult {
  functionName: string;
  functionDdl: string;
  version: number;
}

const CANONICAL_ATTRIBUTES = new Set([
  'SALARIO_BASE',
  'CARGA_HORARIA',
  'DEPENDENTES',
  'BASE_RPPS',
  'BASE_IRRF',
  'TEMPO_SERVICO_ANOS',
]);

@Injectable()
export class FormulaCompilerService {
  constructor(private readonly databaseService: DatabaseService) {}

  parse(expression: string): AstNode {
    const parser = new FormulaParser(tokenize(expression));
    return parser.parse();
  }

  compileExpression(
    expression: string,
    attributes: Iterable<string> = CANONICAL_ATTRIBUTES,
    formulaAliases: Iterable<string> = [],
  ): FormulaCompileResult {
    const ast = this.parse(expression);
    const context: EmitContext = {
      attributes: new Set([...attributes].map(normalizeName)),
      formulaAliases: new Set([...formulaAliases].map(normalizeAlias)),
      dependencies: new Set<string>(),
    };
    const compiledSql = emitSql(ast, context);
    return {
      ast,
      ready: true,
      error: null,
      dependencies: [...context.dependencies].sort(),
      compiledSql,
    };
  }

  async validateFormula(
    expression: string,
    earningDeductionId?: string,
  ): Promise<Omit<FormulaCompileResult, 'ast'>> {
    try {
      const attributes = this.databaseService.configured
        ? await this.loadAttributeNames(earningDeductionId)
        : CANONICAL_ATTRIBUTES;
      const aliases = this.databaseService.configured
        ? await this.loadFormulaAliases(earningDeductionId)
        : [];
      const result = this.compileExpression(expression, attributes, aliases);
      return {
        ready: true,
        error: null,
        dependencies: result.dependencies,
        compiledSql: result.compiledSql,
      };
    } catch (error) {
      return {
        ready: false,
        error: error instanceof Error ? error.message : 'Invalid formula',
        dependencies: [],
        compiledSql: '',
      };
    }
  }

  async compileEarningDeduction(
    earningDeductionId: string,
  ): Promise<FormulaMaterializationResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }

    const earning = await this.loadEarningFormula(earningDeductionId);
    const expression = earning.formula_expression?.trim();
    if (!expression) {
      throw new BadRequestException('Formula expression is required');
    }

    const alias = normalizeAlias(
      earning.formula_alias || `formula_${earning.id.replace(/-/g, '_')}`,
    );
    const attributes = await this.loadAttributeNames(earningDeductionId);
    const aliases = await this.loadFormulaAliases(earningDeductionId);
    const compiled = this.compileExpression(expression, attributes, aliases);
    const functionName = `f_${alias}`;
    const functionDdl = buildFunctionDdl(functionName, compiled.compiledSql);

    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE payroll.payroll_earning_deduction
        SET formula_alias = $2,
            updated_at = now()
        WHERE id = $1::uuid
          AND formula_alias IS NULL
        `,
        [earning.id, alias],
      );
      await client.query(functionDdl);
      await client.query(
        `
        UPDATE payroll.payroll_earning_deduction
        SET formula_function_name = $2,
            formula_function_ddl = $3,
            formula_dependencies = $4::text[],
            formula_ready = true,
            formula_error = NULL,
            updated_at = now()
        WHERE id = $1::uuid
        `,
        [earning.id, functionName, functionDdl, compiled.dependencies],
      );
      await client.query(
        `
        INSERT INTO payroll_calc.formula_cache (
          tenant_id,
          earning_deduction_id,
          version,
          compiled_sql,
          compiled_at
        )
        VALUES ($1::uuid, $2::uuid, $3::integer, $4, now())
        ON CONFLICT (tenant_id, earning_deduction_id, version) DO UPDATE
        SET compiled_sql = EXCLUDED.compiled_sql,
            compiled_at = EXCLUDED.compiled_at
        `,
        [earning.tenant_id, earning.id, earning.formula_version, functionDdl],
      );
    });

    return {
      ...compiled,
      functionName,
      functionDdl,
      version: earning.formula_version,
    };
  }

  private async loadEarningFormula(
    earningDeductionId: string,
  ): Promise<EarningFormulaRow> {
    const rows = await this.databaseService.query<EarningFormulaRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        formula_alias,
        formula_expression,
        formula_version
      FROM payroll.payroll_earning_deduction
      WHERE id = $1::uuid
      `,
      [earningDeductionId],
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException('Formula earning/deduction not found');
    }
    return row;
  }

  private async loadAttributeNames(
    earningDeductionId?: string,
  ): Promise<Set<string>> {
    const rows = await this.databaseService.query<FormulaAttributeRow>(
      `
      SELECT name, code
      FROM payroll.formula_attribute
      WHERE status = 'ACTIVE'::"RecordStatus"
        AND (
          source_scope = 'canonical'
          OR earning_deduction_id = $1::uuid
          OR $1::uuid IS NULL
        )
      `,
      [earningDeductionId ?? null],
    );
    return new Set(
      [
        ...CANONICAL_ATTRIBUTES,
        ...rows
          .flatMap((row) => [row.name, row.code])
          .filter(Boolean)
          .map(String),
      ].map(normalizeName),
    );
  }

  private async loadFormulaAliases(
    earningDeductionId?: string,
  ): Promise<string[]> {
    const rows = await this.databaseService.query<FormulaAliasRow>(
      `
      SELECT id::text, formula_alias, formula_function_name
      FROM payroll.payroll_earning_deduction
      WHERE formula_alias IS NOT NULL
        AND formula_function_name IS NOT NULL
        AND ($1::uuid IS NULL OR id <> $1::uuid)
      `,
      [earningDeductionId ?? null],
    );
    return rows.map((row) => row.formula_alias);
  }
}

interface EmitContext {
  attributes: Set<string>;
  formulaAliases: Set<string>;
  dependencies: Set<string>;
}

class FormulaParser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode {
    const expression = this.parseComparison();
    this.expect('eof');
    return expression;
  }

  private parseComparison(): AstNode {
    let node = this.parseAdditive();
    while (this.peek().kind === 'comparator') {
      const operator = this.consume().value;
      node = {
        kind: 'comparison',
        operator,
        left: node,
        right: this.parseAdditive(),
      };
    }
    return node;
  }

  private parseAdditive(): AstNode {
    let node = this.parseMultiplicative();
    while (this.peek().value === '+' || this.peek().value === '-') {
      const operator = this.consume().value;
      node = {
        kind: 'binary',
        operator,
        left: node,
        right: this.parseMultiplicative(),
      };
    }
    return node;
  }

  private parseMultiplicative(): AstNode {
    let node = this.parseUnary();
    while (this.peek().value === '*' || this.peek().value === '/') {
      const operator = this.consume().value;
      node = {
        kind: 'binary',
        operator,
        left: node,
        right: this.parseUnary(),
      };
    }
    return node;
  }

  private parseUnary(): AstNode {
    if (this.peek().value === '-') {
      this.consume();
      return { kind: 'unary', operator: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.peek();
    if (token.kind === 'number') {
      return { kind: 'number', value: this.consume().value };
    }
    if (token.kind === 'identifier') {
      const name = this.consume().value;
      if (this.peek().value !== '(') {
        return { kind: 'attribute', name };
      }
      this.expect('paren', '(');
      const args: AstNode[] = [];
      while (this.peek().value !== ')') {
        args.push(this.parseComparison());
        if (this.peek().value !== ',') {
          break;
        }
        this.consume();
      }
      this.expect('paren', ')');
      return { kind: 'call', name, args };
    }
    if (token.value === '(') {
      this.consume();
      const node = this.parseComparison();
      this.expect('paren', ')');
      return node;
    }
    throw new BadRequestException(`Unexpected token "${token.value}"`);
  }

  private expect(kind: TokenKind, value?: string): Token {
    const token = this.consume();
    if (token.kind !== kind || (value !== undefined && token.value !== value)) {
      throw new BadRequestException(
        `Expected ${value ?? kind}, found "${token.value}"`,
      );
    }
    return token;
  }

  private consume(): Token {
    return this.tokens[this.index++] ?? { kind: 'eof', value: '<eof>' };
  }

  private peek(): Token {
    return this.tokens[this.index] ?? { kind: 'eof', value: '<eof>' };
  }
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const two = expression.slice(index, index + 2);
    if (['>=', '<=', '<>', '!='].includes(two)) {
      tokens.push({ kind: 'comparator', value: two === '!=' ? '<>' : two });
      index += 2;
      continue;
    }
    if (/[><=]/.test(char)) {
      tokens.push({ kind: 'comparator', value: char });
      index += 1;
      continue;
    }
    if (/[+\-*/]/.test(char)) {
      tokens.push({ kind: 'operator', value: char });
      index += 1;
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      index += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ kind: 'comma', value: char });
      index += 1;
      continue;
    }
    const numberMatch = /^\d+(?:\.\d+)?/.exec(expression.slice(index));
    if (numberMatch) {
      const value = numberMatch[0];
      tokens.push({ kind: 'number', value });
      index += value.length;
      continue;
    }
    const identifierMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(
      expression.slice(index),
    );
    if (identifierMatch) {
      const value = identifierMatch[0];
      tokens.push({ kind: 'identifier', value });
      index += value.length;
      continue;
    }
    throw new BadRequestException(`Invalid formula token near "${char}"`);
  }
  tokens.push({ kind: 'eof', value: '<eof>' });
  return tokens;
}

function emitSql(node: AstNode, context: EmitContext): string {
  switch (node.kind) {
    case 'number':
      return `${node.value}::numeric`;
    case 'attribute':
      return emitAttribute(node.name, context);
    case 'unary':
      return `(-${emitSql(node.operand, context)})`;
    case 'binary':
      return `(${emitSql(node.left, context)} ${node.operator} ${emitSql(node.right, context)})`;
    case 'comparison':
      return `(${emitSql(node.left, context)} ${node.operator} ${emitSql(node.right, context)})`;
    case 'call':
      return emitCall(node, context);
  }
}

function emitAttribute(name: string, context: EmitContext): string {
  const normalized = normalizeName(name);
  if (!context.attributes.has(normalized)) {
    throw new BadRequestException(`Unknown formula attribute: ${name}`);
  }
  switch (normalized) {
    case 'SALARIO_BASE':
    case 'BASE_RPPS':
    case 'BASE_IRRF':
      return 'payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1))';
    case 'CARGA_HORARIA':
      return 'payroll_calc.workload_hours(p_employee_id)';
    case 'DEPENDENTES':
      return 'payroll_calc.dependent_count(p_employee_id)';
    case 'TEMPO_SERVICO_ANOS':
      return 'payroll_calc.service_years(p_employee_id, make_date(p_year, p_month, 1))';
    default:
      return '0::numeric';
  }
}

function emitCall(
  node: Extract<AstNode, { kind: 'call' }>,
  context: EmitContext,
) {
  const name = normalizeName(node.name);
  if (name === 'IF') {
    if (node.args.length !== 3) {
      throw new BadRequestException(
        'IF requires condition, true, and false arguments',
      );
    }
    const [condition, trueValue, falseValue] = node.args as [
      AstNode,
      AstNode,
      AstNode,
    ];
    return `(CASE WHEN ${emitSql(condition, context)} THEN ${emitSql(trueValue, context)} ELSE ${emitSql(falseValue, context)} END)`;
  }
  if (name === 'MAX' || name === 'MIN') {
    if (node.args.length < 2) {
      throw new BadRequestException(`${name} requires at least two arguments`);
    }
    const fn = name === 'MAX' ? 'GREATEST' : 'LEAST';
    return `${fn}(${node.args.map((arg) => emitSql(arg, context)).join(', ')})`;
  }

  const alias = normalizeAlias(node.name);
  if (!context.formulaAliases.has(alias)) {
    throw new BadRequestException(`Unknown formula function: ${node.name}`);
  }
  if (node.args.length !== 0) {
    throw new BadRequestException(
      'Rubric formula references do not accept arguments',
    );
  }
  context.dependencies.add(alias);
  return `payroll_calc.${quoteIdent(`f_${alias}`)}(p_employee_id, p_month, p_year)`;
}

function buildFunctionDdl(functionName: string, compiledSql: string): string {
  return `
CREATE OR REPLACE FUNCTION payroll_calc.${quoteIdent(functionName)}(
  p_employee_id uuid,
  p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS numeric
LANGUAGE plpgsql
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
BEGIN
  RETURN (${compiledSql})::numeric(14, 2);
END;
$$;
`;
}

function normalizeName(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeAlias(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');
  if (!/^[a-z_][a-z0-9_]*$/.test(normalized)) {
    throw new BadRequestException(`Invalid formula alias: ${value}`);
  }
  return normalized;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

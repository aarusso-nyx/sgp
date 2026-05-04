import { createHash } from 'node:crypto';

import {
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  DctfwebMitDebitDto,
  DctfwebMitInclusionDto,
  DctfwebMitStatus,
  GenerateDctfwebMitDto,
} from './dctfweb.dto';

interface PgdTaxDebitRow extends QueryResultRow {
  pgd_declaration_id: string;
  pgd_debit_id: string;
  cnpj_filial: string;
  tax_code: string;
  period: Date | string;
  base_amount: string;
  amount: string;
  csll_adicional_amount: string | null;
  due_date: Date | string | null;
  mit_status: DctfwebMitStatus | null;
}

@Injectable()
export class MitInclusionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async generate(
    input: GenerateDctfwebMitDto,
  ): Promise<DctfwebMitInclusionDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const competence = competenceDate(input.year, input.month);
    const rows = await this.loadLegacyPgdDebits(
      tenantId,
      competence,
      input.cnpjFilial,
    );
    const debits = rows.map((row) => toMitDebitDto(tenantId, competence, row));
    if (!debits.length) {
      throw new PreconditionFailedException(
        'DCTFWeb MIT generation requires pending PGD-DCTF tax debits for the competence',
      );
    }

    const includedDebits = debits.map((debit) => ({
      ...debit,
      mitStatus: 'INCLUDED' as const,
    }));
    const xml = buildMitInclusionXml({
      tenantId,
      competence,
      debits: includedDebits,
    });
    return {
      competence,
      mitStatus: 'INCLUDED',
      debitCount: debits.length,
      totalBaseAmount: sumMoney(debits.map((debit) => debit.baseAmount)),
      totalAmount: sumMoney(debits.map((debit) => debit.amount)),
      totalCsllAdicionalAmount: sumMoney(
        debits.map((debit) => debit.csllAdicionalAmount),
      ),
      xml,
      xmlHash: sha256(xml),
      debits: includedDebits,
    };
  }

  private loadLegacyPgdDebits(
    tenantId: string,
    competence: string,
    cnpjFilial?: string,
  ): Promise<PgdTaxDebitRow[]> {
    const params: unknown[] = [tenantId, competence];
    const filters = [
      'tenant_id = $1::uuid',
      'competence = $2::date',
      "COALESCE(mit_status::text, 'PENDING') IN ('PENDING', 'REJECTED')",
    ];
    if (cnpjFilial) {
      params.push(cnpjFilial);
      filters.push(`cnpj_filial = $${params.length}`);
    }

    return this.databaseService.query<PgdTaxDebitRow>(
      `
      SELECT
        pgd_declaration_id::text,
        pgd_debit_id::text,
        cnpj_filial,
        tax_code,
        period,
        base_amount::text,
        amount::text,
        csll_adicional_amount::text,
        due_date,
        mit_status::text
      FROM fiscal.dctf_pgd_tax_debit
      WHERE ${filters.join(' AND ')}
      ORDER BY cnpj_filial, tax_code, pgd_debit_id
      `,
      params,
    );
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new UnprocessableEntityException(
        'Tenant context is required for DCTFWeb MIT',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DCTFWeb MIT operations',
      );
    }
  }
}

export function buildMitInclusionXml(input: {
  tenantId: string;
  competence: string;
  debits: DctfwebMitDebitDto[];
}): string {
  const id = `MIT${sha256(`${input.tenantId}:${input.competence}`).slice(
    0,
    32,
  )}`;
  const branches = groupByBranch(input.debits)
    .map(
      ([cnpjFilial, debits]) =>
        `    <filial cnpj="${cnpjFilial}">
${debits.map((debit) => debitXml(debit)).join('\n')}
    </filial>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DCTFWebMIT xmlns="urn:br:gov:rfb:dctfweb:mit:sgp:v1">
  <inclusao Id="${id}" status="INCLUDED">
    <tenantId>${input.tenantId}</tenantId>
    <competencia>${input.competence.slice(0, 7)}</competencia>
${branches}
  </inclusao>
</DCTFWebMIT>`;
}

export function parseMitInclusionXml(xml: string): DctfwebMitDebitDto[] {
  return [...xml.matchAll(/<debito\b([^>]*)\/>/g)].map((match) => {
    const attrs = parseAttributes(match[1]!);
    return {
      mitDebitId: requiredAttr(attrs, 'mitId'),
      mitStatus: requiredAttr(attrs, 'status') as DctfwebMitStatus,
      cnpjFilial: requiredAttr(attrs, 'cnpjFilial'),
      pgdDeclarationId: requiredAttr(attrs, 'pgdDeclarationId'),
      pgdDebitId: requiredAttr(attrs, 'pgdDebitId'),
      taxCode: requiredAttr(attrs, 'codigo'),
      period: requiredAttr(attrs, 'periodo'),
      baseAmount: requiredAttr(attrs, 'base'),
      amount: requiredAttr(attrs, 'valor'),
      csllAdicionalAmount: attrs.csllAdicional
        ? moneyText(attrs.csllAdicional)
        : '0.00',
      dueDate: attrs.dueDate ?? null,
    };
  });
}

function toMitDebitDto(
  tenantId: string,
  competence: string,
  row: PgdTaxDebitRow,
): DctfwebMitDebitDto {
  const cnpjFilial = cnpjText(row.cnpj_filial);
  const taxCode = scalarText(row.tax_code, 'tax_code');
  const period = dateText(row.period);
  const baseAmount = moneyText(row.base_amount);
  const amount = moneyText(row.amount);
  const csllAdicionalAmount = moneyText(row.csll_adicional_amount ?? 0);
  const pgdDeclarationId = scalarText(
    row.pgd_declaration_id,
    'pgd_declaration_id',
  );
  const pgdDebitId = scalarText(row.pgd_debit_id, 'pgd_debit_id');
  return {
    mitDebitId: buildMitDebitId({
      tenantId,
      competence,
      cnpjFilial,
      pgdDeclarationId,
      pgdDebitId,
      taxCode,
      amount,
    }),
    mitStatus: row.mit_status ?? 'PENDING',
    cnpjFilial,
    pgdDeclarationId,
    pgdDebitId,
    taxCode,
    period,
    baseAmount,
    amount,
    csllAdicionalAmount,
    dueDate: row.due_date ? dateText(row.due_date) : null,
  };
}

export function buildMitDebitId(input: {
  tenantId: string;
  competence: string;
  cnpjFilial: string;
  pgdDeclarationId: string;
  pgdDebitId: string;
  taxCode: string;
  amount: string;
}): string {
  return `MIT-${sha256(Object.values(input).join(':')).slice(0, 24)}`;
}

function debitXml(debit: DctfwebMitDebitDto): string {
  const dueDate = debit.dueDate ? ` dueDate="${xmlEscape(debit.dueDate)}"` : '';
  const csllAdicionalAmount = debit.csllAdicionalAmount ?? '0.00';
  const csllAdicional =
    csllAdicionalAmount === '0.00'
      ? ''
      : ` csllAdicional="${xmlEscape(csllAdicionalAmount)}"`;
  return `      <debito sourceEvent="MIT" mitId="${xmlEscape(
    debit.mitDebitId,
  )}" status="${debit.mitStatus}" cnpjFilial="${debit.cnpjFilial}" pgdDeclarationId="${xmlEscape(
    debit.pgdDeclarationId,
  )}" pgdDebitId="${xmlEscape(debit.pgdDebitId)}" codigo="${xmlEscape(
    debit.taxCode,
  )}" periodo="${debit.period}" base="${debit.baseAmount}" valor="${
    debit.amount
  }"${csllAdicional}${dueDate} />`;
}

function groupByBranch(
  debits: DctfwebMitDebitDto[],
): Array<[string, DctfwebMitDebitDto[]]> {
  const groups = new Map<string, DctfwebMitDebitDto[]>();
  for (const debit of debits) {
    const current = groups.get(debit.cnpjFilial) ?? [];
    current.push(debit);
    groups.set(debit.cnpjFilial, current);
  }
  return [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of input.matchAll(/([A-Za-z0-9_:-]+)="([^"]*)"/g)) {
    const [, name, value] = match;
    attrs[name!] = xmlUnescape(value!);
  }
  return attrs;
}

function requiredAttr(attrs: Record<string, string>, name: string): string {
  const value = attrs[name];
  if (!value) {
    throw new UnprocessableEntityException(
      `DCTFWeb MIT XML is missing ${name}`,
    );
  }
  return value;
}

function cnpjText(value: unknown): string {
  const text = scalarText(value, 'cnpj_filial').replace(/\D/g, '');
  if (!/^\d{14}$/.test(text)) {
    throw new UnprocessableEntityException(
      'DCTFWeb MIT cnpj_filial must have 14 digits',
    );
  }
  return text;
}

function competenceDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function dateText(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function moneyText(value: unknown): string {
  const normalized = scalarText(value, '0').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new UnprocessableEntityException(
      'DCTFWeb MIT monetary values must be non-negative',
    );
  }
  return number.toFixed(2);
}

function sumMoney(values: string[]): string {
  return values
    .reduce((sum, value) => sum + Number(moneyText(value)), 0)
    .toFixed(2);
}

function scalarText(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new UnprocessableEntityException(
    `DCTFWeb MIT ${fieldName} is required`,
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

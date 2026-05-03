import {
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DctfwebMitDebitDto } from './dctfweb.dto';
import { buildDctfwebXml } from './dctfweb-builder.service';
import {
  buildMitInclusionXml,
  MitInclusionService,
  parseMitInclusionXml,
} from './mit-inclusion.service';

const tenantId = '00000000-0000-4000-8000-00000000f501';

describe('MitInclusionService', () => {
  it('round-trips MIT inclusion XML across multiple cnpj_filial values', () => {
    const debits = [
      mitDebit({
        cnpjFilial: '12345678000270',
        pgdDebitId: 'PGD-DEBIT-002',
        taxCode: '2172',
        amount: '125.30',
      }),
      mitDebit({
        cnpjFilial: '12345678000199',
        pgdDebitId: 'PGD-DEBIT-001',
        taxCode: '0561',
        amount: '88.10',
      }),
    ];

    const xml = buildMitInclusionXml({
      tenantId,
      competence: '2026-01-01',
      debits,
    });

    expect(xml).toContain('<filial cnpj="12345678000199">');
    expect(xml).toContain('<filial cnpj="12345678000270">');
    expect(xml).toContain('sourceEvent="MIT"');
    expect(xml).toContain('status="INCLUDED"');
    expect(parseMitInclusionXml(xml)).toEqual([
      expect.objectContaining({
        cnpjFilial: '12345678000199',
        pgdDebitId: 'PGD-DEBIT-001',
        taxCode: '0561',
        amount: '88.10',
      }),
      expect.objectContaining({
        cnpjFilial: '12345678000270',
        pgdDebitId: 'PGD-DEBIT-002',
        taxCode: '2172',
        amount: '125.30',
      }),
    ]);
  });

  it('emits MIT-tagged DCTFWeb debits with per-debit identifiers', () => {
    const xml = buildDctfwebXml({
      tenantId,
      competence: '2026-01-01',
      kind: 'ORIGINAL',
      originalDeclarationId: null,
      items: [
        {
          sourceEvent: 'MIT',
          sourceRunId: '00000000-0000-4000-8000-00000000feed',
          debitCode: '0561',
          baseAmount: '900.00',
          amount: '88.10',
          mitStatus: 'INCLUDED',
          mitDebitId: 'MIT-abc123',
          cnpjFilial: '12345678000199',
        },
      ],
    });

    expect(xml).toContain('sourceEvent="MIT"');
    expect(xml).toContain('mitStatus="INCLUDED"');
    expect(xml).toContain('mitId="MIT-abc123"');
    expect(xml).toContain('cnpjFilial="12345678000199"');
  });

  it('reads pending PGD-DCTF tax debits and emits MIT inclusion XML', async () => {
    const query = jest.fn().mockResolvedValue([
      pgdRow({
        cnpj_filial: '12345678000199',
        pgd_debit_id: 'PGD-DEBIT-001',
        tax_code: '0561',
        amount: '88,10',
        mit_status: 'PENDING',
      }),
      pgdRow({
        cnpj_filial: '12345678000270',
        pgd_debit_id: 'PGD-DEBIT-002',
        tax_code: '2172',
        amount: '125.30',
        mit_status: 'REJECTED',
      }),
    ]);
    const service = new MitInclusionService({
      configured: true,
      query,
    } as never);

    const result = await RequestContextStore.run(
      {
        tenantId,
        permissions: ['fiscal.dctfweb.read', 'fiscal.dctfweb.write'],
      },
      () => service.generate({ year: 2026, month: 1 }),
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM fiscal.dctf_pgd_tax_debit'),
      [tenantId, '2026-01-01'],
    );
    expect(result).toMatchObject({
      competence: '2026-01-01',
      mitStatus: 'INCLUDED',
      debitCount: 2,
      totalAmount: '213.40',
    });
    expect(result.xmlHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.debits).toEqual([
      expect.objectContaining({
        mitStatus: 'INCLUDED',
        cnpjFilial: '12345678000199',
        amount: '88.10',
      }),
      expect.objectContaining({
        mitStatus: 'INCLUDED',
        cnpjFilial: '12345678000270',
        amount: '125.30',
      }),
    ]);
  });

  it('filters by cnpj_filial when a branch is requested', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([pgdRow({ cnpj_filial: '12345678000270' })]);
    const service = new MitInclusionService({
      configured: true,
      query,
    } as never);

    await RequestContextStore.run({ tenantId }, () =>
      service.generate({
        year: 2026,
        month: 1,
        cnpjFilial: '12345678000270',
      }),
    );

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      tenantId,
      '2026-01-01',
      '12345678000270',
    ]);
  });

  it('rejects missing MIT debits and invalid cnpj_filial values', async () => {
    const empty = new MitInclusionService({
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    } as never);

    await expect(
      RequestContextStore.run({ tenantId }, () =>
        empty.generate({ year: 2026, month: 1 }),
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    const invalid = new MitInclusionService({
      configured: true,
      query: jest.fn().mockResolvedValue([pgdRow({ cnpj_filial: '12.345' })]),
    } as never);
    await expect(
      RequestContextStore.run({ tenantId }, () =>
        invalid.generate({ year: 2026, month: 1 }),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

function mitDebit(overrides: Partial<DctfwebMitDebitDto> = {}) {
  return {
    mitDebitId: 'MIT-debit-id',
    mitStatus: 'INCLUDED' as const,
    cnpjFilial: '12345678000199',
    pgdDeclarationId: 'PGD-DECL-2026-01',
    pgdDebitId: 'PGD-DEBIT-001',
    taxCode: '0561',
    period: '2026-01-01',
    baseAmount: '900.00',
    amount: '88.10',
    dueDate: '2026-02-25',
    ...overrides,
  };
}

function pgdRow(overrides: Record<string, unknown> = {}) {
  return {
    pgd_declaration_id: 'PGD-DECL-2026-01',
    pgd_debit_id: 'PGD-DEBIT-001',
    cnpj_filial: '12345678000199',
    tax_code: '0561',
    period: '2026-01-01',
    base_amount: '900.00',
    amount: '88.10',
    due_date: '2026-02-25',
    mit_status: 'PENDING',
    ...overrides,
  };
}

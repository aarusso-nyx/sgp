import { readFileSync } from 'node:fs';

import {
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  buildEfdReinfXml,
  EfdReinfBuilderService,
} from './efd-reinf-builder.service';

interface TestDbClient {
  query(sql: string, values: unknown[]): Promise<{ rows: unknown[] }>;
}

type TransactionCallback = (client: TestDbClient) => Promise<unknown>;

describe('EfdReinfBuilderService', () => {
  it('builds the R-4010 golden XML for pessoa fisica payments', () => {
    const xml = buildEfdReinfXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2025-01-01',
      eventType: 'R4010',
      kind: 'ORIGINAL',
      originalEventId: null,
      items: [
        {
          sourceRunId: '00000000-0000-4000-8000-000000004010',
          beneficiaryKind: 'CPF',
          beneficiaryDocument: '12345678901',
          beneficiaryName: 'Servidor Exemplo',
          revenueCode: '0561',
          grossAmount: '3500.00',
          retainedAmount: '275.15',
        },
      ],
    });

    expect(xml).toBe(golden('r4010.golden.xml'));
  });

  it('builds the R-4020 golden XML for pessoa juridica payments', () => {
    const xml = buildEfdReinfXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2025-01-01',
      eventType: 'R4020',
      kind: 'ORIGINAL',
      originalEventId: null,
      items: [
        {
          sourceRunId: '00000000-0000-4000-8000-000000004020',
          beneficiaryKind: 'CNPJ',
          beneficiaryDocument: '11222333000144',
          beneficiaryName: 'Fornecedor Exemplo LTDA',
          revenueCode: '1708',
          grossAmount: '8000.00',
          retainedAmount: '120.00',
        },
      ],
    });

    expect(xml).toBe(golden('r4020.golden.xml'));
  });

  it('requires database and tenant context for service operations', async () => {
    const service = new EfdReinfBuilderService({ configured: false } as never);
    await expect(service.list()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const configured = new EfdReinfBuilderService({
      configured: true,
    } as never);
    expect(() =>
      (
        configured as never as {
          currentTenantId(): string;
        }
      ).currentTenantId(),
    ).toThrow(UnprocessableEntityException);
  });

  it('generates R-4010 from monthly DIRF source rows', async () => {
    const inserted: unknown[][] = [];
    const client = {
      query: jest.fn(async (sql: string, values: unknown[]) => {
        if (sql.includes('INSERT INTO fiscal.efd_reinf_event')) {
          return { rows: [{ id: 'event-1' }] };
        }
        if (sql.includes('INSERT INTO fiscal.efd_reinf_item')) {
          inserted.push(values);
        }
        return { rows: [] };
      }),
    };
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000004010',
        beneficiary_kind: 'CPF',
        beneficiary_document: '12345678901',
        beneficiary_name: 'Servidor Exemplo',
        revenue_code: '0561',
        amount: '3500.00',
        irrf: '275.15',
      },
    ]);
    const service = new EfdReinfBuilderService({
      configured: true,
      query,
      transaction: jest.fn((callback: TransactionCallback) => callback(client)),
    } as never);
    jest.spyOn(service, 'find').mockResolvedValue({ id: 'event-1' } as never);

    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () =>
          service.generate({
            year: 2025,
            month: 1,
            eventType: 'R4010',
          }),
      ),
    ).resolves.toEqual({ id: 'event-1' });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toEqual(
      expect.arrayContaining(['CPF', '12345678901', '0561', '3500.00']),
    );
  });

  it('builds R-4099 closure items from accepted R-4000 events', async () => {
    const inserted: unknown[][] = [];
    const client: TestDbClient = {
      query: jest.fn(async (sql: string, values: unknown[]) => {
        if (sql.includes('INSERT INTO fiscal.efd_reinf_event')) {
          return { rows: [{ id: 'event-4099' }] };
        }
        if (sql.includes('INSERT INTO fiscal.efd_reinf_item')) {
          inserted.push(values);
        }
        return { rows: [] };
      }),
    };
    const service = new EfdReinfBuilderService({
      configured: true,
      query: jest.fn().mockResolvedValueOnce([
        {
          source_run_id: '00000000-0000-4000-8000-000000004010',
          beneficiary_kind: 'CPF',
          beneficiary_document: '12345678901',
          beneficiary_name: 'Servidor Exemplo',
          revenue_code: '0561',
          gross_amount: '3500.00',
          retained_amount: '275.15',
        },
        {
          source_run_id: '00000000-0000-4000-8000-000000004011',
          beneficiary_kind: 'CPF',
          beneficiary_document: '12345678901',
          beneficiary_name: 'Servidor Exemplo',
          revenue_code: '0561',
          gross_amount: '500.00',
          retained_amount: '10.00',
        },
      ]),
      transaction: jest.fn((callback: TransactionCallback) => callback(client)),
    } as never);
    jest
      .spyOn(service, 'find')
      .mockResolvedValue({ id: 'event-4099' } as never);

    await RequestContextStore.run(
      { tenantId: '00000000-0000-4000-8000-000000000100' },
      () =>
        service.generate({
          year: 2025,
          month: 1,
          eventType: 'R4099',
        }),
    );

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toEqual(
      expect.arrayContaining(['0561', '4000.00', '285.15']),
    );
  });

  it('rejects empty source rows and invalid monetary values', async () => {
    const service = new EfdReinfBuilderService({
      configured: true,
      query: jest.fn().mockResolvedValueOnce([]),
    } as never);
    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () =>
          service.generate({
            year: 2025,
            month: 1,
            eventType: 'R4020',
          }),
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () =>
          service.generate({
            year: 2025,
            month: 1,
            eventType: 'R4080',
            items: [
              {
                beneficiaryKind: 'CNPJ',
                beneficiaryDocument: '11222333000144',
                beneficiaryName: 'Fonte pagadora',
                revenueCode: '1708',
                grossAmount: '-1.00',
                retainedAmount: '0.00',
              },
            ],
          }),
      ),
    ).rejects.toThrow('EFD-Reinf monetary values must be non-negative');
  });
});

function golden(name: string): string {
  return readFileSync(`../tests/fixtures/efd-reinf/${name}`, 'utf8').trimEnd();
}

/* eslint-disable */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  buildDctfwebXml,
  DctfwebBuilderService,
} from './dctfweb-builder.service';

const DCTFWEB_CSLL_GOLDEN_ROOT = join(
  __dirname,
  '../../../../tests/backend/golden/dctfweb-csll-v01',
);

describe('DctfwebBuilderService', () => {
  it('builds the DCTFWeb XML golden for a fictitious competence', () => {
    const xml = buildDctfwebXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2026-01-01',
      kind: 'ORIGINAL',
      originalDeclarationId: null,
      items: [
        {
          sourceEvent: 'S5011',
          sourceRunId: '00000000-0000-4000-8000-000000005011',
          debitCode: '1082-01',
          baseAmount: '1000.00',
          amount: '200.00',
        },
        {
          sourceEvent: 'S5012',
          sourceRunId: '00000000-0000-4000-8000-000000005012',
          debitCode: '0561',
          baseAmount: '500.00',
          amount: '50.00',
        },
      ],
    });

    expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<DCTFWeb xmlns="urn:br:gov:rfb:dctfweb:sgp:v1">
  <declaracao Id="DCTFb11abd46b6ac6a2cb8d7b5bfb4bdb429">
    <tenantId>00000000-0000-0000-0000-00000000f501</tenantId>
    <competencia>2026-01</competencia>
    <tipo>ORIGINAL</tipo>
    <totalizadores>
    <debito sourceEvent="S5011" sourceRunId="00000000-0000-4000-8000-000000005011" codigo="1082-01" base="1000.00" valor="200.00" />
    <debito sourceEvent="S5012" sourceRunId="00000000-0000-4000-8000-000000005012" codigo="0561" base="500.00" valor="50.00" />
    </totalizadores>
  </declaracao>
</DCTFWeb>`);
  });

  it('matches the CSLL adicional DCTFWeb golden fixture byte-for-byte', () => {
    const input = JSON.parse(
      readFileSync(join(DCTFWEB_CSLL_GOLDEN_ROOT, 'input.json'), 'utf8'),
    ) as Parameters<typeof buildDctfwebXml>[0];
    const expectedXml = readFileSync(
      join(DCTFWEB_CSLL_GOLDEN_ROOT, 'expected.xml'),
      'utf8',
    ).trimEnd();

    expect(buildDctfwebXml(input)).toBe(expectedXml);
  });

  it('requires retificadora to reference the original declaration', () => {
    const xml = buildDctfwebXml({
      tenantId: '00000000-0000-0000-0000-00000000f501',
      competence: '2026-01-01',
      kind: 'RETIFICADORA',
      originalDeclarationId: '00000000-0000-4000-8000-00000000abcd',
      items: [
        {
          sourceEvent: 'S5013',
          sourceRunId: '00000000-0000-4000-8000-000000005013',
          debitCode: 'FGTS',
          baseAmount: '800.00',
          amount: '64.00',
        },
      ],
    });

    expect(xml).toContain(
      '<declaracaoOriginal>00000000-0000-4000-8000-00000000abcd</declaracaoOriginal>',
    );
  });

  it('requires database and tenant context for service operations', async () => {
    const service = new DctfwebBuilderService({ configured: false } as never);
    await expect(service.list()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const configured = new DctfwebBuilderService({ configured: true } as never);
    expect(() =>
      (configured as never as { currentTenantId: Function }).currentTenantId(),
    ).toThrow(UnprocessableEntityException);
  });

  it('lists, finds, and maps declaration details with date variants', async () => {
    const declaration = {
      id: 'decl-1',
      competence: new Date('2026-05-01T00:00:00.000Z'),
      kind: 'ORIGINAL',
      status: 'DRAFT',
      original_declaration_id: null,
      payload_xml_ref: 's3://payload',
      payload_xml: '<xml/>',
      payload_xml_hash: 'payload-hash',
      signed_xml_ref: null,
      signed_xml: null,
      signed_xml_hash: null,
      transmitted_xml_hash: null,
      receipt_number: null,
      receipt_at: null,
      item_count: '1',
      total_base_amount: '1000.00',
      total_amount: '200.00',
      created_at: '2026-05-02T10:00:00.000Z',
      updated_at: '2026-05-02T11:00:00.000Z',
    };
    const query = jest
      .fn()
      .mockResolvedValueOnce([declaration])
      .mockResolvedValueOnce([declaration])
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          source_event: 'S5011',
          source_run_id: 'run-1',
          debit_code: '1082-01',
          base_amount: '1000.00',
          amount: '200.00',
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new DctfwebBuilderService({
      configured: true,
      query,
    } as never);

    await expect(service.list(2026, 5)).resolves.toMatchObject([
      { id: 'decl-1', competence: '2026-05-01', itemCount: 1 },
    ]);
    await expect(service.find('decl-1')).resolves.toMatchObject({
      id: 'decl-1',
      payloadXml: '<xml/>',
      items: [{ id: 'item-1', sourceEvent: 'S5011' }],
    });
    await expect(service.find('missing')).rejects.toThrow(
      'DCTFWeb declaration not found',
    );
  });

  it('normalizes explicit totalizer items and XML totalizers', () => {
    const service = new DctfwebBuilderService({ configured: true } as never);
    const target = service as never as { itemsFromTotalizer: Function };

    expect(
      target.itemsFromTotalizer({
        kind: 'S-5011',
        source_event_recibo: 'rec-1',
        payload: JSON.stringify({
          items: [
            {
              codigo: '1082-01',
              base: '1000,50',
              valor: '200.25',
              csllAdicionalAmount: '12,34',
              source_run_id: 'bad-id',
            },
          ],
        }),
      }),
    ).toMatchObject([
      {
        sourceEvent: 'S5011',
        debitCode: '1082-01',
        baseAmount: '1000.50',
        amount: '200.25',
        csllAdicionalAmount: '12.34',
      },
    ]);
    expect(
      target.itemsFromTotalizer({
        kind: 'S-5012',
        source_event_recibo: 'rec-2',
        payload: {
          rawXml:
            '<infoCRIRRF><tpCR>0561</tpCR><vrBcCP>500.00</vrBcCP><vrCR>50.00</vrCR><vrCsllAdicional>5.25</vrCsllAdicional></infoCRIRRF>',
        },
      }),
    ).toMatchObject([
      {
        sourceEvent: 'S5012',
        debitCode: '0561',
        baseAmount: '500.00',
        amount: '50.00',
        csllAdicionalAmount: '5.25',
      },
    ]);
    expect(
      target.itemsFromTotalizer({
        kind: 'S-5013',
        source_event_recibo: 'rec-3',
        payload: { rawXml: '<empty />' },
      }),
    ).toEqual([]);
    expect(
      target.itemsFromTotalizer({
        kind: 'R-9015',
        source_event_recibo: 'REINF-R9015',
        payload: {
          items: [
            {
              sourceRunId: '00000000-0000-4000-8000-000000004099',
              debitCode: '0561',
              baseAmount: '3500.00',
              amount: '275.15',
            },
          ],
        },
      }),
    ).toMatchObject([
      {
        sourceEvent: 'R9015',
        debitCode: '0561',
        baseAmount: '3500.00',
        amount: '275.15',
      },
    ]);
    expect(() =>
      target.itemsFromTotalizer({
        kind: 'S-5011',
        source_event_recibo: 'rec-4',
        payload: { debits: [{ amount: '-1.00' }] },
      }),
    ).toThrow('DCTFWeb monetary values must be non-negative');
  });

  it('generates original and retificadora declarations from accepted totalizers', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 'decl-1' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          kind: 'S-5011',
          source_event_recibo: 'rec-1',
          payload: {
            items: [
              {
                debitCode: '1082-01',
                baseAmount: '1000.00',
                amount: '200.00',
                csllAdicionalAmount: '10.00',
              },
            ],
          },
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new DctfwebBuilderService({
      configured: true,
      query,
      transaction: jest.fn((fn) => fn(client)),
    } as never);
    jest.spyOn(service, 'find').mockResolvedValue({ id: 'decl-1' } as never);

    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () => service.generate({ year: 2026, month: 5 }),
      ),
    ).resolves.toEqual({ id: 'decl-1' });
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenLastCalledWith(
      expect.stringContaining('csll_adicional_amount'),
      expect.arrayContaining(['10.00']),
    );

    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () => service.generate({ year: 2026, month: 5, kind: 'RETIFICADORA' }),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects empty totalizers and missing original declarations', async () => {
    const service = new DctfwebBuilderService({
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    } as never);

    await expect(
      RequestContextStore.run(
        { tenantId: '00000000-0000-4000-8000-000000000100' },
        () => service.generate({ year: 2026, month: 5 }),
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    const target = new DctfwebBuilderService({
      configured: true,
    } as never) as never as {
      assertOriginalExists: Function;
    };
    await expect(
      target.assertOriginalExists(
        { query: jest.fn().mockResolvedValue({ rowCount: 0 }) },
        'decl-original',
      ),
    ).rejects.toThrow(
      'Retificadora must reference an existing original DCTFWeb declaration',
    );
  });
});

/* eslint-disable */
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const {
  queryResult,
} = require('../../../../tests/backend/support/mock-db.cjs');
import { RescisaoService } from './rescisao.service';

const context = {
  employee_id: 'employee-1',
  employment_link_id: 'link-1',
  contract_type: 'celetista',
  branch_id: null,
  functional_status_id: null,
  work_location_id: null,
};

const component = {
  item_code: 'RESC_SALDO',
  item_kind: 'EARNING',
  amount: '1000.00',
  reference_value: '30.00',
  quantity: '1.0000',
  metadata: undefined,
};

describe('RescisaoService', () => {
  it('requires a configured database', async () => {
    const service = new RescisaoService({ configured: false } as never);

    await expect(
      service.run('link-1', '2026-05-01', 'SEM_JUSTA_CAUSA'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('runs the termination payroll orchestration and maps generated components', async () => {
    const client = { query: jest.fn().mockResolvedValue(queryResult([])) };
    const db = {
      configured: true,
      transaction: jest.fn((fn) => fn(client)),
    };
    const priorNotice = { resolve: jest.fn().mockResolvedValue({}) };
    const fgts = {
      computeTerminationFine: jest.fn().mockResolvedValue([
        {
          amount: '400.00',
          baseAmount: '1000.00',
          accountId: 'account-1',
          movementId: 'movement-1',
        },
      ]),
    };
    const service = new RescisaoService(
      db as never,
      priorNotice as never,
      fgts as never,
    );
    jest
      .spyOn(service as never as { loadContext: jest.Mock }, 'loadContext')
      .mockResolvedValue(context);
    jest
      .spyOn(service as never as { ensureCatalog: jest.Mock }, 'ensureCatalog')
      .mockResolvedValue({
        payroll_type_id: 'type-1',
        processing_type_id: 'proc-1',
      });
    jest
      .spyOn(service as never as { ensureRun: jest.Mock }, 'ensureRun')
      .mockResolvedValue({ id: 'run-1', status: 'GENERATED' });
    jest
      .spyOn(
        service as never as { prepareRunForReprocessing: jest.Mock },
        'prepareRunForReprocessing',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        service as never as { softDeleteCalculatedItems: jest.Mock },
        'softDeleteCalculatedItems',
      )
      .mockResolvedValue(undefined);
    client.query.mockResolvedValueOnce(queryResult([component]));
    jest
      .spyOn(service as never as { insertItem: jest.Mock }, 'insertItem')
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        service as never as { refreshAggregates: jest.Mock },
        'refreshAggregates',
      )
      .mockResolvedValue({
        employee_count: '1',
        total_earnings: '1400.00',
        total_deductions: '0.00',
        total_net: '1400.00',
      });
    for (const method of [
      'upsertFinancialRecord',
      'linkTermination',
      'appendHistory',
      'appendAuditEvent',
    ]) {
      jest.spyOn(service as never, method).mockResolvedValue(undefined);
    }

    await expect(
      service.run('link-1', '2026-05-01', 'SEM_JUSTA_CAUSA', 'INDENIZADO'),
    ).resolves.toMatchObject({
      payrollRunId: 'run-1',
      status: 'GENERATED',
      employeeCount: 1,
      components: [
        { code: 'RESC_SALDO', metadata: {} },
        {
          code: 'RESC_MULTA_FGTS_40',
          amount: '400.00',
          metadata: { origin: 'fgts_fine_40' },
        },
      ],
    });
    expect(priorNotice.resolve).toHaveBeenCalledWith(
      'link-1',
      '2026-05-01',
      'INDENIZADO',
      'NONE',
    );
  });

  it('maps missing context and idempotency conflicts to domain exceptions', async () => {
    const service = new RescisaoService({
      configured: true,
      transaction: jest.fn((fn) => fn({ query: jest.fn() })),
    } as never);
    jest
      .spyOn(service as never as { loadContext: jest.Mock }, 'loadContext')
      .mockResolvedValue(null);

    await expect(
      service.run('missing', '2026-05-01', 'OUTRA'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const conflict = new RescisaoService({
      configured: true,
      transaction: jest.fn(() =>
        Promise.reject({
          code: '23505',
          constraint: 'employee_payroll_item_active_idempotency_uq',
        }),
      ),
    } as never);
    await expect(
      conflict.run('link-1', '2026-05-01', 'OUTRA'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('covers FGTS eligibility, catalog guards, and aggregate defaults', async () => {
    const fgts = {
      computeTerminationFine: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            amount: '400.00',
            baseAmount: '1000.00',
            accountId: 'account-1',
            movementId: 'movement-1',
          },
        ]),
    };
    const service = new RescisaoService(
      { configured: true } as never,
      undefined,
      fgts as never,
    );
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult([])),
    };

    await expect(
      (service as never as { computeFgtsFine: Function }).computeFgtsFine(
        client,
        'run-1',
        'link-1',
        'PEDIDO_DEMISSAO',
        context,
      ),
    ).resolves.toEqual([]);
    await expect(
      (service as never as { computeFgtsFine: Function }).computeFgtsFine(
        client,
        'run-1',
        'link-1',
        'SEM_JUSTA_CAUSA',
        context,
      ),
    ).resolves.toEqual([]);
    await expect(
      (service as never as { computeFgtsFine: Function }).computeFgtsFine(
        client,
        'run-1',
        'link-1',
        'WITHOUT_CAUSE',
        context,
      ),
    ).resolves.toMatchObject([{ item_code: 'RESC_MULTA_FGTS_40' }]);

    await expect(
      (service as never as { insertItem: Function }).insertItem(client, {
        employeeId: 'employee-1',
        payrollRunId: 'run-1',
        year: 2026,
        month: 5,
        item: component,
      }),
    ).rejects.toThrow(
      'Termination payroll component RESC_SALDO is not cataloged',
    );
    await expect(
      (service as never as { refreshAggregates: Function }).refreshAggregates(
        client,
        'run-1',
      ),
    ).resolves.toEqual({
      employee_count: '0',
      total_earnings: '0.00',
      total_deductions: '0.00',
      total_net: '0.00',
    });
  });
});

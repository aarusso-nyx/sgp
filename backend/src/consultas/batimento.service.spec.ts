import { ServiceUnavailableException } from '@nestjs/common';

import { BatimentoService } from './batimento.service';

describe('BatimentoService', () => {
  it('creates the F-FOL-016 report request and returns reconciliation assertions', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        row('total_net', '96000.00', '96000.00', '0.00'),
        row('irrf_esocial_s5012_s5002', '1000.00', '990.00', '10.00'),
      ])
      .mockResolvedValueOnce([{ id: 'definition-1' }])
      .mockResolvedValueOnce([
        {
          id: 'request-1',
          status: 'REQUESTED',
          requested_at: '2026-05-02T12:00:00.000Z',
        },
      ]);
    const service = new BatimentoService({ configured: true, query } as never);

    await expect(
      service.createReport({
        competenceYear: 2026,
        competenceMonth: 5,
      }),
    ).resolves.toEqual({
      reportCode: 'F-FOL-016',
      reportRequestId: 'request-1',
      status: 'REQUESTED',
      requestedAt: '2026-05-02T12:00:00.000Z',
      criteria: {
        payrollRunId: null,
        competenceYear: 2026,
        competenceMonth: 5,
        branchId: null,
      },
      assertions: [
        {
          metric: 'total_net',
          sourceTotal: '96000.00',
          recomputedTotal: '96000.00',
          difference: '0.00',
          ok: true,
        },
        {
          metric: 'irrf_esocial_s5012_s5002',
          sourceTotal: '1000.00',
          recomputedTotal: '990.00',
          difference: '10.00',
          ok: false,
        },
      ],
      balanced: false,
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('inss_esocial_s5011'),
      [null, 2026, 5, null],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO public.report_definition'),
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO public.report_request'),
      [
        'definition-1',
        null,
        null,
        2026,
        5,
        JSON.stringify({
          operation: 'report.batimento_folha.requested',
          reportCode: 'F-FOL-016',
        }),
      ],
    );
  });

  it('requires database configuration', async () => {
    const service = new BatimentoService({ configured: false } as never);

    await expect(
      service.createReport({ competenceYear: 2026, competenceMonth: 5 }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

function row(
  metric: string,
  source_total: string,
  recomputed_total: string,
  difference: string,
) {
  return {
    metric,
    source_total,
    recomputed_total,
    difference,
  };
}

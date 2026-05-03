import { BadRequestException } from '@nestjs/common';

import { ReportRuntimeService } from './report-service.service';

describe('ReportRuntimeService', () => {
  const tenantId = '22222222-2222-4222-8222-222222222222';

  it('rejects eSocial definitions in the report-service runtime', () => {
    const service = new ReportRuntimeService(
      { configured: false } as never,
      { pollOnce: jest.fn() } as never,
    );

    expect(() =>
      service.validateRequest({
        tenantId,
        definitionCode: 'ESOCIAL_EVENTO_PROCESSAR',
      }),
    ).toThrow(BadRequestException);
  });

  it('queues a concrete report request with tenant scope', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([{ id: 'definition-1' }])
      .mockResolvedValueOnce([
        {
          id: 'request-1',
          status: 'REQUESTED',
          definition_code: 'AVALIACAO_RELATORIO_CICLO',
          requested_at: '2026-04-25T12:00:00.000Z',
        },
      ]);

    const service = new ReportRuntimeService(
      { configured: true, query } as never,
      { pollOnce: jest.fn() } as never,
    );

    await expect(
      service.queueReport({
        tenantId,
        definitionCode: 'avaliacao_relatorio_ciclo',
        moduleKey: 'AVALIACAO',
        name: 'Relatorio de ciclo',
        parameters: { periodLabel: '2026' },
      }),
    ).resolves.toMatchObject({
      accepted: true,
      id: 'request-1',
      definitionCode: 'AVALIACAO_RELATORIO_CICLO',
      status: 'REQUESTED',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO public.report_definition'),
      expect.arrayContaining([tenantId, 'AVALIACAO_RELATORIO_CICLO']),
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO public.report_request'),
      expect.arrayContaining([tenantId, 'definition-1']),
    );
  });

  it('polls through the report worker runtime', async () => {
    const pollOnce = jest.fn().mockResolvedValue({
      discovered: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
    });
    const service = new ReportRuntimeService(
      { configured: false } as never,
      { pollOnce } as never,
    );

    await service.pollOnce({ limit: 7 });

    expect(pollOnce).toHaveBeenCalledWith(7);
  });

  it('normalizes defaults, dry-runs, and validates report runtime requests', async () => {
    const service = new ReportRuntimeService(
      { configured: false } as never,
      { pollOnce: jest.fn() } as never,
    );

    expect(() => service.validateRequest(undefined as never)).toThrow(
      'tenantId must be a UUID',
    );
    expect(() =>
      service.validateRequest({ tenantId, definitionCode: '   ' }),
    ).toThrow('definitionCode is required');
    expect(() =>
      service.validateRequest({
        tenantId,
        definitionCode: 'REL',
        branchId: 'bad',
      }),
    ).toThrow('branchId must be a UUID');
    expect(() =>
      service.validateRequest({
        tenantId,
        definitionCode: 'REL',
        competenceYear: 2026,
      }),
    ).toThrow('competenceYear and competenceMonth must be provided together');

    const normalized = service.validateRequest({
      tenantId,
      definitionCode: ' relatorio_geral ',
      dryRun: true,
    });
    expect(normalized).toMatchObject({
      tenantId,
      definitionCode: 'RELATORIO_GERAL',
      moduleKey: 'RELATORIO',
      name: 'RELATORIO_GERAL',
      description: 'Runtime report request.',
      branchId: null,
      payrollRunId: null,
      processingTypeId: null,
      competenceYear: null,
      competenceMonth: null,
      parameters: {},
      dryRun: true,
    });
    await expect(
      service.queueReport({ tenantId, definitionCode: 'REL', dryRun: true }),
    ).resolves.toMatchObject({
      accepted: true,
      dryRun: true,
      definitionCode: 'REL',
    });
    await expect(
      service.queueReport({ tenantId, definitionCode: 'REL' }),
    ).rejects.toThrow('DATABASE_URL is required');
  });

  it('normalizes poll limits before delegating to the integrations worker', async () => {
    const pollOnce = jest.fn().mockResolvedValue({
      discovered: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
    });
    const service = new ReportRuntimeService(
      { configured: false } as never,
      { pollOnce } as never,
    );

    await service.pollOnce();
    await service.pollOnce({ limit: 0 });
    await service.pollOnce({ limit: 250 });

    expect(pollOnce.mock.calls[0][0]).toBe(10);
    expect(pollOnce.mock.calls[1][0]).toBe(10);
    expect(pollOnce.mock.calls[2][0]).toBe(100);
  });
});

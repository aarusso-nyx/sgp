import { PayrollOperationsService } from './payroll-operations.service';

describe('PayrollOperationsService', () => {
  const runRow = {
    id: 'run-1',
    branch_id: 'branch-1',
    processing_type_id: 'proc-1',
    competence_year: 2026,
    competence_month: 4,
    total_net: '5800.00',
  };

  it('creates remittance requests backed by remittance file and report request', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          branch_id: 'branch-1',
          processing_type_id: 'proc-1',
          competence_year: 2026,
          competence_month: 4,
          total_net: '5800.00',
        },
      ])
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([{ id: 'rem-1' }])
      .mockResolvedValueOnce([{ id: 'def-1' }])
      .mockResolvedValueOnce([
        {
          id: 'req-1',
          status: 'REQUESTED',
          requested_at: new Date('2026-04-26T00:00:00.000Z'),
        },
      ]);
    const service = new PayrollOperationsService({
      configured: true,
      query,
    } as never);

    const result = await service.requestRemittance('run-1', {
      bankId: 'bank-1',
      format: 'CNAB240',
      paymentDate: '2026-04-25',
    });

    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO payroll.payment_remittance_file'),
      [
        'run-1',
        'branch-1',
        'proc-1',
        2026,
        4,
        '2026-04-25',
        'remessa_000001.txt',
        '5800.00',
      ],
    );
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('INSERT INTO public.report_request'),
      ['def-1', 'branch-1', 'run-1', 'proc-1', 2026, 4, expect.any(String)],
    );
    expect(result.requestId).toBe('req-1');
  });

  it('lists remittances and applies request defaults', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([{ total: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...runRow, branch_id: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'rem-2' }])
      .mockResolvedValueOnce([{ id: 'def-1' }])
      .mockResolvedValueOnce([
        {
          id: 'req-2',
          status: 'REQUESTED',
          requested_at: '2026-04-26T00:00:00.000Z',
        },
      ]);
    const service = new PayrollOperationsService({
      configured: true,
      query,
    } as never);

    await expect(service.listRemittances('run-1', {})).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    const result = await service.requestRemittance('run-1', {
      bankId: 'bank-1',
    });

    expect(result).toMatchObject({
      requestId: 'req-2',
      metadata: {
        remittanceId: 'rem-2',
        remittanceNumber: 1,
        fileName: 'remessa_000001.txt',
      },
    });
    const parameters = JSON.parse(query.mock.calls[7][1][6] as string);
    expect(parameters).toMatchObject({
      format: 'CNAB240',
      launchType: 'ACCOUNT_CREDIT',
      paymentDate: '2026-04-25',
    });
  });

  it('creates return-processing requests for an existing remittance', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          branch_id: 'branch-1',
          processing_type_id: 'proc-1',
          competence_year: 2026,
          competence_month: 4,
          total_net: '5800.00',
        },
      ])
      .mockResolvedValueOnce([{ id: 'rem-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'def-2' }])
      .mockResolvedValueOnce([
        {
          id: 'req-2',
          status: 'REQUESTED',
          requested_at: new Date('2026-04-26T00:00:00.000Z'),
        },
      ]);
    const service = new PayrollOperationsService({
      configured: true,
      query,
    } as never);

    const result = await service.requestReturnProcessing('run-1', {
      remittanceId: 'rem-1',
      s3Key: 'uploads/retorno/file.txt',
    });

    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('INSERT INTO public.report_request'),
      ['def-2', 'branch-1', 'run-1', 'proc-1', 2026, 4, expect.any(String)],
    );
    expect(result.requestId).toBe('req-2');
  });

  it('creates gfip generation requests', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'def-3' }])
      .mockResolvedValueOnce([
        {
          id: 'req-3',
          status: 'REQUESTED',
          requested_at: new Date('2026-04-26T00:00:00.000Z'),
        },
      ]);
    const service = new PayrollOperationsService({
      configured: true,
      query,
    } as never);

    const result = await service.requestGfipGeneration({
      branchId: 'branch-1',
      competenceYear: 2026,
      competenceMonth: 4,
      collectionCode: '2100',
      modality: 'BRANCO',
    });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO public.report_request'),
      ['def-3', 'branch-1', '', '', 2026, 4, expect.any(String)],
    );
    expect(result.requestId).toBe('req-3');
  });

  it('creates GFIP requests from an existing payroll run and handles missing records', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([{ id: 'def-4' }])
      .mockResolvedValueOnce([
        {
          id: 'req-4',
          status: 'REQUESTED',
          requested_at: '2026-04-26T00:00:00.000Z',
        },
      ]);
    const service = new PayrollOperationsService({
      configured: true,
      query,
    } as never);

    await expect(
      service.requestGfipGeneration({
        payrollRunId: 'run-1',
        competenceYear: 2026,
        competenceMonth: 4,
        collectionCode: '2100',
        modality: 'BRANCO',
      }),
    ).resolves.toMatchObject({
      metadata: {
        payrollRunId: 'run-1',
        branchId: 'branch-1',
      },
    });

    await expect(
      new PayrollOperationsService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).listRemittances('missing', {}),
    ).rejects.toThrow('Payroll run not found');
    await expect(
      new PayrollOperationsService({
        configured: true,
        query: jest
          .fn()
          .mockResolvedValueOnce([runRow])
          .mockResolvedValueOnce([]),
      } as never).requestReturnProcessing('run-1', {
        remittanceId: 'missing',
        s3Key: 'returns/file.txt',
      }),
    ).rejects.toThrow('Remittance file not found');
    await expect(
      new PayrollOperationsService({
        configured: false,
      } as never).requestGfipGeneration({
        competenceYear: 2026,
        competenceMonth: 4,
        collectionCode: '2100',
        modality: 'BRANCO',
      }),
    ).rejects.toThrow('DATABASE_URL is required');
  });
});

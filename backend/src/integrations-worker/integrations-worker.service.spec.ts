import { IntegrationsWorkerService } from './integrations-worker.service';

describe('IntegrationsWorkerService', () => {
  it('processes a remittance request into a generated attachment', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          id: 'req-1',
          tenant_id: 'tenant-1',
          definition_code: 'FOLHA_CNAB_REMESSA',
          parameters: {
            remittanceId: 'rem-1',
            bankId: 'bank-1',
            format: 'CNAB240',
            remittanceNumber: 1,
          },
          payroll_run_id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-1' }])
      .mockResolvedValueOnce([
        {
          remittance_id: 'rem-1',
          payroll_run_id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          payment_date: '2026-04-25',
          total_amount: '5800.00',
          employee_count: '3',
          file_name: 'remessa_000001.txt',
        },
      ])
      .mockResolvedValueOnce([{ id: 'doc-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const storeGeneratedObject = jest.fn().mockResolvedValue({
      storageKind: 'LOCAL',
      storageKey: 'tenant-1/outputs/remessa/2026/04/remessa_000001.txt',
      sizeBytes: 128,
      checksum: 'abc123',
    });

    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject } as never,
    );

    const result = await service.pollOnce(5);

    expect(result).toEqual({
      discovered: 1,
      processed: 1,
      failed: 0,
      skipped: 0,
    });
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: 'tenant-1/outputs/remessa/2026/04/remessa_000001.txt',
      }),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.payment_remittance_file'),
      ['rem-1', 'abc123'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.report_request'),
      expect.arrayContaining(['req-1']),
    );
  });

  it('marks a failing worker request as failed', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          id: 'req-2',
          tenant_id: 'tenant-2',
          definition_code: 'FOLHA_CNAB_RETORNO',
          parameters: {
            remittanceId: 'rem-2',
          },
          payroll_run_id: 'run-2',
          competence_year: 2026,
          competence_month: 4,
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-2' }])
      .mockResolvedValueOnce([]);

    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject: jest.fn() } as never,
    );

    const result = await service.pollOnce(5);

    expect(result).toEqual({
      discovered: 1,
      processed: 0,
      failed: 1,
      skipped: 0,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'FAILED'"),
      ['req-2', 'Missing required worker parameter: s3Key'],
    );
  });

  it('processes an avaliacao report request into a generated attachment', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          id: 'req-3',
          tenant_id: 'tenant-3',
          definition_code: 'AVALIACAO_FICHA_DESEMPENHO',
          parameters: {
            evaluationId: 'aval-1',
            format: 'PDF',
          },
          payroll_run_id: null,
          competence_year: null,
          competence_month: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-3' }])
      .mockResolvedValueOnce([
        {
          evaluation_id: 'aval-1',
          employee_name: 'Maria Servidora',
          registration: '0001',
          period_label: '2026',
          score: '9.50',
          status: 'APPROVED',
          evaluated_on: '2026-04-25',
          evaluator_ref: 'usr-avaliador',
        },
      ])
      .mockResolvedValueOnce([{ id: 'doc-3' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const storeGeneratedObject = jest.fn().mockResolvedValue({
      storageKind: 'LOCAL',
      storageKey: 'tenant-3/outputs/avaliacao/fichas/avaliacao-0001-2026.pdf',
      sizeBytes: 512,
      checksum: 'pdf123',
    });

    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject } as never,
    );

    const result = await service.pollOnce(5);

    expect(result.processed).toBe(1);
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: 'tenant-3/outputs/avaliacao/fichas/avaliacao-0001-2026.pdf',
        contentType: 'application/pdf',
      }),
    );
  });

  it('processes a siprev export request into generated xml', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          id: 'req-4',
          tenant_id: 'tenant-4',
          definition_code: 'PREVIDENCIARIO_SIPREV_EXPORT',
          parameters: {
            competence: '2026-05',
            format: 'XML',
          },
          payroll_run_id: null,
          competence_year: null,
          competence_month: null,
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-4' }])
      .mockResolvedValueOnce([
        {
          id: 'ret-1',
          cpf: '00011122233',
          name: 'Servidor Aposentado',
          granted_on: '2026-05-01',
          legal_basis: 'Lei RPPS',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'pen-1',
          beneficiary_name: 'Dependente Pensionista',
          beneficiary_cpf: '99988877766',
          granted_on: '2026-05-03',
          benefit_type: 'VITALICIA',
        },
      ])
      .mockResolvedValueOnce([{ id: 'doc-4' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const storeGeneratedObject = jest.fn().mockResolvedValue({
      storageKind: 'LOCAL',
      storageKey:
        'tenant-4/outputs/previdenciario/siprev/2026/05/siprev-202605.xml',
      sizeBytes: 1024,
      checksum: 'xml123',
    });

    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject } as never,
    );

    const result = await service.pollOnce(5);

    expect(result.processed).toBe(1);
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey:
          'tenant-4/outputs/previdenciario/siprev/2026/05/siprev-202605.xml',
        contentType: 'application/xml; charset=utf-8',
      }),
    );
  });

  it('processes the remaining report definition builders', async () => {
    const jobs = [
      {
        id: 'req-retorno',
        tenant_id: 'tenant-x',
        definition_code: 'FOLHA_CNAB_RETORNO',
        parameters: {
          remittanceId: 'rem-retorno',
          s3Key: 'imports/retorno.ret',
          returnFileName: 'retorno.ret',
          format: 'CNAB240',
        },
        payroll_run_id: null,
        competence_year: 2026,
        competence_month: 6,
      },
      {
        id: 'req-gfip',
        tenant_id: 'tenant-x',
        definition_code: 'FOLHA_GFIP_GERAR',
        parameters: {
          payrollRunId: 'run-gfip',
          collectionCode: '115',
          modality: '1',
          branchId: 'branch-1',
        },
        payroll_run_id: 'run-gfip',
        competence_year: 2026,
        competence_month: 6,
      },
      {
        id: 'req-cycle',
        tenant_id: 'tenant-x',
        definition_code: 'AVALIACAO_RELATORIO_CICLO',
        parameters: { periodLabel: '2026/1' },
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-ctc',
        tenant_id: 'tenant-x',
        definition_code: 'PREVIDENCIARIO_CTC',
        parameters: { certificateId: 'ctc-1' },
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-decl',
        tenant_id: 'tenant-x',
        definition_code: 'PREVIDENCIARIO_DECLARACAO',
        parameters: { declarationId: 'decl-1' },
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-notice',
        tenant_id: 'tenant-x',
        definition_code: 'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO',
        parameters: { campaignId: 'campaign-1' },
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-pending',
        tenant_id: 'tenant-x',
        definition_code: 'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS',
        parameters: {},
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM public.report_request rr')) {
        return jobs;
      }
      if (
        sql.includes("SET status = 'RUNNING'") ||
        sql.includes("SET status = 'COMPLETED'") ||
        sql.includes('UPDATE payroll.payment_remittance_file') ||
        sql.includes('UPDATE payroll.payroll_run') ||
        sql.includes('payroll_run_status_history') ||
        sql.includes('generated_report_file')
      ) {
        return sql.includes('RETURNING id::text') ||
          sql.includes('RETURNING id')
          ? [{ id: 'claim-or-doc' }]
          : [];
      }
      if (sql.includes('INSERT INTO public.document_attachment')) {
        return [{ id: 'doc-generated' }];
      }
      if (sql.includes('FROM payroll.payment_remittance_file')) {
        return [
          {
            remittance_id: 'rem-retorno',
            payroll_run_id: null,
            competence_year: 2026,
            competence_month: 6,
            payment_date: null,
            total_amount: '1000.00',
            employee_count: '2',
            file_name: null,
          },
        ];
      }
      if (
        sql.includes('FROM payroll.payroll_run pr') &&
        sql.includes('WHERE pr.id = $1::uuid')
      ) {
        return [
          {
            payroll_run_id: 'run-gfip',
            competence_year: 2026,
            competence_month: 6,
            branch_id: 'branch-1',
            total_net: '1500.00',
            employee_count: '3',
          },
        ];
      }
      if (sql.includes('GROUP BY evaluation.period_label')) {
        return [
          {
            period_label: '2026/1',
            total_evaluations: '4',
            average_score: '8.75',
            approved_count: '3',
          },
        ];
      }
      if (sql.includes('FROM hr.contribution_time_certificate')) {
        return [
          {
            certificate_id: 'ctc-1',
            employee_name: 'Servidor CTC',
            registration: '0002',
            period_start: new Date('2000-01-01T00:00:00.000Z'),
            period_end: '2026-01-01',
            issuing_agency: 'RPPS',
            issuance_act: 'Ato CTC',
          },
        ];
      }
      if (sql.includes('FROM hr.previdentiary_declaration')) {
        return [
          {
            declaration_id: 'decl-1',
            employee_name: 'Servidor Declaracao',
            registration: '0003',
            type: 'TEMPO',
            issued_at: new Date('2026-04-25T00:00:00.000Z'),
          },
        ];
      }
      if (sql.includes('FROM hr.recertification_campaign')) {
        return [
          {
            campaign_id: 'campaign-1',
            cycle_start: '2026-01-01',
            cycle_end: null,
            total_beneficiaries: '10',
            pending_count: '4',
            recertified_count: '6',
          },
        ];
      }
      return [];
    });
    const storeGeneratedObject = jest.fn(async ({ storageKey }) => ({
      storageKind: 'S3',
      storageKey,
      sizeBytes: 256,
      checksum: `checksum-${String(storageKey).split('/').pop()}`,
    }));
    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject } as never,
    );

    await expect(service.pollOnce(10)).resolves.toEqual({
      discovered: jobs.length,
      processed: jobs.length,
      failed: 0,
      skipped: 0,
    });
    expect(storeGeneratedObject).toHaveBeenCalledTimes(jobs.length);
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining('/outputs/gfip/2026/06/'),
      }),
    );
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining('/outputs/previdenciario/ctc/'),
      }),
    );
  });

  it('skips unclaimed jobs and fails unsupported definitions', async () => {
    const unclaimedQuery = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'req-skip',
          tenant_id: 'tenant-skip',
          definition_code: 'FOLHA_GFIP_GERAR',
          parameters: {},
          payroll_run_id: null,
          competence_year: 2026,
          competence_month: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    await expect(
      new IntegrationsWorkerService(
        { query: unclaimedQuery } as never,
        { storeGeneratedObject: jest.fn() } as never,
      ).pollOnce(1),
    ).resolves.toMatchObject({ skipped: 1, processed: 0 });

    const unsupportedQuery = jest.fn(async (sql: string) => {
      if (sql.includes('FROM public.report_request rr')) {
        return [
          {
            id: 'req-unsupported',
            tenant_id: 'tenant-x',
            definition_code: 'NAO_SUPORTADO',
            parameters: {},
            payroll_run_id: null,
            competence_year: null,
            competence_month: null,
          },
        ];
      }
      if (sql.includes("SET status = 'RUNNING'"))
        return [{ id: 'req-unsupported' }];
      return [];
    });
    await expect(
      new IntegrationsWorkerService(
        { query: unsupportedQuery } as never,
        { storeGeneratedObject: jest.fn() } as never,
      ).pollOnce(1, ['NAO_SUPORTADO']),
    ).resolves.toMatchObject({ failed: 1, processed: 0 });
  });

  it('reports queue and active-claim backpressure for integration workers', async () => {
    const query = jest.fn(async (_sql: string, values?: unknown[]) => {
      if (values?.[0] === 'REQUESTED') return [{ total: '6' }];
      if (values?.[0] === 'RUNNING') return [{ total: '6' }];
      return [];
    });
    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject: jest.fn() } as never,
    );

    await expect(service.backpressureStatus(6)).resolves.toMatchObject({
      queueDepth: 6,
      activeClaims: 6,
      capacity: 6,
      limit: 0,
      skipped: true,
    });
  });

  it('uses fallback worker parameters and reports missing source records', async () => {
    const jobs = [
      {
        id: 'req-gfip-default',
        tenant_id: 'tenant-fallback',
        definition_code: 'FOLHA_GFIP_GERAR',
        parameters: {
          collectionCode: '115',
          modality: '1',
          competenceYear: 2026,
          competenceMonth: 7,
        },
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-notice-general',
        tenant_id: 'tenant-fallback',
        definition_code: 'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO',
        parameters: {},
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-pending-general',
        tenant_id: 'tenant-fallback',
        definition_code: 'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS',
        parameters: {},
        payroll_run_id: null,
        competence_year: null,
        competence_month: null,
      },
      {
        id: 'req-missing-remittance',
        tenant_id: 'tenant-fallback',
        definition_code: 'FOLHA_CNAB_REMESSA',
        parameters: { remittanceId: 'missing', bankId: 'bank-1' },
        payroll_run_id: null,
        competence_year: 2026,
        competence_month: 7,
      },
      {
        id: 'req-missing-return',
        tenant_id: 'tenant-fallback',
        definition_code: 'FOLHA_CNAB_RETORNO',
        parameters: { remittanceId: 'missing', s3Key: 'imports/retorno.ret' },
        payroll_run_id: null,
        competence_year: 2026,
        competence_month: 7,
      },
    ];
    const query = jest.fn(async (sql: string, values?: unknown[]) => {
      if (sql.includes('FROM public.report_request rr')) return jobs;
      if (sql.includes("SET status = 'RUNNING'")) return [{ id: values?.[0] }];
      if (
        sql.includes("SET status = 'FAILED'") ||
        sql.includes("SET status = 'COMPLETED'") ||
        sql.includes('UPDATE payroll.payment_remittance_file') ||
        sql.includes('generated_report_file')
      ) {
        return [];
      }
      if (sql.includes('INSERT INTO public.document_attachment')) {
        return [{ id: 'doc-fallback' }];
      }
      if (sql.includes('FROM payroll.payment_remittance_file')) return [];
      if (sql.includes('FROM public.esocial_spool')) return [];
      if (sql.includes('FROM hr.recertification_campaign')) {
        return [
          {
            campaign_id: null,
            cycle_start: null,
            cycle_end: null,
            total_beneficiaries: '0',
            pending_count: '0',
            recertified_count: '0',
          },
        ];
      }
      return [];
    });
    const storeGeneratedObject = jest.fn(async ({ storageKey }) => ({
      storageKind: 'LOCAL',
      storageKey,
      sizeBytes: 128,
      checksum: 'fallback-checksum',
    }));
    const service = new IntegrationsWorkerService(
      { query } as never,
      { storeGeneratedObject } as never,
    );

    await expect(service.pollOnce()).resolves.toMatchObject({
      discovered: jobs.length,
      processed: 3,
      failed: 2,
      skipped: 0,
    });
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining('/outputs/gfip/2026/07/'),
      }),
    );
    expect(storeGeneratedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining(
          '/outputs/previdenciario/recadastramento/convocacoes/convocacao-recadastramento-geral.pdf',
        ),
      }),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'FAILED'"),
      ['req-missing-remittance', 'Remittance record not found'],
    );
  });
});

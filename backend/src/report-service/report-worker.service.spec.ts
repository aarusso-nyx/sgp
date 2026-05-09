import { ReportWorkerService } from './report-worker.service';

const summary = {
  payroll_run_id: '00000000-0000-4000-8000-000000000901',
  competence_year: 2026,
  competence_month: 5,
  branch_name: 'Matriz',
  status: 'APPROVED',
  employee_count: '12',
  total_earnings: '120000.00',
  total_deductions: '24000.00',
  total_net: '96000.00',
};

describe('ReportWorkerService', () => {
  it('processes F-FOL PDF and XLSX report requests into generated files', async () => {
    const jobs = [
      job('req-013', 'F-FOL-013'),
      job('req-014', 'FOLHA_GERENCIAL'),
      job('req-015', 'SERVIDOR_PAGAMENTO_BLOQUEADO'),
      job('req-016', 'RELATORIO_BATIMENTO_FOLHA'),
      job('req-017', 'F-FOL-017'),
      job('req-manad', 'MANAD_EXPORT'),
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WITH claimed AS')) return jobs;
      if (sql.includes('FROM payroll.payroll_run run')) return [summary];
      if (sql.includes('employee.registration AS employee_registration')) {
        return [
          {
            employee_registration: 'MAT-001',
            employee_cpf: '123.456.789-01',
            rubric_code: 'BASE',
            rubric_description: 'Vencimento base',
            entry_kind: 'EARNING',
            quantity: '1.0000',
            reference_value: '1000.00',
            amount: '1000.00',
          },
        ];
      }
      if (sql.includes('GROUP BY coalesce(branch.name')) {
        return [
          {
            label: 'Matriz',
            employee_count: '12',
            total_earnings: '120000.00',
            total_deductions: '24000.00',
            total_net: '96000.00',
          },
        ];
      }
      if (sql.includes('GROUP BY coalesce(status.description')) {
        return [
          {
            label: 'Ativo',
            employee_count: '12',
            total_earnings: '120000.00',
            total_deductions: '24000.00',
            total_net: '96000.00',
          },
        ];
      }
      if (sql.includes('FROM payroll.blocked_payment')) {
        return [
          {
            label: 'MAT-001 - Servidor Bloqueado',
            employee_count: '1',
            total_earnings: '0.00',
            total_deductions: '0.00',
            total_net: '0.00',
          },
        ];
      }
      if (sql.includes('WITH run AS')) {
        return [
          {
            metric: 'total_net',
            source_total: '96000.00',
            recomputed_total: '96000.00',
            difference: '0.00',
          },
        ];
      }
      if (sql.includes('INSERT INTO public.document_attachment')) {
        return [{ id: 'attachment-1' }];
      }
      return [];
    });
    const storedInputs: StoredObjectInput[] = [];
    const storeGeneratedObject = jest.fn(async (input: StoredObjectInput) => {
      storedInputs.push(input);
      return {
        storageKind: 'S3' as const,
        storageKey: input.storageKey,
        sizeBytes: input.body.length,
        checksum: `checksum-${input.storageKey.split('/').pop()}`,
      };
    });
    const service = new ReportWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject } as never,
    );

    await expect(service.pollOnce(10)).resolves.toEqual({
      discovered: 6,
      processed: 6,
      failed: 0,
      skipped: 0,
    });

    expect(storedInputs).toHaveLength(9);
    expect(
      storedInputs.filter((input) => input.contentType === 'application/pdf'),
    ).toHaveLength(5);
    expect(
      storedInputs.filter(
        (input) => input.contentType === 'text/plain; charset=utf-8',
      ),
    ).toHaveLength(1);
    expect(
      storedInputs.filter((input) => input.contentType === 'application/json'),
    ).toHaveLength(1);
    expect(
      storedInputs.filter(
        (input) =>
          input.contentType ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toHaveLength(2);
    expect(
      storedInputs
        .find(
          (input) =>
            String(input.storageKey).includes('batimento-folha') &&
            input.contentType === 'application/pdf',
        )
        ?.body.subarray(0, 5)
        .toString('utf8'),
    ).toBe('%PDF-');
    expect(
      storedInputs.find((input) =>
        String(input.storageKey).endsWith(
          'f-fol-016-batimento-folha-2026-05.xlsx',
        ),
      )?.contentType,
    ).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(
      storedInputs
        .filter((input) => input.contentType === 'application/pdf')
        .every(
          (input) => input.body.subarray(0, 5).toString('utf8') === '%PDF-',
        ),
    ).toBe(true);
    expect(
      storedInputs
        .find((input) =>
          String(input.storageKey).endsWith(
            'f-fol-016-batimento-folha-2026-05.xlsx',
          ),
        )
        ?.body.subarray(0, 2)
        .toString('utf8'),
    ).toBe('PK');
    const folhaXlsx = storedInputs.find((input) =>
      String(input.storageKey).endsWith(
        'f-fol-013-relatorio-folha-2026-05.xlsx',
      ),
    );
    expect(folhaXlsx?.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const folhaWorksheet = folhaXlsx?.body.toString('utf8') ?? '';
    expect(folhaWorksheet).toEqual(expect.stringContaining('Descricao'));
    expect(folhaWorksheet).toEqual(expect.stringContaining('Servidores'));
    expect(folhaWorksheet).toEqual(expect.stringContaining('Total geral'));
    expect(folhaWorksheet).toEqual(expect.stringContaining('120000.00'));
    expect(folhaWorksheet).toEqual(expect.stringContaining('24000.00'));
    expect(folhaWorksheet).toEqual(expect.stringContaining('96000.00'));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'COMPLETED'"),
      expect.arrayContaining(['req-017']),
    );
  });

  it('fails report requests without payroll criteria', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WITH claimed AS')) {
        return [
          {
            ...job('req-missing', 'F-FOL-013'),
            payroll_run_id: null,
            competence_year: null,
            competence_month: null,
          },
        ];
      }
      return [];
    });
    const service = new ReportWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject: jest.fn() } as never,
    );

    await expect(service.pollOnce()).resolves.toMatchObject({
      processed: 0,
      failed: 1,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'FAILED'"),
      [
        'req-missing',
        'Report request requires payrollRunId or competenceYear/competenceMonth',
      ],
    );
  });

  it('reports queue and active-claim backpressure for report workers', async () => {
    const query = jest.fn(async (_sql: string, values?: unknown[]) => {
      if (values?.[0] === 'REQUESTED') return [{ total: '4' }];
      if (values?.[0] === 'RUNNING') return [{ total: '2' }];
      return [];
    });
    const service = new ReportWorkerService(
      { configured: true, query } as never,
      { storeGeneratedObject: jest.fn() } as never,
    );

    await expect(service.backpressureStatus(5)).resolves.toMatchObject({
      queueDepth: 4,
      activeClaims: 2,
      capacity: 5,
      limit: 3,
      skipped: false,
    });
  });
});

interface StoredObjectInput {
  storageKey: string;
  contentType: string;
  body: Buffer;
}

function job(id: string, definitionCode: string) {
  return {
    id,
    tenant_id: '00000000-0000-4000-8000-000000000100',
    definition_code: definitionCode,
    parameters: {},
    payroll_run_id: '00000000-0000-4000-8000-000000000901',
    branch_id: null,
    competence_year: 2026,
    competence_month: 5,
  };
}

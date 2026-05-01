import { RubricaService } from './rubrica.service';

describe('RubricaService', () => {
  const rubricaRow = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'VENC',
    description: 'Vencimento basico',
    kind: 'EARNING',
    taxable: true,
    active: true,
    incidences: { irrf: true },
    starts_on: '2026-01-01',
    ends_on: null,
    formula_alias: 'vencimento',
    formula_expression:
      'base_salary(p_employee_id, make_date(p_year, p_month, 1))',
    formula_dependencies: [],
    formula_ready: true,
    formula_error: null,
    esocial_code: '1000',
    official_rubric_code: '001',
    attributes: [
      {
        id: 'attr-1',
        name: 'percentual',
        type: 'decimal',
        defaultValue: '100.00',
        required: true,
      },
    ],
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  };

  it('lists rubricas with type and incidence filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([rubricaRow]);
    const service = new RubricaService(
      { configured: true, query } as never,
      { compileAndValidate: jest.fn() } as never,
    );

    const result = await service.listRubricas({
      type: 'provento',
      incidence: 'irrf',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('payroll.payroll_earning_deduction'),
      ['%%', 'EARNING', 'irrf'],
    );
    expect(result.items[0]).toMatchObject({
      code: 'VENC',
      type: 'provento',
      formulaReady: true,
    });
  });

  it('creates rubrica rows and replaces formula attributes in one transaction', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [{ id: '11111111-1111-4111-8111-111111111111' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [rubricaRow] }),
    };
    const transaction = jest.fn(
      async <T>(callback: (clientArg: typeof client) => Promise<T>) =>
        callback(client),
    );
    const service = new RubricaService(
      { configured: true, transaction } as never,
      { compileAndValidate: jest.fn() } as never,
    );

    const created = await service.createRubrica({
      code: 'VENC',
      description: 'Vencimento basico',
      type: 'provento',
      formulaExpression:
        'base_salary(p_employee_id, make_date(p_year, p_month, 1))',
      attributes: [
        {
          name: 'percentual',
          type: 'decimal',
          defaultValue: '100.00',
          required: true,
        },
      ],
    });

    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO payroll.payroll_earning_deduction'),
      expect.arrayContaining(['VENC', 'Vencimento basico', 'EARNING']),
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO payroll.formula_attribute'),
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        'percentual',
        'percentual',
        'decimal',
      ]),
    );
    expect(created.attributes[0].name).toBe('percentual');
  });

  it('previews through evaluate_earning_deduction and clears cache', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ amount: '1234.56' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const transaction = jest.fn(
      async <T>(callback: (clientArg: typeof client) => Promise<T>) =>
        callback(client),
    );
    const service = new RubricaService(
      { configured: true, transaction } as never,
      { compileAndValidate: jest.fn() } as never,
    );

    const preview = await service.previewRubrica(
      '11111111-1111-4111-8111-111111111111',
      {
        employeeId: '22222222-2222-4222-8222-222222222222',
        competenceMonth: 5,
        competenceYear: 2026,
        attributes: { percentual: '100.00' },
      },
    );

    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('payroll_calc.evaluate_earning_deduction'),
      [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        5,
        2026,
      ],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM payroll_calc.formula_cache'),
      expect.any(Array),
    );
    expect(preview.amount).toBe('1234.56');
  });
});

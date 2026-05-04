import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { AvaliacaoDataAccessService } from './avaliacao-data-access.service';

describe('AvaliacaoDataAccessService', () => {
  const employeeRow = {
    id: 'emp-1',
    registration: '0001',
    name: 'Maria Servidora',
    branch_id: null,
    work_location_id: null,
    job_position_id: null,
    job_function_id: null,
    salary_reference_id: 'ref-1',
  };
  const salaryReferenceRow = {
    id: 'ref-1',
    code: 'R1',
    description: 'Referencia 1',
    amount: '1000.00',
  };

  const createDatabase = (configured = true) => ({
    configured,
    query: jest.fn(async () => []),
  });

  it('guards database availability and forwards generic queries', async () => {
    const availableDatabase = createDatabase();
    const available = new AvaliacaoDataAccessService(
      availableDatabase as never,
    );

    expect(available.configured).toBe(true);
    expect(() => available.ensureDatabase()).not.toThrow();

    await available.query('SELECT 1');
    expect(availableDatabase.query).toHaveBeenCalledWith('SELECT 1', []);

    const unavailable = new AvaliacaoDataAccessService(
      createDatabase(false) as never,
    );

    expect(unavailable.configured).toBe(false);
    expect(() => unavailable.ensureDatabase()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads employee and salary-reference rows or reports missing records', async () => {
    const database = createDatabase();
    database.query
      .mockResolvedValueOnce([employeeRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([salaryReferenceRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([]);
    const service = new AvaliacaoDataAccessService(database as never);

    await expect(service.employeeReference('emp-1')).resolves.toEqual(
      employeeRow,
    );
    await expect(service.employeeReference('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.salaryReference('ref-1')).resolves.toEqual(
      salaryReferenceRow,
    );
    await expect(service.salaryReference('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      service.belongsToEmployee('hr.performance_evaluation', 'aval-1', 'emp-1'),
    ).resolves.toBe(true);
    await expect(
      service.belongsToEmployee('hr.performance_evaluation', 'aval-2', 'emp-1'),
    ).resolves.toBe(false);
  });

  it('maps performance-evaluation status values in both directions', () => {
    const service = new AvaliacaoDataAccessService(createDatabase() as never);

    expect(service.toEvaluationStatusDb('RASCUNHO')).toBe('DRAFT');
    expect(service.toEvaluationStatusDb('SUBMETIDA')).toBe('SUBMITTED');
    expect(service.toEvaluationStatusDb('APROVADA')).toBe('APPROVED');
    expect(service.toEvaluationStatusDb('REPROVADA')).toBe('REJECTED');

    expect(service.toEvaluationStatusInput('DRAFT')).toBe('RASCUNHO');
    expect(service.toEvaluationStatusInput('SUBMITTED')).toBe('SUBMETIDA');
    expect(service.toEvaluationStatusInput('APPROVED')).toBe('APROVADA');
    expect(service.toEvaluationStatusInput('REJECTED')).toBe('REPROVADA');
    expect(service.toEvaluationStatusInput('UNKNOWN')).toBe('REPROVADA');
  });

  it('maps progression-kind values in both directions', () => {
    const service = new AvaliacaoDataAccessService(createDatabase() as never);

    expect(service.toProgressionKindDb('MERITO')).toBe('MERIT');
    expect(service.toProgressionKindDb('TITULARIDADE')).toBe('TITLE');
    expect(service.toProgressionKindDb('JUDICIAL')).toBe('JUDICIAL');
    expect(service.toProgressionKindDb('CORRECAO')).toBe('CORRECTION');

    expect(service.toProgressionKindInput('MERIT')).toBe('MERITO');
    expect(service.toProgressionKindInput('TITLE')).toBe('TITULARIDADE');
    expect(service.toProgressionKindInput('JUDICIAL')).toBe('JUDICIAL');
    expect(service.toProgressionKindInput('CORRECTION')).toBe('CORRECAO');
    expect(service.toProgressionKindInput('UNKNOWN')).toBe('CORRECAO');
  });

  it('normalizes JSON payloads, dates, and monetary values', () => {
    const service = new AvaliacaoDataAccessService(createDatabase() as never);

    expect(service.asArray([{ criterio: 'pontualidade' }])).toEqual([
      { criterio: 'pontualidade' },
    ]);
    expect(service.asArray('[{"criterio":"assiduidade"}]')).toEqual([
      { criterio: 'assiduidade' },
    ]);
    expect(service.asArray('   ')).toEqual([]);
    expect(service.asArray({ criterio: 'fora-do-formato' })).toEqual([]);

    expect(service.asObject({ R1: 'ref-1' })).toEqual({ R1: 'ref-1' });
    expect(service.asObject('{"R2":"ref-2"}')).toEqual({ R2: 'ref-2' });
    expect(service.asObject([{ R3: 'ref-3' }])).toEqual({});
    expect(service.asObject('')).toEqual({});
    expect(service.asObject(null)).toEqual({});

    expect(service.toIsoDate('2026-05-01T13:30:00.000Z')).toBe('2026-05-01');
    expect(service.toIso(new Date('2026-05-01T13:30:00.000Z'))).toBe(
      '2026-05-01T13:30:00.000Z',
    );
    expect(service.toMoney(123.456)).toBe('123.46');
    expect(service.moneyDiff('100.00', '115.25')).toBe('15.25');
  });
});

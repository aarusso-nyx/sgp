import { EmployeesController } from './employees.controller';

describe('EmployeesController', () => {
  it('returns documented read payloads', () => {
    const controller = new EmployeesController({} as never, {} as never);

    expect(controller.dossier('emp-1')).toEqual(
      expect.objectContaining({ funcionarioId: 'emp-1', tipo: 'dossie' }),
    );
    expect(controller.medicalReportPdf('pront-1')).toEqual(
      expect.objectContaining({ prontuarioId: 'pront-1', tipo: 'laudo_pdf' }),
    );
    expect(controller.recadastramentoReceipt('rec-1')).toEqual(
      expect.objectContaining({
        recadastramentoId: 'rec-1',
        tipo: 'comprovante',
      }),
    );
  });

  it('delegates employee termination', async () => {
    const terminate = jest.fn().mockResolvedValue({
      employee: { id: 'emp-1' },
      payrollRunId: 'run-1',
      payrollRunStatus: 'DRAFT',
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new EmployeesController(
      { terminate } as never,
      { auditMutation } as never,
    );

    const result = await controller.terminateEmployee(
      { actor: { username: 'rh-user' } } as never,
      'emp-1',
      {
        terminationDate: '2026-04-15',
        terminationReasonId: 'reason-1',
        generateTerminationPayroll: true,
      },
    );

    expect(terminate).toHaveBeenCalledWith('emp-1', {
      terminationDate: '2026-04-15',
      terminationReasonId: 'reason-1',
      generateTerminationPayroll: true,
    });
    expect(result.payrollRunId).toBe('run-1');
  });
});

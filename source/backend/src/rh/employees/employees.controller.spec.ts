import { EmployeesController } from './employees.controller';

function controllerMethod(name: keyof EmployeesController): unknown {
  return Object.getOwnPropertyDescriptor(EmployeesController.prototype, name)
    ?.value;
}

describe('EmployeesController', () => {
  it('returns documented read payloads', async () => {
    const getDossier = jest.fn().mockResolvedValue({
      funcionarioId: 'emp-1',
      tipo: 'dossie',
    });
    const controller = new EmployeesController(
      { getDossier } as never,
      {} as never,
    );

    await expect(controller.dossier('emp-1')).resolves.toEqual(
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

  it('delegates employee admission', async () => {
    const admit = jest.fn().mockResolvedValue({
      employeeId: 'emp-1',
      employmentContractId: 'contract-1',
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new EmployeesController(
      { admit } as never,
      { auditMutation } as never,
    );

    const result = await controller.admitEmployee(
      { actor: { username: 'rh-user' } } as never,
      {
        registration: 'MAT-001',
        name: 'Servidor',
        hiredOn: '2026-04-01',
      },
    );

    expect(admit).toHaveBeenCalledWith({
      registration: 'MAT-001',
      name: 'Servidor',
      hiredOn: '2026-04-01',
    });
    expect(auditMutation).toHaveBeenCalledWith(
      expect.anything(),
      'CREATE',
      'employee',
      expect.objectContaining({ resourceId: 'emp-1' }),
    );
    expect(result.employeeId).toBe('emp-1');
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

  it('declares HR-01 specific permission metadata', () => {
    expect(
      Reflect.getMetadata('requiredPermissions', controllerMethod('list')),
    ).toEqual(['rh.employee.read']);
    expect(
      Reflect.getMetadata(
        'requiredPermissions',
        controllerMethod('admitEmployee'),
      ),
    ).toEqual(['rh.employee.admit']);
    expect(
      Reflect.getMetadata(
        'requiredPermissions',
        controllerMethod('terminateEmployee'),
      ),
    ).toEqual(['rh.employee.terminate']);
  });
});

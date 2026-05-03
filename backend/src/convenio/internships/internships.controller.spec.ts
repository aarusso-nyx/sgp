import { InternshipsController } from './internships.controller';

describe('InternshipsController', () => {
  it('delegates internship program and record lifecycle operations', async () => {
    const service = {
      listPrograms: jest.fn().mockReturnValue({ items: [] }),
      createProgram: jest.fn().mockReturnValue({ id: 'program-1' }),
      listInternships: jest.fn().mockReturnValue({ items: [] }),
      createInternship: jest.fn().mockReturnValue({ id: 'internship-1' }),
      extendInternship: jest.fn().mockReturnValue({ status: 'ACTIVE' }),
      terminateInternship: jest.fn().mockReturnValue({ status: 'TERMINATED' }),
      buildS2300: jest.fn().mockReturnValue({ eventKind: 'S-2300' }),
    };
    const controller = new InternshipsController(service as never);

    expect(controller.listPrograms({ page: 1 })).toEqual({ items: [] });
    expect(controller.createProgram({ code: 'PGM', name: 'Programa' })).toEqual(
      { id: 'program-1' },
    );
    expect(controller.listInternships({ pageSize: 5 })).toEqual({ items: [] });
    expect(
      controller.createInternship({
        programId: 'program-1',
        registration: 'EST-1',
        internName: 'Ana Estagio',
        internCpf: '11144477735',
        workplaceId: 'work-1',
        supervisorName: 'Supervisor',
        startsOn: '2026-05-01',
        endsOn: '2026-12-31',
        termNumber: 'TCE-1',
        termSignedOn: '2026-04-20',
        activityPlanUri: 's3://planos/tce-1.pdf',
        activityPlanDescription: 'Atividades administrativas',
        role: 'Estagiaria administrativa',
        weeklyHours: '30.000000',
      }),
    ).toEqual({ id: 'internship-1' });
    expect(
      controller.extend('internship-1', {
        endsOn: '2027-04-30',
        reason: 'Aditivo de TCE',
      }),
    ).toEqual({ status: 'ACTIVE' });
    expect(
      controller.terminate('internship-1', {
        terminationDate: '2026-11-30',
        reason: 'Encerramento antecipado',
      }),
    ).toEqual({ status: 'TERMINATED' });
    expect(controller.buildS2300('internship-1')).toEqual({
      eventKind: 'S-2300',
    });
  });
});

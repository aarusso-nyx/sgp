import { RequestContextStore } from '../../common/request-context/request-context.store';
import { InternshipEsocialService } from './internship-esocial.service';
import { InternshipLifecycleService } from './internship-lifecycle.service';
import { InternshipProgramsService } from './internship-programs.service';
import { InternshipsService } from './internships.service';

const tenantId = '00000000-0000-4000-8000-000000000076';

function createService(database: never, stynx: never): InternshipsService {
  return new InternshipsService(
    new InternshipProgramsService(database),
    new InternshipLifecycleService(database),
    new InternshipEsocialService(database, stynx),
  );
}

describe('InternshipsService', () => {
  it('creates an internship program', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'program-1',
        code: 'PGM-1',
        name: 'Programa de Estagio',
        description: '',
        institution_name: null,
        starts_on: '2026-05-01',
        ends_on: '2026-12-31',
        status: 'ACTIVE',
      },
    ]);
    const service = createService(
      { configured: true, query } as never,
      {} as never,
    );

    await expect(
      service.createProgram({ code: ' PGM-1 ', name: ' Programa de Estagio ' }),
    ).resolves.toMatchObject({
      code: 'PGM-1',
      startsOn: '2026-05-01',
    });
  });

  it('creates an internship and links it to a TS-V S-2300 source', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'program-1', institution_name: 'Universidade' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'link-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'employee-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'tsv-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'internship-1',
              program_id: 'program-1',
              agreement_id: null,
              employee_id: 'employee-1',
              tsv_contract_id: 'tsv-1',
              intern_name: 'Ana Estagio',
              intern_cpf: '11144477735',
              supervisor_name: 'Supervisor',
              starts_on: '2026-05-01',
              ends_on: '2026-12-31',
              stipend_amount: '1200.00',
              status: 'ACTIVE',
              term_number: 'TCE-1',
              term_signed_on: '2026-04-20',
              activity_plan_uri: 's3://planos/tce-1.pdf',
              activity_plan_description: 'Atividades administrativas',
              weekly_hours: '30.000000',
            },
          ],
        }),
    };
    const database = {
      configured: true,
      transaction: jest.fn(
        <T>(callback: (value: typeof client) => Promise<T>) => callback(client),
      ),
    };
    const service = createService(database as never, {} as never);

    const result = await RequestContextStore.run(
      { tenantId, permissions: ['convenio.write'] },
      () =>
        service.createInternship({
          programId: 'program-1',
          registration: 'EST-1',
          internName: 'Ana Estagio',
          internCpf: '11144477735',
          workplaceId: '00000000-0000-4000-8000-000000000001',
          supervisorName: 'Supervisor',
          startsOn: '2026-05-01',
          endsOn: '2026-12-31',
          termNumber: 'TCE-1',
          termSignedOn: '2026-04-20',
          activityPlanUri: 's3://planos/tce-1.pdf',
          activityPlanDescription: 'Atividades administrativas',
          role: 'Estagiaria administrativa',
          weeklyHours: '30.000000',
          stipendAmount: '1200.00',
        }),
    );

    expect(result).toMatchObject({
      id: 'internship-1',
      tsvContractId: 'tsv-1',
      esocialStartEvent: { eventKind: 'S-2300', tsvContractId: 'tsv-1' },
    });
    expect(client.query).toHaveBeenCalledTimes(5);
  });

  it('rejects ordinary internship weekly hours above the legal operational ceiling', async () => {
    const service = createService({ configured: true } as never, {} as never);

    await expect(
      RequestContextStore.run({ tenantId }, () =>
        service.createInternship({
          programId: 'program-1',
          registration: 'EST-1',
          internName: 'Ana Estagio',
          internCpf: '11144477735',
          workplaceId: '00000000-0000-4000-8000-000000000001',
          supervisorName: 'Supervisor',
          startsOn: '2026-05-01',
          endsOn: '2026-12-31',
          termNumber: 'TCE-1',
          termSignedOn: '2026-04-20',
          activityPlanUri: 's3://planos/tce-1.pdf',
          activityPlanDescription: 'Atividades administrativas',
          role: 'Estagiaria administrativa',
          weeklyHours: '31.000000',
        }),
      ),
    ).rejects.toThrow('weeklyHours');
  });

  it('builds S-2300 from the linked TS-V contract', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'internship-1',
        program_id: 'program-1',
        agreement_id: null,
        employee_id: 'employee-1',
        tsv_contract_id: 'tsv-1',
        intern_name: 'Ana Estagio',
        intern_cpf: '11144477735',
        supervisor_name: 'Supervisor',
        starts_on: '2026-05-01',
        ends_on: '2026-12-31',
        stipend_amount: '1200.00',
        status: 'ACTIVE',
        term_number: 'TCE-1',
        term_signed_on: '2026-04-20',
        activity_plan_uri: 's3://planos/tce-1.pdf',
        activity_plan_description: 'Atividades administrativas',
        weekly_hours: '30.000000',
      },
    ]);
    const enqueue = jest.fn().mockResolvedValue({
      messageId: 'message-1',
      status: 'PENDING',
    });
    const service = createService(
      { configured: true, query } as never,
      { enqueue } as never,
    );

    await expect(
      RequestContextStore.run({ tenantId }, () =>
        service.buildS2300('internship-1'),
      ),
    ).resolves.toMatchObject({
      eventKind: 'S-2300',
      tsvContractId: 'tsv-1',
      messageId: 'message-1',
      status: 'PENDING',
    });
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'trabalhador',
      eventClass: 'S-2300',
      sourceRef: {
        sourceEntityKind: 'hr.tsv_contract',
        sourceEntityId: 'tsv-1',
      },
      payload: { tsvContractId: 'tsv-1', internshipId: 'internship-1' },
    });
  });
});

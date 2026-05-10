import { HealthProgramService } from './health-program.service';
import { ProgramRevisionService } from './program-revision.service';

describe('HealthProgramService', () => {
  it('supersedes prior active PCMSO and creates an activation revision', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'pcmso-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              kind: 'PCMSO',
              valid_from: '2026-01-01',
              valid_until: '2026-12-31',
              responsible_doctor_crm: 'CRM-1',
              responsible_doctor_name: 'Medica',
              status: 'DRAFT',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'pcmso-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'pcmso-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              kind: 'PCMSO',
              valid_from: '2026-01-01',
              valid_until: '2026-12-31',
              responsible_doctor_crm: 'CRM-1',
              responsible_doctor_name: 'Medica',
              status: 'ACTIVE',
            },
          ],
        }),
    };
    const runTransaction = async <T>(
      callback: (transactionClient: typeof client) => Promise<T>,
    ): Promise<T> => callback(client);
    const database = {
      configured: true,
      transaction: jest.fn(runTransaction),
    };
    const revisionService = {
      createWithClient: jest.fn().mockResolvedValue({ id: 'rev-1' }),
    };
    const service = new HealthProgramService(
      database as never,
      revisionService as unknown as ProgramRevisionService,
    );

    await expect(service.activate('pcmso-2')).resolves.toMatchObject({
      id: 'pcmso-2',
      status: 'ACTIVE',
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'SUPERSEDED'"),
      ['lot-1', 'pcmso-2', 'PCMSO'],
    );
    expect(revisionService.createWithClient).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        parentProgramKind: 'PCMSO',
        revisionReason: 'ACTIVATION',
      }),
    );
  });

  it('activates PCMAT using the health program kind boundary', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'pcmat-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              kind: 'PCMAT',
              valid_from: '2026-01-01',
              valid_until: '2026-12-31',
              responsible_doctor_crm: 'CRM-2',
              responsible_doctor_name: 'Medica SST',
              status: 'DRAFT',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'pcmat-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'pcmat-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              kind: 'PCMAT',
              valid_from: '2026-01-01',
              valid_until: '2026-12-31',
              responsible_doctor_crm: 'CRM-2',
              responsible_doctor_name: 'Medica SST',
              status: 'ACTIVE',
            },
          ],
        }),
    };
    const runTransaction = async <T>(
      callback: (transactionClient: typeof client) => Promise<T>,
    ): Promise<T> => callback(client);
    const database = {
      configured: true,
      transaction: jest.fn(runTransaction),
    };
    const revisionService = {
      createWithClient: jest.fn().mockResolvedValue({ id: 'rev-1' }),
    };
    const service = new HealthProgramService(
      database as never,
      revisionService as unknown as ProgramRevisionService,
    );

    await expect(service.activate('pcmat-2', 'PCMAT')).resolves.toMatchObject({
      id: 'pcmat-2',
      kind: 'PCMAT',
      status: 'ACTIVE',
    });
    expect(revisionService.createWithClient).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        parentProgramKind: 'PCMAT',
        revisionReason: 'ACTIVATION',
      }),
    );
  });
});

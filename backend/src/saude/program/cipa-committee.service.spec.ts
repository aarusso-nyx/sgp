import { CipaCommitteeService } from './cipa-committee.service';

describe('CipaCommitteeService', () => {
  it('activates one CIPA committee per work location', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cipa-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              election_call_ref: 'EDITAL-2026',
              mandate_start: '2026-01-01',
              mandate_end: '2026-12-31',
              status: 'DRAFT',
              metadata: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cipa-2',
              work_location_id: 'lot-1',
              work_location_name: null,
              election_call_ref: 'EDITAL-2026',
              mandate_start: '2026-01-01',
              mandate_end: '2026-12-31',
              status: 'ACTIVE',
              metadata: {},
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
    const service = new CipaCommitteeService(database as never);

    await expect(service.activate('cipa-2')).resolves.toMatchObject({
      id: 'cipa-2',
      status: 'ACTIVE',
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CLOSED'"),
      ['lot-1', 'cipa-2'],
    );
  });

  it('stores CIPA minute metadata without storing document bytes', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([
        {
          id: 'minute-1',
          committee_id: 'cipa-1',
          meeting_at: '2026-02-01T12:00:00.000Z',
          subject: 'Monthly meeting',
          minutes_uri:
            's3://sgp-docs.detran-am.sistematech.com.br/stage/t1/cipa/minute.pdf',
          sha256: 'a'.repeat(64),
          metadata: { quorum: 5 },
        },
      ]),
    };
    const service = new CipaCommitteeService(database as never);

    await expect(
      service.addMinute('cipa-1', {
        meetingAt: '2026-02-01T12:00:00.000Z',
        subject: 'Monthly meeting',
        minutesUri:
          's3://sgp-docs.detran-am.sistematech.com.br/stage/t1/cipa/minute.pdf',
        sha256: 'a'.repeat(64),
        metadata: { quorum: 5 },
      }),
    ).resolves.toMatchObject({
      committeeId: 'cipa-1',
      minutesUri: expect.stringContaining('/cipa/minute.pdf'),
      sha256: 'a'.repeat(64),
    });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO saude.cipa_minute'),
      expect.arrayContaining(['cipa-1', 'Monthly meeting', 'a'.repeat(64)]),
    );
  });
});

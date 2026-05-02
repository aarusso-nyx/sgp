import { PppService } from './ppp.service';

describe('PppService', () => {
  it('generates immutable PPP snapshot from exposure and EPI aggregates', async () => {
    const database = databaseStub([
      [
        {
          id: 'ppp-1',
          employee_id: 'employee-1',
          period_start: '2026-01-01',
          period_end: '2026-12-31',
          snapshot_json: {
            environmentalExposures: [{ harmfulAgentCode: '01.01.001' }],
            epiDeliveries: [{ caNumber: '12345' }],
          },
          generated_at: '2026-05-02T00:00:00.000Z',
        },
      ],
    ]);
    const service = new PppService(database as never);

    const result = await service.generate({
      employeeId: 'employee-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    });

    expect(result.snapshotJson).toMatchObject({
      environmentalExposures: [{ harmfulAgentCode: '01.01.001' }],
      epiDeliveries: [{ caNumber: '12345' }],
    });
    expect(database.sql()).toContain('INSERT INTO saude.ppp_record');
  });
});

function databaseStub(results: unknown[][]) {
  const sql: string[] = [];
  let index = 0;
  return {
    configured: true,
    query: jest.fn(async (statement: string) => {
      sql.push(statement);
      return results[index++] ?? [];
    }),
    sql: () => sql.join('\n'),
  };
}

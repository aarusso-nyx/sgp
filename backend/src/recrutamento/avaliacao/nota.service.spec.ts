import { NotaService } from './nota.service';

describe('NotaService', () => {
  it('delegates recomputation to the database function and is idempotent on repeated input', async () => {
    const calls: unknown[][] = [];
    const database = {
      configured: true,
      query: jest.fn().mockImplementation((_sql: string, values: unknown[]) => {
        calls.push(values);
        return Promise.resolve(
          calls.length === 1
            ? [
                {
                  inscricao_id: '00000000-0000-4000-8000-000000000101',
                  old_weighted_score: null,
                  new_weighted_score: '2.000000',
                },
              ]
            : [],
        );
      }),
    };
    const service = new NotaService(database as never);

    await expect(
      service.recompute('00000000-0000-4000-8000-000000000201', 1),
    ).resolves.toHaveLength(1);
    await expect(
      service.recompute('00000000-0000-4000-8000-000000000201', 1),
    ).resolves.toHaveLength(0);

    expect(database.query).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([
      ['00000000-0000-4000-8000-000000000201', 1],
      ['00000000-0000-4000-8000-000000000201', 1],
    ]);
  });
});

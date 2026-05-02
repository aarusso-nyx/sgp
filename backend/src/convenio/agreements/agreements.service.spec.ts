import { AgreementsService } from './agreements.service';

describe('AgreementsService', () => {
  const row = {
    id: 'agr-1',
    code: 'CONV-1',
    description: 'Convenio',
    institution_name: 'IES',
    program_name: 'Prog',
    starts_on: null,
    ends_on: null,
    status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('returns paged agreements', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([row]);
    const service = new AgreementsService({ configured: true, query } as never);

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.code).toBe('CONV-1');
  });

  it('creates, updates, and deactivates agreements with defaults', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { ...row, starts_on: '2026-01-01', ends_on: '2026-12-31' },
      ])
      .mockResolvedValueOnce([
        { ...row, institution_name: null, program_name: null },
      ])
      .mockResolvedValueOnce([{ ...row, status: 'TERMINATED' }]);
    const service = new AgreementsService({ configured: true, query } as never);

    await expect(
      service.create({ code: ' CONV-1 ', description: ' Convenio ' }),
    ).resolves.toMatchObject({
      startsOn: '2026-01-01T00:00:00.000Z',
      endsOn: '2026-12-31T00:00:00.000Z',
    });
    await expect(
      service.update('agr-1', { code: ' CONV-2 ' }),
    ).resolves.toMatchObject({ institution: null, program: null });
    await expect(service.deactivate('agr-1')).resolves.toMatchObject({
      status: 'TERMINATED',
    });
  });

  it('rejects unavailable, duplicate, and missing agreement operations', async () => {
    await expect(
      new AgreementsService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new AgreementsService({
        configured: true,
        query: jest.fn().mockRejectedValueOnce({ code: '23505' }),
      } as never).create({ code: 'CONV-1' }),
    ).rejects.toThrow('Agreement code already exists');
    await expect(
      new AgreementsService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).update('missing', { code: 'CONV-1' }),
    ).rejects.toThrow('Agreement not found');
    await expect(
      new AgreementsService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).deactivate('missing'),
    ).rejects.toThrow('Agreement not found');
  });
});

import {
  JobPositionsController,
  MasterDataController,
} from './master-data.controller';

describe('MasterDataController', () => {
  it('delegates resource listing', () => {
    const listResources = jest.fn().mockReturnValue({ items: [], total: 0 });
    const controller = new MasterDataController(
      { listResources } as never,
      {} as never,
    );

    const result = controller.listResources({ page: 1, pageSize: 20 });

    expect(listResources).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('creates job positions through the /v1/cargos controller', async () => {
    const created = { id: 'job-1', code: 'ANL' };
    const createRecord = jest.fn().mockResolvedValue(created);
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new JobPositionsController(
      { createRecord } as never,
      { auditMutation } as never,
    );

    await expect(
      controller.create({} as never, { code: 'ANL', name: 'Analista' }),
    ).resolves.toEqual(created);

    expect(createRecord).toHaveBeenCalledWith('cargo', {
      code: 'ANL',
      name: 'Analista',
    });
    expect(auditMutation).toHaveBeenCalledWith(
      {},
      'CREATE',
      'master_data',
      expect.objectContaining({
        resourceId: 'job-1',
        tableName: 'hr.job_position',
      }),
    );
  });
});

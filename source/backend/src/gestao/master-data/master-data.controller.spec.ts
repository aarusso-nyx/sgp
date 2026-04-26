import { MasterDataController } from './master-data.controller';

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
});

import { ReportCatalogController } from './report-catalog.controller';

describe('ReportCatalogController', () => {
  it('delegates report definition listing', () => {
    const list = jest.fn().mockReturnValue({ items: [], total: 0 });
    const controller = new ReportCatalogController(
      { list } as never,
      {} as never,
    );

    const result = controller.list({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toEqual({ items: [], total: 0 });
  });
});

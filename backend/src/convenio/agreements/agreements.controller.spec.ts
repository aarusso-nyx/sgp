import { AgreementsController } from './agreements.controller';

describe('AgreementsController', () => {
  it('delegates agreement listing', () => {
    const list = jest.fn().mockReturnValue({ items: [], total: 0 });
    const controller = new AgreementsController({ list } as never, {} as never);

    const result = controller.list({ page: 1, pageSize: 20 });

    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toEqual({ items: [], total: 0 });
  });
});

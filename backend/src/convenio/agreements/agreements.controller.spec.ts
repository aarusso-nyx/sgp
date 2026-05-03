import { AgreementsController } from './agreements.controller';

describe('AgreementsController', () => {
  it('delegates agreement operations', () => {
    const list = jest.fn().mockReturnValue({ items: [], total: 0 });
    const create = jest.fn().mockReturnValue({ id: 'agr-1' });
    const update = jest.fn().mockReturnValue({ id: 'agr-1' });
    const deactivate = jest.fn().mockReturnValue({ id: 'agr-1' });
    const controller = new AgreementsController({
      list,
      create,
      update,
      deactivate,
    } as never);

    const result = controller.list({ page: 1, pageSize: 20 });
    const created = controller.create({ code: 'CONV-1' });
    const updated = controller.update('agr-1', { description: 'Updated' });
    const deleted = controller.deactivate('agr-1');

    expect(list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toEqual({ items: [], total: 0 });
    expect(create).toHaveBeenCalledWith({ code: 'CONV-1' });
    expect(created).toEqual({ id: 'agr-1' });
    expect(update).toHaveBeenCalledWith('agr-1', { description: 'Updated' });
    expect(updated).toEqual({ id: 'agr-1' });
    expect(deactivate).toHaveBeenCalledWith('agr-1');
    expect(deleted).toEqual({ id: 'agr-1' });
  });
});

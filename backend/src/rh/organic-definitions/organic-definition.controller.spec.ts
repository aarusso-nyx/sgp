import { OrganicDefinitionController } from './organic-definition.controller';

describe('OrganicDefinitionController', () => {
  const body = {
    code: 'ORG-EDU-ANL',
    name: 'Analistas da Educacao',
    workLocationId: '00000000-0000-4000-8000-000000000752',
    jobPositionId: '00000000-0000-4000-8000-000000000753',
    vacanciesTotal: 5,
    vacanciesFilled: 2,
  };

  it('delegates list and mutations to the service', async () => {
    const service = {
      list: jest.fn(async () => ({ items: [] })),
      create: jest.fn(async () => ({ id: 'organic-1' })),
      update: jest.fn(async () => ({ id: 'organic-1', updated: true })),
      deactivate: jest.fn(async () => ({
        id: 'organic-1',
        status: 'INACTIVE',
      })),
    };
    const controller = new OrganicDefinitionController(service as never);

    await expect(controller.list({ page: 1 })).resolves.toEqual({ items: [] });
    await expect(controller.create(body)).resolves.toEqual({ id: 'organic-1' });
    await expect(controller.update('organic-1', body)).resolves.toMatchObject({
      updated: true,
    });
    await expect(controller.deactivate('organic-1')).resolves.toMatchObject({
      status: 'INACTIVE',
    });

    expect(service.create).toHaveBeenCalledWith(body);
    expect(service.update).toHaveBeenCalledWith('organic-1', body);
  });
});

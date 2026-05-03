import { BatimentoController } from './batimento.controller';

describe('BatimentoController', () => {
  it('routes report requests to the service', async () => {
    const service = {
      createReport: jest.fn().mockResolvedValue({
        reportCode: 'F-FOL-016',
        reportRequestId: 'request-1',
      }),
    };
    const controller = new BatimentoController(service as never);
    const query = {
      competenceYear: 2026,
      competenceMonth: 5,
    };

    await expect(controller.createReport(query)).resolves.toMatchObject({
      reportCode: 'F-FOL-016',
      reportRequestId: 'request-1',
    });
    expect(service.createReport).toHaveBeenCalledWith(query);
  });
});

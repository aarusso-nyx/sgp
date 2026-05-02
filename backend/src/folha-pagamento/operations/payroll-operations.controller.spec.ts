import {
  PayrollGfipController,
  PayrollOperationsController,
} from './payroll-operations.controller';

describe('PayrollOperationsController', () => {
  it('queues remittance requests through the operations service', async () => {
    const requestRemittance = jest.fn().mockResolvedValue({
      requestId: 'req-1',
      metadata: { remittanceId: 'rem-1' },
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollOperationsController(
      { requestRemittance } as never,
      { auditMutation } as never,
    );

    const result = await controller.requestRemittance(
      { actor: { username: 'folha-user' } } as never,
      'run-1',
      { bankId: 'bank-1', format: 'CNAB240' },
    );

    expect(requestRemittance).toHaveBeenCalledWith('run-1', {
      bankId: 'bank-1',
      format: 'CNAB240',
    });
    expect(result.requestId).toBe('req-1');
  });

  it('queues return processing through the operations service', async () => {
    const requestReturnProcessing = jest.fn().mockResolvedValue({
      requestId: 'req-2',
      metadata: { remittanceId: 'rem-1' },
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollOperationsController(
      { requestReturnProcessing } as never,
      { auditMutation } as never,
    );

    const result = await controller.requestReturnProcessing(
      { actor: { username: 'folha-user' } } as never,
      'run-1',
      { remittanceId: 'rem-1', s3Key: 'uploads/retorno/file.txt' },
    );

    expect(requestReturnProcessing).toHaveBeenCalledWith('run-1', {
      remittanceId: 'rem-1',
      s3Key: 'uploads/retorno/file.txt',
    });
    expect(result.requestId).toBe('req-2');
  });
});

describe('PayrollGfipController', () => {
  it('queues gfip generation through the operations service', async () => {
    const requestGfipGeneration = jest.fn().mockResolvedValue({
      requestId: 'req-3',
      metadata: { branchId: 'branch-1' },
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollGfipController(
      { requestGfipGeneration } as never,
      { auditMutation } as never,
    );

    const result = await controller.requestGfipGeneration(
      { actor: { username: 'folha-user' } } as never,
      {
        competenceYear: 2026,
        competenceMonth: 4,
        collectionCode: '2100',
        modality: 'BRANCO',
      },
    );

    expect(requestGfipGeneration).toHaveBeenCalledWith({
      competenceYear: 2026,
      competenceMonth: 4,
      collectionCode: '2100',
      modality: 'BRANCO',
    });
    expect(result.requestId).toBe('req-3');
  });
});

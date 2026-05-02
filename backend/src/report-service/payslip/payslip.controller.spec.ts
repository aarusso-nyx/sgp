import { PayslipController } from './payslip.controller';

describe('PayslipController', () => {
  it('delegates portal listing and batch generation', async () => {
    const service = {
      listPortalFiles: jest.fn().mockResolvedValue([{ id: 'file-1' }]),
      renderBatch: jest.fn().mockResolvedValue({
        batchId: 'batch-1',
        status: 'DONE',
        fileCount: 100,
        errorCount: 0,
      }),
    };
    const controller = new PayslipController(service as never);

    await expect(controller.listPortal(undefined)).resolves.toEqual([
      { id: 'file-1' },
    ]);
    await expect(
      controller.createBatch({
        payrollRunId: '00000000-0000-4000-8000-000000000901',
        competence: '2026-05-01',
      }),
    ).resolves.toMatchObject({ fileCount: 100, errorCount: 0 });
  });
});

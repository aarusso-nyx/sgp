import { CtcService } from './ctc.service';

describe('CtcService', () => {
  it('rejects output requests for missing certificates', async () => {
    const service = new CtcService({
      configured: true,
      query: jest.fn(async () => []),
    } as never);

    await expect(
      service.requestContributionTimeCertificateOutput('missing', {}),
    ).rejects.toThrow('Contribution time certificate not found');
  });
});

import { ForbiddenException } from '@nestjs/common';

import { FaceConsentService } from './consent.service';
import { FaceMatcherService } from './face-matcher.service';
import { FaceLivenessService } from './liveness.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

class FakeConsentDatabase {
  readonly configured = true;

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    return callback({ query: jest.fn() });
  }
}

describe('PONTO-10 facial LGPD consent', () => {
  it('blocks facial matching without active consent while primary identifiers remain outside this service', async () => {
    const database = new FakeConsentDatabase();
    const consentService = {
      hasActiveConsent: jest.fn(async () => false),
      assertActiveConsent: jest.fn(async () => {
        throw new ForbiddenException(
          'Active facial recognition consent is required',
        );
      }),
    } as unknown as FaceConsentService;
    const service = new FaceMatcherService(
      database as never,
      consentService,
      new FaceLivenessService(),
      {
        getCurrent: jest.fn(async () => ({
          threshold: '0.700000',
          livenessRequired: true,
        })),
      } as unknown as FaceThresholdAdminService,
      { createWithClient: jest.fn() } as never,
    );

    await expect(
      service.match({
        employeeId: '00000000-0000-4000-8000-000000000521',
        frames: [
          {
            imageBase64: Buffer.from('face').toString('base64'),
            blinkDetected: false,
            yawDegrees: -10,
          },
          {
            imageBase64: Buffer.from('face').toString('base64'),
            blinkDetected: true,
            yawDegrees: 10,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

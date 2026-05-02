import { BadRequestException } from '@nestjs/common';

import { TemplateEnrollmentService } from './template-enrollment.service';

describe('TemplateEnrollmentService', () => {
  const consentService = {
    assertActiveConsent: jest.fn(),
  };

  function serviceWithQuery(handler: jest.Mock) {
    return new TemplateEnrollmentService(
      {
        configured: true,
        transaction: (callback: (client: unknown) => Promise<unknown>) =>
          callback({ query: handler }),
      } as never,
      consentService as never,
    );
  }

  beforeEach(() => {
    consentService.assertActiveConsent.mockResolvedValue(undefined);
  });

  it('stores an encrypted template instead of clear extracted bytes', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: '00000000-0000-4000-8000-000000000082',
          employee_id: '00000000-0000-4000-8000-000000000101',
          kind: 'FINGERPRINT',
          quality_score: '0.990000',
          captured_at: '2026-05-02T12:00:00.000Z',
          status: 'ACTIVE',
          encrypted_differs: true,
        },
      ],
    });
    const service = serviceWithQuery(query);

    const result = await service.enroll({
      employeeId: '00000000-0000-4000-8000-000000000101',
      kind: 'FINGERPRINT',
      sampleBase64: Buffer.alloc(4096, 7).toString('base64'),
      templateKmsKeyId: 'kms/ponto/fingerprint',
      minimumQuality: 0.85,
    });

    expect(result.qualityScore).toBe('0.990000');
    const encryptedTemplate = query.mock.calls[0]?.[1]?.[2] as Buffer;
    expect(encryptedTemplate).toBeInstanceOf(Buffer);
    expect(encryptedTemplate.toString()).not.toContain(
      Buffer.alloc(32, 7).toString(),
    );
  });

  it('rejects samples below the quality threshold', async () => {
    const service = serviceWithQuery(jest.fn());

    await expect(
      service.enroll({
        employeeId: '00000000-0000-4000-8000-000000000101',
        kind: 'PALM_VEIN',
        sampleBase64: Buffer.alloc(32, 1).toString('base64'),
        templateKmsKeyId: 'kms/ponto/palm',
        minimumQuality: 0.85,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

import { BadRequestException } from '@nestjs/common';

import { AsoAttachmentService } from './aso-attachment.service';
import { AsoService } from './aso.service';

describe('AsoService', () => {
  function database(rows: unknown[][]) {
    const query = jest.fn();
    for (const row of rows) {
      query.mockResolvedValueOnce(row);
    }
    return { configured: true, query };
  }

  it('calculates the next due date from periodicity months', () => {
    const service = new AsoService({
      configured: true,
      query: jest.fn(),
    } as never);

    expect(service.calculateDueDate('2026-05-10T00:00:00.000Z', 12)).toBe(
      '2027-05-10T00:00:00.000Z',
    );
  });

  it('rejects archive before performance', async () => {
    const db = database([
      [
        {
          id: 'aso-1',
          employee_id: 'emp-1',
          employee_name: 'Servidor',
          aso_kind: 'ADMISSIONAL',
          scheduled_at: '2026-05-01T00:00:00.000Z',
          performed_at: null,
          doctor_crm: null,
          doctor_name: null,
          conclusion: null,
          restriction_text: null,
          next_exam_due_at: null,
          status: 'SCHEDULED',
          attachment_count: '0',
        },
      ],
    ]);
    const service = new AsoService(db as never);

    await expect(service.archive('aso-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('persists encrypted attachment metadata and verifies sha256', async () => {
    const sha =
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    const db = database([
      [
        {
          id: 'att-1',
          aso_record_id: 'aso-1',
          file_uri: 's3://bucket/aso.pdf',
          sha256: sha,
          mime: 'application/pdf',
          encrypted_at_rest: true,
        },
      ],
    ]);
    const service = new AsoAttachmentService(db as never);

    await expect(
      service.attach('aso-1', {
        fileUri: 's3://bucket/aso.pdf',
        sha256: sha,
        mime: 'application/pdf',
      }),
    ).resolves.toMatchObject({
      sha256: sha,
      encryptedAtRest: true,
    });
    expect(service.verifySha256('hello', sha)).toBe(true);
  });
});

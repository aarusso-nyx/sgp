import { NotFoundException } from '@nestjs/common';

import { TrainingCertificationsService } from './certifications.service';

describe('TrainingCertificationsService', () => {
  it('lists certifications ordered by issued date', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([
        {
          id: 'cert-1',
          employee_id: 'emp-1',
          course_name: 'NR-10',
          issuer: 'Senai',
          issued_at: '2026-01-15',
          expires_at: '2028-01-15',
          hours_workload: 40,
          attachment_id: null,
          notes: '',
          created_at: '2026-01-16T10:00:00.000Z',
          updated_at: '2026-01-16T10:00:00.000Z',
        },
      ]),
    };
    const service = new TrainingCertificationsService(database as never);

    await expect(service.listForEmployee('emp-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'cert-1',
        employeeId: 'emp-1',
        courseName: 'NR-10',
        issuer: 'Senai',
        issuedAt: '2026-01-15',
        expiresAt: '2028-01-15',
        hoursWorkload: 40,
        attachmentId: null,
      }),
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM hr.training_certificate'),
      ['emp-1'],
    );
  });

  it('creates a certificate trimming course and issuer text', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([
        {
          id: 'cert-2',
          employee_id: 'emp-1',
          course_name: 'NR-35',
          issuer: 'Sebrae',
          issued_at: '2026-03-01',
          expires_at: null,
          hours_workload: null,
          attachment_id: null,
          notes: '',
          created_at: '2026-03-02T08:00:00.000Z',
          updated_at: '2026-03-02T08:00:00.000Z',
        },
      ]),
    };
    const service = new TrainingCertificationsService(database as never);

    await expect(
      service.create({
        employeeId: 'emp-1',
        courseName: '  NR-35  ',
        issuer: '  Sebrae  ',
        issuedAt: '2026-03-01',
      }),
    ).resolves.toMatchObject({
      id: 'cert-2',
      courseName: 'NR-35',
      issuer: 'Sebrae',
      expiresAt: null,
    });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.training_certificate'),
      expect.arrayContaining(['emp-1', 'NR-35', 'Sebrae', '2026-03-01']),
    );
  });

  it('throws NotFound when updating a missing certificate', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new TrainingCertificationsService(database as never);

    await expect(
      service.update('cert-missing', { courseName: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFound when removing a missing certificate', async () => {
    const database = {
      configured: true,
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new TrainingCertificationsService(database as never);

    await expect(service.remove('cert-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

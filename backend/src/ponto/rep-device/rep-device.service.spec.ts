/* eslint-disable */
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { RepDeviceService } from './rep-device.service';

const row = {
  rep_device_id: 'rep-1',
  kind: 'REP_C',
  serial_number: 'SER-1',
  employer_tax_id: '12345678000199',
  manufacturer: null,
  model: null,
  program_hash: null,
  registered_at: new Date('2026-05-02T10:00:00.000Z'),
  status: 'ACTIVE',
};

describe('RepDeviceService', () => {
  it('validates device kind-specific requirements and tax ids', () => {
    const service = new RepDeviceService({ configured: true } as never);

    expect(() =>
      (service as never as { validate: Function }).validate({
        kind: 'REP_P',
        employerTaxId: '12345678000199',
      }),
    ).toThrow('program_hash is required for REP-P');
    expect(() =>
      (service as never as { validate: Function }).validate({
        kind: 'REP_C',
        employerTaxId: '12345678000199',
      }),
    ).toThrow('serial_number is required for REP-C');
    expect(() =>
      (service as never as { validate: Function }).validate({
        kind: 'REP_A',
        employerTaxId: 'bad',
      }),
    ).toThrow(BadRequestException);
    expect(
      (service as never as { taxId: Function }).taxId('123.456.789-00'),
    ).toBe('12345678900');
  });

  it('maps list, create, and get rows with null optional fields', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ ...row, kind: 'REP_P', program_hash: 'hash' }])
      .mockResolvedValueOnce([]);
    const service = new RepDeviceService({ configured: true, query } as never);

    await expect(service.list()).resolves.toMatchObject([
      {
        repDeviceId: 'rep-1',
        kind: 'REP_C',
        manufacturer: null,
        registeredAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
    await expect(
      service.create({
        kind: 'REP_P',
        employerTaxId: '12.345.678/0001-99',
        programHash: ' hash ',
        status: undefined,
      }),
    ).resolves.toMatchObject({ kind: 'REP_P', programHash: 'hash' });
    await expect(service.get('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

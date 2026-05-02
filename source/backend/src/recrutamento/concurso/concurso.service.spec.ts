import { BadRequestException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { ConcursoService } from './concurso.service';

describe('ConcursoService', () => {
  const service = new ConcursoService({
    configured: true,
  } as unknown as DatabaseService);

  it('requires PCD reserve of at least 5% when total seats is five or more', () => {
    expect(() =>
      service.validateVagas([
        {
          positionId: '00000000-0000-4000-8000-000000000001',
          totalSeats: 20,
          pcdSeats: 0,
          racialSeats: 4,
          indigenousSeats: 0,
          baseSalary: '5000.00',
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('requires racial reserve of at least 20% when total seats is three or more', () => {
    expect(() =>
      service.validateVagas([
        {
          positionId: '00000000-0000-4000-8000-000000000001',
          totalSeats: 10,
          pcdSeats: 1,
          racialSeats: 1,
          indigenousSeats: 0,
          baseSalary: '5000.00',
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('accepts minimum legal reserves and draft creation state', () => {
    expect(() =>
      service.validateVagas([
        {
          positionId: '00000000-0000-4000-8000-000000000001',
          totalSeats: 10,
          pcdSeats: 1,
          racialSeats: 2,
          indigenousSeats: 0,
          baseSalary: '5000.00',
        },
      ]),
    ).not.toThrow();
  });
});

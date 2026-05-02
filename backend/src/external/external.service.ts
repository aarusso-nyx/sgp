import { Injectable } from '@nestjs/common';

@Injectable()
export class ExternalService {
  dados() {
    return {
      service: 'sgp-external-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  entidades() {
    return {
      entities: [
        'employees',
        'payroll-runs',
        'agreements',
        'reports',
        'audit-events',
      ],
    };
  }
}

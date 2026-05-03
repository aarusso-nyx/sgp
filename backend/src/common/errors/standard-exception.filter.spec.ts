import { ArgumentsHost, HttpStatus } from '@nestjs/common';

import { domainError } from './domain-error';
import { StandardExceptionFilter } from './standard-exception.filter';

describe('StandardExceptionFilter', () => {
  it('maps domain errors to the standard status/code/message envelope', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/v1/pericia/agendamentos',
          requestId: 'req-123',
        }),
      }),
    } as unknown as ArgumentsHost;

    new StandardExceptionFilter().catch(
      domainError.unprocessable(
        'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
        'Funcionário não se encontra em exercício',
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
        message: 'Funcionário não se encontra em exercício',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        method: 'POST',
        path: '/api/v1/pericia/agendamentos',
        requestId: 'req-123',
        timestamp: expect.any(String),
      },
    });
  });
});

import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { domainError } from './domain-error';
import { StandardExceptionFilter } from './standard-exception.filter';

describe('StandardExceptionFilter', () => {
  const createHost = ({
    method = 'POST',
    originalUrl,
    url = '/api/v1/fallback',
    requestId,
  }: {
    method?: string | undefined;
    originalUrl?: string | undefined;
    url?: string | undefined;
    requestId?: string | undefined;
  } = {}) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method,
          originalUrl,
          url,
          requestId,
        }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  };

  it('maps domain errors to the standard status/code/message envelope', () => {
    const { host, json, status } = createHost({
      originalUrl: '/api/v1/pericia/agendamentos',
      requestId: 'req-123',
    });

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

  it('passes through http exception status and response message', () => {
    const { host, json, status } = createHost({
      method: 'GET',
      originalUrl: '/api/v1/users',
      requestId: 'req-http',
    });

    new StandardExceptionFilter().catch(
      new HttpException(
        { code: 'IAM.USER_NOT_FOUND', message: 'User not found' },
        HttpStatus.NOT_FOUND,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'IAM.USER_NOT_FOUND',
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
        method: 'GET',
        path: '/api/v1/users',
        requestId: 'req-http',
        timestamp: expect.any(String),
      },
    });
  });

  it('uses string http exception responses as the envelope message', () => {
    const { host, json, status } = createHost({
      method: 'PATCH',
      originalUrl: '/api/v1/users/123',
      requestId: 'req-string',
    });

    new StandardExceptionFilter().catch(
      new HttpException('User is locked', HttpStatus.CONFLICT),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'CONFLICT',
        message: 'User is locked',
        status: HttpStatus.CONFLICT,
        method: 'PATCH',
        path: '/api/v1/users/123',
        requestId: 'req-string',
        timestamp: expect.any(String),
      },
    });
  });

  it('falls back to object error text when no message is present', () => {
    const { host, json, status } = createHost({
      method: 'PUT',
      originalUrl: '/api/v1/fiscal/dctfweb',
      requestId: 'req-error-fallback',
    });

    new StandardExceptionFilter().catch(
      new HttpException(
        { error: 'Declaration already transmitted' },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'CONFLICT',
        message: 'Declaration already transmitted',
        status: HttpStatus.CONFLICT,
        method: 'PUT',
        path: '/api/v1/fiscal/dctfweb',
        requestId: 'req-error-fallback',
        timestamp: expect.any(String),
      },
    });
  });

  it('maps domain error details into the envelope', () => {
    const { host, json, status } = createHost({
      originalUrl: '/api/v1/folha/calculos',
      requestId: 'req-domain-details',
    });

    new StandardExceptionFilter().catch(
      domainError.unprocessable(
        'FOLHA.CALC.INVALID_INPUT',
        'Invalid payroll input',
        ['employee_id is required'],
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'FOLHA.CALC.INVALID_INPUT',
        message: 'Invalid payroll input',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        method: 'POST',
        path: '/api/v1/folha/calculos',
        requestId: 'req-domain-details',
        timestamp: expect.any(String),
        details: ['employee_id is required'],
      },
    });
  });

  it('maps validation arrays to request validation failures', () => {
    const { host, json, status } = createHost({
      originalUrl: '/api/v1/ponto/marcacoes',
      requestId: 'req-validation',
    });

    new StandardExceptionFilter().catch(
      new BadRequestException({
        message: ['tenant_id must be a UUID', 'employee_id must be a UUID'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Request validation failed',
        status: HttpStatus.BAD_REQUEST,
        method: 'POST',
        path: '/api/v1/ponto/marcacoes',
        requestId: 'req-validation',
        timestamp: expect.any(String),
        details: ['tenant_id must be a UUID', 'employee_id must be a UUID'],
      },
    });
  });

  it('handles non-error thrown values without leaking them', () => {
    const { host, json, status } = createHost({
      originalUrl: '/api/v1/health',
      requestId: 'req-non-error',
    });

    new StandardExceptionFilter().catch('raw failure', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'POST',
        path: '/api/v1/health',
        requestId: 'req-non-error',
        timestamp: expect.any(String),
      },
    });
  });

  it('falls back to request url and tolerates a missing request id', () => {
    const { host, json, status } = createHost({
      method: 'DELETE',
      originalUrl: '',
      url: '/api/v1/lgpd/requests/123',
    });

    new StandardExceptionFilter().catch(new Error('Unexpected failure'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'DELETE',
        path: '/api/v1/lgpd/requests/123',
        timestamp: expect.any(String),
      },
    });
    expect(json.mock.calls[0][0].error).not.toHaveProperty('requestId');
  });
});

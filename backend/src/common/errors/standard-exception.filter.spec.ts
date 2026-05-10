import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { StandardExceptionFilter } from './standard-exception.filter';
import { domainError } from './domain-error';

describe('StandardExceptionFilter', () => {
  const createHost = ({
    method = 'POST',
    originalUrl,
    url = '/api/v1/fallback',
    requestId,
    traceId,
  }: {
    method?: string | undefined;
    originalUrl?: string | undefined;
    url?: string | undefined;
    requestId?: string | undefined;
    traceId?: string | undefined;
  } = {}) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const type = jest.fn(() => ({ status }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, type }),
        getRequest: () => ({
          method,
          originalUrl,
          url,
          requestId,
          traceId,
        }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status, type };
  };

  it('maps domain errors to RFC 9457 problem details', () => {
    const { host, json, status, type } = createHost({
      originalUrl: '/api/v1/pericia/agendamentos',
      requestId: 'req-123',
      traceId: 'trace-123',
    });

    new StandardExceptionFilter().catch(
      domainError.unprocessable(
        'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
        'Funcionário não se encontra em exercício',
      ),
      host,
    );

    expect(type).toHaveBeenCalledWith('application/problem+json');
    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith({
      type: 'https://sgp.detran-am.sistematech.com.br/errors/saude-pericia-employee-not-active',
      title: 'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'Funcionário não se encontra em exercício',
      instance: '/api/v1/pericia/agendamentos',
      traceId: 'trace-123',
      correlationId: 'req-123',
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/iam-user-not-found',
      title: 'IAM.USER_NOT_FOUND',
      status: HttpStatus.NOT_FOUND,
      detail: 'User not found',
      instance: '/api/v1/users',
      correlationId: 'req-http',
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/conflict',
      title: 'CONFLICT',
      status: HttpStatus.CONFLICT,
      detail: 'User is locked',
      instance: '/api/v1/users/123',
      correlationId: 'req-string',
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/conflict',
      title: 'CONFLICT',
      status: HttpStatus.CONFLICT,
      detail: 'Declaration already transmitted',
      instance: '/api/v1/fiscal/dctfweb',
      correlationId: 'req-error-fallback',
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/validation',
      title: 'FOLHA.CALC.INVALID_INPUT',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'Invalid payroll input',
      instance: '/api/v1/folha/calculos',
      correlationId: 'req-domain-details',
      errors: ['employee_id is required'],
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/validation',
      title: 'BAD_REQUEST',
      status: HttpStatus.BAD_REQUEST,
      detail: 'Request validation failed',
      instance: '/api/v1/ponto/marcacoes',
      correlationId: 'req-validation',
      errors: ['tenant_id must be a UUID', 'employee_id must be a UUID'],
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/internal-server-error',
      title: 'INTERNAL_SERVER_ERROR',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Internal server error',
      instance: '/api/v1/health',
      correlationId: 'req-non-error',
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
      type: 'https://sgp.detran-am.sistematech.com.br/errors/internal-server-error',
      title: 'INTERNAL_SERVER_ERROR',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Internal server error',
      instance: '/api/v1/lgpd/requests/123',
    });
    expect(json.mock.calls[0][0]).not.toHaveProperty('correlationId');
  });
});

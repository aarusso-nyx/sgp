import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

import type { RequestWithContext } from '../request-id/request-with-context';
import { isDomainError } from './domain-error';

type ExceptionResponse =
  | string
  | {
      error?: string | undefined;
      message?: string | string[] | undefined;
      statusCode?: number | undefined;
      code?: string | undefined;
    };

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId?: string | undefined;
  correlationId?: string | undefined;
  errors?: readonly string[] | undefined;
};

@Catch()
export class StandardExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const domainException = isDomainError(exception) ? exception : undefined;
    const status: HttpStatus =
      domainException?.status ??
      (exception instanceof HttpException
        ? (exception.getStatus() as HttpStatus)
        : HttpStatus.INTERNAL_SERVER_ERROR);
    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionResponse)
        : undefined;
    const message =
      domainException?.message ??
      this.resolveMessage(exception, exceptionResponse, status);
    const details = domainException?.details?.length
      ? domainException.details
      : typeof exceptionResponse === 'object' &&
          Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : undefined;

    const code =
      domainException?.code ?? this.resolveCode(exceptionResponse, status);
    const problemDetails: ProblemDetails = {
      type: this.resolveType(code, details),
      title: code,
      status,
      detail: message,
      instance: request.originalUrl || request.url,
      ...(request.traceId ? { traceId: request.traceId } : {}),
      ...(request.requestId ? { correlationId: request.requestId } : {}),
      ...(details ? { errors: details } : {}),
    };

    response
      .type('application/problem+json')
      .status(status)
      .json(problemDetails);
  }

  private resolveMessage(
    exception: unknown,
    exceptionResponse: ExceptionResponse | undefined,
    status: number,
  ): string {
    if (typeof exceptionResponse === 'string') return exceptionResponse;
    if (typeof exceptionResponse === 'object') {
      if (Array.isArray(exceptionResponse.message))
        return 'Request validation failed';
      if (exceptionResponse.message) return exceptionResponse.message;
      if (exceptionResponse.error) return exceptionResponse.error;
    }
    if (status === 500) return 'Internal server error';
    return exception instanceof Error ? exception.message : 'Request failed';
  }

  private resolveCode(
    exceptionResponse: ExceptionResponse | undefined,
    status: number,
  ): string {
    if (typeof exceptionResponse === 'object' && exceptionResponse.code)
      return exceptionResponse.code;
    return HttpStatus[status]?.toString() ?? 'ERROR';
  }

  private resolveType(
    code: string,
    details: readonly string[] | undefined,
  ): string {
    if (details?.length) {
      return 'https://sgp.detran-am.sistematech.com.br/errors/validation';
    }
    return `https://sgp.detran-am.sistematech.com.br/errors/${code
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;
  }
}

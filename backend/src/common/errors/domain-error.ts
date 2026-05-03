import { HttpStatus } from '@nestjs/common';

export interface DomainErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly status: HttpStatus;
  readonly details?: readonly string[];
}

export class DomainError extends Error {
  readonly code: string;
  readonly status: HttpStatus;
  readonly details?: readonly string[];

  constructor(options: DomainErrorOptions) {
    super(options.message);
    this.name = 'DomainError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const domainError = {
  badRequest(
    code: string,
    message: string,
    details?: readonly string[],
  ): DomainError {
    return new DomainError({
      code,
      message,
      status: HttpStatus.BAD_REQUEST,
      details,
    });
  },

  conflict(
    code: string,
    message: string,
    details?: readonly string[],
  ): DomainError {
    return new DomainError({
      code,
      message,
      status: HttpStatus.CONFLICT,
      details,
    });
  },

  notFound(
    code: string,
    message: string,
    details?: readonly string[],
  ): DomainError {
    return new DomainError({
      code,
      message,
      status: HttpStatus.NOT_FOUND,
      details,
    });
  },

  serviceUnavailable(
    code: string,
    message: string,
    details?: readonly string[],
  ): DomainError {
    return new DomainError({
      code,
      message,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      details,
    });
  },

  unprocessable(
    code: string,
    message: string,
    details?: readonly string[],
  ): DomainError {
    return new DomainError({
      code,
      message,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    });
  },
} as const;

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

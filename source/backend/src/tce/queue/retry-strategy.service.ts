import { Injectable } from '@nestjs/common';

export type TceQueueErrorKind =
  | 'TRANSIENT'
  | 'DEFINITIVE'
  | 'TIMEOUT'
  | 'VALIDATION';

export type TceAttemptOutcome =
  | 'SUCCESS'
  | 'TRANSIENT_FAIL'
  | 'DEFINITIVE_FAIL'
  | 'TIMEOUT'
  | 'CIRCUIT_OPEN';

export interface TceRetryDecision {
  errorKind: TceQueueErrorKind;
  outcome: TceAttemptOutcome;
  transient: boolean;
  countsForCircuit: boolean;
  message: string;
  payload: Record<string, unknown>;
}

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  response?: {
    status?: number;
    statusCode?: number;
    data?: unknown;
  };
  body?: unknown;
}

const TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNABORTED',
  'EAI_AGAIN',
]);

@Injectable()
export class TceRetryStrategyService {
  classify(error: unknown): TceRetryDecision {
    const errorLike = this.toErrorLike(error);
    const code = errorLike.code?.toUpperCase();
    const httpStatus = this.httpStatus(errorLike);
    const message = this.errorText(errorLike);
    const payload = {
      code: code ?? null,
      httpStatus,
      message,
    };

    if (code && TIMEOUT_CODES.has(code)) {
      return {
        errorKind: 'TIMEOUT',
        outcome: 'TIMEOUT',
        transient: true,
        countsForCircuit: true,
        message: message || code,
        payload,
      };
    }

    if (httpStatus && (httpStatus === 429 || httpStatus >= 500)) {
      return {
        errorKind: 'TRANSIENT',
        outcome: 'TRANSIENT_FAIL',
        transient: true,
        countsForCircuit: true,
        message: message || `HTTP ${httpStatus}`,
        payload,
      };
    }

    if (
      /\b(transient|tempor[aá]ri[ao]|indispon[ií]vel|timeout|circuit|retry)\b/i.test(
        message,
      )
    ) {
      return {
        errorKind: 'TRANSIENT',
        outcome: 'TRANSIENT_FAIL',
        transient: true,
        countsForCircuit: true,
        message,
        payload,
      };
    }

    if (/\b(validation|validacao|valida[cç][aã]o|invalid)\b/i.test(message)) {
      return {
        errorKind: 'VALIDATION',
        outcome: 'DEFINITIVE_FAIL',
        transient: false,
        countsForCircuit: false,
        message: message || 'TCE validation failure',
        payload,
      };
    }

    return {
      errorKind: 'DEFINITIVE',
      outcome: 'DEFINITIVE_FAIL',
      transient: false,
      countsForCircuit: false,
      message: message || 'Definitive TCE submission failure',
      payload,
    };
  }

  nextAttemptAt(
    attempts: number,
    now = new Date(),
    jitterUnit = Math.random(),
  ): Date {
    const boundedAttempts = Math.max(1, Math.min(attempts, 8));
    const baseDelayMs = Math.min(1000 * 2 ** (boundedAttempts - 1), 300_000);
    const jitterMs = Math.trunc(
      baseDelayMs * 0.2 * Math.max(0, Math.min(jitterUnit, 1)),
    );
    return new Date(now.getTime() + baseDelayMs + jitterMs);
  }

  private toErrorLike(error: unknown): ErrorLike {
    if (error && typeof error === 'object') return error as ErrorLike;
    return { message: this.unknownText(error) };
  }

  private httpStatus(error: ErrorLike): number | null {
    const candidate =
      error.response?.status ??
      error.response?.statusCode ??
      error.status ??
      error.statusCode;
    return typeof candidate === 'number' ? candidate : null;
  }

  private errorText(error: ErrorLike): string {
    return [
      error.message,
      this.bodyText(error.body),
      this.bodyText(error.response?.data),
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 1000);
  }

  private bodyText(body: unknown): string {
    if (typeof body === 'string') return body;
    if (!body || typeof body !== 'object') return '';
    try {
      return JSON.stringify(body);
    } catch {
      return '';
    }
  }

  private unknownText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return this.bodyText(value);
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    return '';
  }
}

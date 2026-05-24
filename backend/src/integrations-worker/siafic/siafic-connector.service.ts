import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InMemoryCircuitBreaker,
  IntegrationAdapter,
  type RetryPolicy,
} from '@stynx/integration-adapter';

import {
  SiaficCircuitState,
  SiaficConnectorResponse,
  SiaficStagePayload,
} from './siafic.dto';
import { domainError } from '../../common/errors/domain-error';
import {
  combineAbortSignals,
  currentRequestAbortSignal,
} from '../../common/http/request-abort-signal';

@Injectable()
export class SiaficConnectorService {
  private readonly circuitBreaker: InMemoryCircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    this.circuitBreaker = new InMemoryCircuitBreaker({
      failureThreshold: this.failureThreshold(),
      openAfterMs: 0,
      halfOpenAfterMs: this.resetTimeoutMs(),
    });
  }

  getCircuitState(enteCode: string): SiaficCircuitState {
    const state = this.circuitBreaker.snapshot(this.circuitKey(enteCode)).state;
    if (state === 'open') return 'OPEN';
    if (state === 'half-open') return 'HALF_OPEN';
    return 'CLOSED';
  }

  async sendStage(
    payload: SiaficStagePayload,
  ): Promise<SiaficConnectorResponse> {
    const adapter = new IntegrationAdapter<
      SiaficStagePayload,
      SiaficConnectorResponse,
      SiaficConnectorResponse
    >({
      name: 'sgp.siafic.stage',
      request: (input) => this.sendOnce(input),
      parseResponse: (response) => response,
      idempotencyKey: (input) => input.idempotencyKey,
      retryPolicy: this.retryPolicy(payload.enteCode),
      timeoutMs: this.timeoutMs(),
      circuitBreakerKey: (input) => this.circuitKey(input.enteCode),
      circuitBreaker: this.circuitBreaker,
    });

    try {
      return await adapter.execute(payload, {
        metadata: {
          enteCode: payload.enteCode,
          stage: payload.stage,
        },
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? error.message
          : 'SIAFIC transmission failed after retries',
      );
    }
  }

  private async sendOnce(
    payload: SiaficStagePayload,
  ): Promise<SiaficConnectorResponse> {
    const endpoint = this.configService.get<string>('SIAFIC_ENDPOINT_URL');
    if (!endpoint) {
      return {
        accepted: true,
        receiptNumber: `SIAFIC-${payload.stage}-${payload.payrollRunId
          .slice(0, 8)
          .toUpperCase()}`,
        payload: {
          mode: 'sandbox',
          attempt: 1,
          stage: payload.stage,
          message:
            'SIAFIC sandbox connector accepted the payroll accounting payload without an external call.',
        },
      };
    }

    const timeoutMs = Math.max(
      1_000,
      Number(this.configService.get<string>('SIAFIC_TIMEOUT_MS') ?? 15_000),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const signal = combineAbortSignals(
        controller.signal,
        currentRequestAbortSignal(),
      );
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sgp-ente-code': payload.enteCode,
          'x-sgp-siafic-stage': payload.stage,
          'x-idempotency-key': payload.idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal,
      });
      const body = await response.text();
      if (!response.ok) {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          `SIAFIC endpoint returned ${response.status}: ${body.slice(0, 300)}`,
        );
      }
      return parseSiaficResponse(body, response.status);
    } finally {
      clearTimeout(timeout);
    }
  }

  private circuitKey(enteCode: string): string {
    return `siafic:${enteCode}`;
  }

  private retryPolicy(enteCode: string): RetryPolicy {
    return {
      maxAttempts: Math.max(
        1,
        Number(this.configService.get<string>('SIAFIC_MAX_ATTEMPTS') ?? 3),
      ),
      baseDelayMs: 0,
      retryable: () =>
        this.circuitBreaker.snapshot(this.circuitKey(enteCode)).state !==
        'open',
    };
  }

  private timeoutMs(): number {
    return Math.max(
      1_000,
      Number(this.configService.get<string>('SIAFIC_TIMEOUT_MS') ?? 15_000),
    );
  }

  private failureThreshold(): number {
    return Math.max(
      1,
      Number(
        this.configService.get<string>('SIAFIC_CIRCUIT_FAILURE_THRESHOLD') ?? 3,
      ),
    );
  }

  private resetTimeoutMs(): number {
    return Math.max(
      1_000,
      Number(
        this.configService.get<string>('SIAFIC_CIRCUIT_RESET_TIMEOUT_MS') ??
          60_000,
      ),
    );
  }
}

export function parseSiaficResponse(
  body: string,
  httpStatus = 200,
): SiaficConnectorResponse {
  try {
    const parsed = JSON.parse(body) as {
      accepted?: boolean | undefined;
      receiptNumber?: string | undefined;
      receipt_number?: string | undefined;
      protocolo?: string | undefined;
      status?: string | undefined;
    };
    const accepted =
      parsed.accepted ??
      ['ACCEPTED', 'ACEITO', 'OK', 'SUCCESS'].includes(
        String(parsed.status ?? '').toUpperCase(),
      );
    return {
      accepted,
      receiptNumber:
        parsed.receiptNumber ??
        parsed.receipt_number ??
        parsed.protocolo ??
        null,
      payload: { httpStatus, ...parsed },
    };
  } catch {
    const receipt =
      body.match(
        /<[^>]*(?:receiptNumber|protocolo|numeroRecibo)[^>]*>([^<]+)</i,
      )?.[1] ?? null;
    const rejected = /rejeitad|rejected|erro/i.test(body);
    return {
      accepted: !rejected,
      receiptNumber: receipt,
      payload: { httpStatus, body },
    };
  }
}

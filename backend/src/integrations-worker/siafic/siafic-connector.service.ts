import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

interface CircuitRecord {
  state: SiaficCircuitState;
  failures: number;
  openedAt: number | null;
}

@Injectable()
export class SiaficConnectorService {
  private readonly circuits = new Map<string, CircuitRecord>();

  constructor(private readonly configService: ConfigService) {}

  getCircuitState(enteCode: string): SiaficCircuitState {
    return this.resolveCircuit(enteCode).state;
  }

  async sendStage(
    payload: SiaficStagePayload,
  ): Promise<SiaficConnectorResponse> {
    this.assertCircuitAllows(payload.enteCode);
    const attempts = this.maxAttempts();
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.sendOnce(payload, attempt);
        this.recordSuccess(payload.enteCode);
        return response;
      } catch (error) {
        lastError = error;
        this.recordFailure(payload.enteCode);
        if (attempt === attempts || this.isOpen(payload.enteCode)) break;
      }
    }

    throw new ServiceUnavailableException(
      lastError instanceof Error
        ? lastError.message
        : 'SIAFIC transmission failed after retries',
    );
  }

  private async sendOnce(
    payload: SiaficStagePayload,
    attempt: number,
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
          attempt,
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

  private assertCircuitAllows(enteCode: string): void {
    const circuit = this.resolveCircuit(enteCode);
    if (circuit.state !== 'OPEN') return;
    const openedAt = circuit.openedAt ?? 0;
    if (Date.now() - openedAt >= this.resetTimeoutMs()) {
      circuit.state = 'HALF_OPEN';
      return;
    }
    throw new ServiceUnavailableException(
      `SIAFIC circuit is open for ente ${enteCode}`,
    );
  }

  private recordSuccess(enteCode: string): void {
    const circuit = this.resolveCircuit(enteCode);
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.openedAt = null;
  }

  private recordFailure(enteCode: string): void {
    const circuit = this.resolveCircuit(enteCode);
    circuit.failures += 1;
    if (circuit.failures >= this.failureThreshold()) {
      circuit.state = 'OPEN';
      circuit.openedAt = Date.now();
    }
  }

  private isOpen(enteCode: string): boolean {
    return this.resolveCircuit(enteCode).state === 'OPEN';
  }

  private resolveCircuit(enteCode: string): CircuitRecord {
    const current = this.circuits.get(enteCode);
    if (current) return current;
    const created: CircuitRecord = {
      state: 'CLOSED',
      failures: 0,
      openedAt: null,
    };
    this.circuits.set(enteCode, created);
    return created;
  }

  private maxAttempts(): number {
    return Math.max(
      1,
      Number(this.configService.get<string>('SIAFIC_MAX_ATTEMPTS') ?? 3),
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

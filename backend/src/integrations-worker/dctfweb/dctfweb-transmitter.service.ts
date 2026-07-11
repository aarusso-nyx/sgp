import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationAdapter,
  type RetryPolicy,
} from '@stynx-nyx/integration-adapter';

import {
  combineAbortSignals,
  currentRequestAbortSignal,
} from '../../common/http/request-abort-signal';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebDeclarationDetailsDto } from './dctfweb.dto';
import { DctfwebReceiptService } from './dctfweb-receipt.service';

interface RfbResponse {
  accepted: boolean;
  receiptNumber: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class DctfwebTransmitterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly declarations: DctfwebBuilderService,
    private readonly receiptService: DctfwebReceiptService,
  ) {}

  async transmit(id: string): Promise<DctfwebDeclarationDetailsDto> {
    const declaration = await this.declarations.find(id);
    if (declaration.status === 'ACCEPTED' && declaration.transmittedXmlHash) {
      return declaration;
    }
    if (!declaration.signedXml) {
      throw new BadRequestException(
        'DCTFWeb declaration must be signed before transmission',
      );
    }

    const response = await this.sendWithRetry(declaration);
    return this.receiptService.process({
      declarationId: id,
      accepted: response.accepted,
      receiptNumber: response.receiptNumber,
      receiptAt: new Date(),
      transmittedXml: declaration.signedXml,
      responsePayload: response.payload,
    });
  }

  private async sendWithRetry(
    declaration: DctfwebDeclarationDetailsDto,
  ): Promise<RfbResponse> {
    const adapter = new IntegrationAdapter<
      DctfwebDeclarationDetailsDto,
      RfbResponse,
      RfbResponse
    >({
      name: 'sgp.dctfweb.rfb',
      request: (input) => this.sendOnce(input),
      parseResponse: (response) => response,
      idempotencyKey: (input) =>
        `dctfweb:${input.id}:${input.signedXmlHash ?? input.payloadXmlHash}`,
      retryPolicy: this.retryPolicy('DCTFWEB_RFB_MAX_ATTEMPTS'),
      timeoutMs: this.timeoutMs('DCTFWEB_RFB_TIMEOUT_MS'),
      circuitBreakerKey: () => 'rfb:dctfweb',
    });

    try {
      return await adapter.execute(declaration);
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? error.message
          : 'DCTFWeb transmission failed after retries',
      );
    }
  }

  private async sendOnce(
    declaration: DctfwebDeclarationDetailsDto,
  ): Promise<RfbResponse> {
    const endpoint = this.configService.get<string>('DCTFWEB_RFB_ENDPOINT_URL');
    if (!endpoint) {
      return {
        accepted: true,
        receiptNumber: `DCTFWEB-${declaration.id.slice(0, 8).toUpperCase()}`,
        payload: {
          mode: 'sandbox',
          attempt: 1,
          message:
            'DCTFWeb sandbox transmitter accepted the signed XML without an external RFB call.',
        },
      };
    }

    const timeoutMs = Math.max(
      1_000,
      Number(
        this.configService.get<string>('DCTFWEB_RFB_TIMEOUT_MS') ?? 15_000,
      ),
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
        headers: { 'content-type': 'application/xml' },
        body: declaration.signedXml,
        signal,
      });
      const body = await response.text();
      if (!response.ok) {
        return {
          accepted: false,
          receiptNumber: null,
          payload: { httpStatus: response.status, body },
        };
      }
      return parseRfbResponse(body, response.status);
    } finally {
      clearTimeout(timeout);
    }
  }

  private retryPolicy(maxAttemptsKey: string): RetryPolicy {
    return {
      maxAttempts: Math.max(
        1,
        Number(this.configService.get<string>(maxAttemptsKey) ?? 3),
      ),
      baseDelayMs: 0,
    };
  }

  private timeoutMs(key: string): number {
    return Math.max(
      1_000,
      Number(this.configService.get<string>(key) ?? 15_000),
    );
  }
}

export function parseRfbResponse(body: string, httpStatus = 200): RfbResponse {
  try {
    const parsed = JSON.parse(body) as {
      accepted?: boolean | undefined;
      receiptNumber?: string | undefined;
      receipt_number?: string | undefined;
      status?: string | undefined;
    };
    const accepted =
      parsed.accepted ??
      ['ACCEPTED', 'OK', 'SUCCESS'].includes(
        String(parsed.status ?? '').toUpperCase(),
      );
    return {
      accepted,
      receiptNumber: parsed.receiptNumber ?? parsed.receipt_number ?? null,
      payload: { httpStatus, ...parsed },
    };
  } catch {
    const receipt =
      body.match(/<[^>]*(?:receiptNumber|numeroRecibo)[^>]*>([^<]+)</i)?.[1] ??
      null;
    const rejected = /rejeitad|rejected/i.test(body);
    return {
      accepted: !rejected,
      receiptNumber: receipt,
      payload: { httpStatus, body },
    };
  }
}

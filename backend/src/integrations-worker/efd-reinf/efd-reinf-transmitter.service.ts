import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EfdReinfEventDetailsDto } from './efd-reinf.dto';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { EfdReinfReceiptService } from './efd-reinf-receipt.service';

interface RfbResponse {
  accepted: boolean;
  receiptNumber: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class EfdReinfTransmitterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly events: EfdReinfBuilderService,
    private readonly receiptService: EfdReinfReceiptService,
  ) {}

  async transmit(id: string): Promise<EfdReinfEventDetailsDto> {
    const event = await this.events.find(id);
    if (event.status === 'ACCEPTED' && event.transmittedXmlHash) {
      return event;
    }
    if (!event.signedXml) {
      throw new BadRequestException(
        'EFD-Reinf event must be signed before transmission',
      );
    }

    const response = await this.sendWithRetry(event);
    return this.receiptService.process({
      eventId: id,
      accepted: response.accepted,
      receiptNumber: response.receiptNumber,
      receiptAt: new Date(),
      transmittedXml: event.signedXml,
      responsePayload: response.payload,
    });
  }

  private async sendWithRetry(
    event: EfdReinfEventDetailsDto,
  ): Promise<RfbResponse> {
    const attempts = Math.max(
      1,
      Number(this.configService.get<string>('EFD_REINF_RFB_MAX_ATTEMPTS') ?? 3),
    );
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.sendOnce(event, attempt);
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
      }
    }
    throw new ServiceUnavailableException(
      lastError instanceof Error
        ? lastError.message
        : 'EFD-Reinf transmission failed after retries',
    );
  }

  private async sendOnce(
    event: EfdReinfEventDetailsDto,
    attempt: number,
  ): Promise<RfbResponse> {
    const endpoint = this.configService.get<string>(
      'EFD_REINF_RFB_ENDPOINT_URL',
    );
    if (!endpoint) {
      return {
        accepted: true,
        receiptNumber: `REINF-${event.eventType}-${event.id
          .slice(0, 8)
          .toUpperCase()}`,
        payload: {
          mode: 'sandbox',
          attempt,
          eventType: event.eventType,
          message:
            'EFD-Reinf sandbox transmitter accepted the signed XML without an external RFB call.',
        },
      };
    }

    const timeoutMs = Math.max(
      1_000,
      Number(
        this.configService.get<string>('EFD_REINF_RFB_TIMEOUT_MS') ?? 15_000,
      ),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        body: event.signedXml,
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        return {
          accepted: false,
          receiptNumber: null,
          payload: { httpStatus: response.status, body },
        };
      }
      return parseEfdReinfRfbResponse(body, response.status);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseEfdReinfRfbResponse(
  body: string,
  httpStatus = 200,
): RfbResponse {
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
      body.match(
        /<[^>]*(?:receiptNumber|numeroRecibo|nrRecibo)[^>]*>([^<]+)</i,
      )?.[1] ?? null;
    const rejected = /rejeitad|rejected/i.test(body);
    return {
      accepted: !rejected,
      receiptNumber: receipt,
      payload: { httpStatus, body },
    };
  }
}

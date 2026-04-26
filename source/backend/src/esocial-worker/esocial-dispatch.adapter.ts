import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ESocialDispatchInput {
  eventId: string;
  eventType: string;
  schemaVersion: string;
  xml: string;
}

export interface ESocialDispatchResult {
  mode: 'sandbox';
  accepted: true;
  receiptNumber: string;
  protocolNumber: string;
  responsePayload: Record<string, unknown>;
}

@Injectable()
export class ESocialDispatchAdapter {
  constructor(private readonly configService: ConfigService) {}

  dispatch(input: ESocialDispatchInput): ESocialDispatchResult {
    const mode = (
      this.configService.get<string>('ESOCIAL_DISPATCH_MODE') ?? 'sandbox'
    ).toLowerCase();

    if (mode !== 'sandbox') {
      throw new ServiceUnavailableException(
        'Only the eSocial sandbox dispatch adapter is configured in this runtime',
      );
    }

    const eventToken = input.eventId
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase();
    const typeToken = input.eventType
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    return {
      mode: 'sandbox',
      accepted: true,
      receiptNumber: `REC-SANDBOX-${typeToken}-${eventToken}`,
      protocolNumber: `PROTO-SANDBOX-${eventToken}`,
      responsePayload: {
        ambiente: 'sandbox',
        schemaVersion: input.schemaVersion,
        xmlSizeBytes: Buffer.byteLength(input.xml, 'utf8'),
        receivedAt: new Date().toISOString(),
      },
    };
  }
}

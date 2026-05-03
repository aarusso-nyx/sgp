import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { EfdReinfEventDetailsDto } from './efd-reinf.dto';

export interface EfdReinfReceiptInput {
  eventId: string;
  accepted: boolean;
  receiptNumber: string | null;
  receiptAt: Date;
  transmittedXml: string;
  responsePayload: Record<string, unknown>;
}

@Injectable()
export class EfdReinfReceiptService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly events: EfdReinfBuilderService,
  ) {}

  async process(input: EfdReinfReceiptInput): Promise<EfdReinfEventDetailsDto> {
    this.ensureDatabase();
    const transmittedHash = sha256(input.transmittedXml);
    const event = await this.events.find(input.eventId);
    if (!event.signedXmlHash) {
      throw new BadRequestException(
        'EFD-Reinf receipt cannot be recorded before signing',
      );
    }
    if (event.signedXmlHash !== transmittedHash) {
      throw new BadRequestException(
        'EFD-Reinf receipt hash does not match the signed transmitted XML',
      );
    }

    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE fiscal.efd_reinf_event
        SET status = $2::fiscal.efd_reinf_event_status,
            transmitted_xml_hash = $3,
            receipt_number = $4,
            receipt_at = $5::timestamptz,
            receipt_payload = $6::jsonb
        WHERE id = $1::uuid
        `,
        [
          input.eventId,
          input.accepted ? 'ACCEPTED' : 'REJECTED',
          transmittedHash,
          input.receiptNumber,
          input.receiptAt.toISOString(),
          JSON.stringify({
            ...input.responsePayload,
            transmittedXmlHash: transmittedHash,
            signedXmlHash: event.signedXmlHash,
          }),
        ],
      );

      if (input.accepted && event.eventType === 'R4099') {
        await client.query(
          `
          INSERT INTO fiscal.efd_reinf_totalizer (
            tenant_id,
            competence,
            kind,
            source_event_id,
            receipt_number,
            payload,
            received_at
          )
          SELECT
            tenant_id,
            competence,
            'R-9015'::fiscal.efd_reinf_totalizer_kind,
            id,
            $2,
            $3::jsonb,
            $4::timestamptz
          FROM fiscal.efd_reinf_event
          WHERE id = $1::uuid
          ON CONFLICT (tenant_id, competence, kind, source_event_id)
          DO UPDATE SET
            receipt_number = EXCLUDED.receipt_number,
            payload = EXCLUDED.payload,
            received_at = EXCLUDED.received_at
          `,
          [
            input.eventId,
            input.receiptNumber,
            JSON.stringify({
              items: event.items.map((item) => ({
                sourceRunId: item.sourceRunId,
                debitCode: item.revenueCode,
                baseAmount: item.grossAmount,
                amount: item.retainedAmount,
              })),
            }),
            input.receiptAt.toISOString(),
          ],
        );
      }
    });

    return this.events.find(input.eventId);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for EFD-Reinf receipt processing',
      );
    }
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

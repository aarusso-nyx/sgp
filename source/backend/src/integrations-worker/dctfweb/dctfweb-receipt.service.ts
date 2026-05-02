import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebDeclarationDetailsDto } from './dctfweb.dto';

export interface DctfwebReceiptInput {
  declarationId: string;
  accepted: boolean;
  receiptNumber: string | null;
  receiptAt: Date;
  transmittedXml: string;
  responsePayload: Record<string, unknown>;
}

@Injectable()
export class DctfwebReceiptService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly declarations: DctfwebBuilderService,
  ) {}

  async process(
    input: DctfwebReceiptInput,
  ): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const transmittedHash = sha256(input.transmittedXml);
    const declaration = await this.declarations.find(input.declarationId);
    if (!declaration.signedXmlHash) {
      throw new BadRequestException(
        'DCTFWeb receipt cannot be recorded before signing',
      );
    }
    if (declaration.signedXmlHash !== transmittedHash) {
      throw new BadRequestException(
        'DCTFWeb receipt hash does not match the signed transmitted XML',
      );
    }

    await this.databaseService.query(
      `
      UPDATE fiscal.dctfweb_declaration
      SET status = $2::fiscal.dctfweb_declaration_status,
          transmitted_xml_hash = $3,
          receipt_number = $4,
          receipt_at = $5::timestamptz,
          receipt_payload = $6::jsonb
      WHERE id = $1::uuid
      `,
      [
        input.declarationId,
        input.accepted ? 'ACCEPTED' : 'REJECTED',
        transmittedHash,
        input.receiptNumber,
        input.receiptAt.toISOString(),
        JSON.stringify({
          ...input.responsePayload,
          transmittedXmlHash: transmittedHash,
          signedXmlHash: declaration.signedXmlHash,
        }),
      ],
    );
    return this.declarations.find(input.declarationId);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DCTFWeb receipt processing',
      );
    }
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

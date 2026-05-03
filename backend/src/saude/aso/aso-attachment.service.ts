import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AttachAsoDto } from './aso.dto';

interface AttachmentRow extends QueryResultRow {
  id: string;
  aso_record_id: string;
  file_uri: string;
  sha256: string;
  mime: string;
  encrypted_at_rest: boolean;
}

export interface AsoAttachmentSummary {
  id: string;
  asoRecordId: string;
  fileUri: string;
  sha256: string;
  mime: string;
  encryptedAtRest: boolean;
  signedUploadUrl: string;
}

@Injectable()
export class AsoAttachmentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async attach(
    asoRecordId: string,
    input: AttachAsoDto,
  ): Promise<AsoAttachmentSummary> {
    this.ensureDatabase();
    const sha = input.sha256.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha)) {
      throw new BadRequestException('Invalid SHA-256 digest');
    }
    if (input.encryptedAtRest === false) {
      throw new BadRequestException(
        'ASO attachments must be encrypted at rest',
      );
    }
    const rows = await this.databaseService.query<AttachmentRow>(
      `
      INSERT INTO saude.aso_attachment (
        aso_record_id, file_uri, sha256, mime, encrypted_at_rest
      )
      VALUES ($1::uuid, $2, $3, $4, true)
      RETURNING id::text, aso_record_id::text, file_uri, sha256, mime, encrypted_at_rest
      `,
      [asoRecordId, input.fileUri.trim(), sha, input.mime],
    );
    return this.toSummary(rows[0]!);
  }

  verifySha256(content: Buffer | string, expectedSha256: string): boolean {
    const actual = createHash('sha256').update(content).digest('hex');
    return actual === expectedSha256.toLowerCase();
  }

  private signedUploadUrl(fileUri: string): string {
    const token = createHash('sha256')
      .update(fileUri)
      .digest('hex')
      .slice(0, 24);
    return `${fileUri}?signature=${token}`;
  }

  private toSummary(row: AttachmentRow): AsoAttachmentSummary {
    return {
      id: row.id,
      asoRecordId: row.aso_record_id,
      fileUri: row.file_uri,
      sha256: row.sha256,
      mime: row.mime,
      encryptedAtRest: row.encrypted_at_rest,
      signedUploadUrl: this.signedUploadUrl(row.file_uri),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

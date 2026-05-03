import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

export interface ProgramRevisionSummary {
  id: string;
  parentProgramId: string;
  parentProgramKind: 'PCMSO' | 'PGR';
  revisionNumber: number;
  revisionReason: string;
  snapshotJson: Record<string, unknown>;
  signedPdfUri: string | null;
  sha256: string | null;
  createdAt: string;
}

interface RevisionRow extends QueryResultRow {
  id: string;
  parent_program_id: string;
  parent_program_kind: 'PCMSO' | 'PGR';
  revision_number: number;
  revision_reason: string;
  snapshot_json: Record<string, unknown>;
  signed_pdf_uri: string | null;
  sha256: string | null;
  created_at: Date | string;
}

@Injectable()
export class ProgramRevisionService {
  async createWithClient(
    client: PoolClient,
    input: {
      parentProgramId: string;
      parentProgramKind: 'PCMSO' | 'PGR';
      revisionReason: string;
      signedPdfUri?: string | null;
      sha256?: string | null;
      snapshotJson: Record<string, unknown>;
    },
  ): Promise<ProgramRevisionSummary> {
    if (input.parentProgramKind === 'PCMSO') {
      await this.assertPcmosExists(client, input.parentProgramId);
    }
    if (input.parentProgramKind === 'PGR') {
      await this.assertPgrExists(client, input.parentProgramId);
    }
    const rows = await client.query<RevisionRow>(
      `
      WITH next_revision AS (
        SELECT COALESCE(max(revision_number), 0) + 1 AS revision_number
        FROM saude.program_revision
        WHERE parent_program_id = $1::uuid
          AND parent_program_kind = $2::saude.program_parent_kind
      )
      INSERT INTO saude.program_revision (
        parent_program_id, parent_program_kind, revision_number,
        revision_reason, snapshot_json, signed_pdf_uri, sha256
      )
      SELECT
        $1::uuid, $2::saude.program_parent_kind, revision_number,
        $3, $4::jsonb, NULLIF($5, ''), NULLIF($6, '')
      FROM next_revision
      RETURNING id::text, parent_program_id::text, parent_program_kind::text,
        revision_number, revision_reason, snapshot_json, signed_pdf_uri,
        sha256, created_at
      `,
      [
        input.parentProgramId,
        input.parentProgramKind,
        input.revisionReason.trim(),
        JSON.stringify(input.snapshotJson),
        input.signedPdfUri ?? '',
        input.sha256 ?? '',
      ],
    );
    return this.toSummary(rows.rows[0]!);
  }

  toSummary(row: RevisionRow): ProgramRevisionSummary {
    return {
      id: row.id,
      parentProgramId: row.parent_program_id,
      parentProgramKind: row.parent_program_kind,
      revisionNumber: row.revision_number,
      revisionReason: row.revision_reason,
      snapshotJson: row.snapshot_json,
      signedPdfUri: row.signed_pdf_uri,
      sha256: row.sha256,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
    };
  }

  private async assertPcmosExists(
    client: PoolClient,
    id: string,
  ): Promise<void> {
    const rows = await client.query(
      'SELECT 1 FROM saude.health_program WHERE id = $1::uuid',
      [id],
    );
    if (rows.rowCount === 0) throw new BadRequestException('PCMSO not found');
  }

  private async assertPgrExists(client: PoolClient, id: string): Promise<void> {
    const rows = await client.query(
      'SELECT 1 FROM saude.risk_management_program WHERE id = $1::uuid',
      [id],
    );
    if (rows.rowCount === 0) throw new BadRequestException('PGR not found');
  }
}

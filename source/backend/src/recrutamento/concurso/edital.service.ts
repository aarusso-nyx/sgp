import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { ConcursoService } from './concurso.service';
import { CreateEditalDto, PublishEditalDto } from './concurso.dto';

export interface EditalSummary {
  concursoId: string;
  version: number;
  documentRef: string;
  administrativeAct: string;
  administrativeActDate: string;
  publishedAt: string | null;
  publicUrl: string | null;
}

interface EditalRow extends QueryResultRow {
  concurso_id: string;
  version: number;
  document_ref: string;
  administrative_act: string;
  administrative_act_date: Date | string;
  published_at: Date | string | null;
  public_url: string | null;
}

@Injectable()
export class EditalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly concursoService: ConcursoService,
  ) {}

  async createVersion(
    concursoId: string,
    input: CreateEditalDto,
  ): Promise<EditalSummary> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.concursoService.requireExists(client, concursoId);
      const result = await client.query<EditalRow>(
        `
        INSERT INTO recrutamento.edital (
          tenant_id, concurso_id, version, document_ref, administrative_act, administrative_act_date
        )
        SELECT
          concurso.tenant_id,
          concurso.id,
          COALESCE((SELECT max(version) + 1 FROM recrutamento.edital WHERE concurso_id = concurso.id), 1),
          $2,
          $3,
          $4::date
        FROM recrutamento.concurso concurso
        WHERE concurso.id = $1::uuid
        RETURNING concurso_id::text, version, document_ref, administrative_act, administrative_act_date, published_at, public_url
        `,
        [
          concursoId,
          input.documentRef.trim(),
          input.administrativeAct.trim(),
          input.administrativeActDate,
        ],
      );
      if (!result.rows[0]) throw new NotFoundException('Concurso not found');
      return this.toSummary(result.rows[0]);
    });
  }

  async publish(
    concursoId: string,
    input: PublishEditalDto,
  ): Promise<EditalSummary> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const latest = await client.query<EditalRow>(
        `
        SELECT concurso_id::text, version, document_ref, administrative_act, administrative_act_date, published_at, public_url
        FROM recrutamento.edital
        WHERE concurso_id = $1::uuid
        ORDER BY version DESC
        LIMIT 1
        `,
        [concursoId],
      );
      if (!latest.rows[0]) {
        throw new UnprocessableEntityException(
          'Cannot publish concurso without an edital version',
        );
      }
      const result = await client.query<EditalRow>(
        `
        WITH updated_edital AS (
          UPDATE recrutamento.edital
          SET administrative_act = $2,
              administrative_act_date = $3::date,
              published_at = now(),
              public_url = $4
          WHERE concurso_id = $1::uuid
            AND version = $5
          RETURNING *
        ), updated_concurso AS (
          UPDATE recrutamento.concurso
          SET status = 'PUBLISHED'::recrutamento.concurso_status
          WHERE id = $1::uuid
          RETURNING id
        )
        SELECT concurso_id::text, version, document_ref, administrative_act, administrative_act_date, published_at, public_url
        FROM updated_edital
        `,
        [
          concursoId,
          input.administrativeAct.trim(),
          input.administrativeActDate,
          input.publicUrl.trim(),
          latest.rows[0].version,
        ],
      );
      return this.toSummary(result.rows[0]);
    });
  }

  async publicBySlug(slug: string): Promise<unknown> {
    this.ensureDatabase();
    const rows = await this.database.query<QueryResultRow>(
      'SELECT recrutamento.get_public_concurso($1) AS concurso',
      [slug],
    );
    if (!rows[0]?.concurso) throw new NotFoundException('Concurso not found');
    return rows[0].concurso;
  }

  private toSummary(row: EditalRow): EditalSummary {
    return {
      concursoId: row.concurso_id,
      version: row.version,
      documentRef: row.document_ref,
      administrativeAct: row.administrative_act,
      administrativeActDate:
        row.administrative_act_date instanceof Date
          ? row.administrative_act_date.toISOString().slice(0, 10)
          : String(row.administrative_act_date),
      publishedAt:
        row.published_at instanceof Date
          ? row.published_at.toISOString()
          : row.published_at
            ? String(row.published_at)
            : null,
      publicUrl: row.public_url,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for concurso edital',
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import type { CreateGabaritoDto } from './avaliacao.dto';
import { NotaService } from './nota.service';

interface GabaritoRow extends QueryResultRow {
  id: string;
  prova_id: string;
  version: number;
  status: string;
  published_at: Date | string;
  answers: Record<string, string>;
}

@Injectable()
export class GabaritoService {
  constructor(
    private readonly database: DatabaseService,
    private readonly notaService: NotaService,
  ) {}

  async publish(provaId: string, input: CreateGabaritoDto) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      if (input.status === 'FINAL') {
        await client.query(
          `
          UPDATE recrutamento.gabarito
          SET status = 'SUPERSEDED'::recrutamento.gabarito_status
          WHERE prova_id = $1::uuid
            AND status IN ('PRELIMINARY', 'FINAL')
          `,
          [provaId],
        );
      }

      const created = await client.query<GabaritoRow>(
        `
        INSERT INTO recrutamento.gabarito (tenant_id, prova_id, version, status, answers)
        SELECT
          p.tenant_id,
          p.id,
          COALESCE((SELECT max(version) + 1 FROM recrutamento.gabarito WHERE prova_id = p.id), 1),
          $2::recrutamento.gabarito_status,
          $3::jsonb
        FROM recrutamento.prova p
        WHERE p.id = $1::uuid
        RETURNING id::text, prova_id::text, version, status::text, published_at, answers
        `,
        [
          provaId,
          input.status,
          JSON.stringify(this.normalizeAnswers(input.answers)),
        ],
      );
      const row = created.rows[0];
      if (!row) throw new NotFoundException('Prova not found');
      const changedNotas = await this.notaService.recomputeWithClient(
        client,
        provaId,
        row.version,
      );
      AuditMutationContextStore.markMutationAudited();
      return { ...this.toSummary(row), changedNotas };
    });
  }

  async list(provaId: string) {
    this.ensureDatabase();
    const rows = await this.database.query<GabaritoRow>(
      `
      SELECT id::text, prova_id::text, version, status::text, published_at, answers
      FROM recrutamento.gabarito
      WHERE prova_id = $1::uuid
      ORDER BY version DESC
      `,
      [provaId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private normalizeAnswers(answers: Record<string, string>) {
    return Object.fromEntries(
      Object.entries(answers).map(([key, value]) => [
        String(Number(key)),
        String(value).trim(),
      ]),
    );
  }

  private toSummary(row: GabaritoRow) {
    return {
      id: row.id,
      provaId: row.prova_id,
      version: row.version,
      status: row.status,
      publishedAt:
        row.published_at instanceof Date
          ? row.published_at.toISOString()
          : String(row.published_at),
      answers: row.answers,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

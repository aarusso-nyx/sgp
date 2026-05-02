import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

export interface NotaRow extends QueryResultRow {
  inscricao_id: string;
  old_weighted_score: string | null;
  new_weighted_score: string;
}

@Injectable()
export class NotaService {
  constructor(private readonly database: DatabaseService) {}

  async recompute(provaId: string, version: number): Promise<NotaRow[]> {
    this.ensureDatabase();
    return this.database.query<NotaRow>(
      `
      SELECT
        inscricao_id::text,
        old_weighted_score::text,
        new_weighted_score::text
      FROM recrutamento.recompute_notas($1::uuid, $2::integer)
      `,
      [provaId, version],
    );
  }

  async recomputeWithClient(
    client: PoolClient,
    provaId: string,
    version: number,
  ): Promise<NotaRow[]> {
    const rows = await client.query<NotaRow>(
      `
      SELECT
        inscricao_id::text,
        old_weighted_score::text,
        new_weighted_score::text
      FROM recrutamento.recompute_notas($1::uuid, $2::integer)
      `,
      [provaId, version],
    );
    return rows.rows;
  }

  async listByInscricao(inscricaoId: string) {
    this.ensureDatabase();
    return this.database.query<QueryResultRow>(
      `
      SELECT
        n.inscricao_id::text AS "inscricaoId",
        n.prova_id::text AS "provaId",
        p.kind::text AS "kind",
        n.raw_score::text AS "rawScore",
        n.weighted_score::text AS "weightedScore",
        n.recomputed_at AS "recomputedAt"
      FROM recrutamento.nota n
      JOIN recrutamento.prova p ON p.tenant_id = n.tenant_id AND p.id = n.prova_id
      WHERE n.inscricao_id = $1::uuid
      ORDER BY p.applied_at, p.id
      `,
      [inscricaoId],
    );
  }

  async listPublicByToken(inscricaoId: string, token: string) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.bypass_rls',
        'true',
      ]);
      const rows = await client.query<QueryResultRow>(
        `
        SELECT
          n.inscricao_id::text AS "inscricaoId",
          n.prova_id::text AS "provaId",
          p.kind::text AS "kind",
          n.raw_score::text AS "rawScore",
          n.weighted_score::text AS "weightedScore",
          n.recomputed_at AS "recomputedAt",
          jsonb_agg(jsonb_build_object(
            'questionNumber', q.number,
            'answer', r.answer,
            'isCorrect', r.is_correct,
            'score', r.score::text
          ) ORDER BY q.number) AS "answerSheet"
        FROM recrutamento.inscricao i
        JOIN recrutamento.nota n ON n.tenant_id = i.tenant_id AND n.inscricao_id = i.id
        JOIN recrutamento.prova p ON p.tenant_id = n.tenant_id AND p.id = n.prova_id
        LEFT JOIN recrutamento.resposta_candidato r
          ON r.tenant_id = n.tenant_id AND r.inscricao_id = n.inscricao_id AND r.prova_id = n.prova_id
        LEFT JOIN recrutamento.questao q ON q.tenant_id = r.tenant_id AND q.id = r.questao_id
        WHERE i.id = $1::uuid
          AND i.access_token_hash = $2
        GROUP BY n.inscricao_id, n.prova_id, p.kind, n.raw_score, n.weighted_score, n.recomputed_at, p.applied_at, p.id
        ORDER BY p.applied_at, p.id
        `,
        [inscricaoId, this.hashToken(token)],
      );
      return rows.rows;
    });
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import type {
  CreateProvaDto,
  CreateQuestaoDto,
  RecordRespostasDto,
} from './avaliacao.dto';

export interface ProvaSummary {
  id: string;
  concursoId: string;
  kind: string;
  appliedAt: string;
  weight: string;
}

interface ProvaRow extends QueryResultRow {
  id: string;
  concurso_id: string;
  kind: string;
  applied_at: Date | string;
  weight: string;
}

export interface RespostaRow extends QueryResultRow {
  id: string;
  inscricao_id: string;
  prova_id: string;
  questao_id: string;
  answer: string;
}

@Injectable()
export class ProvaService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateProvaDto): Promise<ProvaSummary> {
    this.ensureDatabase();
    const rows = await this.database.query<ProvaRow>(
      `
      INSERT INTO recrutamento.prova (tenant_id, concurso_id, kind, applied_at, weight)
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::recrutamento.prova_kind,
        $3::timestamptz,
        $4::numeric(18,6)
      )
      RETURNING id::text, concurso_id::text, kind::text, applied_at, weight::text
      `,
      [input.concursoId, input.kind, input.appliedAt, input.weight],
    );
    AuditMutationContextStore.markMutationAudited();
    return this.toSummary(rows[0]);
  }

  async list(concursoId: string): Promise<ProvaSummary[]> {
    this.ensureDatabase();
    const rows = await this.database.query<ProvaRow>(
      `
      SELECT id::text, concurso_id::text, kind::text, applied_at, weight::text
      FROM recrutamento.prova
      WHERE concurso_id = $1::uuid
      ORDER BY applied_at, id
      `,
      [concursoId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  async addQuestao(provaId: string, input: CreateQuestaoDto) {
    this.ensureDatabase();
    const rows = await this.database.query<QueryResultRow>(
      `
      INSERT INTO recrutamento.questao (tenant_id, prova_id, number, statement, options)
      SELECT tenant_id, id, $2, $3, $4::jsonb
      FROM recrutamento.prova
      WHERE id = $1::uuid
      RETURNING id::text, prova_id::text, number, statement, options
      `,
      [
        provaId,
        input.number,
        input.statement.trim(),
        JSON.stringify(input.options ?? {}),
      ],
    );
    if (!rows[0]) throw new NotFoundException('Prova not found');
    AuditMutationContextStore.markMutationAudited();
    return rows[0];
  }

  async recordRespostas(provaId: string, input: RecordRespostasDto) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const rows = await client.query<RespostaRow>(
        `
        INSERT INTO recrutamento.resposta_candidato (
          tenant_id, inscricao_id, prova_id, questao_id, answer
        )
        SELECT
          p.tenant_id,
          payload.inscricao_id::uuid,
          p.id,
          payload.questao_id::uuid,
          payload.answer
        FROM recrutamento.prova p
        CROSS JOIN LATERAL jsonb_to_recordset($2::jsonb) AS payload(
          inscricao_id text,
          questao_id text,
          answer text
        )
        WHERE p.id = $1::uuid
        ON CONFLICT (tenant_id, inscricao_id, prova_id, questao_id) DO UPDATE
        SET answer = EXCLUDED.answer,
            is_correct = NULL,
            score = 0
        RETURNING id::text, inscricao_id::text, prova_id::text, questao_id::text, answer
        `,
        [
          provaId,
          JSON.stringify(
            input.respostas.map((resposta) => ({
              inscricao_id: resposta.inscricaoId,
              questao_id: resposta.questaoId,
              answer: resposta.answer.trim(),
            })),
          ),
        ],
      );
      if (rows.rows.length === 0)
        throw new NotFoundException('Prova not found');
      AuditMutationContextStore.markMutationAudited();
      return rows.rows;
    });
  }

  private toSummary(row: ProvaRow): ProvaSummary {
    return {
      id: row.id,
      concursoId: row.concurso_id,
      kind: row.kind,
      appliedAt:
        row.applied_at instanceof Date
          ? row.applied_at.toISOString()
          : String(row.applied_at),
      weight: row.weight,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

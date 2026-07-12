import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type { CreateRecursoDto, DecideRecursoDto } from './avaliacao.dto';

interface RecursoRow extends QueryResultRow {
  id: string;
  inscricao_id: string;
  prova_id: string;
  questao_id: string;
  reason: string;
  status: string;
  parecer: string | null;
  decided_at: Date | string | null;
}

@Injectable()
export class RecursoService {
  constructor(private readonly database: DatabaseService) {}

  async createPublic(
    inscricaoId: string,
    token: string,
    input: CreateRecursoDto,
  ) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.database.applyPublicLookupContext(client);
      const context = await client.query<{
        tenant_id: string;
        deadline: Date | string | null;
      }>(
        `
        SELECT i.tenant_id::text, e.resource_deadline_at AS deadline
        FROM recrutamento.inscricao i
        JOIN recrutamento.prova p ON p.tenant_id = i.tenant_id AND p.id = $3::uuid
        JOIN LATERAL (
          SELECT e.resource_deadline_at
          FROM recrutamento.edital e
          WHERE e.tenant_id = i.tenant_id
            AND e.concurso_id = i.concurso_id
            AND e.published_at IS NOT NULL
          ORDER BY e.version DESC
          LIMIT 1
        ) e ON true
        WHERE i.id = $1::uuid
          AND i.access_token_hash = $2
          AND i.status IN ('CONFIRMED', 'EXEMPT')
        `,
        [inscricaoId, this.hashToken(token), input.provaId],
      );
      const contest = context.rows[0];
      if (!contest) throw new NotFoundException('Inscricao not found');
      const deadline =
        contest.deadline instanceof Date
          ? contest.deadline
          : contest.deadline
            ? new Date(contest.deadline)
            : null;
      if (!deadline || deadline.getTime() < Date.now()) {
        throw new UnprocessableEntityException('Resource deadline is closed');
      }

      await this.database.applyTenantMutationContext(
        client,
        contest.tenant_id,
        ['recrutamento.write'],
      );

      const rows = await client.query<RecursoRow>(
        `
        INSERT INTO recrutamento.recurso (
          tenant_id, inscricao_id, prova_id, questao_id, reason
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
        RETURNING id::text, inscricao_id::text, prova_id::text, questao_id::text, reason, status::text, parecer, decided_at
        `,
        [
          contest.tenant_id,
          inscricaoId,
          input.provaId,
          input.questaoId,
          input.reason.trim(),
        ],
      );
      AuditMutationContextStore.markMutationAudited();
      return this.toSummary(rows.rows[0]!);
    });
  }

  async decide(id: string, input: DecideRecursoDto) {
    this.ensureDatabase();
    const rows = await this.database.query<RecursoRow>(
      `
      UPDATE recrutamento.recurso
      SET status = $2::recrutamento.recurso_status,
          parecer = $3,
          decided_at = now()
      WHERE id = $1::uuid
        AND status = 'OPEN'
      RETURNING id::text, inscricao_id::text, prova_id::text, questao_id::text, reason, status::text, parecer, decided_at
      `,
      [id, input.status, input.parecer.trim()],
    );
    if (!rows[0]) throw new NotFoundException('Open recurso not found');
    AuditMutationContextStore.markMutationAudited();
    return this.toSummary(rows[0]);
  }

  async listOpen(provaId: string) {
    this.ensureDatabase();
    const rows = await this.database.query<RecursoRow>(
      `
      SELECT id::text, inscricao_id::text, prova_id::text, questao_id::text, reason, status::text, parecer, decided_at
      FROM recrutamento.recurso
      WHERE prova_id = $1::uuid
      ORDER BY created_at, id
      `,
      [provaId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private toSummary(row: RecursoRow) {
    return {
      id: row.id,
      inscricaoId: row.inscricao_id,
      provaId: row.prova_id,
      questaoId: row.questao_id,
      reason: row.reason,
      status: row.status,
      parecer: row.parecer,
      decidedAt:
        row.decided_at instanceof Date
          ? row.decided_at.toISOString()
          : row.decided_at,
    };
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

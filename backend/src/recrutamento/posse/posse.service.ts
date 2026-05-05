import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';

interface PosseRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  nomeacao_id: string;
  posse_at: Date | string;
  exercicio_at: Date | string | null;
  exercicio_due_at: Date | string;
  lotacao_id: string;
  employee_id: string | null;
  status: string;
  cancellation_reason: string | null;
  s2200_event_count?: string;
}

interface EffectRow extends QueryResultRow {
  tenant_id: string;
  posse_id: string;
  nomeacao_id: string;
  employee_id: string;
}

@Injectable()
export class PosseService {
  constructor(
    private readonly database: DatabaseService,
    private readonly stynxEsocialClient: StynxEsocialClient,
  ) {}

  async agendar(
    nomeacaoId: string,
    posseAt: string,
    lotacaoId: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const nomeacao = await this.findNomeacao(client, nomeacaoId);
      if (!nomeacao) throw new NotFoundException('Nomeacao not found');
      if (!['CONVOCADO', 'POSSE_EM_ANDAMENTO'].includes(nomeacao.status)) {
        throw new ConflictException(
          'Nomeacao must be CONVOCADO or POSSE_EM_ANDAMENTO',
        );
      }

      const rows = await client.query<PosseRow>(
        `
        INSERT INTO recrutamento.posse (
          tenant_id,
          nomeacao_id,
          posse_at,
          exercicio_due_at,
          lotacao_id,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::timestamptz,
          recrutamento.add_business_days($3::date, 15),
          $4::uuid,
          'AGENDADA'::recrutamento.posse_status
        )
        ON CONFLICT (tenant_id, nomeacao_id) DO UPDATE
        SET posse_at = EXCLUDED.posse_at,
            exercicio_due_at = EXCLUDED.exercicio_due_at,
            lotacao_id = EXCLUDED.lotacao_id
        WHERE recrutamento.posse.employee_id IS NULL
          AND recrutamento.posse.status IN ('AGENDADA', 'PRORROGADA')
        RETURNING ${this.returningColumns()}
        `,
        [nomeacao.tenant_id, nomeacao.id, posseAt, lotacaoId],
      );
      if (!rows.rows[0]) {
        throw new ConflictException(
          'Posse cannot be rescheduled after exercise',
        );
      }
      await this.updateNomeacaoStatus(
        client,
        nomeacao.id,
        'POSSE_EM_ANDAMENTO',
      );
      return this.map(rows.rows[0]);
    });
  }

  async realizarPosse(posseId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      const posse = await this.findPosse(client, posseId);
      if (!posse) throw new NotFoundException('Posse not found');
      if (posse.status !== 'AGENDADA' && posse.status !== 'PRORROGADA') {
        throw new ConflictException('Posse must be AGENDADA or PRORROGADA');
      }
      const nomeacao = await this.findNomeacao(client, posse.nomeacao_id);
      if (!nomeacao) throw new NotFoundException('Nomeacao not found');
      if (!['CONVOCADO', 'POSSE_EM_ANDAMENTO'].includes(nomeacao.status)) {
        throw new ConflictException(
          'Nomeacao must be CONVOCADO or POSSE_EM_ANDAMENTO',
        );
      }

      const rows = await client.query<PosseRow>(
        `
        UPDATE recrutamento.posse
        SET status = 'POSSE_REALIZADA'::recrutamento.posse_status
        WHERE id = $1::uuid
          AND employee_id IS NULL
        RETURNING ${this.returningColumns()}
        `,
        [posseId],
      );
      await this.updateNomeacaoStatus(client, nomeacao.id, 'POSSE');
      return this.map(rows.rows[0]!);
    });
  }

  async iniciarExercicio(posseId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const effect = await this.database.transaction(async (client) => {
      const posse = await this.findPosse(client, posseId);
      if (!posse) throw new NotFoundException('Posse not found');
      if (posse.employee_id) {
        throw new ConflictException('Posse already created an employee');
      }
      const rows = await client.query<EffectRow>(
        'SELECT * FROM recrutamento.efetivar_posse($1::uuid)',
        [posseId],
      );
      return rows.rows[0];
    });

    if (!effect) {
      throw new ServiceUnavailableException(
        'Posse exercise did not return a row',
      );
    }

    const s2200 = await RequestContextStore.run(
      {
        tenantId: effect.tenant_id,
        permissions: [
          'esocial.event.read',
          'esocial.event.write',
          'rh.employee.read',
          'rh.dependent.read',
        ],
      },
      () =>
        this.stynxEsocialClient.enqueue({
          kind: 'trabalhador',
          eventClass: 'S-2200',
          sourceRef: {
            sourceEntityKind: 'hr.employee',
            sourceEntityId: effect.employee_id,
          },
          payload: {
            posseId: effect.posse_id,
            nomeacaoId: effect.nomeacao_id,
            employeeId: effect.employee_id,
          },
        }),
    );

    return {
      ...(await this.findById(posseId)),
      s2200,
    };
  }

  async prorrogarExercicio(posseId: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.database.query<PosseRow>(
      `
      UPDATE recrutamento.posse
      SET status = 'PRORROGADA'::recrutamento.posse_status,
          exercicio_due_at = recrutamento.add_business_days(exercicio_due_at, 15)
      WHERE id = $1::uuid
        AND employee_id IS NULL
        AND status IN ('AGENDADA', 'POSSE_REALIZADA', 'PRORROGADA')
      RETURNING ${this.returningColumns()}
      `,
      [posseId],
    );
    if (!rows[0])
      throw new ConflictException('Posse cannot be prorogued after exercise');
    return this.map(rows[0]);
  }

  async cancelar(
    posseId: string,
    reason: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const current = await this.findById(posseId);
    if (!current) throw new NotFoundException('Posse not found');
    if (current['employeeId']) {
      throw new ConflictException(
        'Cancellation after employee creation requires CALC-12 rescisao',
      );
    }
    const rows = await this.database.query<PosseRow>(
      `
      UPDATE recrutamento.posse
      SET status = 'CANCELADA'::recrutamento.posse_status,
          cancellation_reason = $2
      WHERE id = $1::uuid
        AND employee_id IS NULL
      RETURNING ${this.returningColumns()}
      `,
      [posseId, reason.trim()],
    );
    if (!rows[0]) throw new NotFoundException('Posse not found');
    return this.map(rows[0]);
  }

  async findById(posseId: string): Promise<Record<string, unknown> | null> {
    this.ensureDatabase();
    const rows = await this.database.query<PosseRow>(
      `
      SELECT ${this.returningColumns()},
        (
          SELECT count(*)::text
          FROM public.esocial_events spool
          WHERE spool.tenant_id = posse.tenant_id
            AND spool.event_class = 'S-2200'
            AND spool.source_ref->>'sourceEntityId' = posse.employee_id::text
        ) AS s2200_event_count
      FROM recrutamento.posse posse
      WHERE id = $1::uuid
      `,
      [posseId],
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  private async findPosse(
    client: PoolClient,
    posseId: string,
  ): Promise<PosseRow | null> {
    const rows = await client.query<PosseRow>(
      `SELECT ${this.returningColumns()} FROM recrutamento.posse posse WHERE id = $1::uuid`,
      [posseId],
    );
    return rows.rows[0] ?? null;
  }

  private async findNomeacao(
    client: PoolClient,
    nomeacaoId: string,
  ): Promise<{ id: string; tenant_id: string; status: string } | null> {
    const rows = await client.query<{
      id: string;
      tenant_id: string;
      status: string;
    }>(
      `
      SELECT id::text, tenant_id::text, status::text
      FROM recrutamento.nomeacao
      WHERE id = $1::uuid
      `,
      [nomeacaoId],
    );
    return rows.rows[0] ?? null;
  }

  private async updateNomeacaoStatus(
    client: PoolClient,
    nomeacaoId: string,
    status: 'POSSE_EM_ANDAMENTO' | 'POSSE',
  ): Promise<void> {
    await client.query(
      `
      UPDATE recrutamento.nomeacao
      SET status = $2::recrutamento.nomeacao_status
      WHERE id = $1::uuid
      `,
      [nomeacaoId, status],
    );
  }

  private returningColumns(): string {
    return `
      posse.id::text,
      posse.tenant_id::text,
      posse.nomeacao_id::text,
      posse.posse_at,
      posse.exercicio_at,
      posse.exercicio_due_at,
      posse.lotacao_id::text,
      posse.employee_id::text,
      posse.status::text,
      posse.cancellation_reason
    `;
  }

  private map(row: PosseRow): Record<string, unknown> {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      nomeacaoId: row.nomeacao_id,
      posseAt: new Date(row.posse_at).toISOString(),
      exercicioAt: row.exercicio_at
        ? new Date(row.exercicio_at).toISOString()
        : null,
      exercicioDueAt: new Date(row.exercicio_due_at).toISOString().slice(0, 10),
      lotacaoId: row.lotacao_id,
      employeeId: row.employee_id,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      s2200EventCount: Number(row.s2200_event_count ?? 0),
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for posse',
      );
    }
  }
}

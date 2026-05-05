import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';
import { EmitCatDto } from './cat.dto';

export type CatKind = 'INICIAL' | 'REABERTURA' | 'OBITO';

interface CatEmissionRow extends QueryResultRow {
  id: string;
  work_accident_id: string;
  cat_kind: CatKind;
  emitted_at: Date | string;
  deadline_at: Date | string;
  esocial_spool_message_id: string | null;
  doctor_crm: string;
  doctor_name: string;
  internment: boolean;
  leave_until: Date | string | null;
}

interface AccidentRow extends QueryResultRow {
  id: string;
  accident_at: Date | string;
  severity: string;
  death_at: Date | string | null;
  status: string;
}

export interface CatEmissionSummary {
  id: string;
  workAccidentId: string;
  catKind: CatKind;
  emittedAt: string;
  deadlineAt: string;
  esocialEventId: string | null;
  doctorCrm: string;
  doctorName: string;
  internment: boolean;
  leaveUntil: string | null;
}

@Injectable()
export class CatEmissionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stynxEsocialClient: StynxEsocialClient,
  ) {}

  async emit(
    workAccidentId: string,
    input: EmitCatDto,
  ): Promise<CatEmissionSummary> {
    this.ensureDatabase();
    const emittedAt = input.emittedAt ? new Date(input.emittedAt) : new Date();
    if (Number.isNaN(emittedAt.getTime())) {
      throw new BadRequestException('Invalid emittedAt');
    }

    const rows = await this.databaseService.transaction(async (client) => {
      const accidentResult = await client.query<AccidentRow>(
        `
        SELECT id::text, accident_at, severity::text, death_at, status::text
        FROM saude.work_accident
        WHERE id = $1::uuid
        FOR UPDATE
        `,
        [workAccidentId],
      );
      const accident = accidentResult.rows[0];
      if (!accident) throw new NotFoundException('Work accident not found');

      const nextStatus = this.statusForCatKind(input.catKind);
      if (input.catKind === 'OBITO' && !accident.death_at) {
        throw new BadRequestException('Death CAT requires deathAt on accident');
      }

      await client.query(
        `
        UPDATE saude.work_accident
        SET status = $2::saude.work_accident_status
        WHERE id = $1::uuid
        `,
        [workAccidentId, nextStatus],
      );

      const insertResult = await client.query<CatEmissionRow>(
        `
        INSERT INTO saude.cat_emission (
          work_accident_id,
          cat_kind,
          emitted_at,
          deadline_at,
          doctor_crm,
          doctor_name,
          internment,
          leave_until
        )
        VALUES (
          $1::uuid,
          $2::saude.cat_kind,
          $3::timestamptz,
          $4::timestamptz,
          $5,
          $6,
          $7,
          NULLIF($8, '')::date
        )
        RETURNING
          id::text,
          work_accident_id::text,
          cat_kind::text,
          emitted_at,
          deadline_at,
          esocial_spool_message_id::text,
          doctor_crm,
          doctor_name,
          internment,
          leave_until
        `,
        [
          workAccidentId,
          input.catKind,
          emittedAt.toISOString(),
          this.deadlineFor(accident, input.catKind, emittedAt).toISOString(),
          input.doctorCrm.trim(),
          input.doctorName.trim(),
          input.internment ?? false,
          input.leaveUntil ?? '',
        ],
      );
      return insertResult.rows;
    });

    const emission = rows[0]!;
    const queued = await this.stynxEsocialClient.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2210',
      sourceRef: {
        sourceEntityKind: 'saude.cat_emission',
        sourceEntityId: emission.id,
        catEmissionId: emission.id,
        workAccidentId: emission.work_accident_id,
        catKind: emission.cat_kind,
      },
      payload: {
        catEmissionId: emission.id,
        workAccidentId: emission.work_accident_id,
        catKind: emission.cat_kind,
        emittedAt: new Date(emission.emitted_at).toISOString(),
        deadlineAt: new Date(emission.deadline_at).toISOString(),
      },
    });

    const updated = await this.databaseService.query<CatEmissionRow>(
      `
      UPDATE saude.cat_emission
      SET esocial_spool_message_id = $2::uuid
      WHERE id = $1::uuid
      RETURNING
        id::text,
        work_accident_id::text,
        cat_kind::text,
        emitted_at,
        deadline_at,
        esocial_spool_message_id::text,
        doctor_crm,
        doctor_name,
        internment,
        leave_until
      `,
      [emission.id, queued.messageId],
    );

    return this.toSummary(updated[0] ?? emission);
  }

  deadlineFor(
    accident: { accident_at: Date | string; death_at?: Date | string | null },
    catKind: CatKind,
    emittedAt = new Date(),
  ): Date {
    if (catKind === 'OBITO' || accident.death_at) return emittedAt;
    return nextBusinessDay(new Date(accident.accident_at));
  }

  private statusForCatKind(catKind: CatKind): string {
    if (catKind === 'INICIAL') return 'COMUNICADO';
    if (catKind === 'REABERTURA') return 'REABERTO';
    return 'COMUNICACAO_OBITO';
  }

  private toSummary(row: CatEmissionRow): CatEmissionSummary {
    return {
      id: row.id,
      workAccidentId: row.work_accident_id,
      catKind: row.cat_kind,
      emittedAt: new Date(row.emitted_at).toISOString(),
      deadlineAt: new Date(row.deadline_at).toISOString(),
      esocialEventId: row.esocial_spool_message_id,
      doctorCrm: row.doctor_crm,
      doctorName: row.doctor_name,
      internment: row.internment,
      leaveUntil: row.leave_until
        ? new Date(row.leave_until).toISOString().slice(0, 10)
        : null,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for CAT operations',
      );
    }
  }
}

export function nextBusinessDay(value: Date): Date {
  const deadline = new Date(value);
  deadline.setDate(deadline.getDate() + 1);
  while (deadline.getDay() === 0 || deadline.getDay() === 6) {
    deadline.setDate(deadline.getDate() + 1);
  }
  return deadline;
}

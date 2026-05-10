import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { MeusDadosService } from '../meus-dados/meus-dados.service';

interface VacationApprovalTransitionRow extends QueryResultRow {
  id: string;
  employee_id: string;
  starts_on: Date | string;
  ends_on: Date | string;
  days: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class FeriasService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly meusDadosService: MeusDadosService,
  ) {}

  async transitionVacation(id: string, approve: boolean) {
    const status = approve ? 'aprovado' : 'cancelado';
    const rows =
      await this.databaseService.query<VacationApprovalTransitionRow>(
        `
      UPDATE hr.vacation_record
      SET status = $2, updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        starts_on,
        ends_on,
        days,
        status::text,
        created_at,
        updated_at
      `,
        [id, status],
      );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Vacation approval item not found');
    }
    return {
      kind: 'vacation',
      id: row.id,
      employeeId: row.employee_id,
      startsOn: this.meusDadosService.toDate(row.starts_on),
      endsOn: this.meusDadosService.toDate(row.ends_on),
      days: row.days,
      status: row.status,
      requestedAt: this.meusDadosService.toIso(row.created_at),
      updatedAt: this.meusDadosService.toIso(row.updated_at),
    };
  }
}

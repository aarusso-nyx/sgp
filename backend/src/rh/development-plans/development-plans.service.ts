import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateDevelopmentPlanDto,
  CreateDevelopmentPlanGoalDto,
  DEVELOPMENT_PLAN_GOAL_STATUSES,
  DEVELOPMENT_PLAN_STATUSES,
  UpdateDevelopmentPlanDto,
  UpdateDevelopmentPlanGoalDto,
} from './development-plans.dto';

interface DevelopmentPlanRow extends QueryResultRow {
  id: string;
  employee_id: string;
  manager_employee_id: string | null;
  period_start: Date | string;
  period_end: Date | string;
  status: string;
  objective: string;
  manager_review: string;
  reviewed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DevelopmentPlanGoalRow extends QueryResultRow {
  id: string;
  development_plan_id: string;
  description: string;
  status: string;
  due_at: Date | string | null;
  completed_at: Date | string | null;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DevelopmentPlanSummary {
  id: string;
  employeeId: string;
  managerEmployeeId: string | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  objective: string;
  managerReview: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentPlanGoalSummary {
  id: string;
  developmentPlanId: string;
  description: string;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const PLAN_COLUMNS = `
  id::text,
  employee_id::text,
  manager_employee_id::text,
  period_start,
  period_end,
  status::text,
  objective,
  manager_review,
  reviewed_at,
  created_at,
  updated_at
`;

const GOAL_COLUMNS = `
  id::text,
  development_plan_id::text,
  description,
  status::text,
  due_at,
  completed_at,
  notes,
  created_at,
  updated_at
`;

@Injectable()
export class DevelopmentPlansService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listForEmployee(employeeId: string): Promise<DevelopmentPlanSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanRow>(
      `
      SELECT ${PLAN_COLUMNS}
      FROM hr.development_plan
      WHERE employee_id = $1::uuid
      ORDER BY period_end DESC, created_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toPlanSummary(row));
  }

  async getById(id: string): Promise<DevelopmentPlanSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanRow>(
      `SELECT ${PLAN_COLUMNS} FROM hr.development_plan WHERE id = $1::uuid`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Development plan not found');
    }
    return this.toPlanSummary(rows[0]!);
  }

  async listGoals(planId: string): Promise<DevelopmentPlanGoalSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanGoalRow>(
      `
      SELECT ${GOAL_COLUMNS}
      FROM hr.development_plan_goal
      WHERE development_plan_id = $1::uuid
      ORDER BY created_at ASC
      `,
      [planId],
    );
    return rows.map((row) => this.toGoalSummary(row));
  }

  async create(
    input: CreateDevelopmentPlanDto,
  ): Promise<DevelopmentPlanSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanRow>(
      `
      INSERT INTO hr.development_plan (
        employee_id, manager_employee_id, period_start, period_end, objective
      )
      VALUES (
        $1::uuid, NULLIF($2, '')::uuid, $3::date, $4::date, COALESCE($5, '')
      )
      RETURNING ${PLAN_COLUMNS}
      `,
      [
        input.employeeId,
        input.managerEmployeeId ?? '',
        input.periodStart,
        input.periodEnd,
        input.objective ?? '',
      ],
    );
    return this.toPlanSummary(rows[0]!);
  }

  async update(
    id: string,
    input: UpdateDevelopmentPlanDto,
  ): Promise<DevelopmentPlanSummary> {
    this.ensureDatabase();
    if (
      input.status !== undefined &&
      !DEVELOPMENT_PLAN_STATUSES.includes(input.status)
    ) {
      throw new BadRequestException(
        `Invalid development plan status: ${input.status}`,
      );
    }
    const rows = await this.databaseService.query<DevelopmentPlanRow>(
      `
      UPDATE hr.development_plan
      SET
        status = COALESCE($2::hr.development_plan_status, status),
        objective = COALESCE($3, objective),
        manager_review = COALESCE($4, manager_review),
        manager_employee_id = CASE
          WHEN $5::text = '__clear__' THEN NULL
          WHEN $5::text IS NULL THEN manager_employee_id
          ELSE $5::uuid
        END,
        reviewed_at = CASE
          WHEN $4 IS NOT NULL THEN now()
          ELSE reviewed_at
        END,
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING ${PLAN_COLUMNS}
      `,
      [
        id,
        input.status ?? null,
        input.objective ?? null,
        input.managerReview ?? null,
        input.managerEmployeeId ?? null,
      ],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Development plan not found');
    }
    return this.toPlanSummary(rows[0]!);
  }

  async addGoal(
    planId: string,
    input: CreateDevelopmentPlanGoalDto,
  ): Promise<DevelopmentPlanGoalSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanGoalRow>(
      `
      INSERT INTO hr.development_plan_goal (
        development_plan_id, description, due_at, notes
      )
      VALUES ($1::uuid, $2, NULLIF($3, '')::date, COALESCE($4, ''))
      RETURNING ${GOAL_COLUMNS}
      `,
      [planId, input.description.trim(), input.dueAt ?? '', input.notes ?? ''],
    );
    return this.toGoalSummary(rows[0]!);
  }

  async updateGoal(
    goalId: string,
    input: UpdateDevelopmentPlanGoalDto,
  ): Promise<DevelopmentPlanGoalSummary> {
    this.ensureDatabase();
    if (
      input.status !== undefined &&
      !DEVELOPMENT_PLAN_GOAL_STATUSES.includes(input.status)
    ) {
      throw new BadRequestException(
        `Invalid development plan goal status: ${input.status}`,
      );
    }
    const rows = await this.databaseService.query<DevelopmentPlanGoalRow>(
      `
      UPDATE hr.development_plan_goal
      SET
        description = COALESCE($2, description),
        status = COALESCE($3::hr.development_plan_goal_status, status),
        due_at = COALESCE(NULLIF($4, '')::date, due_at),
        completed_at = CASE
          WHEN $3 = 'DONE' AND $5 IS NULL THEN COALESCE(completed_at, CURRENT_DATE)
          WHEN $5 IS NOT NULL THEN $5::date
          ELSE completed_at
        END,
        notes = COALESCE($6, notes),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING ${GOAL_COLUMNS}
      `,
      [
        goalId,
        input.description?.trim() ?? null,
        input.status ?? null,
        input.dueAt ?? '',
        input.completedAt ?? null,
        input.notes ?? null,
      ],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Development plan goal not found');
    }
    return this.toGoalSummary(rows[0]!);
  }

  async removeGoal(goalId: string): Promise<void> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DevelopmentPlanGoalRow>(
      `
      DELETE FROM hr.development_plan_goal
      WHERE id = $1::uuid
      RETURNING ${GOAL_COLUMNS}
      `,
      [goalId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Development plan goal not found');
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toPlanSummary(row: DevelopmentPlanRow): DevelopmentPlanSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      managerEmployeeId: row.manager_employee_id,
      periodStart: this.dateValue(row.period_start),
      periodEnd: this.dateValue(row.period_end),
      status: row.status,
      objective: row.objective,
      managerReview: row.manager_review,
      reviewedAt: this.nullableTimestamp(row.reviewed_at),
      createdAt: this.timestampValue(row.created_at),
      updatedAt: this.timestampValue(row.updated_at),
    };
  }

  private toGoalSummary(
    row: DevelopmentPlanGoalRow,
  ): DevelopmentPlanGoalSummary {
    return {
      id: row.id,
      developmentPlanId: row.development_plan_id,
      description: row.description,
      status: row.status,
      dueAt: this.nullableDateValue(row.due_at),
      completedAt: this.nullableDateValue(row.completed_at),
      notes: row.notes,
      createdAt: this.timestampValue(row.created_at),
      updatedAt: this.timestampValue(row.updated_at),
    };
  }

  private nullableDateValue(value: Date | string | null): string | null {
    return value === null ? null : this.dateValue(value);
  }

  private nullableTimestamp(value: Date | string | null): string | null {
    return value === null ? null : this.timestampValue(value);
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private timestampValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}

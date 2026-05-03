import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateLaiRequestDto } from './lai-requests.dto';
import { LaiRequestStatus } from './lai-request-state-machine';
import { LaiSlaService, LaiSlaStatus } from './lai-sla.service';

interface CreateLaiRequestRow extends QueryResultRow {
  protocol: string;
  access_key: string;
  status: LaiRequestStatus;
  submitted_at: string;
  due_at: string;
}

interface LaiRequestStatusRow extends QueryResultRow {
  protocol: string;
  status: LaiRequestStatus;
  submitted_at: string;
  due_at: string;
  extended_due_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
}

interface TransitionRow extends LaiRequestStatusRow {
  id: string;
}

export interface CreatedLaiRequest {
  protocol: string;
  accessKey: string;
  status: LaiRequestStatus;
  submittedAt: string;
  dueAt: string;
  slaStatus: LaiSlaStatus;
}

export interface LaiRequestStatusResponse {
  protocol: string;
  status: LaiRequestStatus;
  submittedAt: string;
  dueAt: string;
  extendedDueAt?: string;
  effectiveDueAt: string;
  answeredAt?: string;
  closedAt?: string;
  remainingDays: number;
  slaStatus: LaiSlaStatus;
}

@Injectable()
export class LaiRequestsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly slaService: LaiSlaService,
  ) {}

  async create(
    tenantId: string,
    input: CreateLaiRequestDto,
  ): Promise<CreatedLaiRequest> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CreateLaiRequestRow>(
      `SELECT
         protocol,
         access_key,
         status,
         submitted_at::text,
         due_at::text
       FROM public_data.create_lai_request(
         $1::uuid,
         $2::text,
         $3::text,
         $4::text,
         $5::text
       )`,
      [
        tenantId,
        input.requesterName,
        input.requesterEmail,
        input.requestText,
        input.requesterDocument ?? null,
      ],
    );
    const row = rows[0]!;
    return {
      protocol: row.protocol,
      accessKey: row.access_key,
      status: row.status,
      submittedAt: row.submitted_at,
      dueAt: row.due_at,
      slaStatus: this.slaService.summarize({
        submittedAt: new Date(row.submitted_at),
        dueAt: new Date(row.due_at),
      }).status,
    };
  }

  async status(
    tenantId: string,
    protocol: string,
    accessKey: string,
  ): Promise<LaiRequestStatusResponse> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LaiRequestStatusRow>(
      `SELECT
         protocol,
         status,
         submitted_at::text,
         due_at::text,
         extended_due_at::text,
         answered_at::text,
         closed_at::text
       FROM public_data.get_lai_request_status(
         $1::uuid,
         $2::text,
         $3::text
       )`,
      [tenantId, protocol, accessKey],
    );
    if (!rows[0]) {
      throw new NotFoundException('LAI request was not found');
    }
    return this.toStatusResponse(rows[0]);
  }

  async transition(
    tenantId: string,
    protocol: string,
    status: LaiRequestStatus,
    reason?: string,
  ): Promise<LaiRequestStatusResponse> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TransitionRow>(
      `SELECT
         id::text,
         protocol,
         status,
         submitted_at::text,
         due_at::text,
         extended_due_at::text,
         answered_at::text,
         closed_at::text
       FROM public_data.transition_lai_request(
         $1::uuid,
         $2::text,
         $3::text,
         $4::text
       )`,
      [tenantId, protocol, status, reason ?? null],
    );
    if (!rows[0]) {
      throw new NotFoundException('LAI request was not found');
    }
    return this.toStatusResponse(rows[0]);
  }

  private toStatusResponse(row: LaiRequestStatusRow): LaiRequestStatusResponse {
    const sla = this.slaService.summarize({
      submittedAt: new Date(row.submitted_at),
      dueAt: new Date(row.due_at),
      extendedDueAt: row.extended_due_at ? new Date(row.extended_due_at) : null,
      finishedAt:
        row.closed_at || row.answered_at
          ? new Date(row.closed_at ?? row.answered_at ?? '')
          : null,
    });

    return {
      protocol: row.protocol,
      status: row.status,
      submittedAt: row.submitted_at,
      dueAt: row.due_at,
      extendedDueAt: row.extended_due_at ?? undefined,
      effectiveDueAt: sla.effectiveDueAt.toISOString(),
      answeredAt: row.answered_at ?? undefined,
      closedAt: row.closed_at ?? undefined,
      remainingDays: sla.remainingDays,
      slaStatus: sla.status,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for LAI request endpoints',
      );
    }
  }
}

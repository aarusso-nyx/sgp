import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  TceQueueJobDto,
  mapQueueJob,
  queueJobColumns,
  queueJobFromClause,
} from './queue.types';

interface SubmissionTenantRow extends QueryResultRow {
  tenant_id: string;
  adapter_id: string;
}

@Injectable()
export class TceQueueEnqueueService {
  constructor(private readonly databaseService: DatabaseService) {}

  async enqueueSubmission(
    submissionId: string,
    endpointUrl: string | null = 'stub://audesp-sp',
  ): Promise<TceQueueJobDto> {
    const submissions = await this.databaseService.query<SubmissionTenantRow>(
      `
      SELECT tenant_id::text, adapter_id
      FROM tce.submission
      WHERE id = $1::uuid
      `,
      [submissionId],
    );
    const submission = submissions[0];
    if (!submission) {
      throw new NotFoundException(`TCE submission not found: ${submissionId}`);
    }

    const rows = await this.databaseService.query<{ id: string }>(
      `
      INSERT INTO tce.submission_queue (
        tenant_id,
        submission_id,
        adapter_id,
        endpoint_url,
        status,
        next_attempt_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        'PENDING'::tce.submission_queue_status,
        now()
      )
      RETURNING id::text
      `,
      [submission.tenant_id, submissionId, submission.adapter_id, endpointUrl],
    );
    const queueRows = await this.databaseService.query(
      `
      SELECT ${queueJobColumns()}
      FROM ${queueJobFromClause()}
      WHERE queue.id = $1::uuid
      `,
      [rows[0].id],
    );
    return mapQueueJob(queueRows[0]);
  }
}

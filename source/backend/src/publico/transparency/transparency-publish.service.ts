import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

interface PublishRow extends QueryResultRow {
  competence: string;
  snapshot_hash: string;
  row_count: number;
}

@Injectable()
export class TransparencyPublishService {
  constructor(private readonly databaseService: DatabaseService) {}

  async publish(
    tenantId: string,
    payrollRunId: string,
    actorId?: string | null,
  ) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PublishRow>(
      `SELECT
         competence::text,
         snapshot_hash,
         row_count
       FROM public_data.publish_transparency_snapshot($1::uuid, $2::uuid, $3::uuid)`,
      [tenantId, payrollRunId, actorId ?? null],
    );
    if (!rows[0]) {
      throw new NotFoundException('Approved payroll run not found');
    }
    return {
      competence: rows[0].competence,
      snapshotHash: rows[0].snapshot_hash,
      rowCount: rows[0].row_count,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for transparency publish',
      );
    }
  }
}

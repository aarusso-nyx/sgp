import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import type { UpdateFaceThresholdDto } from './face.dto';

interface ThresholdRow extends QueryResultRow {
  threshold: string;
  liveness_required: boolean;
}

export interface FaceThresholdConfig {
  threshold: string;
  livenessRequired: boolean;
}

@Injectable()
export class FaceThresholdAdminService {
  constructor(private readonly database: DatabaseService) {}

  async getCurrent(client?: PoolClient): Promise<FaceThresholdConfig> {
    const runner = async (queryClient: Pick<PoolClient, 'query'>) => {
      const rows = await queryClient.query<ThresholdRow>(
        `
        INSERT INTO ponto.face_threshold_config (tenant_id)
        VALUES (public.sgp_current_tenant_uuid())
        ON CONFLICT (tenant_id) DO UPDATE SET updated_at = ponto.face_threshold_config.updated_at
        RETURNING threshold::text, liveness_required
        `,
      );
      return this.toConfig(rows.rows[0]!);
    };
    if (client) return runner(client);
    this.ensureDatabase();
    return this.database.transaction((transactionClient) =>
      runner(transactionClient),
    );
  }

  async update(input: UpdateFaceThresholdDto): Promise<FaceThresholdConfig> {
    this.ensureDatabase();
    const rows = await this.database.query<ThresholdRow>(
      `
      INSERT INTO ponto.face_threshold_config (tenant_id, threshold, liveness_required)
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::numeric(18,6),
        $2::boolean
      )
      ON CONFLICT (tenant_id) DO UPDATE
      SET threshold = EXCLUDED.threshold,
          liveness_required = EXCLUDED.liveness_required,
          updated_at = now()
      RETURNING threshold::text, liveness_required
      `,
      [input.threshold.toFixed(6), input.livenessRequired],
    );
    AuditMutationContextStore.markMutationAudited();
    return this.toConfig(rows[0]!);
  }

  private toConfig(row: ThresholdRow): FaceThresholdConfig {
    return {
      threshold: row.threshold,
      livenessRequired: row.liveness_required,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

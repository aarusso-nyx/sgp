import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BiometricRetentionScheduler {
  private readonly logger = new Logger(BiometricRetentionScheduler.name);

  constructor(private readonly database: DatabaseService) {}

  async expireDueTemplates(now = new Date()): Promise<{ expired: number }> {
    this.ensureDatabase();
    const rows = await this.database.query<{ id: string }>(
      `
      UPDATE recrutamento.candidate_biometric
      SET status = 'EXPIRED'::recrutamento.biometric_status
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND status = 'ACTIVE'::recrutamento.biometric_status
        AND retention_until <= $1::timestamptz
      RETURNING id::text
      `,
      [now.toISOString()],
    );
    this.logger.log(`Expired ${rows.length} candidate biometric templates`);
    return { expired: rows.length };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

import { Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';

export type TceLifecycleEvent =
  | 'REGISTERED'
  | 'ENABLED'
  | 'DISABLED'
  | 'VALIDATION_OK'
  | 'VALIDATION_FAIL'
  | 'SUBMISSION_OK'
  | 'SUBMISSION_FAIL'
  | 'HEALTH_OK'
  | 'HEALTH_FAIL';

@Injectable()
export class LifecycleEmitterService {
  constructor(private readonly databaseService: DatabaseService) {}

  async emit(
    adapterId: string,
    event: TceLifecycleEvent,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await this.withRegistryBypass(() =>
      this.databaseService.query(
        `
        INSERT INTO tce.adapter_lifecycle_event (adapter_id, event, payload)
        VALUES ($1, $2::tce.adapter_lifecycle_event_kind, $3::jsonb)
        `,
        [adapterId, event, JSON.stringify(payload)],
      ),
    );
  }

  private withRegistryBypass<T>(callback: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'tce-adapter-registry' },
      callback,
    );
  }
}

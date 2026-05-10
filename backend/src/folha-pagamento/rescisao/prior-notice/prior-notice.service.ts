import {
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { SgpEsocialEmittersService } from '../../../integrations/stynx-esocial';

export type PriorNoticeKind = 'WORKED' | 'INDEMNIFIED' | 'NONE';
export type PriorNoticeReductionMode =
  | 'TWO_HOURS_DAY'
  | 'SEVEN_FINAL_DAYS'
  | 'NONE';

interface PriorNoticeRow extends QueryResultRow {
  notice_days: string;
  projected_end_date: string;
  base_amount: string;
}

export interface PriorNoticeResult {
  employmentLinkId: string;
  kind: PriorNoticeKind;
  reductionMode: PriorNoticeReductionMode;
  noticeDays: number;
  projectedEndDate: string;
  baseAmount: string;
}

@Injectable()
export class PriorNoticeService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {}

  async resolve(
    employmentLinkId: string,
    terminationDate: string,
    kind: PriorNoticeKind,
    reductionMode: PriorNoticeReductionMode = 'NONE',
  ): Promise<PriorNoticeResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for prior notice calculation',
      );
    }

    const rows = await this.databaseService.query<PriorNoticeRow>(
      `
      SELECT
        notice_days::text,
        projected_end_date::text,
        base_amount::text
      FROM payment.compute_prior_notice(
        $1::uuid,
        $2::date,
        $3::payment.prior_notice_kind,
        $4::payment.prior_notice_reduction_mode
      )
      `,
      [employmentLinkId, terminationDate, kind, reductionMode],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Employment link not found');
    }

    const result = {
      employmentLinkId,
      kind,
      reductionMode,
      noticeDays: Number(row.notice_days),
      projectedEndDate: row.projected_end_date,
      baseAmount: row.base_amount,
    };
    await this.esocialEmitters?.emitForCurrentTenant('s2250PriorNotice', {
      sourceId: employmentLinkId,
      operation: 'create',
      data: {
        employmentLinkId,
        terminationDate,
        kind,
        reductionMode,
        noticeDays: result.noticeDays,
        projectedEndDate: result.projectedEndDate,
      },
    });
    return result;
  }
}

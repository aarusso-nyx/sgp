import { Injectable } from '@nestjs/common';

import { TransparencyQueryDto } from './transparency-query.dto';
import { TransparencyQueryService } from './transparency-query.service';

const CSV_COLUMNS = [
  'tenant_id',
  'competence',
  'employee_public_id',
  'full_name',
  'registration_number',
  'position_name',
  'organizational_unit',
  'gross_total',
  'deductions_total',
  'net_total',
  'snapshot_taken_at',
] as const;

@Injectable()
export class TransparencyCsvService {
  constructor(private readonly queryService: TransparencyQueryService) {}

  async export(tenantId: string, query: TransparencyQueryDto): Promise<string> {
    const result = await this.queryService.list(tenantId, {
      ...query,
      page: 1,
      pageSize: 200,
    });
    const lines = [
      CSV_COLUMNS.join(','),
      ...result.items.map((item) =>
        [
          item.tenantId,
          item.competence,
          item.employeePublicId,
          item.fullName,
          item.registrationNumber,
          item.positionName,
          item.organizationalUnit,
          item.grossTotal,
          item.deductionsTotal,
          item.netTotal,
          item.snapshotTakenAt,
        ]
          .map((value) => this.escape(value))
          .join(','),
      ),
    ];
    return `\uFEFF${lines.join('\n')}\n`;
  }

  private escape(value: string): string {
    if (!/[",\n]/.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
  }
}

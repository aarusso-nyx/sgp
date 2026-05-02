import { BadRequestException, Injectable } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { TimeRecordHashService } from '../time-record/time-record-hash.service';
import { ParsedRepLine } from './rep-ingestion.types';

interface EmployeeRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class ApplyToTimeRecordService {
  constructor(private readonly timeRecordHashService: TimeRecordHashService) {}

  async apply(
    client: PoolClient,
    source: 'REP_P' | 'REP_A' | 'REP_C',
    line: ParsedRepLine,
    repDeviceId: string,
  ): Promise<string> {
    const employeeId = await this.resolveEmployeeId(client, line);
    const summary = await this.timeRecordHashService.createWithClient(client, {
      employeeId,
      recordedAt: line.recordedAt,
      source,
      nsr: line.nsr,
      rawPayload: {
        ...line.payload,
        repDeviceId,
        lineNo: line.lineNo,
      },
    });
    return summary.timeRecordId;
  }

  private async resolveEmployeeId(
    client: PoolClient,
    line: ParsedRepLine,
  ): Promise<string> {
    if (line.employeeId) return line.employeeId;
    const result = await client.query<EmployeeRow>(
      `
      SELECT id::text
      FROM hr.employee
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND (
          NULLIF($1, '') IS NOT NULL AND registration = $1
          OR NULLIF($2, '') IS NOT NULL AND cpf = $2
        )
      ORDER BY id
      LIMIT 1
      `,
      [line.employeeRegistration ?? '', line.employeeCpf ?? ''],
    );
    const employee = result.rows[0];
    if (!employee) {
      throw new BadRequestException(
        `Employee not found for REP line ${line.lineNo}`,
      );
    }
    return employee.id;
  }
}

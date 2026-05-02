import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { YearlyIncomeRenderService } from './yearly-income-render.service';

interface TenantRow extends QueryResultRow {
  tenant_id: string;
}

interface EmployeeRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class YearlyIncomeBatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly renderService: YearlyIncomeRenderService,
  ) {}

  async generate(yearBase: number) {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
    const tenantRows = await this.databaseService.query<TenantRow>(
      `
      SELECT DISTINCT tenant_id::text
      FROM payroll.payroll_financial_record
      WHERE competence_year = $1::integer
      ORDER BY tenant_id::text
      LIMIT 1
      `,
      [yearBase],
    );
    const tenantId = tenantRows[0]?.tenant_id;
    if (!tenantId)
      throw new NotFoundException('No payroll records for year-base');

    const employees = await this.databaseService.query<EmployeeRow>(
      `
      SELECT DISTINCT employee_id::text AS id
      FROM payroll.payroll_financial_record
      WHERE tenant_id = $1::uuid
        AND competence_year = $2::integer
      ORDER BY employee_id::text
      `,
      [tenantId, yearBase],
    );

    let fileCount = 0;
    let errorCount = 0;
    const files: Array<{
      employeeId: string;
      fileId: string;
      fileHash: string;
    }> = [];
    for (const employee of employees) {
      try {
        const rendered = await this.renderService.renderAndPersist(
          yearBase,
          employee.id,
        );
        fileCount += 1;
        files.push({
          employeeId: rendered.employeeId,
          fileId: rendered.fileId,
          fileHash: rendered.fileHash,
        });
      } catch {
        errorCount += 1;
      }
    }

    return {
      batchId: `${tenantId}:${yearBase}`,
      status: errorCount === 0 ? 'DONE' : 'FAILED',
      fileCount,
      errorCount,
      files,
    };
  }
}

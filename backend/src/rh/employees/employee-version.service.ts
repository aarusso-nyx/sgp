import {
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { VersionRow } from './employees.types';

@Injectable()
export class EmployeeVersionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertEmployeeVersion(
    employeeId: string,
    expectedVersion: number,
    client?: PoolClient,
  ): Promise<void> {
    const sql = `
      SELECT version
      FROM hr.employee
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      FOR UPDATE
      `;
    const rows = client
      ? (await client.query<VersionRow>(sql, [employeeId])).rows
      : await this.databaseService.query<VersionRow>(sql, [employeeId]);
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    this.assertExpectedVersion(row.version, expectedVersion);
  }

  assertExpectedVersion(
    currentVersion: number | string,
    expectedVersion: number,
  ): void {
    if (Number(currentVersion) !== expectedVersion) {
      throw new PreconditionFailedException('If-Match version does not match');
    }
  }
}

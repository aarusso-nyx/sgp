import { Injectable, PreconditionFailedException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

export type TenantFiscalCertificate = Readonly<{
  pkcs12: Buffer;
  password?: string | undefined;
  alias?: string | undefined;
}>;

type SystemParameterRow = QueryResultRow & {
  value: unknown;
};

@Injectable()
export class TenantFiscalCertificateService {
  constructor(private readonly databaseService: DatabaseService) {}

  async activeCertificate(): Promise<TenantFiscalCertificate> {
    const [row] = await this.databaseService.query<SystemParameterRow>(
      `
      SELECT value
      FROM public.system_parameter
      WHERE key = 'fiscal.icp_certificate'
      ORDER BY updated_at DESC
      LIMIT 1
      `,
    );
    if (!row) {
      throw new PreconditionFailedException(
        'No active fiscal ICP-Brasil certificate is available',
      );
    }
    return this.parse(row.value);
  }

  private parse(value: unknown): TenantFiscalCertificate {
    if (!value || typeof value !== 'object') {
      throw new PreconditionFailedException(
        'Fiscal ICP-Brasil certificate parameter is invalid',
      );
    }
    const record = value as Record<string, unknown>;
    const pkcs12Base64 = record['pkcs12Base64'] ?? record['pkcs12'];
    if (typeof pkcs12Base64 !== 'string' || !pkcs12Base64.trim()) {
      throw new PreconditionFailedException(
        'Fiscal ICP-Brasil certificate must include pkcs12Base64',
      );
    }
    const password =
      typeof record['password'] === 'string' ? record['password'] : undefined;
    const alias =
      typeof record['alias'] === 'string' ? record['alias'] : undefined;
    return {
      pkcs12: Buffer.from(pkcs12Base64, 'base64'),
      password,
      alias,
    };
  }
}

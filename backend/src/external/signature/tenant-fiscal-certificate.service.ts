import { Injectable, PreconditionFailedException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { IcpSignerService } from './icp-signer.service';

export type TenantFiscalCertificate = Readonly<{
  pkcs12: Buffer;
  password?: string | undefined;
  alias?: string | undefined;
}>;

export type TenantFiscalCertificateStatus = Readonly<{
  alias: string | null;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  expired: boolean;
  nearExpiry: boolean;
}>;

type SystemParameterRow = QueryResultRow & {
  value: unknown;
};

const certificateExpiryWarningDays = 30;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

@Injectable()
export class TenantFiscalCertificateService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly icpSigner: IcpSignerService,
  ) {}

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

  async activeCertificateStatus(
    now = new Date(),
  ): Promise<TenantFiscalCertificateStatus> {
    const certificate = await this.activeCertificate();
    const material = this.icpSigner.readPkcs12(
      certificate.pkcs12,
      certificate.password,
    );
    const daysUntilExpiry = Math.floor(
      (material.validTo.getTime() - now.getTime()) / millisecondsPerDay,
    );
    const expired = material.validTo.getTime() <= now.getTime();

    return {
      alias: certificate.alias ?? null,
      subject: material.subject,
      validFrom: material.validFrom.toISOString(),
      validTo: material.validTo.toISOString(),
      daysUntilExpiry,
      expired,
      nearExpiry: !expired && daysUntilExpiry <= certificateExpiryWarningDays,
    };
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

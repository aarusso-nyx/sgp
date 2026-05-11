import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class SifgeValidationService {
  ensureDatabase(databaseService: DatabaseService): void {
    if (!databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for FGTS remittance operations',
      );
    }
  }

  competenceDate(value: string): string {
    if (!value) throw new BadRequestException('Competence is required');
    const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (!match) {
      throw new BadRequestException('Competence must be YYYY-MM or YYYY-MM-DD');
    }
    return `${match[1]}-${match[2]}-01`;
  }

  ensureTenantContext(tenantId: string): void {
    if (!this.isUuid(tenantId)) {
      throw new BadRequestException('Tenant context is required');
    }
  }

  ensureTerminationContext(
    employmentLinkId: string,
    terminationId: string,
  ): void {
    if (!this.isUuid(employmentLinkId) || !this.isUuid(terminationId)) {
      throw new BadRequestException(
        'Employment link and termination payroll run are required',
      );
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}

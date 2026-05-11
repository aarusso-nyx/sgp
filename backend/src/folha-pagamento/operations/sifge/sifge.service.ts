import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { CaixaSifgeAdapter, SIFGE_ADAPTERS } from './caixa-adapter.contract';
import { SifgeGenerationService } from './sifge-generation.service';
import {
  FgtsRemittanceSummary,
  SifgePersistenceService,
} from './sifge-persistence.service';
import { SifgeValidationService } from './sifge-validation.service';

export type { FgtsRemittanceSummary } from './sifge-persistence.service';

@Injectable()
export class SifgeService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(SIFGE_ADAPTERS)
    private readonly adapters: CaixaSifgeAdapter[],
    private readonly persistence: SifgePersistenceService,
    private readonly generation: SifgeGenerationService,
    private readonly validation: SifgeValidationService,
  ) {}

  async generateMonthlyGRF(
    tenantId: string,
    competence: string,
  ): Promise<FgtsRemittanceSummary> {
    this.validation.ensureDatabase(this.databaseService);
    const competenceDate = this.validation.competenceDate(competence);
    this.validation.ensureTenantContext(tenantId);

    return this.databaseService.transaction(async (client) => {
      const adapter = await this.persistence.resolveAdapter(
        client,
        this.adapters,
      );
      const source = await this.persistence.getMonthlySource(
        client,
        tenantId,
        competenceDate,
      );
      if (source.length === 0) {
        throw new NotFoundException(
          'No monthly FGTS movements found for competence',
        );
      }
      const details = await this.persistence.getMonthlyDetails(
        client,
        tenantId,
        competenceDate,
      );
      const totals = this.generation.totalsFromGrf(source);
      const remittance = await this.persistence.insertRemittance(client, {
        tenantId,
        competence: competenceDate,
        kind: 'GRF_MONTHLY',
        totalBase: totals.totalBase,
        totalAmount: totals.totalAmount,
        adapter,
      });

      await this.persistence.insertMonthlyGrfRows(
        client,
        tenantId,
        remittance.id,
        source,
      );

      return this.persistence.finalizeRemittance(
        client,
        adapter,
        remittance,
        this.generation.monthlyPayload({
          tenantId,
          competence: competenceDate,
          remittance,
          totals,
          details,
        }),
      );
    });
  }

  async generateTerminationGRRF(
    employmentLinkId: string,
    terminationId: string,
  ): Promise<FgtsRemittanceSummary> {
    this.validation.ensureDatabase(this.databaseService);
    this.validation.ensureTerminationContext(employmentLinkId, terminationId);

    return this.databaseService.transaction(async (client) => {
      const adapter = await this.persistence.resolveAdapter(
        client,
        this.adapters,
      );
      const source = await this.persistence.getTerminationSource(
        client,
        employmentLinkId,
        terminationId,
      );
      if (!source) {
        throw new NotFoundException('No termination FGTS fine found for GRRF');
      }
      const remittance = await this.persistence.insertRemittance(client, {
        tenantId: source.tenant_id,
        competence: this.generation.dateText(source.termination_date),
        kind: 'GRRF_TERMINATION',
        totalBase: source.base_balance,
        totalAmount: source.fine_amount,
        adapter,
      });

      await this.persistence.insertTerminationGrrfRow(
        client,
        remittance.id,
        source,
      );

      return this.persistence.finalizeRemittance(
        client,
        adapter,
        remittance,
        this.generation.terminationPayload({ source, remittance }),
      );
    });
  }

  async find(id: string): Promise<FgtsRemittanceSummary> {
    this.validation.ensureDatabase(this.databaseService);
    return this.persistence.findById(
      this.databaseService.query.bind(this.databaseService),
      id,
    );
  }
}

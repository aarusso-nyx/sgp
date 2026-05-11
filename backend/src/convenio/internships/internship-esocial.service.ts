import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';
import { InternshipRow, S2300BuildResult } from './internships.types';
import {
  currentTenantId,
  ensureDatabase,
  runWithOperationalPermissions,
} from './internships.utils';

@Injectable()
export class InternshipEsocialService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stynxEsocialClient: StynxEsocialClient,
  ) {}

  async buildS2300(id: string): Promise<S2300BuildResult> {
    ensureDatabase(this.databaseService);
    const current = await this.loadInternship(id);
    if (!current?.tsv_contract_id) {
      throw new NotFoundException('Internship S-2300 source not found');
    }
    const tsvContractId = current.tsv_contract_id;
    const queued = await runWithOperationalPermissions(currentTenantId(), () =>
      this.stynxEsocialClient.enqueue({
        kind: 'trabalhador',
        eventClass: 'S-2300',
        sourceRef: {
          sourceEntityKind: 'hr.tsv_contract',
          sourceEntityId: tsvContractId,
        },
        payload: { tsvContractId, internshipId: id },
      }),
    );
    return {
      eventKind: 'S-2300',
      tsvContractId,
      messageId: queued.messageId,
      status: queued.status,
    };
  }

  private async loadInternship(id: string): Promise<InternshipRow | null> {
    const rows = await this.databaseService.query<InternshipRow>(
      `
      SELECT
        id::text,
        program_id::text,
        agreement_id::text,
        employee_id::text,
        tsv_contract_id::text,
        intern_name,
        intern_cpf,
        supervisor_name,
        starts_on,
        ends_on,
        stipend_amount::text,
        status::text AS status,
        term_number,
        term_signed_on,
        activity_plan_uri,
        activity_plan_description,
        weekly_hours::text
      FROM hr.internship_record
      WHERE id = $1::uuid
      `,
      [id],
    );
    return rows[0] ?? null;
  }
}

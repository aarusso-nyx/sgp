import { Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  findLgpdLegalBasisRule,
  LgpdLegalBasisRule,
} from './legal-basis.registry';

interface LegalBasisRuleRow extends QueryResultRow {
  flow_key: string;
  flow_name: string;
  data_category: 'PERSONAL' | 'SENSITIVE' | 'MIXED';
  legal_basis_code: string;
  legal_basis_article: string;
  sensitive_basis_code: string | null;
  sensitive_basis_article: string | null;
  purpose: string;
  data_subjects: string[];
  data_categories: string[];
  source_tables: string[];
  read_surfaces: string[];
  retention_rule: string;
  sharing_scope: string;
  requires_consent: boolean;
  requires_dpia: boolean;
  decision_record_anchor: string;
}

@Injectable()
export class LgpdLegalBasisService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertPiiReadAllowed(flowKey: string): Promise<LgpdLegalBasisRule> {
    const staticRule = findLgpdLegalBasisRule(flowKey);
    if (!staticRule) {
      throw new Error(`Unknown LGPD data flow: ${flowKey}`);
    }

    if (!this.databaseService.configured) {
      return staticRule;
    }

    const rows = await this.databaseService.query<LegalBasisRuleRow>(
      `
      SELECT
        flow_key,
        flow_name,
        data_category,
        legal_basis_code,
        legal_basis_article,
        sensitive_basis_code,
        sensitive_basis_article,
        purpose,
        data_subjects,
        data_categories,
        source_tables,
        read_surfaces,
        retention_rule,
        sharing_scope,
        requires_consent,
        requires_dpia,
        decision_record_anchor
      FROM lgpd.legal_basis_rule
      WHERE flow_key = $1
        AND status = 'ACTIVE'
        AND effective_from <= CURRENT_DATE
        AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      `,
      [flowKey],
    );
    const row = rows[0];
    if (!row) {
      throw new Error(
        `LGPD legal basis is not active for data flow: ${flowKey}`,
      );
    }
    return this.mapRow(row);
  }

  private mapRow(row: LegalBasisRuleRow): LgpdLegalBasisRule {
    return {
      flowKey: row.flow_key,
      flowName: row.flow_name,
      dataCategory: row.data_category,
      legalBasisCode: row.legal_basis_code,
      legalBasisArticle: row.legal_basis_article,
      sensitiveBasisCode: row.sensitive_basis_code,
      sensitiveBasisArticle: row.sensitive_basis_article,
      purpose: row.purpose,
      dataSubjects: row.data_subjects,
      dataCategories: row.data_categories,
      sourceTables: row.source_tables,
      readSurfaces: row.read_surfaces,
      retentionRule: row.retention_rule,
      sharingScope: row.sharing_scope,
      requiresConsent: row.requires_consent,
      requiresDpia: row.requires_dpia,
      decisionRecordAnchor: row.decision_record_anchor,
    };
  }
}

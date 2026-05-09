import { Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';

export const LGPD_DPO_PARAMETER_KEY = 'lgpd.encarregado';

export interface LgpdDpoContact {
  email: string;
  phone: string;
  channelUrl: string;
  officeHours: string;
  postalAddress: string;
}

export interface LgpdDpoResponse {
  name: string;
  contact: LgpdDpoContact;
  updatedAt: string | null;
}

export interface PublicInternationalTransferResponse {
  flowKey: string;
  processorName: string;
  destinationCountry: string;
  destinationCountryName: string | null;
  mechanism: string;
  mechanismReference: string;
  adequacyDecisionRef: string | null;
  startsAt: string | null;
  reviewDueAt: string | null;
}

interface DpoParameterRow extends QueryResultRow {
  value: unknown;
  updated_at: Date | string;
}

interface PublicInternationalTransferRow extends QueryResultRow {
  flow_key: string;
  processor_name: string;
  destination_country: string;
  destination_country_name: string | null;
  mechanism: string;
  mechanism_reference: string;
  adequacy_decision_ref: string | null;
  starts_at: Date | string | null;
  review_due_at: Date | string | null;
}

const DEFAULT_DPO_CONTACT: LgpdDpoResponse = {
  name: 'Encarregado pelo Tratamento de Dados Pessoais',
  contact: {
    email: 'dpo@example.invalid',
    phone: '',
    channelUrl: '/lgpd/encarregado',
    officeHours: 'Dias uteis, 9h as 17h',
    postalAddress: '',
  },
  updatedAt: null,
};

@Injectable()
export class LgpdDpoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getPublicContact(tenantId?: string): Promise<LgpdDpoResponse> {
    if (!this.databaseService.configured) {
      return DEFAULT_DPO_CONTACT;
    }

    const rows = await RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'public-lgpd-dpo' },
      () => this.loadParameter(tenantId),
    );
    const row = rows[0];
    if (!row) return DEFAULT_DPO_CONTACT;

    return this.toResponse(row);
  }

  async listPublicInternationalTransfers(
    tenantId?: string,
  ): Promise<{ items: PublicInternationalTransferResponse[] }> {
    if (!this.databaseService.configured) {
      return { items: [] };
    }

    const rows = await RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'public-lgpd-dpo' },
      () => this.loadInternationalTransfers(tenantId),
    );
    return { items: rows.map((row) => this.toTransferResponse(row)) };
  }

  private loadParameter(tenantId?: string): Promise<DpoParameterRow[]> {
    if (tenantId) {
      return this.databaseService.query<DpoParameterRow>(
        `
        SELECT parameter.value, parameter.updated_at
        FROM public.system_parameter parameter
        WHERE parameter.key = $1
          AND parameter.tenant_id = $2::uuid
        LIMIT 1
        `,
        [LGPD_DPO_PARAMETER_KEY, tenantId],
      );
    }

    return this.databaseService.query<DpoParameterRow>(
      `
      SELECT parameter.value, parameter.updated_at
      FROM public.system_parameter parameter
      JOIN public.tenant tenant ON tenant.id = parameter.tenant_id
      WHERE parameter.key = $1
        AND tenant.status = 'ACTIVE'::public."RecordStatus"
      ORDER BY parameter.updated_at DESC, tenant.created_at ASC
      LIMIT 1
      `,
      [LGPD_DPO_PARAMETER_KEY],
    );
  }

  private loadInternationalTransfers(
    tenantId?: string,
  ): Promise<PublicInternationalTransferRow[]> {
    const whereTenant = tenantId
      ? 'AND transfer.tenant_id = $1::uuid'
      : 'AND tenant.status = \'ACTIVE\'::public."RecordStatus"';
    const values = tenantId ? [tenantId] : [];
    return this.databaseService.query<PublicInternationalTransferRow>(
      `
      SELECT
        transfer.flow_key,
        transfer.processor_name,
        transfer.destination_country,
        country.country_name AS destination_country_name,
        transfer.mechanism,
        transfer.mechanism_reference,
        country.adequacy_decision_ref,
        transfer.starts_at,
        transfer.review_due_at
      FROM lgpd.international_transfer transfer
      JOIN public.tenant tenant ON tenant.id = transfer.tenant_id
      LEFT JOIN lgpd.international_transfer_country_adequacy country
        ON country.country_code = transfer.destination_country
      WHERE transfer.status = 'ACTIVE'
        ${whereTenant}
      ORDER BY transfer.flow_key ASC, transfer.processor_name ASC
      `,
      values,
    );
  }

  private toResponse(row: DpoParameterRow): LgpdDpoResponse {
    const value = this.objectValue(row.value);
    return {
      name: this.stringValue(value.name, DEFAULT_DPO_CONTACT.name),
      contact: {
        email: this.stringValue(value.email, DEFAULT_DPO_CONTACT.contact.email),
        phone: this.stringValue(value.phone, DEFAULT_DPO_CONTACT.contact.phone),
        channelUrl: this.stringValue(
          value.channelUrl ?? value.channel_url,
          DEFAULT_DPO_CONTACT.contact.channelUrl,
        ),
        officeHours: this.stringValue(
          value.officeHours ?? value.office_hours,
          DEFAULT_DPO_CONTACT.contact.officeHours,
        ),
        postalAddress: this.stringValue(
          value.postalAddress ?? value.postal_address,
          DEFAULT_DPO_CONTACT.contact.postalAddress,
        ),
      },
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toTransferResponse(
    row: PublicInternationalTransferRow,
  ): PublicInternationalTransferResponse {
    return {
      flowKey: row.flow_key,
      processorName: row.processor_name,
      destinationCountry: row.destination_country,
      destinationCountryName: row.destination_country_name,
      mechanism: row.mechanism,
      mechanismReference: row.mechanism_reference,
      adequacyDecisionRef: row.adequacy_decision_ref,
      startsAt: this.dateValue(row.starts_at),
      reviewDueAt: this.dateValue(row.review_due_at),
    };
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private dateValue(value: Date | string | null): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
}

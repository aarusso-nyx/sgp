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

interface DpoParameterRow extends QueryResultRow {
  value: unknown;
  updated_at: Date | string;
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
}

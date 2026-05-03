import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import {
  LGPD_DPO_PARAMETER_KEY,
  LgpdDpoContact,
} from '../publico/lgpd-dpo.service';
import { DatabaseService } from '../database/database.service';
import {
  CreateLgpdDpoDesignationDto,
  LgpdDpoDesignationStatus,
  UpdateLgpdDpoDesignationDto,
} from './dpo.dto';

interface DpoParameterRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  key: string;
  value: unknown;
  updated_at: Date | string;
}

export interface LgpdDpoDesignationDto {
  key: typeof LGPD_DPO_PARAMETER_KEY;
  tenantId: string | null;
  name: string;
  contact: LgpdDpoContact;
  lifecycle: {
    status: LgpdDpoDesignationStatus;
    designationAct: string | null;
    designatedAt: string | null;
    notes: string | null;
  };
  updatedAt: string | null;
}

const DEFAULT_DPO_VALUE = {
  name: 'Encarregado pelo Tratamento de Dados Pessoais',
  email: 'dpo@example.invalid',
  phone: '',
  channelUrl: '/lgpd/encarregado',
  officeHours: 'Dias uteis, 9h as 17h',
  postalAddress: '',
  status: 'UNDER_REVIEW' as const,
  designationAct: null,
  designatedAt: null,
  notes: null,
};

@Injectable()
export class LgpdDpoAdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDesignation(): Promise<LgpdDpoDesignationDto> {
    this.ensureDatabase();
    const row = await this.loadParameter();
    return row ? this.mapRow(row) : this.defaultResponse();
  }

  async createDesignation(
    payload: CreateLgpdDpoDesignationDto,
  ): Promise<LgpdDpoDesignationDto> {
    this.ensureDatabase();
    const value = this.normalizePayload({
      ...DEFAULT_DPO_VALUE,
      ...payload,
      status: payload.status ?? 'ACTIVE',
    });
    return this.persist(value);
  }

  async updateDesignation(
    payload: UpdateLgpdDpoDesignationDto,
  ): Promise<LgpdDpoDesignationDto> {
    this.ensureDatabase();
    const current = await this.loadParameter();
    const currentValue = current
      ? this.objectValue(current.value)
      : DEFAULT_DPO_VALUE;
    const value = this.normalizePayload({
      ...currentValue,
      ...payload,
    });
    return this.persist(value);
  }

  private async loadParameter(): Promise<DpoParameterRow | null> {
    const rows = await this.databaseService.query<DpoParameterRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        key,
        value,
        updated_at
      FROM public.system_parameter
      WHERE key = $1
      LIMIT 1
      `,
      [LGPD_DPO_PARAMETER_KEY],
    );
    return rows[0] ?? null;
  }

  private async persist(
    value: Record<string, unknown>,
  ): Promise<LgpdDpoDesignationDto> {
    const rows = await this.databaseService.query<DpoParameterRow>(
      `
      INSERT INTO public.system_parameter (
        tenant_id,
        key,
        value,
        description,
        module_key
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2::jsonb,
        $3,
        'lgpd'
      )
      ON CONFLICT (tenant_id, key) DO UPDATE
      SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        module_key = EXCLUDED.module_key,
        updated_at = now()
      RETURNING
        id::text,
        tenant_id::text,
        key,
        value,
        updated_at
      `,
      [
        LGPD_DPO_PARAMETER_KEY,
        JSON.stringify(value),
        'LGPD DPO designation lifecycle and public contact.',
      ],
    );
    const row = rows[0];
    if (!row) {
      throw new ServiceUnavailableException(
        'LGPD DPO designation was not persisted',
      );
    }
    return this.mapRow(row);
  }

  private normalizePayload(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      name: this.stringValue(value.name, DEFAULT_DPO_VALUE.name),
      email: this.stringValue(value.email, DEFAULT_DPO_VALUE.email),
      phone: this.stringValue(value.phone, DEFAULT_DPO_VALUE.phone),
      channelUrl: this.stringValue(
        value.channelUrl ?? value.channel_url,
        DEFAULT_DPO_VALUE.channelUrl,
      ),
      officeHours: this.stringValue(
        value.officeHours ?? value.office_hours,
        DEFAULT_DPO_VALUE.officeHours,
      ),
      postalAddress: this.stringValue(
        value.postalAddress ?? value.postal_address,
        DEFAULT_DPO_VALUE.postalAddress,
      ),
      status: this.statusValue(value.status),
      designationAct: this.nullableStringValue(
        value.designationAct ?? value.designation_act,
      ),
      designatedAt: this.nullableStringValue(
        value.designatedAt ?? value.designated_at,
      ),
      notes: this.nullableStringValue(value.notes),
    };
  }

  private mapRow(row: DpoParameterRow): LgpdDpoDesignationDto {
    const value = this.normalizePayload(this.objectValue(row.value));
    return {
      key: LGPD_DPO_PARAMETER_KEY,
      tenantId: row.tenant_id,
      name: value.name as string,
      contact: {
        email: value.email as string,
        phone: value.phone as string,
        channelUrl: value.channelUrl as string,
        officeHours: value.officeHours as string,
        postalAddress: value.postalAddress as string,
      },
      lifecycle: {
        status: value.status as LgpdDpoDesignationStatus,
        designationAct: value.designationAct as string | null,
        designatedAt: value.designatedAt as string | null,
        notes: value.notes as string | null,
      },
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private defaultResponse(): LgpdDpoDesignationDto {
    return {
      key: LGPD_DPO_PARAMETER_KEY,
      tenantId: null,
      name: DEFAULT_DPO_VALUE.name,
      contact: {
        email: DEFAULT_DPO_VALUE.email,
        phone: DEFAULT_DPO_VALUE.phone,
        channelUrl: DEFAULT_DPO_VALUE.channelUrl,
        officeHours: DEFAULT_DPO_VALUE.officeHours,
        postalAddress: DEFAULT_DPO_VALUE.postalAddress,
      },
      lifecycle: {
        status: DEFAULT_DPO_VALUE.status,
        designationAct: null,
        designatedAt: null,
        notes: null,
      },
      updatedAt: null,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for LGPD DPO designation operations',
      );
    }
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private nullableStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private statusValue(value: unknown): LgpdDpoDesignationStatus {
    return value === 'ACTIVE' || value === 'REPLACED' ? value : 'UNDER_REVIEW';
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}

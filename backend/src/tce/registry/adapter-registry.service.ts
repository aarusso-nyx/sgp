import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  HealthStatus,
  TceAdapter,
  TceOrganKind,
} from '../contracts/tce-adapter.interface';
import { LifecycleEmitterService } from '../lifecycle/lifecycle-emitter.service';
import { domainError } from '../../common/errors/domain-error';

export type TceAdapterStatus =
  | 'REGISTERED'
  | 'ENABLED'
  | 'DISABLED'
  | 'DEPRECATED';

export interface TceLifecycleEventDto {
  id: string;
  adapterId: string;
  event: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface TceAdapterRegistryDto {
  id: string;
  adapterId: string;
  stateCode: string;
  municipalCode: string | null;
  organKind: TceOrganKind;
  version: string;
  status: TceAdapterStatus;
  capabilities: Record<string, unknown>;
  registeredAt: string;
  lastHealthCheckAt: string | null;
  lastHealthStatus: string | null;
  lifecycleEvents: TceLifecycleEventDto[];
}

interface RegistryRow extends QueryResultRow {
  id: string;
  adapter_id: string;
  state_code: string;
  municipal_code: string | null;
  organ_kind: TceOrganKind;
  version: string;
  status: TceAdapterStatus;
  capabilities: Record<string, unknown> | string;
  registered_at: Date | string;
  last_health_check_at: Date | string | null;
  last_health_status: string | null;
}

interface EventRow extends QueryResultRow {
  id: string;
  adapter_id: string;
  event: string;
  payload: Record<string, unknown> | string;
  occurred_at: Date | string;
}

@Injectable()
export class AdapterRegistryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly lifecycle: LifecycleEmitterService,
  ) {}

  async register(adapter: TceAdapter): Promise<TceAdapterRegistryDto> {
    this.assertAdapter(adapter);
    const health = await adapter.health();
    const capabilities = {
      layouts: adapter.supported_layouts(),
      lifecycle: [
        'validation',
        'serialization',
        'submission',
        'response',
        'health',
      ],
    };
    const rows = await this.withRegistryBypass(() =>
      this.databaseService.query<RegistryRow>(
        `
        INSERT INTO tce.adapter_registry (
          adapter_id,
          state_code,
          organ_kind,
          version,
          capabilities,
          last_health_check_at,
          last_health_status
        )
        VALUES (
          $1,
          $2,
          $3::tce.organ_kind,
          $4,
          $5::jsonb,
          $6::timestamptz,
          $7
        )
        ON CONFLICT (adapter_id) DO UPDATE
        SET state_code = EXCLUDED.state_code,
            organ_kind = EXCLUDED.organ_kind,
            version = EXCLUDED.version,
            capabilities = EXCLUDED.capabilities,
            last_health_check_at = EXCLUDED.last_health_check_at,
            last_health_status = EXCLUDED.last_health_status
        RETURNING
          id::text,
          adapter_id,
          state_code::text,
          municipal_code,
          organ_kind::text,
          version,
          status::text,
          capabilities,
          registered_at,
          last_health_check_at,
          last_health_status
        `,
        [
          adapter.id(),
          adapter.state_code(),
          adapter.organ_kind(),
          adapter.supported_layouts()[0]?.version ?? '0.0.1',
          JSON.stringify(capabilities),
          health.checkedAt,
          health.status,
        ],
      ),
    );

    const registered = rows[0];
    await this.lifecycle.emit(adapter.id(), 'REGISTERED', {
      stateCode: adapter.state_code(),
      organKind: adapter.organ_kind(),
      version: adapter.supported_layouts()[0]?.version ?? '0.0.1',
    });
    await this.lifecycle.emit(
      adapter.id(),
      healthEvent(health),
      health.details,
    );
    if (!registered) {
      return {
        id: adapter.id(),
        adapterId: adapter.id(),
        stateCode: adapter.state_code(),
        municipalCode: null,
        organKind: adapter.organ_kind(),
        version: adapter.supported_layouts()[0]?.version ?? '0.0.1',
        status: 'REGISTERED',
        capabilities,
        registeredAt: new Date().toISOString(),
        lastHealthCheckAt: health.checkedAt,
        lastHealthStatus: health.status,
        lifecycleEvents: [],
      };
    }
    return this.find(registered.adapter_id);
  }

  async list(): Promise<TceAdapterRegistryDto[]> {
    const rows = await this.databaseService.query<RegistryRow>(
      registrySelectSql('ORDER BY state_code, organ_kind, adapter_id'),
    );
    return Promise.all(rows.map((row) => this.withEvents(row)));
  }

  async find(adapterId: string): Promise<TceAdapterRegistryDto> {
    const rows = await this.databaseService.query<RegistryRow>(
      registrySelectSql('WHERE adapter_id = $1'),
      [adapterId],
    );
    if (!rows[0]) {
      throw new NotFoundException(`TCE adapter not found: ${adapterId}`);
    }
    return this.withEvents(rows[0]);
  }

  async enable(adapterId: string): Promise<TceAdapterRegistryDto> {
    return this.transition(adapterId, 'ENABLED');
  }

  async disable(adapterId: string): Promise<TceAdapterRegistryDto> {
    return this.transition(adapterId, 'DISABLED');
  }

  async events(adapterId: string): Promise<TceLifecycleEventDto[]> {
    const rows = await this.databaseService.query<EventRow>(
      `
      SELECT id::text, adapter_id, event::text, payload, occurred_at
      FROM tce.adapter_lifecycle_event
      WHERE adapter_id = $1
      ORDER BY occurred_at DESC, id DESC
      LIMIT 50
      `,
      [adapterId],
    );
    return rows.map(toEventDto);
  }

  private async transition(
    adapterId: string,
    status: Extract<TceAdapterStatus, 'ENABLED' | 'DISABLED'>,
  ): Promise<TceAdapterRegistryDto> {
    const rows = await this.withRegistryBypass(() =>
      this.databaseService.query<RegistryRow>(
        `
        UPDATE tce.adapter_registry
        SET status = $2::tce.adapter_status
        WHERE adapter_id = $1
        RETURNING
          id::text,
          adapter_id,
          state_code::text,
          municipal_code,
          organ_kind::text,
          version,
          status::text,
          capabilities,
          registered_at,
          last_health_check_at,
          last_health_status
        `,
        [adapterId, status],
      ),
    );
    if (!rows[0]) {
      throw new NotFoundException(`TCE adapter not found: ${adapterId}`);
    }
    await this.lifecycle.emit(adapterId, status, { status });
    return this.find(adapterId);
  }

  private async withEvents(row: RegistryRow): Promise<TceAdapterRegistryDto> {
    return {
      ...toRegistryDto(row),
      lifecycleEvents: await this.events(row.adapter_id),
    };
  }

  private assertAdapter(adapter: TceAdapter): void {
    const requiredMethods = [
      'id',
      'state_code',
      'organ_kind',
      'supported_layouts',
      'validate',
      'serialize',
      'submit',
      'parseResponse',
      'health',
    ] as const;
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          `TCE adapter is missing method ${method}`,
        );
      }
    }
    if (!adapter.supported_layouts().length) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `TCE adapter ${adapter.id()} must declare at least one layout`,
      );
    }
  }

  private withRegistryBypass<T>(callback: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'tce-adapter-registry' },
      callback,
    );
  }
}

function registrySelectSql(tail: string): string {
  return `
    SELECT
      id::text,
      adapter_id,
      state_code::text,
      municipal_code,
      organ_kind::text,
      version,
      status::text,
      capabilities,
      registered_at,
      last_health_check_at,
      last_health_status
    FROM tce.adapter_registry
    ${tail}
  `;
}

function toRegistryDto(
  row: RegistryRow,
): Omit<TceAdapterRegistryDto, 'lifecycleEvents'> {
  return {
    id: row.id,
    adapterId: row.adapter_id,
    stateCode: String(row.state_code ?? '').trim(),
    municipalCode: row.municipal_code,
    organKind: row.organ_kind,
    version: row.version,
    status: row.status,
    capabilities: parseJsonObject(row.capabilities),
    registeredAt: iso(row.registered_at),
    lastHealthCheckAt: row.last_health_check_at
      ? iso(row.last_health_check_at)
      : null,
    lastHealthStatus: row.last_health_status,
  };
}

function toEventDto(row: EventRow): TceLifecycleEventDto {
  return {
    id: row.id,
    adapterId: row.adapter_id,
    event: row.event,
    payload: parseJsonObject(row.payload),
    occurredAt: iso(row.occurred_at),
  };
}

function parseJsonObject(
  value: Record<string, unknown> | string,
): Record<string, unknown> {
  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }
  return value ?? {};
}

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function healthEvent(health: HealthStatus): 'HEALTH_OK' | 'HEALTH_FAIL' {
  return health.status === 'OK' ? 'HEALTH_OK' : 'HEALTH_FAIL';
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

export type TceCircuitState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

export interface TceCircuitStateDto {
  adapterId: string;
  endpointUrl: string;
  state: TceCircuitState;
  failureCount: number;
  openedAt: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
}

interface CircuitRow extends QueryResultRow {
  adapter_id: string;
  endpoint_url: string;
  state: TceCircuitState;
  failure_count: number;
  opened_at: Date | string | null;
  last_failure_at: Date | string | null;
  last_success_at: Date | string | null;
}

@Injectable()
export class TceCircuitBreakerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async assertCanSend(
    adapterId: string,
    endpointUrl: string | null,
  ): Promise<void> {
    const endpoint = this.endpointKey(endpointUrl);
    const state = await this.state(adapterId, endpoint);
    if (!state || state.state !== 'OPEN') return;

    const openedAt = state.opened_at ? new Date(state.opened_at) : new Date(0);
    if (Date.now() - openedAt.getTime() < this.cooldownMs()) {
      throw new ServiceUnavailableException(
        `TCE circuit is open for ${adapterId} ${endpoint}`,
      );
    }

    await this.databaseService.query(
      `
      UPDATE tce.adapter_circuit_state
      SET state = 'HALF_OPEN'::tce.adapter_circuit_state_status
      WHERE adapter_id = $1
        AND endpoint_url = $2
      `,
      [adapterId, endpoint],
    );
  }

  async recordSuccess(
    adapterId: string,
    endpointUrl: string | null,
  ): Promise<void> {
    await this.databaseService.query(
      `
      INSERT INTO tce.adapter_circuit_state (
        adapter_id,
        endpoint_url,
        state,
        failure_count,
        last_success_at
      )
      VALUES ($1, $2, 'CLOSED'::tce.adapter_circuit_state_status, 0, now())
      ON CONFLICT (adapter_id, endpoint_url) DO UPDATE
      SET state = 'CLOSED'::tce.adapter_circuit_state_status,
          failure_count = 0,
          opened_at = NULL,
          last_success_at = now()
      `,
      [adapterId, this.endpointKey(endpointUrl)],
    );
  }

  async recordFailure(
    adapterId: string,
    endpointUrl: string | null,
  ): Promise<TceCircuitState> {
    const rows = await this.databaseService.query<CircuitRow>(
      `
      INSERT INTO tce.adapter_circuit_state (
        adapter_id,
        endpoint_url,
        state,
        failure_count,
        opened_at,
        last_failure_at
      )
      VALUES (
        $1,
        $2,
        CASE
          WHEN $3::int <= 1 THEN 'OPEN'::tce.adapter_circuit_state_status
          ELSE 'CLOSED'::tce.adapter_circuit_state_status
        END,
        1,
        CASE WHEN $3::int <= 1 THEN now() ELSE NULL END,
        now()
      )
      ON CONFLICT (adapter_id, endpoint_url) DO UPDATE
      SET failure_count = tce.adapter_circuit_state.failure_count + 1,
          last_failure_at = now(),
          opened_at = CASE
            WHEN tce.adapter_circuit_state.failure_count + 1 >= $3::int THEN now()
            ELSE tce.adapter_circuit_state.opened_at
          END,
          state = CASE
            WHEN tce.adapter_circuit_state.failure_count + 1 >= $3::int
              THEN 'OPEN'::tce.adapter_circuit_state_status
            ELSE 'CLOSED'::tce.adapter_circuit_state_status
          END
      RETURNING state::text AS state
      `,
      [adapterId, this.endpointKey(endpointUrl), this.failureThreshold()],
    );
    return rows[0]?.state ?? 'CLOSED';
  }

  async reset(
    adapterId: string,
    endpointUrl: string | null,
  ): Promise<TceCircuitStateDto> {
    const rows = await this.databaseService.query<CircuitRow>(
      `
      INSERT INTO tce.adapter_circuit_state (
        adapter_id,
        endpoint_url,
        state,
        failure_count,
        last_success_at
      )
      VALUES ($1, $2, 'CLOSED'::tce.adapter_circuit_state_status, 0, now())
      ON CONFLICT (adapter_id, endpoint_url) DO UPDATE
      SET state = 'CLOSED'::tce.adapter_circuit_state_status,
          failure_count = 0,
          opened_at = NULL,
          last_success_at = now()
      RETURNING ${circuitColumns()}
      `,
      [adapterId, this.endpointKey(endpointUrl)],
    );
    return mapCircuit(rows[0]);
  }

  async list(): Promise<TceCircuitStateDto[]> {
    const rows = await this.databaseService.query<CircuitRow>(
      `
      SELECT ${circuitColumns()}
      FROM tce.adapter_circuit_state
      ORDER BY adapter_id, endpoint_url
      `,
    );
    return rows.map(mapCircuit);
  }

  private async state(
    adapterId: string,
    endpointUrl: string,
  ): Promise<CircuitRow | undefined> {
    const rows = await this.databaseService.query<CircuitRow>(
      `
      SELECT ${circuitColumns()}
      FROM tce.adapter_circuit_state
      WHERE adapter_id = $1
        AND endpoint_url = $2
      `,
      [adapterId, endpointUrl],
    );
    return rows[0];
  }

  private failureThreshold(): number {
    const configured = Number(
      this.configService.get<string>('TCE_CIRCUIT_FAILURE_THRESHOLD') ?? 3,
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 3;
  }

  private cooldownMs(): number {
    const configured = Number(
      this.configService.get<string>('TCE_CIRCUIT_COOLDOWN_MS') ?? 60_000,
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 60_000;
  }

  private endpointKey(endpointUrl: string | null | undefined): string {
    return endpointUrl?.trim() || 'stub://audesp-sp';
  }
}

function circuitColumns(): string {
  return `
    adapter_id,
    endpoint_url,
    state::text AS state,
    failure_count,
    opened_at,
    last_failure_at,
    last_success_at
  `;
}

function mapCircuit(row: CircuitRow): TceCircuitStateDto {
  return {
    adapterId: row.adapter_id,
    endpointUrl: row.endpoint_url,
    state: row.state,
    failureCount: row.failure_count,
    openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
    lastFailureAt: row.last_failure_at
      ? new Date(row.last_failure_at).toISOString()
      : null,
    lastSuccessAt: row.last_success_at
      ? new Date(row.last_success_at).toISOString()
      : null,
  };
}

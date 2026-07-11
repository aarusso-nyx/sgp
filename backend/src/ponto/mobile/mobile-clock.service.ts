import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { TimeRecordHashService } from '../time-record/time-record-hash.service';
import type {
  CreateMobileGeolocationConsentDto,
  MobileClockInDto,
  MobileClockInResult,
  RegisterMobileDeviceDto,
  UpdateWorkLocationGeofenceDto,
} from './mobile-clock.dto';
import { GeofenceValidatorService } from './geofence-validator.service';
import { MockLocationDetector } from './mock-location.detector';
import { MobileClockPlausibilityService } from './plausibility.service';

interface AttemptRow extends QueryResultRow {
  id: string;
  result: MobileClockInResult;
  time_record_id: string | null;
  work_location_id: string | null;
}

interface NsrRow extends QueryResultRow {
  next_nsr: string;
}

@Injectable()
export class MobileClockService {
  constructor(
    private readonly database: DatabaseService,
    private readonly geofenceValidator: GeofenceValidatorService,
    private readonly plausibilityService: MobileClockPlausibilityService,
    private readonly mockLocationDetector: MockLocationDetector,
    private readonly timeRecordHashService: TimeRecordHashService,
  ) {}

  async registerDevice(input: RegisterMobileDeviceDto) {
    this.ensureDatabase();
    const rows = await this.database.query<{
      id: string;
      employee_id: string;
      device_id: string;
      platform: string;
      registered_at: Date | string;
    }>(
      `
      INSERT INTO ponto.mobile_device_registration (
        employee_id, device_id, platform, public_key
      )
      VALUES ($1::uuid, $2, $3::ponto.mobile_platform, $4)
      ON CONFLICT (tenant_id, employee_id, device_id)
      DO UPDATE SET platform = EXCLUDED.platform,
                    public_key = EXCLUDED.public_key,
                    revoked_at = NULL,
                    updated_at = now()
      RETURNING id::text, employee_id::text, device_id, platform::text, registered_at
      `,
      [
        input.employeeId,
        input.deviceId.trim(),
        input.platform,
        input.publicKey.trim(),
      ],
    );
    AuditMutationContextStore.markMutationAudited();
    return rows[0];
  }

  async createConsent(input: CreateMobileGeolocationConsentDto) {
    this.ensureDatabase();
    const rows = await this.database.query<{
      id: string;
      employee_id: string;
      consent_version: string;
      consent_at: Date | string;
    }>(
      `
      INSERT INTO ponto.mobile_geolocation_consent (
        employee_id, consent_version, consent_at
      )
      VALUES ($1::uuid, $2, COALESCE($3::timestamptz, now()))
      RETURNING id::text, employee_id::text, consent_version, consent_at
      `,
      [input.employeeId, input.consentVersion.trim(), input.consentAt ?? null],
    );
    AuditMutationContextStore.markMutationAudited();
    return rows[0];
  }

  async clock(input: MobileClockInDto) {
    this.ensureDatabase();
    return this.database.transaction(async (client) => {
      await this.assertRegisteredDevice(client, input);
      const geofence = await this.geofenceValidator.validateWithClient(
        client,
        input,
      );
      let result: MobileClockInResult | null = null;

      if (!(await this.hasActiveGeolocationConsent(client, input.employeeId))) {
        result = 'NO_GEOLOCATION_CONSENT';
      }
      const mockDecision = this.mockLocationDetector.detect(input);
      if (!result && mockDecision.blocked)
        result = mockDecision.result ?? 'MOCK_DETECTED';
      if (!result) {
        const plausibility = await this.plausibilityService.validateWithClient(
          client,
          input,
        );
        if (!plausibility.accepted)
          result = plausibility.result ?? 'LOW_PRECISION';
      }
      if (!result && !geofence.inside) result = 'OUT_OF_FENCE';

      let timeRecordId: string | null = null;
      if (!result) {
        result = 'ACCEPTED';
        const nsr = await this.nextNsr(client, input.employeeId);
        const record = await this.timeRecordHashService.createWithClient(
          client,
          {
            employeeId: input.employeeId,
            recordedAt: input.occurredAt,
            source: 'MOBILE',
            nsr,
            rawPayload: {
              mobileClock: {
                lat: input.lat,
                lon: input.lon,
                gpsPrecisionM: input.gpsPrecisionM,
                mockLocation: input.mockLocation,
                deviceId: input.deviceId,
                workLocationId: geofence.workLocationId,
              },
            },
          },
          false,
        );
        timeRecordId = record.timeRecordId;
      }

      const attempt = await this.insertAttempt(client, input, {
        result,
        workLocationId: geofence.workLocationId,
        timeRecordId,
      });
      AuditMutationContextStore.markMutationAudited();
      return {
        attemptId: attempt.id,
        result: attempt.result,
        timeRecordId: attempt.time_record_id,
        workLocationId: attempt.work_location_id,
        distanceM: geofence.distanceM,
      };
    });
  }

  async updateGeofence(input: UpdateWorkLocationGeofenceDto) {
    this.ensureDatabase();
    const points = [...input.polygon, input.polygon[0]!];
    const wkt = `POLYGON((${points
      .map((point) => `${point.lon} ${point.lat}`)
      .join(', ')}))`;
    const rows = await this.database.query<{
      id: string;
      geofence_configured: boolean;
    }>(
      `
      UPDATE hr.work_location
      SET geofence_polygon = public.ST_GeomFromText($2, 4326)
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
      RETURNING id::text, geofence_polygon IS NOT NULL AS geofence_configured
      `,
      [input.workLocationId, wkt],
    );
    AuditMutationContextStore.markMutationAudited();
    return rows[0];
  }

  private async assertRegisteredDevice(
    client: PoolClient,
    input: MobileClockInDto,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM ponto.mobile_device_registration
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND device_id = $2
        AND revoked_at IS NULL
      LIMIT 1
      `,
      [input.employeeId, input.deviceId],
    );
    if (!result.rows[0]) {
      throw new ForbiddenException('Registered mobile device is required');
    }
  }

  private async hasActiveGeolocationConsent(
    client: PoolClient,
    employeeId: string,
  ): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM ponto.mobile_geolocation_consent
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND employee_id = $1::uuid
          AND withdrawn_at IS NULL
      )
      `,
      [employeeId],
    );
    return result.rows[0]?.exists === true;
  }

  private async nextNsr(
    client: PoolClient,
    employeeId: string,
  ): Promise<number> {
    const result = await client.query<NsrRow>(
      `
      SELECT COALESCE(MAX(nsr), 0) + 1 AS next_nsr
      FROM ponto.time_record
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
      `,
      [employeeId],
    );
    return Number(result.rows[0]?.next_nsr ?? '1');
  }

  private async insertAttempt(
    client: PoolClient,
    input: MobileClockInDto,
    decision: {
      result: MobileClockInResult;
      workLocationId: string | null;
      timeRecordId: string | null;
    },
  ): Promise<AttemptRow> {
    const result = await client.query<AttemptRow>(
      `
      INSERT INTO ponto.mobile_clock_in_attempt (
        employee_id, occurred_at, lat, lon, gps_precision_m, mock_location,
        device_id, work_location_id, result, time_record_id
      )
      VALUES (
        $1::uuid, $2::timestamptz, $3::numeric(18,6), $4::numeric(18,6),
        $5::numeric(18,6), $6::boolean, $7, $8::uuid,
        $9::ponto.mobile_clock_in_result, $10::uuid
      )
      RETURNING id::text, result::text AS result, time_record_id::text, work_location_id::text
      `,
      [
        input.employeeId,
        input.occurredAt,
        input.lat,
        input.lon,
        input.gpsPrecisionM,
        input.mockLocation,
        input.deviceId,
        decision.workLocationId,
        decision.result,
        decision.timeRecordId,
      ],
    );
    return result.rows[0]!;
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

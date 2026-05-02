import { Injectable } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import type { MobileClockInDto, MobileClockInResult } from './mobile-clock.dto';

const EARTH_RADIUS_KM = 6371;

interface LastMobileRecordRow extends QueryResultRow {
  recorded_at: Date | string;
  lat: string;
  lon: string;
}

export interface PlausibilityDecision {
  accepted: boolean;
  result?: MobileClockInResult;
}

@Injectable()
export class MobileClockPlausibilityService {
  private readonly precisionThresholdM = 100;
  private readonly impossibleSpeedKmh = 200;

  async validateWithClient(
    client: PoolClient,
    input: MobileClockInDto,
  ): Promise<PlausibilityDecision> {
    if (input.gpsPrecisionM > this.precisionThresholdM) {
      return { accepted: false, result: 'LOW_PRECISION' };
    }
    const result = await client.query<LastMobileRecordRow>(
      `
      SELECT recorded_at, raw_payload #>> '{mobileClock,lat}' AS lat,
             raw_payload #>> '{mobileClock,lon}' AS lon
      FROM ponto.time_record
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND raw_payload ? 'mobileClock'
      ORDER BY recorded_at DESC
      LIMIT 1
      `,
      [input.employeeId],
    );
    const last = result.rows[0];
    if (!last) return { accepted: true };

    const hours = Math.abs(
      (new Date(input.occurredAt).getTime() -
        new Date(last.recorded_at).getTime()) /
        3_600_000,
    );
    if (hours <= 0) return { accepted: false, result: 'IMPOSSIBLE_VELOCITY' };

    const speed =
      this.distanceKm(
        Number(last.lat),
        Number(last.lon),
        input.lat,
        input.lon,
      ) / hours;
    if (speed > this.impossibleSpeedKmh) {
      return { accepted: false, result: 'IMPOSSIBLE_VELOCITY' };
    }
    return { accepted: true };
  }

  private distanceKm(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ): number {
    const dLat = this.toRadians(toLat - fromLat);
    const dLon = this.toRadians(toLon - fromLon);
    const lat1 = this.toRadians(fromLat);
    const lat2 = this.toRadians(toLat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}

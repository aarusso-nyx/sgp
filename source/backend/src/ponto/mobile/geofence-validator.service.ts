import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

interface GeofenceRow extends QueryResultRow {
  work_location_id: string | null;
  inside: boolean;
  center_lat: string | null;
  center_lon: string | null;
  distance_m: string | null;
}

export interface GeofenceValidation {
  workLocationId: string | null;
  inside: boolean;
  centerLat: number | null;
  centerLon: number | null;
  distanceM: number | null;
}

@Injectable()
export class GeofenceValidatorService {
  constructor(private readonly database: DatabaseService) {}

  async validateWithClient(
    client: PoolClient,
    input: { employeeId: string; lat: number; lon: number },
  ): Promise<GeofenceValidation> {
    this.ensureDatabase();
    const result = await client.query<GeofenceRow>(
      `
      WITH employee_location AS (
        SELECT e.work_location_id, wl.geofence_polygon
        FROM hr.employee e
        JOIN hr.work_location wl
          ON wl.id = e.work_location_id
         AND wl.tenant_id = e.tenant_id
        WHERE e.tenant_id = public.sgp_current_tenant_uuid()
          AND e.id = $1::uuid
        LIMIT 1
      ),
      mobile_point AS (
        SELECT postgis.ST_SetSRID(postgis.ST_MakePoint($2::numeric, $3::numeric), 4326) AS geom
      )
      SELECT
        employee_location.work_location_id::text,
        COALESCE(postgis.ST_Within(mobile_point.geom, employee_location.geofence_polygon), false) AS inside,
        CASE WHEN employee_location.geofence_polygon IS NULL THEN NULL
             ELSE postgis.ST_Y(postgis.ST_Centroid(employee_location.geofence_polygon))::text
        END AS center_lat,
        CASE WHEN employee_location.geofence_polygon IS NULL THEN NULL
             ELSE postgis.ST_X(postgis.ST_Centroid(employee_location.geofence_polygon))::text
        END AS center_lon,
        CASE WHEN employee_location.geofence_polygon IS NULL THEN NULL
             ELSE postgis.ST_DistanceSphere(
               mobile_point.geom,
               postgis.ST_Centroid(employee_location.geofence_polygon)
             )::text
        END AS distance_m
      FROM employee_location, mobile_point
      `,
      [input.employeeId, input.lon, input.lat],
    );
    const row = result.rows[0];
    return {
      workLocationId: row?.work_location_id ?? null,
      inside: row?.inside === true,
      centerLat:
        row?.center_lat === null || row?.center_lat === undefined
          ? null
          : Number(row.center_lat),
      centerLon:
        row?.center_lon === null || row?.center_lon === undefined
          ? null
          : Number(row.center_lon),
      distanceM:
        row?.distance_m === null || row?.distance_m === undefined
          ? null
          : Number(row.distance_m),
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is required');
    }
  }
}

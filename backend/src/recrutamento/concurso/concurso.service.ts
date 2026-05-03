import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../../auth/auth.types';
import { DatabaseService } from '../../database/database.service';
import { CreateConcursoDto, ConcursoVagaDto } from './concurso.dto';

export interface ConcursoSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  validUntil: string;
  vagas: ConcursoVagaDto[];
}

interface ConcursoRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  status: string;
  valid_until: Date | string;
  vagas: ConcursoVagaDto[] | string | null;
}

@Injectable()
export class ConcursoService {
  constructor(private readonly database: DatabaseService) {}

  validateVagas(vagas: ConcursoVagaDto[]): void {
    for (const vaga of vagas) {
      const reserved = vaga.pcdSeats + vaga.racialSeats + vaga.indigenousSeats;
      if (reserved > vaga.totalSeats) {
        throw new BadRequestException(
          'Reserved seats cannot exceed total seats',
        );
      }
      if (
        vaga.totalSeats >= 5 &&
        vaga.pcdSeats < Math.ceil(vaga.totalSeats * 0.05)
      ) {
        throw new BadRequestException(
          'PCD reserve must be at least 5% for positions with five or more seats',
        );
      }
      if (
        vaga.totalSeats >= 3 &&
        vaga.racialSeats < Math.ceil(vaga.totalSeats * 0.2)
      ) {
        throw new BadRequestException(
          'Racial reserve must be at least 20% for positions with three or more seats',
        );
      }
    }
  }

  async create(
    input: CreateConcursoDto,
    actor?: AuthenticatedActor,
  ): Promise<ConcursoSummary> {
    this.ensureDatabase();
    this.validateVagas(input.vagas);

    return this.database.transaction(async (client) => {
      const rows = await client.query<ConcursoRow>(
        `
        WITH created AS (
          INSERT INTO recrutamento.concurso (tenant_id, code, name, valid_until, created_by_user_id)
          VALUES (NULLIF(current_setting('app.current_tenant_id', true), '')::uuid, $1, $2, $3::date, NULLIF($4, '')::uuid)
          RETURNING *
        ), inserted_vagas AS (
          INSERT INTO recrutamento.vaga (
            tenant_id, concurso_id, position_id, organic_definition_id, total_seats,
            pcd_seats, racial_seats, indigenous_seats, requirement, base_salary
          )
          SELECT
            created.tenant_id,
            created.id,
            payload.position_id::uuid,
            NULLIF(payload.organic_definition_id, '')::uuid,
            payload.total_seats,
            payload.pcd_seats,
            payload.racial_seats,
            payload.indigenous_seats,
            COALESCE(payload.requirement, '{}'::jsonb),
            payload.base_salary::numeric(14,2)
          FROM created
          CROSS JOIN LATERAL jsonb_to_recordset($5::jsonb) AS payload(
            position_id text,
            organic_definition_id text,
            total_seats integer,
            pcd_seats integer,
            racial_seats integer,
            indigenous_seats integer,
            requirement jsonb,
            base_salary text
          )
          RETURNING *
        )
        SELECT
          created.id::text,
          created.code,
          created.name,
          created.status::text,
          created.valid_until,
          COALESCE(jsonb_agg(jsonb_build_object(
            'positionId', inserted_vagas.position_id::text,
            'organicDefinitionId', inserted_vagas.organic_definition_id::text,
            'totalSeats', inserted_vagas.total_seats,
            'pcdSeats', inserted_vagas.pcd_seats,
            'racialSeats', inserted_vagas.racial_seats,
            'indigenousSeats', inserted_vagas.indigenous_seats,
            'requirement', inserted_vagas.requirement,
            'baseSalary', inserted_vagas.base_salary::text
          )), '[]'::jsonb) AS vagas
        FROM created
        LEFT JOIN inserted_vagas ON true
        GROUP BY created.id, created.code, created.name, created.status, created.valid_until
        `,
        [
          input.code.trim(),
          input.name.trim(),
          input.validUntil,
          actor?.sub ?? '',
          JSON.stringify(
            input.vagas.map((vaga) => ({
              position_id: vaga.positionId,
              organic_definition_id: vaga.organicDefinitionId ?? '',
              total_seats: vaga.totalSeats,
              pcd_seats: vaga.pcdSeats,
              racial_seats: vaga.racialSeats,
              indigenous_seats: vaga.indigenousSeats,
              requirement: vaga.requirement ?? {},
              base_salary: vaga.baseSalary,
            })),
          ),
        ],
      );
      return this.toSummary(rows.rows[0]!);
    });
  }

  async list(): Promise<ConcursoSummary[]> {
    this.ensureDatabase();
    const rows = await this.database.query<ConcursoRow>(
      `
      SELECT
        c.id::text,
        c.code,
        c.name,
        c.status::text,
        c.valid_until,
        COALESCE(jsonb_agg(jsonb_build_object(
          'positionId', v.position_id::text,
          'organicDefinitionId', v.organic_definition_id::text,
          'totalSeats', v.total_seats,
          'pcdSeats', v.pcd_seats,
          'racialSeats', v.racial_seats,
          'indigenousSeats', v.indigenous_seats,
          'requirement', v.requirement,
          'baseSalary', v.base_salary::text
        ) ORDER BY v.position_id) FILTER (WHERE v.position_id IS NOT NULL), '[]'::jsonb) AS vagas
      FROM recrutamento.concurso c
      LEFT JOIN recrutamento.vaga v ON v.tenant_id = c.tenant_id AND v.concurso_id = c.id
      GROUP BY c.id, c.code, c.name, c.status, c.valid_until
      ORDER BY c.created_at DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async requireExists(client: PoolClient, concursoId: string): Promise<void> {
    const rows = await client.query(
      'SELECT 1 FROM recrutamento.concurso WHERE id = $1::uuid',
      [concursoId],
    );
    if (!rows.rows[0]) throw new NotFoundException('Concurso not found');
  }

  private toSummary(row: ConcursoRow): ConcursoSummary {
    const vagas: ConcursoVagaDto[] =
      typeof row.vagas === 'string'
        ? (JSON.parse(row.vagas) as ConcursoVagaDto[])
        : (row.vagas ?? []);

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      validUntil:
        row.valid_until instanceof Date
          ? row.valid_until.toISOString().slice(0, 10)
          : String(row.valid_until),
      vagas,
    };
  }

  private ensureDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for concurso',
      );
    }
  }
}

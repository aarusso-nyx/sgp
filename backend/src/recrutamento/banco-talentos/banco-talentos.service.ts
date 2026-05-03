import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { PagedResponse } from '../../common/pagination/paged-response';
import {
  CreateTalentPoolCandidateDto,
  TalentPoolListQueryDto,
  TalentPoolStatus,
  UpdateTalentPoolCandidateDto,
} from './banco-talentos.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface TalentPoolCandidateRow extends QueryResultRow {
  id: string;
  cpf: string;
  full_name: string;
  birth_date: Date | string;
  email: string;
  phone: string;
  address: Record<string, unknown> | string;
  lgpd_consent_at: Date | string;
  lgpd_consent_version: string;
  source: string;
  curriculum_s3_key: string | null;
  profile_summary: string;
  skills: string[] | string | null;
  pool_status: TalentPoolStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TalentPoolCandidate {
  id: string;
  cpf: string;
  fullName: string;
  birthDate: string;
  email: string;
  phone: string;
  address: Record<string, unknown>;
  lgpdConsentAt: string;
  lgpdConsentVersion: string;
  source: string;
  curriculumS3Key: string | null;
  profileSummary: string;
  skills: string[];
  status: TalentPoolStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BancoTalentosService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: TalentPoolListQueryDto,
  ): Promise<PagedResponse<TalentPoolCandidate>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const clauses = ['tenant_id = public.sgp_current_tenant_uuid()'];
    const status = query.status ?? 'ACTIVE';

    if (status !== 'ALL') {
      values.push(status);
      clauses.push(`pool_status = $${values.length}`);
    }
    if (query.search?.trim()) {
      values.push(`%${query.search.trim().toLowerCase()}%`);
      clauses.push(
        `lower(concat_ws(' ', cpf, full_name, email, phone, source, profile_summary, array_to_string(skills, ' '))) LIKE $${values.length}`,
      );
    }

    const where = `WHERE ${clauses.join(' AND ')}`;
    const count = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total FROM recrutamento.candidato ${where}`,
      values,
    );
    const rows = await this.databaseService.query<TalentPoolCandidateRow>(
      `
      SELECT
        id::text,
        cpf,
        full_name,
        birth_date,
        email,
        phone,
        address,
        lgpd_consent_at,
        lgpd_consent_version,
        source,
        curriculum_s3_key,
        profile_summary,
        skills,
        pool_status,
        created_at,
        updated_at
      FROM recrutamento.candidato
      ${where}
      ORDER BY created_at DESC, full_name ASC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);

    return {
      items: rows.map((row) => this.toCandidate(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<TalentPoolCandidate> {
    this.ensureDatabase();
    return this.toCandidate(await this.loadById(id));
  }

  async create(
    input: CreateTalentPoolCandidateDto,
  ): Promise<TalentPoolCandidate> {
    this.ensureDatabase();

    try {
      const rows = await this.databaseService.query<TalentPoolCandidateRow>(
        `
        INSERT INTO recrutamento.candidato (
          tenant_id,
          cpf,
          full_name,
          birth_date,
          email,
          phone,
          address,
          lgpd_consent_at,
          lgpd_consent_version,
          source,
          curriculum_s3_key,
          profile_summary,
          skills
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3::date,
          $4,
          $5,
          $6::jsonb,
          $7::timestamptz,
          $8,
          $9,
          NULLIF($10, ''),
          $11,
          $12::text[]
        )
        RETURNING
          id::text,
          cpf,
          full_name,
          birth_date,
          email,
          phone,
          address,
          lgpd_consent_at,
          lgpd_consent_version,
          source,
          curriculum_s3_key,
          profile_summary,
          skills,
          pool_status,
          created_at,
          updated_at
        `,
        [
          input.cpf.trim(),
          input.fullName.trim(),
          input.birthDate,
          input.email.trim().toLowerCase(),
          input.phone.trim(),
          JSON.stringify(input.address ?? {}),
          input.lgpdConsentAt,
          input.lgpdConsentVersion.trim(),
          input.source?.trim() || 'manual',
          input.curriculumS3Key?.trim() ?? '',
          input.profileSummary?.trim() ?? '',
          this.normalizeSkills(input.skills),
        ],
      );

      return this.toCandidate(rows[0]);
    } catch (error: unknown) {
      this.handleConstraintError(error);
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateTalentPoolCandidateDto,
  ): Promise<TalentPoolCandidate> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TalentPoolCandidateRow>(
      `
      UPDATE recrutamento.candidato
      SET
        email = COALESCE(NULLIF($2, ''), email),
        phone = COALESCE(NULLIF($3, ''), phone),
        address = COALESCE($4::jsonb, address),
        source = COALESCE(NULLIF($5, ''), source),
        curriculum_s3_key = CASE WHEN $6::boolean THEN NULLIF($7, '') ELSE curriculum_s3_key END,
        profile_summary = CASE WHEN $8::boolean THEN $9 ELSE profile_summary END,
        skills = CASE WHEN $10::boolean THEN $11::text[] ELSE skills END,
        pool_status = COALESCE($12, pool_status),
        updated_at = now()
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
      RETURNING
        id::text,
        cpf,
        full_name,
        birth_date,
        email,
        phone,
        address,
        lgpd_consent_at,
        lgpd_consent_version,
        source,
        curriculum_s3_key,
        profile_summary,
        skills,
        pool_status,
        created_at,
        updated_at
      `,
      [
        id,
        input.email?.trim().toLowerCase() ?? '',
        input.phone?.trim() ?? '',
        input.address === undefined ? null : JSON.stringify(input.address),
        input.source?.trim() ?? '',
        input.curriculumS3Key !== undefined,
        input.curriculumS3Key?.trim() ?? '',
        input.profileSummary !== undefined,
        input.profileSummary?.trim() ?? '',
        input.skills !== undefined,
        this.normalizeSkills(input.skills),
        input.status ?? null,
      ],
    );
    return this.toCandidate(rows[0]);
  }

  async archive(id: string): Promise<TalentPoolCandidate> {
    return this.update(id, { status: 'ARCHIVED' });
  }

  private async loadById(id: string): Promise<TalentPoolCandidateRow> {
    const rows = await this.databaseService.query<TalentPoolCandidateRow>(
      `
      SELECT
        id::text,
        cpf,
        full_name,
        birth_date,
        email,
        phone,
        address,
        lgpd_consent_at,
        lgpd_consent_version,
        source,
        curriculum_s3_key,
        profile_summary,
        skills,
        pool_status,
        created_at,
        updated_at
      FROM recrutamento.candidato
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND id = $1::uuid
      LIMIT 1
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Talent pool candidate not found');
    }
    return rows[0];
  }

  private toCandidate(
    row: TalentPoolCandidateRow | undefined,
  ): TalentPoolCandidate {
    if (!row) {
      throw new NotFoundException('Talent pool candidate not found');
    }

    return {
      id: row.id,
      cpf: row.cpf,
      fullName: row.full_name,
      birthDate: this.toDateOnly(row.birth_date),
      email: row.email,
      phone: row.phone,
      address: this.parseObject(row.address),
      lgpdConsentAt: this.toIso(row.lgpd_consent_at),
      lgpdConsentVersion: row.lgpd_consent_version,
      source: row.source,
      curriculumS3Key: row.curriculum_s3_key,
      profileSummary: row.profile_summary,
      skills: this.parseSkills(row.skills),
      status: row.pool_status,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private parseObject(value: Record<string, unknown> | string) {
    return typeof value === 'string'
      ? (JSON.parse(value) as Record<string, unknown>)
      : value;
  }

  private parseSkills(value: string[] | string | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value.startsWith('{') && value.endsWith('}')) {
      return value
        .slice(1, -1)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return JSON.parse(value) as string[];
  }

  private normalizeSkills(value: string[] | undefined): string[] {
    return [
      ...new Set((value ?? []).map((entry) => entry.trim()).filter(Boolean)),
    ];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for talent pool operations',
      );
    }
  }

  private toDateOnly(value: Date | string): string {
    const normalized =
      value instanceof Date ? value.toISOString() : String(value);
    return normalized.slice(0, 10);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private handleConstraintError(error: unknown): void {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new ConflictException(
        'Talent pool candidate CPF already exists for this tenant',
      );
    }
  }
}

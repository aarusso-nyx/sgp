import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  LayoutVersionMutationDto,
  LayoutVersionRow,
  TceLayoutStatus,
  TceLayoutVersionDto,
  toLayoutVersionDto,
} from './catalog.types';

const ALLOWED_TRANSITIONS: Record<TceLayoutStatus, readonly TceLayoutStatus[]> =
  {
    DRAFT: ['ACTIVE', 'RETIRED'],
    ACTIVE: ['SUPERSEDED', 'RETIRED'],
    SUPERSEDED: ['RETIRED'],
    RETIRED: [],
  };

@Injectable()
export class LayoutVersionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listByStateCode(code: string): Promise<TceLayoutVersionDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LayoutVersionRow>(
      layoutVersionSelectSql(`
        WHERE state.code = $1::char(2)
        ORDER BY layout.system_name, layout.effective_from DESC, layout.version DESC
      `),
      [code.toUpperCase()],
    );
    return rows.map(toLayoutVersionDto);
  }

  async create(input: LayoutVersionMutationDto): Promise<TceLayoutVersionDto> {
    this.ensureDatabase();
    const status = input.status ?? 'DRAFT';
    if (status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Layout versions must be created as DRAFT',
      );
    }
    try {
      const rows = await this.databaseService.query<LayoutVersionRow>(
        `
        INSERT INTO tce.layout_version (
          state_id, system_name, version, effective_from, effective_to, status, publication_url, notes
        )
        VALUES ($1::uuid, $2, $3::tce.semver, $4::date, $5::date, $6::tce.layout_status, $7, $8)
        RETURNING id::text, state_id::text, (SELECT code::text FROM tce.state WHERE id = state_id) AS state_code,
          system_name, version::text, effective_from, effective_to, status::text, publication_url, notes
        `,
        [
          input.stateId,
          input.systemName,
          input.version,
          input.effectiveFrom,
          input.effectiveTo ?? null,
          status,
          input.publicationUrl,
          input.notes ?? null,
        ],
      );
      return toLayoutVersionDto(rows[0]);
    } catch (error) {
      this.rethrowConstraint(error);
    }
  }

  async transition(
    id: string,
    status: TceLayoutStatus,
  ): Promise<TceLayoutVersionDto> {
    this.ensureDatabase();
    const current = await this.find(id);
    if (!ALLOWED_TRANSITIONS[current.status].includes(status)) {
      throw new UnprocessableEntityException(
        `Invalid layout status transition: ${current.status} -> ${status}`,
      );
    }
    try {
      const rows = await this.databaseService.query<LayoutVersionRow>(
        `
          WITH updated AS (
            UPDATE tce.layout_version
            SET status = $2::tce.layout_status
            WHERE id = $1::uuid
            RETURNING *
          )
          SELECT updated.id::text, updated.state_id::text, state.code::text AS state_code,
            updated.system_name, updated.version::text, updated.effective_from, updated.effective_to,
            updated.status::text, updated.publication_url, updated.notes
          FROM updated
          JOIN tce.state state ON state.id = updated.state_id
        `,
        [id, status],
      );
      if (!rows[0])
        throw new NotFoundException(`Layout version not found: ${id}`);
      return toLayoutVersionDto(rows[0]);
    } catch (error) {
      this.rethrowConstraint(error);
    }
  }

  async find(id: string): Promise<TceLayoutVersionDto> {
    const rows = await this.databaseService.query<LayoutVersionRow>(
      layoutVersionSelectSql('WHERE layout.id = $1::uuid'),
      [id],
    );
    if (!rows[0])
      throw new NotFoundException(`Layout version not found: ${id}`);
    return toLayoutVersionDto(rows[0]);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private rethrowConstraint(error: unknown): never {
    const code =
      typeof error === 'object' && error
        ? (error as { code?: string }).code
        : '';
    if (code === '23P01') {
      throw new UnprocessableEntityException(
        'ACTIVE layout effective period overlaps',
      );
    }
    if (code === '23514' || code === '22P02') {
      throw new BadRequestException('Invalid layout version payload');
    }
    throw error;
  }
}

function layoutVersionSelectSql(tail: string): string {
  return `
    SELECT layout.id::text, layout.state_id::text, state.code::text AS state_code,
      layout.system_name, layout.version::text, layout.effective_from, layout.effective_to,
      layout.status::text, layout.publication_url, layout.notes
    FROM tce.layout_version layout
    JOIN tce.state state ON state.id = layout.state_id
    ${tail}
  `;
}

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { StateRow, TceStateDto, toStateDto } from './catalog.types';

@Injectable()
export class StateService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<TceStateDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<StateRow>(
      stateSelectSql('ORDER BY organ_kind, code'),
    );
    return rows.map(toStateDto);
  }

  async findByCode(code: string): Promise<TceStateDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<StateRow>(
      stateSelectSql('WHERE code = $1::char(2)'),
      [code.toUpperCase()],
    );
    if (!rows[0]) throw new NotFoundException(`TCE state not found: ${code}`);
    return toStateDto(rows[0]);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function stateSelectSql(tail: string): string {
  return `
    SELECT id::text, code::text, name, sphere::text, parent_state_code::text, organ_kind::text, organ_name, organ_official_url
    FROM tce.state
    ${tail}
  `;
}

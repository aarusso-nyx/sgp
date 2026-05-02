import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  LayoutFieldMutationDto,
  LayoutFieldRow,
  TceLayoutFieldDto,
  toLayoutFieldDto,
} from './catalog.types';

@Injectable()
export class LayoutFieldService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(layoutVersionId: string): Promise<TceLayoutFieldDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LayoutFieldRow>(
      fieldSelectSql(
        'WHERE layout_version_id = $1::uuid ORDER BY ordering, field_path',
      ),
      [layoutVersionId],
    );
    return rows.map(toLayoutFieldDto);
  }

  async create(input: LayoutFieldMutationDto): Promise<TceLayoutFieldDto> {
    this.ensureDatabase();
    this.validateDecimal(input);
    const rows = await this.databaseService.query<LayoutFieldRow>(
      `
      INSERT INTO tce.layout_field (
        layout_version_id, field_path, data_type, required, max_length,
        decimal_precision, decimal_scale, transform_rule, source_hint, ordering
      )
      VALUES ($1::uuid, $2, $3::tce.layout_field_data_type, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id::text, layout_version_id::text, field_path, data_type::text, required,
        max_length, decimal_precision, decimal_scale, transform_rule, source_hint, ordering
      `,
      [
        input.layoutVersionId,
        input.fieldPath,
        input.dataType,
        input.required ?? false,
        input.maxLength ?? null,
        input.decimalPrecision ?? null,
        input.decimalScale ?? null,
        input.transformRule ?? null,
        input.sourceHint ?? null,
        input.ordering,
      ],
    );
    return toLayoutFieldDto(rows[0]);
  }

  async delete(id: string): Promise<{ id: string; deleted: true }> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<
      { id: string } & LayoutFieldRow
    >('DELETE FROM tce.layout_field WHERE id = $1::uuid RETURNING id::text', [
      id,
    ]);
    if (!rows[0]) throw new NotFoundException(`Layout field not found: ${id}`);
    return { id: rows[0].id, deleted: true };
  }

  validateDecimal(input: LayoutFieldMutationDto): void {
    const hasPrecision =
      input.decimalPrecision !== undefined && input.decimalPrecision !== null;
    const hasScale =
      input.decimalScale !== undefined && input.decimalScale !== null;
    if (input.dataType === 'DECIMAL') {
      if (!hasPrecision || !hasScale) {
        throw new BadRequestException(
          'DECIMAL fields require precision and scale',
        );
      }
      if (
        Number(input.decimalPrecision) <= 0 ||
        Number(input.decimalScale) < 0 ||
        Number(input.decimalScale) > Number(input.decimalPrecision)
      ) {
        throw new BadRequestException('Invalid DECIMAL precision and scale');
      }
      return;
    }
    if (hasPrecision || hasScale) {
      throw new BadRequestException(
        'Only DECIMAL fields may define precision and scale',
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function fieldSelectSql(tail: string): string {
  return `
    SELECT id::text, layout_version_id::text, field_path, data_type::text, required,
      max_length, decimal_precision, decimal_scale, transform_rule, source_hint, ordering
    FROM tce.layout_field
    ${tail}
  `;
}

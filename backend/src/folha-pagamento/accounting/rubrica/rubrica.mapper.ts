import {
  JobPositionRubricaRecord,
  LinkRow,
  RubricaRecord,
  RubricaRow,
  TYPE_BY_KIND,
} from './rubrica.types';

export class RubricaMapper {
  toRubrica(row: RubricaRow): RubricaRecord {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      type: TYPE_BY_KIND[row.kind] ?? 'informativa',
      taxable: row.taxable,
      active: row.active,
      incidences: row.incidences ?? {},
      startsOn: this.toDate(row.starts_on),
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      formulaAlias: row.formula_alias,
      formulaExpression: row.formula_expression,
      formulaDependencies: row.formula_dependencies ?? [],
      formulaReady: row.formula_ready,
      formulaError: row.formula_error,
      esocialCode: row.esocial_code,
      officialRubricCode: row.official_rubric_code,
      attributes: row.attributes ?? [],
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  toJobPositionRubrica(row: LinkRow): JobPositionRubricaRecord {
    return {
      id: row.id,
      jobPositionId: row.job_position_id,
      jobPositionCode: row.job_position_code,
      jobPositionName: row.job_position_name,
      rubricaId: row.rubrica_id,
      rubricaCode: row.rubrica_code,
      rubricaDescription: row.rubrica_description,
      startsOn: row.starts_on ? this.toDate(row.starts_on) : null,
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      applicationCondition: row.application_condition,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toDate(value: Date | string): string {
    return (value instanceof Date ? value : new Date(value))
      .toISOString()
      .slice(0, 10);
  }
}

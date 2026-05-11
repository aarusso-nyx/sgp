import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../../common/pagination/paged-response';
import { DatabaseService } from '../../../database/database.service';
import { SgpEsocialEmittersService } from '../../../integrations/stynx-esocial';
import { FormulaCompilerService } from '../../../payroll-engine/formula-compiler.service';
import { PayrollEngineService } from '../../../payroll-engine/payroll-engine.service';
import {
  JobPositionRubricaMutationDto,
  RubricaCompileDto,
  RubricaMutationDto,
  RubricaPreviewDto,
  RubricaType,
} from './rubrica.dto';
import { RubricaPersistence } from './rubrica.persistence';
import type {
  JobPositionRubricaRecord,
  RubricaCompileResult,
  RubricaPreviewResult,
  RubricaRecord,
} from './rubrica.types';

export type {
  JobPositionRubricaRecord,
  RubricaAttributeRecord,
  RubricaCompileResult,
  RubricaPreviewResult,
  RubricaRecord,
} from './rubrica.types';

@Injectable()
export class RubricaService {
  private readonly persistence: RubricaPersistence;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly payrollEngineService: PayrollEngineService,
    @Optional()
    private readonly formulaCompilerService?: FormulaCompilerService,
    @Optional()
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {
    this.persistence = new RubricaPersistence(databaseService);
  }

  async listRubricas(
    query: DomainListQueryDto & { type?: RubricaType; incidence?: string },
  ): Promise<PagedResponse<RubricaRecord>> {
    this.ensureDatabase();
    return this.persistence.listRubricas(query);
  }

  async getRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    return this.persistence.getRubrica(id);
  }

  async createRubrica(input: RubricaMutationDto): Promise<RubricaRecord> {
    this.ensureDatabase();
    const created = await this.persistence.createRubrica(input);
    const recompiled = await this.recompileIfFormula(created);
    await this.emitS1010(recompiled, 'create');
    return recompiled;
  }

  async updateRubrica(
    id: string,
    input: RubricaMutationDto,
  ): Promise<RubricaRecord> {
    this.ensureDatabase();
    const updated = await this.persistence.updateRubrica(id, input);
    const recompiled = await this.recompileIfFormula(updated);
    await this.emitS1010(recompiled, 'update');
    return recompiled;
  }

  async deactivateRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    return this.persistence.deactivateRubrica(id);
  }

  async compileFormula(
    input: RubricaCompileDto,
  ): Promise<RubricaCompileResult> {
    if (this.formulaCompilerService) {
      const result = await this.formulaCompilerService.validateFormula(
        input.expression,
      );
      return {
        ready: result.ready,
        error: result.error,
        dependencies: result.dependencies,
      };
    }
    return this.payrollEngineService.compileAndValidate(
      input.expression,
      input.dependencies ?? [],
    );
  }

  async recompileRubrica(id: string): Promise<RubricaRecord> {
    this.ensureDatabase();
    if (!this.formulaCompilerService) {
      throw new ServiceUnavailableException(
        'Formula compiler is not configured',
      );
    }
    await this.formulaCompilerService.compileEarningDeduction(id);
    return this.getRubrica(id);
  }

  async previewRubrica(
    id: string,
    input: RubricaPreviewDto,
  ): Promise<RubricaPreviewResult> {
    this.ensureDatabase();
    const rows = await this.persistence.previewRubrica(id, input);
    return {
      rubricaId: id,
      employeeId: input.employeeId,
      competence: `${input.competenceYear}-${String(input.competenceMonth).padStart(2, '0')}`,
      amount: rows[0]?.amount ?? null,
      attributes: input.attributes ?? {},
    };
  }

  async listJobPositionRubricas(): Promise<JobPositionRubricaRecord[]> {
    this.ensureDatabase();
    return this.persistence.listJobPositionRubricas();
  }

  async createJobPositionRubrica(
    input: JobPositionRubricaMutationDto,
  ): Promise<JobPositionRubricaRecord> {
    this.ensureDatabase();
    return this.persistence.createJobPositionRubrica(input);
  }

  private emitS1010(
    rubrica: RubricaRecord,
    operation: 'create' | 'update',
  ): Promise<unknown> | undefined {
    return this.esocialEmitters?.emitForCurrentTenant('s1010EarningDeduction', {
      sourceId: rubrica.id,
      operation,
      data: {
        code: rubrica.code,
        description: rubrica.description,
        type: rubrica.type,
        taxable: rubrica.taxable,
        incidences: rubrica.incidences,
        startsOn: rubrica.startsOn,
        endsOn: rubrica.endsOn,
        esocialCode: rubrica.esocialCode,
        officialRubricCode: rubrica.officialRubricCode,
      },
    });
  }

  private async recompileIfFormula(
    rubrica: RubricaRecord,
  ): Promise<RubricaRecord> {
    if (!rubrica.formulaExpression?.trim() || !this.formulaCompilerService) {
      return rubrica;
    }
    return this.recompileRubrica(rubrica.id);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }
}

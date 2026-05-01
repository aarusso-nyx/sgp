import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../../audit/audit.service';
import { DomainListQueryDto } from '../../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../../common/request-id/request-with-context';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import {
  JobPositionRubricaMutationDto,
  RubricaCompileDto,
  RubricaMutationDto,
  RubricaPreviewDto,
  RubricaType,
} from './rubrica.dto';
import { RubricaService } from './rubrica.service';

@ApiTags('folha-rubrica')
@ApiBearerAuth()
@Controller('v1/folha/rubrica')
export class RubricaController {
  constructor(
    private readonly rubricaService: RubricaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('folha.rubrica.read')
  @ApiOkResponse({ description: 'List payroll rubrics.' })
  listRubricas(
    @Query()
    query: DomainListQueryDto & { type?: RubricaType; incidence?: string },
  ) {
    return this.rubricaService.listRubricas(query);
  }

  @Get(':id')
  @RequirePermission('folha.rubrica.read')
  @ApiOkResponse({ description: 'Get a payroll rubric.' })
  getRubrica(@Param('id') id: string) {
    return this.rubricaService.getRubrica(id);
  }

  @Post()
  @RequirePermission('folha.rubrica.write')
  @ApiCreatedResponse({ description: 'Create a payroll rubric.' })
  async createRubrica(
    @Req() request: RequestWithContext,
    @Body() body: RubricaMutationDto,
  ) {
    const created = await this.rubricaService.createRubrica(body);
    await this.auditService.auditMutation(request, 'CREATE', 'folha.rubrica', {
      resourceId: created.id,
      tableName: 'payroll.payroll_earning_deduction',
      metadata: { event: 'folha.rubrica.created', code: created.code },
    });
    return created;
  }

  @Patch(':id')
  @RequirePermission('folha.rubrica.write')
  @ApiOkResponse({ description: 'Update a payroll rubric.' })
  async updateRubrica(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RubricaMutationDto,
  ) {
    const updated = await this.rubricaService.updateRubrica(id, body);
    await this.auditService.auditMutation(request, 'UPDATE', 'folha.rubrica', {
      resourceId: updated.id,
      tableName: 'payroll.payroll_earning_deduction',
      metadata: { event: 'folha.rubrica.updated', code: updated.code },
    });
    return updated;
  }

  @Delete(':id')
  @RequirePermission('folha.rubrica.write')
  @ApiOkResponse({ description: 'Deactivate a payroll rubric.' })
  async deactivateRubrica(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const updated = await this.rubricaService.deactivateRubrica(id);
    await this.auditService.auditMutation(request, 'DELETE', 'folha.rubrica', {
      resourceId: updated.id,
      tableName: 'payroll.payroll_earning_deduction',
      metadata: { event: 'folha.rubrica.deactivated', code: updated.code },
    });
    return updated;
  }

  @Post('compile')
  @RequirePermission('folha.rubrica.preview')
  @ApiOkResponse({ description: 'Validate a payroll rubric formula.' })
  async compileFormula(
    @Req() request: RequestWithContext,
    @Body() body: RubricaCompileDto,
  ) {
    const result = await this.rubricaService.compileFormula(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'folha.rubrica.formula',
      {
        tableName: 'payroll.payroll_earning_deduction',
        metadata: {
          event: 'folha.rubrica.formula_validated',
          ready: result.ready,
        },
      },
    );
    return result;
  }

  @Post(':id/preview')
  @RequirePermission('folha.rubrica.preview')
  @ApiOkResponse({ description: 'Preview a payroll rubric formula value.' })
  async previewRubrica(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RubricaPreviewDto,
  ) {
    const preview = await this.rubricaService.previewRubrica(id, body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'folha.rubrica.preview',
      {
        resourceId: id,
        tableName: 'payroll.payroll_earning_deduction',
        metadata: {
          event: 'folha.rubrica.previewed',
          employeeId: body.employeeId,
          competence: preview.competence,
        },
      },
    );
    return preview;
  }

  @Get('links/job-positions')
  @RequirePermission('folha.rubrica.read')
  @ApiOkResponse({ description: 'List job-position rubric links.' })
  listJobPositionRubricas() {
    return this.rubricaService.listJobPositionRubricas();
  }

  @Post('links/job-positions')
  @RequirePermission('folha.rubrica.write')
  @ApiCreatedResponse({
    description: 'Create or update a job-position rubric link.',
  })
  async createJobPositionRubrica(
    @Req() request: RequestWithContext,
    @Body() body: JobPositionRubricaMutationDto,
  ) {
    const created = await this.rubricaService.createJobPositionRubrica(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'folha.rubrica.job_position',
      {
        resourceId: created.id,
        tableName: 'payroll.job_position_earning',
        metadata: {
          event: 'folha.rubrica.job_position_linked',
          rubricaId: body.rubricaId,
          jobPositionId: body.jobPositionId,
        },
      },
    );
    return created;
  }
}

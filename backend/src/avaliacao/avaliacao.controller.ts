import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CreateCareerPlanDto,
  CreateMeritProgressionDto,
  CreatePerformanceEvaluationDto,
  CreateSalarySimulationDto,
  GenerateAvaliacaoReportDto,
  UpdateCareerPlanDto,
  UpdatePerformanceEvaluationDto,
} from './avaliacao.dto';
import { AvaliacaoService } from './avaliacao.service';

@ApiTags('avaliacao')
@ApiBearerAuth()
@Controller('v1/avaliacao')
export class AvaliacaoController {
  constructor(
    private readonly avaliacaoService: AvaliacaoService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET desempenhos' })
  @Get('desempenhos')
  @RequirePermission('avaliacao.read')
  @ApiOkResponse({ description: 'List performance evaluations.' })
  listPerformanceEvaluations() {
    return this.avaliacaoService.listPerformanceEvaluations();
  }

  @ApiOperation({ summary: 'POST desempenhos' })
  @Post('desempenhos')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Create a performance evaluation.' })
  async createPerformanceEvaluation(
    @Req() request: RequestWithContext,
    @Body() body: CreatePerformanceEvaluationDto,
  ) {
    const created =
      await this.avaliacaoService.createPerformanceEvaluation(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'performance_evaluation',
      {
        resourceId: created.id,
        tableName: 'performance_evaluation',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH desempenhos/:id' })
  @Patch('desempenhos/:id')
  @RequirePermission('avaliacao.write')
  @ApiOkResponse({ description: 'Update a performance evaluation.' })
  async updatePerformanceEvaluation(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdatePerformanceEvaluationDto,
  ) {
    const updated = await this.avaliacaoService.updatePerformanceEvaluation(
      id,
      body,
    );
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'performance_evaluation',
      {
        resourceId: updated.id,
        tableName: 'performance_evaluation',
      },
    );
    return updated;
  }

  @ApiOperation({ summary: 'GET progressoes' })
  @Get('progressoes')
  @RequirePermission('avaliacao.read')
  @ApiOkResponse({ description: 'List career progressions.' })
  listProgressions() {
    return this.avaliacaoService.listProgressions();
  }

  @ApiOperation({ summary: 'POST progressoes' })
  @Post('progressoes')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Create a career progression.' })
  async createProgression(
    @Req() request: RequestWithContext,
    @Body() body: CreateMeritProgressionDto,
  ) {
    const created = await this.avaliacaoService.createProgression(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'merit_progression',
      {
        resourceId: created.id,
        tableName: 'merit_progression',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET simulacoes' })
  @Get('simulacoes')
  @RequirePermission('avaliacao.read')
  @ApiOkResponse({ description: 'List salary simulations.' })
  listSimulations() {
    return this.avaliacaoService.listSimulations();
  }

  @ApiOperation({ summary: 'POST simulacoes' })
  @Post('simulacoes')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Create a salary simulation.' })
  async createSimulation(
    @Req() request: RequestWithContext,
    @Body() body: CreateSalarySimulationDto,
  ) {
    const created = await this.avaliacaoService.createSimulation(
      body,
      request.actor?.username,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'salary_simulation',
      {
        resourceId: created.id,
        tableName: 'salary_simulation',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET planos-cargos' })
  @Get('planos-cargos')
  @RequirePermission('avaliacao.read')
  @ApiOkResponse({ description: 'List career plans.' })
  listCareerPlans() {
    return this.avaliacaoService.listCareerPlans();
  }

  @ApiOperation({ summary: 'POST planos-cargos' })
  @Post('planos-cargos')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Create a career plan.' })
  async createCareerPlan(
    @Req() request: RequestWithContext,
    @Body() body: CreateCareerPlanDto,
  ) {
    const created = await this.avaliacaoService.createCareerPlan(body);
    await this.auditService.auditMutation(request, 'CREATE', 'career_plan', {
      resourceId: created.id,
      tableName: 'career_plan',
    });
    return created;
  }

  @ApiOperation({ summary: 'PATCH planos-cargos/:id' })
  @Patch('planos-cargos/:id')
  @RequirePermission('avaliacao.write')
  @ApiOkResponse({ description: 'Update a career plan.' })
  async updateCareerPlan(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateCareerPlanDto,
  ) {
    const updated = await this.avaliacaoService.updateCareerPlan(id, body);
    await this.auditService.auditMutation(request, 'UPDATE', 'career_plan', {
      resourceId: updated.id,
      tableName: 'career_plan',
    });
    return updated;
  }

  @ApiOperation({ summary: 'POST desempenhos/:id/ficha' })
  @Post('desempenhos/:id/ficha')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Queue a performance evaluation sheet.' })
  async requestEvaluationSheet(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: GenerateAvaliacaoReportDto,
  ) {
    const created = await this.avaliacaoService.requestEvaluationSheet(
      id,
      body,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'performance_evaluation_report',
      {
        resourceId: id,
        tableName: 'report_request',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST ciclos/:periodo/relatorio' })
  @Post('ciclos/:periodo/relatorio')
  @RequirePermission('avaliacao.write')
  @ApiCreatedResponse({ description: 'Queue a cycle evaluation report.' })
  async requestCycleReport(
    @Req() request: RequestWithContext,
    @Param('periodo') periodLabel: string,
    @Body() body: GenerateAvaliacaoReportDto,
  ) {
    const created = await this.avaliacaoService.requestCycleReport(
      periodLabel,
      body,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'evaluation_cycle_report',
      {
        resourceId: periodLabel,
        tableName: 'report_request',
      },
    );
    return created;
  }
}

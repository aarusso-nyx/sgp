import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
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
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/avaliacao')
export class AvaliacaoController {
  constructor(
    private readonly avaliacaoService: AvaliacaoService,
    private readonly auditService: AuditService,
  ) {}

  @Get('desempenhos')
  @RequirePermissions('avaliacao:read')
  @ApiOkResponse({ description: 'List performance evaluations.' })
  listPerformanceEvaluations() {
    return this.avaliacaoService.listPerformanceEvaluations();
  }

  @Post('desempenhos')
  @RequirePermissions('avaliacao:write')
  @ApiCreatedResponse({ description: 'Create a performance evaluation.' })
  async createPerformanceEvaluation(
    @Req() request: RequestWithContext,
    @Body() body: CreatePerformanceEvaluationDto,
  ) {
    const created =
      await this.avaliacaoService.createPerformanceEvaluation(body);
    await this.auditService.appendMutation(
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

  @Patch('desempenhos/:id')
  @RequirePermissions('avaliacao:write')
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
    await this.auditService.appendMutation(
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

  @Get('progressoes')
  @RequirePermissions('avaliacao:read')
  @ApiOkResponse({ description: 'List career progressions.' })
  listProgressions() {
    return this.avaliacaoService.listProgressions();
  }

  @Post('progressoes')
  @RequirePermissions('avaliacao:write')
  @ApiCreatedResponse({ description: 'Create a career progression.' })
  async createProgression(
    @Req() request: RequestWithContext,
    @Body() body: CreateMeritProgressionDto,
  ) {
    const created = await this.avaliacaoService.createProgression(body);
    await this.auditService.appendMutation(
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

  @Get('simulacoes')
  @RequirePermissions('avaliacao:read')
  @ApiOkResponse({ description: 'List salary simulations.' })
  listSimulations() {
    return this.avaliacaoService.listSimulations();
  }

  @Post('simulacoes')
  @RequirePermissions('avaliacao:write')
  @ApiCreatedResponse({ description: 'Create a salary simulation.' })
  async createSimulation(
    @Req() request: RequestWithContext,
    @Body() body: CreateSalarySimulationDto,
  ) {
    const created = await this.avaliacaoService.createSimulation(
      body,
      request.actor?.username,
    );
    await this.auditService.appendMutation(
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

  @Get('planos-cargos')
  @RequirePermissions('avaliacao:read')
  @ApiOkResponse({ description: 'List career plans.' })
  listCareerPlans() {
    return this.avaliacaoService.listCareerPlans();
  }

  @Post('planos-cargos')
  @RequirePermissions('avaliacao:write')
  @ApiCreatedResponse({ description: 'Create a career plan.' })
  async createCareerPlan(
    @Req() request: RequestWithContext,
    @Body() body: CreateCareerPlanDto,
  ) {
    const created = await this.avaliacaoService.createCareerPlan(body);
    await this.auditService.appendMutation(request, 'CREATE', 'career_plan', {
      resourceId: created.id,
      tableName: 'career_plan',
    });
    return created;
  }

  @Patch('planos-cargos/:id')
  @RequirePermissions('avaliacao:write')
  @ApiOkResponse({ description: 'Update a career plan.' })
  async updateCareerPlan(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateCareerPlanDto,
  ) {
    const updated = await this.avaliacaoService.updateCareerPlan(id, body);
    await this.auditService.appendMutation(request, 'UPDATE', 'career_plan', {
      resourceId: updated.id,
      tableName: 'career_plan',
    });
    return updated;
  }

  @Post('desempenhos/:id/ficha')
  @RequirePermissions('avaliacao:write')
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
    await this.auditService.appendMutation(
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

  @Post('ciclos/:periodo/relatorio')
  @RequirePermissions('avaliacao:write')
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
    await this.auditService.appendMutation(
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

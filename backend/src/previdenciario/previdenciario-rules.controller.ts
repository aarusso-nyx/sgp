import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  CreateRetirementRuleDto,
  CreateRetirementSimulationDto,
  SimulateEc103AtividadeRiscoProfessorDto,
  SimulateEc103IdadeProgressivaDto,
  SimulateEc103Pedagio50Dto,
  SimulateEc103Pedagio100Dto,
  SimulateEc103PontosDto,
  UpdateRetirementRuleDto,
} from './previdenciario.dto';
import {
  PREVIDENCIARIO_SERVICE_REGISTRY,
  type PrevidenciarioServiceRegistry,
} from './previdenciario.tokens';
import { RegrasService } from './regras/regras.service';

@ApiTags('previdenciario')
@ApiBearerAuth()
@Controller('v1/previdenciario')
export class PrevidenciarioRulesController {
  private readonly regrasService: RegrasService;

  constructor(
    private readonly auditService: AuditService,
    @Inject(PREVIDENCIARIO_SERVICE_REGISTRY)
    registry: PrevidenciarioServiceRegistry,
  ) {
    this.regrasService = registry.regras;
  }

  @ApiOperation({ summary: 'GET regras' })
  @Get('regras')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List retirement rules.' })
  listRules() {
    return this.regrasService.listRules();
  }

  @ApiOperation({ summary: 'POST regras' })
  @Post('regras')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a retirement rule.' })
  async createRule(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementRuleDto,
  ) {
    const created = await this.regrasService.createRule(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'retirement_rule',
      {
        resourceId: created.id,
        tableName: 'retirement_rule',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH regras/:id' })
  @Patch('regras/:id')
  @RequirePermission('previdenciario.write')
  @ApiOkResponse({ description: 'Update a retirement rule.' })
  async updateRule(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateRetirementRuleDto,
  ) {
    const updated = await this.regrasService.updateRule(id, body);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'retirement_rule',
      {
        resourceId: updated.id,
        tableName: 'retirement_rule',
      },
    );
    return updated;
  }

  @ApiOperation({ summary: 'GET simulacoes' })
  @Get('simulacoes')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List retirement simulations.' })
  listSimulations() {
    return this.regrasService.listSimulations();
  }

  @ApiOperation({ summary: 'POST simulacoes' })
  @Post('simulacoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a retirement simulation.' })
  async createSimulation(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementSimulationDto,
  ) {
    const created = await this.regrasService.createSimulation(
      body,
      request.actor?.username,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: created.id,
        tableName: 'retirement_simulation',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pedagio-100' })
  @Post('simulacoes/ec103/pedagio-100')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 20 Pedagio 100 transition rule.',
  })
  async simulateEc103Pedagio100(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103Pedagio100Dto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePedagio100(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pedagio-50' })
  @Post('simulacoes/ec103/pedagio-50')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 17 Pedagio 50 transition rule.',
  })
  async simulateEc103Pedagio50(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103Pedagio50Dto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePedagio50(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pontos' })
  @Post('simulacoes/ec103/pontos')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 4 points transition rule.',
  })
  async simulateEc103Pontos(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103PontosDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePontos(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/idade-progressiva' })
  @Post('simulacoes/ec103/idade-progressiva')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 16 progressive age rule.',
  })
  async simulateEc103IdadeProgressiva(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103IdadeProgressivaDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulateIdadeProgressiva(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/atividade-risco-professor' })
  @Post('simulacoes/ec103/atividade-risco-professor')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description:
      'Simulate EC 103/2019 risk-activity or federal teacher transition rules.',
  })
  async simulateEc103AtividadeRiscoProfessor(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103AtividadeRiscoProfessorDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulateAtividadeRiscoProfessor(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }
}

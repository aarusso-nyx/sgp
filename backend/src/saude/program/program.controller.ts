import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { HealthProgramService } from './health-program.service';
import {
  AddRequiredExamDto,
  CreateHealthProgramDto,
  CreateProgramRevisionDto,
  CreateRiskManagementProgramDto,
} from './program.dto';
import { RiskManagementProgramService } from './risk-management-program.service';

@ApiTags('saude-programas')
@ApiBearerAuth()
@Controller('v1/saude/programas')
export class ProgramController {
  constructor(
    private readonly healthProgramService: HealthProgramService,
    private readonly riskManagementProgramService: RiskManagementProgramService,
  ) {}

  @ApiOperation({ summary: 'GET pcmso' })
  @Get('pcmso')
  @RequirePermission('saude.program.read')
  @ApiOkResponse({ description: 'PCMSO programs.' })
  listPcmos() {
    return this.healthProgramService.list();
  }

  @ApiOperation({ summary: 'POST pcmso' })
  @Post('pcmso')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.health_program',
    tableName: 'saude.health_program',
  })
  @ApiCreatedResponse({ description: 'Create a PCMSO draft.' })
  createPcmos(@Body() body: CreateHealthProgramDto) {
    return this.healthProgramService.create(body);
  }

  @ApiOperation({ summary: 'PATCH pcmso/:id/ativar' })
  @Patch('pcmso/:id/ativar')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.health_program',
    tableName: 'saude.health_program',
  })
  @ApiOkResponse({
    description: 'Activate PCMSO and supersede prior active revision.',
  })
  activatePcmos(@Param('id') id: string) {
    return this.healthProgramService.activate(id);
  }

  @ApiOperation({ summary: 'POST pcmso/:id/revisoes' })
  @Post('pcmso/:id/revisoes')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.program_revision',
    tableName: 'saude.program_revision',
  })
  @ApiCreatedResponse({ description: 'Append an immutable PCMSO revision.' })
  revisePcmos(@Param('id') id: string, @Body() body: CreateProgramRevisionDto) {
    return this.healthProgramService.revise(id, body);
  }

  @ApiOperation({ summary: 'POST pcmso/:id/exames' })
  @Post('pcmso/:id/exames')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.pcmso_required_exam',
    tableName: 'saude.pcmso_required_exam',
  })
  @ApiCreatedResponse({ description: 'Attach a required exam to PCMSO.' })
  addRequiredExam(@Param('id') id: string, @Body() body: AddRequiredExamDto) {
    return this.healthProgramService.addRequiredExam(id, body);
  }

  @ApiOperation({ summary: 'GET pgr' })
  @Get('pgr')
  @RequirePermission('saude.program.read')
  @ApiOkResponse({ description: 'PGR programs.' })
  listPgr() {
    return this.riskManagementProgramService.list();
  }

  @ApiOperation({ summary: 'POST pgr' })
  @Post('pgr')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.risk_management_program',
    tableName: 'saude.risk_management_program',
  })
  @ApiCreatedResponse({ description: 'Create a PGR draft.' })
  createPgr(@Body() body: CreateRiskManagementProgramDto) {
    return this.riskManagementProgramService.create(body);
  }

  @ApiOperation({ summary: 'PATCH pgr/:id/ativar' })
  @Patch('pgr/:id/ativar')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.risk_management_program',
    tableName: 'saude.risk_management_program',
  })
  @ApiOkResponse({
    description: 'Activate PGR and supersede prior active revision.',
  })
  activatePgr(@Param('id') id: string) {
    return this.riskManagementProgramService.activate(id);
  }

  @ApiOperation({ summary: 'POST pgr/:id/revisoes' })
  @Post('pgr/:id/revisoes')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.program_revision',
    tableName: 'saude.program_revision',
  })
  @ApiCreatedResponse({ description: 'Append an immutable PGR revision.' })
  revisePgr(@Param('id') id: string, @Body() body: CreateProgramRevisionDto) {
    return this.riskManagementProgramService.revise(id, body);
  }
}

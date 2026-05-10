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
import { CipaCommitteeService } from './cipa-committee.service';
import { HealthProgramService } from './health-program.service';
import {
  AddCipaMemberDto,
  AddCipaMinuteDto,
  AddRequiredExamDto,
  CreateCipaCommitteeDto,
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
    private readonly cipaCommitteeService: CipaCommitteeService,
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

  @ApiOperation({ summary: 'GET pcmat' })
  @Get('pcmat')
  @RequirePermission('saude.program.read')
  @ApiOkResponse({ description: 'PCMAT programs.' })
  listPcmat() {
    return this.healthProgramService.list('PCMAT');
  }

  @ApiOperation({ summary: 'POST pcmat' })
  @Post('pcmat')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.health_program',
    tableName: 'saude.health_program',
  })
  @ApiCreatedResponse({ description: 'Create a PCMAT draft.' })
  createPcmat(@Body() body: CreateHealthProgramDto) {
    return this.healthProgramService.create(body, 'PCMAT');
  }

  @ApiOperation({ summary: 'PATCH pcmat/:id/ativar' })
  @Patch('pcmat/:id/ativar')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.health_program',
    tableName: 'saude.health_program',
  })
  @ApiOkResponse({
    description: 'Activate PCMAT and supersede prior active revision.',
  })
  activatePcmat(@Param('id') id: string) {
    return this.healthProgramService.activate(id, 'PCMAT');
  }

  @ApiOperation({ summary: 'POST pcmat/:id/revisoes' })
  @Post('pcmat/:id/revisoes')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.program_revision',
    tableName: 'saude.program_revision',
  })
  @ApiCreatedResponse({ description: 'Append an immutable PCMAT revision.' })
  revisePcmat(@Param('id') id: string, @Body() body: CreateProgramRevisionDto) {
    return this.healthProgramService.revise(id, body, 'PCMAT');
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

  @ApiOperation({ summary: 'GET cipa/comissoes' })
  @Get('cipa/comissoes')
  @RequirePermission('saude.program.read')
  @ApiOkResponse({ description: 'CIPA committees.' })
  listCipaCommittees() {
    return this.cipaCommitteeService.list();
  }

  @ApiOperation({ summary: 'POST cipa/comissoes' })
  @Post('cipa/comissoes')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.cipa_committee',
    tableName: 'saude.cipa_committee',
  })
  @ApiCreatedResponse({ description: 'Create a CIPA committee draft.' })
  createCipaCommittee(@Body() body: CreateCipaCommitteeDto) {
    return this.cipaCommitteeService.create(body);
  }

  @ApiOperation({ summary: 'PATCH cipa/comissoes/:id/ativar' })
  @Patch('cipa/comissoes/:id/ativar')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.cipa_committee',
    tableName: 'saude.cipa_committee',
  })
  @ApiOkResponse({ description: 'Activate a CIPA committee mandate.' })
  activateCipaCommittee(@Param('id') id: string) {
    return this.cipaCommitteeService.activate(id);
  }

  @ApiOperation({ summary: 'POST cipa/comissoes/:id/membros' })
  @Post('cipa/comissoes/:id/membros')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.cipa_member',
    tableName: 'saude.cipa_member',
  })
  @ApiCreatedResponse({ description: 'Add a CIPA committee member.' })
  addCipaMember(@Param('id') id: string, @Body() body: AddCipaMemberDto) {
    return this.cipaCommitteeService.addMember(id, body);
  }

  @ApiOperation({ summary: 'POST cipa/comissoes/:id/atas' })
  @Post('cipa/comissoes/:id/atas')
  @RequirePermission('saude.program.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.cipa_minute',
    tableName: 'saude.cipa_minute',
  })
  @ApiCreatedResponse({ description: 'Attach CIPA meeting minutes metadata.' })
  addCipaMinute(@Param('id') id: string, @Body() body: AddCipaMinuteDto) {
    return this.cipaCommitteeService.addMinute(id, body);
  }
}

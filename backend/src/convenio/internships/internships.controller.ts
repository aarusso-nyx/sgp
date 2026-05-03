import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateInternshipDto,
  CreateInternshipProgramDto,
  ExtendInternshipDto,
  TerminateInternshipDto,
} from './internships.dto';
import { InternshipsService } from './internships.service';

@ApiTags('convenio-internships')
@ApiBearerAuth()
@Controller('v1/recrutamento/estagios')
export class InternshipsController {
  constructor(private readonly internshipsService: InternshipsService) {}

  @ApiOperation({ summary: 'GET programas' })
  @Get('programas')
  @RequirePermission('convenio.read')
  @ApiOkResponse({ description: 'List internship programs.' })
  listPrograms(@Query() query: DomainListQueryDto) {
    return this.internshipsService.listPrograms(query);
  }

  @ApiOperation({ summary: 'POST programas' })
  @Post('programas')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.internship_program',
    tableName: 'hr.internship_program',
  })
  @ApiCreatedResponse({ description: 'Create an internship program.' })
  createProgram(@Body() body: CreateInternshipProgramDto) {
    return this.internshipsService.createProgram(body);
  }

  @ApiOperation({ summary: 'GET estagiarios' })
  @Get('estagiarios')
  @RequirePermission('convenio.read')
  @ApiOkResponse({ description: 'List internships.' })
  listInternships(@Query() query: DomainListQueryDto) {
    return this.internshipsService.listInternships(query);
  }

  @ApiOperation({ summary: 'POST estagiarios' })
  @Post('estagiarios')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.internship_record',
    tableName: 'hr.internship_record',
  })
  @ApiCreatedResponse({
    description: 'Create an internship record with a TS-V S-2300 source.',
  })
  createInternship(@Body() body: CreateInternshipDto) {
    return this.internshipsService.createInternship(body);
  }

  @ApiOperation({ summary: 'POST :id/prorrogacao' })
  @Post(':id/prorrogacao')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.internship_record',
    tableName: 'hr.internship_record',
  })
  @ApiOkResponse({ description: 'Extend internship term.' })
  extend(@Param('id') id: string, @Body() body: ExtendInternshipDto) {
    return this.internshipsService.extendInternship(id, body);
  }

  @ApiOperation({ summary: 'POST :id/desligar' })
  @Post(':id/desligar')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.internship_record',
    tableName: 'hr.internship_record',
  })
  @ApiOkResponse({ description: 'Terminate internship.' })
  terminate(@Param('id') id: string, @Body() body: TerminateInternshipDto) {
    return this.internshipsService.terminateInternship(id, body);
  }

  @ApiOperation({ summary: 'POST :id/esocial/s2300' })
  @Post(':id/esocial/s2300')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'esocial.s2300',
    tableName: 'hr.internship_record',
  })
  @ApiOkResponse({ description: 'Build the S-2300 XML for an internship.' })
  buildS2300(@Param('id') id: string) {
    return this.internshipsService.buildS2300(id);
  }
}

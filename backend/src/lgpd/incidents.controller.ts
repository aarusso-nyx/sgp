import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CloseLgpdIncidentDto,
  ComplementLgpdIncidentDto,
  CreateLgpdIncidentDto,
  LgpdIncidentListQueryDto,
  ReportLgpdIncidentDto,
  TriageLgpdIncidentDto,
} from './incidents.dto';
import {
  LgpdSecurityIncidentDto,
  LgpdSecurityIncidentService,
} from './incidents.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'lgpd_security_incident',
  tableName: 'lgpd.security_incident',
})
@Controller('v1/admin/lgpd/incidents')
export class LgpdIncidentsController {
  constructor(
    private readonly incidentsService: LgpdSecurityIncidentService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'List LGPD RCIS security incidents.' })
  list(@Query() query: LgpdIncidentListQueryDto) {
    return this.incidentsService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create a detected LGPD RCIS incident.' })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateLgpdIncidentDto,
  ) {
    const created = await this.incidentsService.create(body);
    await this.auditIncident(request, 'CREATE', created);
    return created;
  }

  @ApiOperation({ summary: 'PATCH :id/triage' })
  @Patch(':id/triage')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Move an LGPD RCIS incident to TRIAGED.' })
  async triage(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TriageLgpdIncidentDto,
  ) {
    const updated = await this.incidentsService.triage(id, body);
    await this.auditIncident(request, 'UPDATE', updated, 'TRIAGED');
    return updated;
  }

  @ApiOperation({ summary: 'PATCH :id/report' })
  @Patch(':id/report')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Move an LGPD RCIS incident to REPORTED.' })
  async report(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReportLgpdIncidentDto,
  ) {
    const updated = await this.incidentsService.report(id, body);
    await this.auditIncident(request, 'UPDATE', updated, 'REPORTED');
    return updated;
  }

  @ApiOperation({ summary: 'PATCH :id/complement' })
  @Patch(':id/complement')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Move an LGPD RCIS incident to COMPLEMENTED.' })
  async complement(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ComplementLgpdIncidentDto,
  ) {
    const updated = await this.incidentsService.complement(id, body);
    await this.auditIncident(request, 'UPDATE', updated, 'COMPLEMENTED');
    return updated;
  }

  @ApiOperation({ summary: 'PATCH :id/close' })
  @Patch(':id/close')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Move an LGPD RCIS incident to CLOSED.' })
  async close(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseLgpdIncidentDto,
  ) {
    const updated = await this.incidentsService.close(id, body);
    await this.auditIncident(request, 'UPDATE', updated, 'CLOSED');
    return updated;
  }

  private auditIncident(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE',
    incident: LgpdSecurityIncidentDto,
    transition?: string,
  ) {
    return this.auditService.auditMutation(
      request,
      action,
      'lgpd_security_incident',
      {
        resourceId: incident.id,
        tableName: 'lgpd.security_incident',
        metadata: {
          transition,
          status: incident.status,
          flowKey: incident.flowKey,
          severity: incident.severity,
          anpdDueAt: incident.anpdDueAt,
          complementDueAt: incident.complementDueAt,
        },
      },
    );
  }
}

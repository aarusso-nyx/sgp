import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { GenerateDutyRosterDto } from '../ponto.dto';
import { DutyRosterService } from './duty-roster.service';
import { RosterProjectorService } from './roster-projector.service';

@ApiTags('ponto-duty-roster')
@ApiBearerAuth()
@Controller('v1/ponto/escalas')
export class DutyRosterController {
  constructor(
    private readonly dutyRosterService: DutyRosterService,
    private readonly rosterProjectorService: RosterProjectorService,
  ) {}

  @Get('rosters')
  @RequirePermission('ponto.roster.read')
  @ApiOkResponse({ description: 'Duty rosters.' })
  list() {
    return this.dutyRosterService.list();
  }

  @Get('rosters/projetar')
  @RequirePermission('ponto.roster.read')
  @ApiOkResponse({ description: 'Projected roster entries.' })
  project(
    @Query('employeeId') employeeId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.rosterProjectorService.projectEmployee(
      employeeId,
      periodStart,
      periodEnd,
    );
  }

  @Post('rosters')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.duty_roster',
    tableName: 'ponto.duty_roster',
  })
  @ApiCreatedResponse({ description: 'Generate duty roster entries.' })
  generate(@Body() body: GenerateDutyRosterDto) {
    return this.dutyRosterService.generate(body);
  }

  @Post('rosters/:dutyRosterId/publicar')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.duty_roster',
    tableName: 'ponto.duty_roster',
  })
  @ApiOkResponse({ description: 'Publish a duty roster.' })
  publish(@Param('dutyRosterId') dutyRosterId: string) {
    return this.dutyRosterService.publish(dutyRosterId);
  }

  @Post('rosters/:dutyRosterId/travar')
  @RequirePermission('ponto.roster.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.duty_roster',
    tableName: 'ponto.duty_roster',
  })
  @ApiOkResponse({ description: 'Lock a duty roster.' })
  lock(@Param('dutyRosterId') dutyRosterId: string) {
    return this.dutyRosterService.lock(dutyRosterId);
  }

  @Get('proximas')
  @RequirePermission('ponto.roster.read')
  @ApiOkResponse({ description: 'Next four weeks for an employee.' })
  upcoming(@Query('employeeId') employeeId?: string) {
    return this.dutyRosterService.upcomingForEmployee(employeeId);
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  EmitCatDto,
  RegisterWorkAccidentDto,
  ReportWorkAccidentDeathDto,
} from './cat.dto';
import { WorkAccidentService } from './work-accident.service';

@ApiTags('saude-cat')
@ApiBearerAuth()
@Controller('v1/saude/acidentes')
export class WorkAccidentController {
  constructor(private readonly service: WorkAccidentService) {}

  @Get()
  @RequirePermission('saude.cat.read')
  @ApiOkResponse({ description: 'Work accident and CAT records.' })
  list() {
    return this.service.list();
  }

  @Get('prazos')
  @RequirePermission('saude.cat.read')
  @ApiOkResponse({ description: 'CAT deadlines due in less than four hours.' })
  deadlines() {
    return this.service.listDeadlineAlerts();
  }

  @Post()
  @RequirePermission('saude.cat.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.work_accident',
    tableName: 'saude.work_accident',
  })
  @ApiCreatedResponse({ description: 'Register a work accident.' })
  register(@Body() body: RegisterWorkAccidentDto) {
    return this.service.register(body);
  }

  @Post(':id/cat')
  @RequirePermission('saude.cat.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.cat_emission',
    tableName: 'saude.cat_emission',
  })
  @ApiCreatedResponse({ description: 'Emit initial, reopening, or death CAT.' })
  emitCat(@Param('id') id: string, @Body() body: EmitCatDto) {
    return this.service.emitCat(id, body);
  }

  @Patch(':id/reabrir')
  @RequirePermission('saude.cat.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.work_accident',
    tableName: 'saude.work_accident',
  })
  @ApiOkResponse({ description: 'Reopen a communicated work accident.' })
  reopen(@Param('id') id: string, @Body() body: Omit<EmitCatDto, 'catKind'>) {
    return this.service.reopen(id, body);
  }

  @Patch(':id/comunicar-obito')
  @RequirePermission('saude.cat.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.work_accident',
    tableName: 'saude.work_accident',
  })
  @ApiOkResponse({ description: 'Register death communication CAT.' })
  reportDeath(
    @Param('id') id: string,
    @Body() body: ReportWorkAccidentDeathDto,
  ) {
    return this.service.reportDeath(id, body);
  }

  @Patch(':id/encerrar')
  @RequirePermission('saude.cat.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.work_accident',
    tableName: 'saude.work_accident',
  })
  @ApiOkResponse({ description: 'Close the work accident lifecycle.' })
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}

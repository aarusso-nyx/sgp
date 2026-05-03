import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateAbsenceJustificationDto,
  DecideAbsenceJustificationDto,
} from '../ponto.dto';
import { JustificationService } from './justification.service';

@ApiTags('ponto-justifications')
@ApiBearerAuth()
@Controller('v1/ponto/justifications')
export class JustificationController {
  constructor(private readonly justificationService: JustificationService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('ponto.justification.read')
  @ApiOkResponse({ description: 'Absence justification requests.' })
  list(@Query('status') status?: string) {
    return this.justificationService.list(status);
  }

  @ApiOperation({ summary: 'POST Request' })
  @Post()
  @RequirePermission('ponto.justification.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.absence_justification',
    tableName: 'ponto.absence_justification',
  })
  @ApiCreatedResponse({ description: 'Request an absence justification.' })
  request(@Body() body: CreateAbsenceJustificationDto) {
    return this.justificationService.request(body);
  }

  @ApiOperation({ summary: 'POST :id/decide' })
  @Post(':id/decide')
  @RequirePermission('ponto.justification.approve')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'ponto.absence_justification',
    tableName: 'ponto.absence_justification',
  })
  @ApiOkResponse({ description: 'Approve or reject an absence justification.' })
  decide(@Param('id') id: string, @Body() body: DecideAbsenceJustificationDto) {
    return this.justificationService.decide(id, body);
  }

  @ApiOperation({ summary: 'POST :id/cancel' })
  @Post(':id/cancel')
  @RequirePermission('ponto.justification.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'ponto.absence_justification',
    tableName: 'ponto.absence_justification',
  })
  @ApiOkResponse({ description: 'Cancel a requested absence justification.' })
  cancel(@Param('id') id: string) {
    return this.justificationService.cancel(id);
  }
}

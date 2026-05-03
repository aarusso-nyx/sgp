import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { MassAdjustmentDto } from './salary-history.dto';
import { SalaryHistoryService } from './salary-history.service';

@ApiTags('avaliacao')
@ApiBearerAuth()
@Controller('v1/avaliacao/salary-history')
export class SalaryHistoryController {
  constructor(private readonly salaryHistoryService: SalaryHistoryService) {}

  @ApiOperation({ summary: 'GET :salaryRangeLevelId/timeline' })
  @Get(':salaryRangeLevelId/timeline')
  @RequirePermission('avaliacao.salary_history.read')
  @ApiOkResponse({ description: 'List salary base history for one level.' })
  timeline(@Param('salaryRangeLevelId') salaryRangeLevelId: string) {
    return this.salaryHistoryService.timeline(salaryRangeLevelId);
  }

  @ApiOperation({ summary: 'POST reajuste-massa' })
  @Post('reajuste-massa')
  @RequirePermission('avaliacao.salary_history.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'avaliacao.salary_history',
    tableName: 'hr.salary_level_history',
  })
  @ApiCreatedResponse({ description: 'Apply mass salary-base adjustment.' })
  massAdjustment(@Body() body: MassAdjustmentDto) {
    return this.salaryHistoryService.applyMassAdjustment(body);
  }
}

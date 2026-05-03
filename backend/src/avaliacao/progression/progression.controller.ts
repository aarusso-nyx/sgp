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
  ProgressionEligibilityQueryDto,
  ProgressionListQueryDto,
  ProgressionSimulationDto,
} from './progression.dto';
import {
  EligibilityService,
  ProgressionApplyService,
  ProgressionSimulationService,
} from './progression.service';

@ApiTags('avaliacao')
@ApiBearerAuth()
@Controller('v1/avaliacao/progression')
export class ProgressionController {
  constructor(
    private readonly eligibilityService: EligibilityService,
    private readonly simulationService: ProgressionSimulationService,
    private readonly applyService: ProgressionApplyService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('avaliacao.progressao.read')
  @ApiOkResponse({ description: 'List functional progressions.' })
  list(@Query() query: ProgressionListQueryDto) {
    return this.simulationService.list(query.status);
  }

  @ApiOperation({ summary: 'GET eligibility' })
  @Get('eligibility')
  @RequirePermission('avaliacao.progressao.read')
  @ApiOkResponse({ description: 'Check employee progression eligibility.' })
  eligibility(@Query() query: ProgressionEligibilityQueryDto) {
    return this.eligibilityService.checkInterstice(
      query.employeeId,
      query.effectDate,
    );
  }

  @ApiOperation({ summary: 'POST simulate' })
  @Post('simulate')
  @RequirePermission('avaliacao.progressao.simulate')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'avaliacao.progressao',
    tableName: 'hr.merit_progression',
  })
  @ApiCreatedResponse({
    description: 'Simulate functional progression impact.',
  })
  simulate(@Body() body: ProgressionSimulationDto) {
    return this.simulationService.simulate(body);
  }

  @ApiOperation({ summary: 'POST :id/apply' })
  @Post(':id/apply')
  @RequirePermission('avaliacao.progressao.apply')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'avaliacao.progressao',
    tableName: 'hr.merit_progression',
  })
  @ApiOkResponse({ description: 'Apply simulated functional progression.' })
  apply(@Param('id') id: string) {
    return this.applyService.apply(id);
  }
}

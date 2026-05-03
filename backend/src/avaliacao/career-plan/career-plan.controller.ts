import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CareerPlanMutationDto, CareerTrailQueryDto } from './career-plan.dto';
import { CareerPlanService } from './career-plan.service';

@ApiTags('avaliacao')
@ApiBearerAuth()
@Controller('v1/avaliacao/career-plan')
export class CareerPlanController {
  constructor(private readonly careerPlanService: CareerPlanService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('avaliacao.pccs.read')
  @ApiOkResponse({ description: 'List PCCS career plans.' })
  list() {
    return this.careerPlanService.list();
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('avaliacao.pccs.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'avaliacao.pccs',
    tableName: 'avaliacao.career_plan',
  })
  @ApiCreatedResponse({ description: 'Create a PCCS career plan.' })
  create(@Body() body: CareerPlanMutationDto) {
    return this.careerPlanService.create(body);
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('avaliacao.pccs.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'avaliacao.pccs',
    tableName: 'avaliacao.career_plan',
  })
  @ApiOkResponse({ description: 'Update a PCCS career plan.' })
  update(@Param('id') id: string, @Body() body: CareerPlanMutationDto) {
    return this.careerPlanService.update(id, body);
  }

  @ApiOperation({ summary: 'GET :id/trilha' })
  @Get(':id/trilha')
  @RequirePermission('avaliacao.pccs.read')
  @ApiOkResponse({ description: 'Return the PCCS progression trail.' })
  trail(@Param('id') id: string, @Query() query: CareerTrailQueryDto) {
    return this.careerPlanService.trail(id, query.employeeId);
  }
}

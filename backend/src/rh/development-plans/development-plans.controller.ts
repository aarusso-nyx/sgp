import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateDevelopmentPlanDto,
  CreateDevelopmentPlanGoalDto,
  UpdateDevelopmentPlanDto,
  UpdateDevelopmentPlanGoalDto,
} from './development-plans.dto';
import { DevelopmentPlansService } from './development-plans.service';

@ApiTags('rh-pdi')
@ApiBearerAuth()
@Controller('v1/rh/pdi')
export class DevelopmentPlansController {
  constructor(private readonly service: DevelopmentPlansService) {}

  @ApiOperation({ summary: 'List development plans for an employee' })
  @Get()
  @RequirePermission('rh.development_plan.read')
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiOkResponse({ description: 'Development plans for the employee.' })
  list(@Query('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.listForEmployee(employeeId);
  }

  @ApiOperation({ summary: 'Get a development plan' })
  @Get(':id')
  @RequirePermission('rh.development_plan.read')
  @ApiOkResponse({ description: 'Development plan summary.' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @ApiOperation({ summary: 'List goals for a development plan' })
  @Get(':id/metas')
  @RequirePermission('rh.development_plan.read')
  @ApiOkResponse({ description: 'Goals for the development plan.' })
  listGoals(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listGoals(id);
  }

  @ApiOperation({ summary: 'Create a development plan' })
  @Post()
  @RequirePermission('rh.development_plan.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.development_plan',
    tableName: 'hr.development_plan',
  })
  @ApiCreatedResponse({ description: 'Development plan created.' })
  create(@Body() body: CreateDevelopmentPlanDto) {
    return this.service.create(body);
  }

  @ApiOperation({ summary: 'Update a development plan' })
  @Patch(':id')
  @RequirePermission('rh.development_plan.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.development_plan',
    tableName: 'hr.development_plan',
  })
  @ApiOkResponse({ description: 'Development plan updated.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDevelopmentPlanDto,
  ) {
    return this.service.update(id, body);
  }

  @ApiOperation({ summary: 'Add a goal to a development plan' })
  @Post(':id/metas')
  @RequirePermission('rh.development_plan.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.development_plan_goal',
    tableName: 'hr.development_plan_goal',
  })
  @ApiCreatedResponse({ description: 'Goal added to development plan.' })
  addGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateDevelopmentPlanGoalDto,
  ) {
    return this.service.addGoal(id, body);
  }

  @ApiOperation({ summary: 'Update a development plan goal' })
  @Patch('metas/:goalId')
  @RequirePermission('rh.development_plan.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.development_plan_goal',
    tableName: 'hr.development_plan_goal',
  })
  @ApiOkResponse({ description: 'Goal updated.' })
  updateGoal(
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @Body() body: UpdateDevelopmentPlanGoalDto,
  ) {
    return this.service.updateGoal(goalId, body);
  }

  @ApiOperation({ summary: 'Remove a development plan goal' })
  @Delete('metas/:goalId')
  @HttpCode(204)
  @RequirePermission('rh.development_plan.write')
  @AuditMutation({
    action: 'DELETE',
    resourceType: 'hr.development_plan_goal',
    tableName: 'hr.development_plan_goal',
  })
  @ApiNoContentResponse({ description: 'Goal removed.' })
  async removeGoal(
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ): Promise<void> {
    await this.service.removeGoal(goalId);
  }
}

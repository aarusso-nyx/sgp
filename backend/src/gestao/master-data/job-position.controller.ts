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
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  JobPositionMutationDto,
  SalaryRangeLevelMutationDto,
  SalaryRangeMutationDto,
} from './job-position.dto';
import { JobPositionService } from './job-position.service';
import {
  SalaryRangeLevelService,
  SalaryRangeService,
} from './salary-range.service';

@ApiTags('gestao')
@ApiBearerAuth()
@Controller('v1/gestao/cargos')
export class JobPositionAdminController {
  constructor(private readonly jobPositionService: JobPositionService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('gestao.cargo.read')
  @ApiOkResponse({ description: 'List job positions.' })
  list(@Query() query: DomainListQueryDto) {
    return this.jobPositionService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.cargo.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.job_position',
    tableName: 'hr.job_position',
  })
  @ApiCreatedResponse({ description: 'Create a job position.' })
  create(@Body() body: JobPositionMutationDto) {
    return this.jobPositionService.create(body);
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('gestao.cargo.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.job_position',
    tableName: 'hr.job_position',
  })
  @ApiOkResponse({ description: 'Update a job position.' })
  update(@Param('id') id: string, @Body() body: JobPositionMutationDto) {
    return this.jobPositionService.update(id, body);
  }

  @ApiOperation({ summary: 'GET :id/tabela-salarial' })
  @Get(':id/tabela-salarial')
  @RequirePermission('gestao.cargo.read')
  @ApiOkResponse({
    description: 'Return the active class by level salary matrix.',
  })
  salaryTable(
    @Param('id') id: string,
    @Query('competencia') competence = '2026-01',
  ) {
    return this.jobPositionService.salaryTable(id, competence);
  }
}

@ApiTags('gestao')
@ApiBearerAuth()
@Controller('v1/gestao/faixas-salariais')
export class SalaryRangeController {
  constructor(private readonly salaryRangeService: SalaryRangeService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('gestao.cargo.read')
  list() {
    return this.salaryRangeService.list();
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.cargo.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.salary_range',
    tableName: 'hr.salary_range',
  })
  create(@Body() body: SalaryRangeMutationDto) {
    return this.salaryRangeService.create(body);
  }
}

@ApiTags('gestao')
@ApiBearerAuth()
@Controller('v1/gestao/faixas-salariais/:salaryRangeId/niveis')
export class SalaryRangeLevelController {
  constructor(
    private readonly salaryRangeLevelService: SalaryRangeLevelService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('gestao.cargo.read')
  list(@Param('salaryRangeId') salaryRangeId: string) {
    return this.salaryRangeLevelService.list(salaryRangeId);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.cargo.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.salary_range_level',
    tableName: 'hr.salary_range_level',
  })
  create(
    @Param('salaryRangeId') salaryRangeId: string,
    @Body() body: SalaryRangeLevelMutationDto,
  ) {
    return this.salaryRangeLevelService.create({ ...body, salaryRangeId });
  }
}

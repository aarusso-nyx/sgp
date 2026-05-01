import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { MasterDataMutationDto } from './master-data.dto';
import { MasterDataService } from './master-data.service';

@ApiTags('gestao')
@ApiBearerAuth()
@Controller('v1/master-data')
export class MasterDataController {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('gestao.master_data.read')
  @ApiOkResponse({ description: 'List the foundational catalog resources.' })
  listResources(@Query() query: DomainListQueryDto) {
    return this.masterDataService.listResources(query);
  }

  @Get(':resource')
  @RequirePermission('gestao.master_data.read')
  @ApiOkResponse({ description: 'List canonical records for one catalog.' })
  listRecords(
    @Param('resource') resource: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.masterDataService.listRecords(resource, query);
  }

  @Post(':resource')
  @RequirePermission('gestao.master_data.write')
  @ApiCreatedResponse({ description: 'Create a canonical catalog record.' })
  async createRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Body() body: MasterDataMutationDto,
  ) {
    const created = await this.masterDataService.createRecord(resource, body);
    await this.auditService.auditMutation(request, 'CREATE', 'master_data', {
      resourceId: created.id,
      tableName: resource,
      metadata: { resource, code: created.code },
    });
    return created;
  }

  @Patch(':resource/:id')
  @RequirePermission('gestao.master_data.write')
  @ApiOkResponse({ description: 'Update a canonical catalog record.' })
  async updateRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: MasterDataMutationDto,
  ) {
    const updated = await this.masterDataService.updateRecord(
      resource,
      id,
      body,
    );
    await this.auditService.auditMutation(request, 'UPDATE', 'master_data', {
      resourceId: updated.id,
      tableName: resource,
      metadata: { resource, code: updated.code },
    });
    return updated;
  }

  @Delete(':resource/:id')
  @RequirePermission('gestao.master_data.write')
  @ApiOkResponse({ description: 'Deactivate a canonical catalog record.' })
  async deactivateRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Param('id') id: string,
  ) {
    const updated = await this.masterDataService.deactivateRecord(resource, id);
    await this.auditService.auditMutation(request, 'DELETE', 'master_data', {
      resourceId: updated.id,
      tableName: resource,
      metadata: { resource, code: updated.code },
    });
    return updated;
  }
}

@ApiTags('gestao')
@ApiBearerAuth()
@Controller('v1/cargos')
export class JobPositionsController {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('gestao.master_data.read')
  @ApiOkResponse({ description: 'List job positions.' })
  list(@Query() query: DomainListQueryDto) {
    return this.masterDataService.listRecords('cargo', query);
  }

  @Post()
  @RequirePermission('gestao.master_data.write')
  @ApiCreatedResponse({ description: 'Create a job position.' })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: MasterDataMutationDto,
  ) {
    const created = await this.masterDataService.createRecord('cargo', body);
    await this.auditService.auditMutation(request, 'CREATE', 'master_data', {
      resourceId: created.id,
      tableName: 'hr.job_position',
      metadata: { resource: 'cargo', code: created.code },
    });
    return created;
  }
}

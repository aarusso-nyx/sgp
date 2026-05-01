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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { MasterDataMutationDto } from './master-data.dto';
import { MasterDataService } from './master-data.service';

@ApiTags('gestao')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/master-data')
export class MasterDataController {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('gestao:read')
  @ApiOkResponse({ description: 'List the foundational catalog resources.' })
  listResources(@Query() query: DomainListQueryDto) {
    return this.masterDataService.listResources(query);
  }

  @Get(':resource')
  @RequirePermissions('gestao:read')
  @ApiOkResponse({ description: 'List canonical records for one catalog.' })
  listRecords(
    @Param('resource') resource: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.masterDataService.listRecords(resource, query);
  }

  @Post(':resource')
  @RequirePermissions('gestao:write')
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
  @RequirePermissions('gestao:write')
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
  @RequirePermissions('gestao:write')
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

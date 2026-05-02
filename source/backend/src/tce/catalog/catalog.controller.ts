import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type {
  LayoutFieldMutationDto,
  LayoutVersionMutationDto,
  TceLayoutStatus,
} from './catalog.types';
import { LayoutFieldService } from './layout-field.service';
import { LayoutVersionService } from './layout-version.service';
import { StateService } from './state.service';

@ApiTags('tce-catalog')
@ApiBearerAuth()
@Controller('v1/tce')
export class CatalogController {
  constructor(
    private readonly stateService: StateService,
    private readonly layoutVersionService: LayoutVersionService,
    private readonly layoutFieldService: LayoutFieldService,
    private readonly auditService: AuditService,
  ) {}

  @Get('states')
  @RequirePermission('tce.catalog.read')
  @ApiOkResponse({
    description: 'List Court of Accounts catalog states and municipal courts.',
  })
  states() {
    return this.stateService.list();
  }

  @Get('states/:code/layouts')
  @RequirePermission('tce.catalog.read')
  @ApiOkResponse({ description: 'List layout versions for a state code.' })
  layouts(@Param('code') code: string) {
    return this.layoutVersionService.listByStateCode(code);
  }

  @Get('layouts/:id/fields')
  @RequirePermission('tce.catalog.read')
  @ApiOkResponse({ description: 'List field metadata for a layout version.' })
  fields(@Param('id') id: string) {
    return this.layoutFieldService.list(id);
  }

  @Post('layouts')
  @RequirePermission('tce.catalog.manage')
  @ApiCreatedResponse({ description: 'Create a draft layout version.' })
  async createLayout(
    @Req() request: RequestWithContext,
    @Body() body: LayoutVersionMutationDto,
  ) {
    const created = await this.layoutVersionService.create(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'tce.layout_version',
      {
        resourceId: created.id,
        tableName: 'tce.layout_version',
        metadata: {
          event: 'tce.catalog.layout.created',
          systemName: created.systemName,
        },
      },
    );
    return created;
  }

  @Patch('layouts/:id/status')
  @RequirePermission('tce.catalog.manage')
  @ApiOkResponse({ description: 'Transition a layout version status.' })
  async transitionLayout(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: { status: TceLayoutStatus },
  ) {
    const updated = await this.layoutVersionService.transition(id, body.status);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'tce.layout_version',
      {
        resourceId: updated.id,
        tableName: 'tce.layout_version',
        metadata: {
          event: 'tce.catalog.layout.status_changed',
          status: updated.status,
        },
      },
    );
    return updated;
  }

  @Post('layout-fields')
  @RequirePermission('tce.catalog.manage')
  @ApiCreatedResponse({ description: 'Create layout field metadata.' })
  async createField(
    @Req() request: RequestWithContext,
    @Body() body: LayoutFieldMutationDto,
  ) {
    const created = await this.layoutFieldService.create(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'tce.layout_field',
      {
        resourceId: created.id,
        tableName: 'tce.layout_field',
        metadata: {
          event: 'tce.catalog.field.created',
          fieldPath: created.fieldPath,
        },
      },
    );
    return created;
  }

  @Delete('layout-fields/:id')
  @RequirePermission('tce.catalog.manage')
  @ApiOkResponse({ description: 'Delete layout field metadata.' })
  async deleteField(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.layoutFieldService.delete(id);
    await this.auditService.auditMutation(
      request,
      'DELETE',
      'tce.layout_field',
      {
        resourceId: deleted.id,
        tableName: 'tce.layout_field',
        metadata: { event: 'tce.catalog.field.deleted' },
      },
    );
    return deleted;
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CreateRopaEntryDto,
  RopaListQueryDto,
  UpdateRopaEntryDto,
} from './ropa.dto';
import { LgpdRopaService } from './ropa.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@Controller('v1/admin/lgpd/ropa')
export class LgpdRopaController {
  constructor(
    private readonly ropaService: LgpdRopaService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'List LGPD ROPA entries for the tenant.' })
  list(@Query() query: RopaListQueryDto) {
    return this.ropaService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create an LGPD ROPA entry.' })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateRopaEntryDto,
  ) {
    const created = await this.ropaService.create(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'lgpd_ropa_entry',
      {
        resourceId: created.id,
        tableName: 'lgpd.ropa_entry',
        metadata: {
          flowKey: created.flowKey,
          operationName: created.operationName,
        },
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Patch an LGPD ROPA entry.' })
  async update(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRopaEntryDto,
  ) {
    const updated = await this.ropaService.update(id, body);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'lgpd_ropa_entry',
      {
        resourceId: updated.id,
        tableName: 'lgpd.ropa_entry',
        metadata: {
          flowKey: updated.flowKey,
          operationName: updated.operationName,
        },
      },
    );
    return updated;
  }
}

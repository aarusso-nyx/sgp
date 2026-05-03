import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { Public } from '../../iam/decorators/require-permission.decorator';
import {
  CreateLaiRequestDto,
  LaiRequestStatusQueryDto,
} from './lai-requests.dto';
import {
  CreatedLaiRequest,
  LaiRequestStatusResponse,
  LaiRequestsService,
} from './lai-requests.service';

@ApiTags('public-lai')
@Controller('v1/public/lai/:tenantId/requests')
export class LaiRequestsController {
  constructor(private readonly laiRequestsService: LaiRequestsService) {}

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @Public()
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'public_data.lai_request',
    tableName: 'public_data.lai_request',
  })
  @ApiCreatedResponse({ description: 'LAI access request received.' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateLaiRequestDto,
  ): Promise<CreatedLaiRequest> {
    return this.laiRequestsService.create(tenantId, body);
  }

  @ApiOperation({ summary: 'GET :protocol/status' })
  @Get(':protocol/status')
  @Public()
  @ApiOkResponse({ description: 'LAI access request public status.' })
  status(
    @Param('tenantId') tenantId: string,
    @Param('protocol') protocol: string,
    @Query() query: LaiRequestStatusQueryDto,
  ): Promise<LaiRequestStatusResponse> {
    return this.laiRequestsService.status(tenantId, protocol, query.accessKey);
  }
}

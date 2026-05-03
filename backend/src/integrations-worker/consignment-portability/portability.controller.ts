import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { UploadPortabilityFileDto } from './portability.dto';
import { PortabilityProcessService } from './portability-process.service';

@ApiTags('payment')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'payment.consignment_portability',
  tableName: 'payment.consignment_portability_detail',
})
@Controller('v1/payment/consignment-portability')
export class PortabilityController {
  constructor(private readonly portabilityService: PortabilityProcessService) {}

  @ApiOperation({ summary: 'POST Upload' })
  @Post()
  @RequirePermission('payment.consignment.write')
  @ApiCreatedResponse({
    description: 'Receive a consignment portability file.',
  })
  upload(@Body() body: UploadPortabilityFileDto) {
    return this.portabilityService.upload(body);
  }

  @ApiOperation({ summary: 'POST :id/process' })
  @Post(':id/process')
  @RequirePermission('payment.consignment.write')
  @ApiOkResponse({ description: 'Process a consignment portability file.' })
  process(@Param('id') id: string) {
    return this.portabilityService.process(id);
  }
}

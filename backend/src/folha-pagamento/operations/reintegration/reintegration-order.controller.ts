import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import {
  ApplyReintegrationOrderDto,
  RegisterReintegrationOrderDto,
} from './reintegration-order.dto';
import { ReintegrationOrderService } from './reintegration-order.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/admin/hr/reintegrations')
export class ReintegrationOrderController {
  constructor(private readonly service: ReintegrationOrderService) {}

  @ApiOperation({ summary: 'POST Register' })
  @Post()
  @RequirePermission('hr.employment.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.reintegration_order',
    tableName: 'hr.reintegration_order',
  })
  @ApiOkResponse({ description: 'Register a reintegration order.' })
  register(@Body() body: RegisterReintegrationOrderDto) {
    return this.service.register(body.employmentLinkId, body);
  }

  @ApiOperation({ summary: 'POST :id/apply' })
  @Post(':id/apply')
  @RequirePermission('hr.employment.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'hr.reintegration_order',
    tableName: 'hr.reintegration_order',
  })
  @ApiOkResponse({
    description: 'Apply a reintegration and reprocess retroactive payroll.',
  })
  apply(@Param('id') id: string, @Body() body: ApplyReintegrationOrderDto) {
    void body;
    return this.service.apply(id);
  }
}

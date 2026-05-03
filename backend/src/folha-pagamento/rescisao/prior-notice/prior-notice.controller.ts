import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { ResolvePriorNoticeDto } from '../rescisao.dto';
import { PriorNoticeService } from './prior-notice.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/admin/terminations')
export class PriorNoticeController {
  constructor(private readonly priorNoticeService: PriorNoticeService) {}

  @ApiOperation({ summary: 'POST :id/prior-notice' })
  @Post(':id/prior-notice')
  @RequirePermission('rh.employee.terminate')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'payment.prior_notice',
    tableName: 'payment.prior_notice',
  })
  @ApiCreatedResponse({ description: 'Resolve and persist CLT prior notice.' })
  resolve(
    @Param('id') employmentLinkId: string,
    @Body() body: ResolvePriorNoticeDto,
  ) {
    return this.priorNoticeService.resolve(
      employmentLinkId,
      body.terminationDate,
      body.kind,
      body.reductionMode ?? 'NONE',
    );
  }
}

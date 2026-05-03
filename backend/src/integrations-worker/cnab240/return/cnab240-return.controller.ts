import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../../audit/audit.service';
import type { RequestWithContext } from '../../../common/request-id/request-with-context';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { ProcessCnab240ReturnDto } from './cnab240-return.dto';
import { Cnab240ReturnProcessService } from './cnab240-return-process.service';

@ApiTags('payment-return-files')
@ApiBearerAuth()
@Controller('v1/payment/return-files')
export class Cnab240ReturnController {
  constructor(
    private readonly service: Cnab240ReturnProcessService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST Process' })
  @Post()
  @RequirePermission('payment.return.write')
  @ApiCreatedResponse({
    description: 'Process a CNAB 240 payroll return file.',
  })
  async process(
    @Req() request: RequestWithContext,
    @Body() body: ProcessCnab240ReturnDto,
  ) {
    const result = await this.service.process({
      remittanceFileId: body.remittanceFileId,
      content: body.content,
      encoding: body.encoding,
      remittanceFileHash: body.remittanceFileHash,
      processedBy: null,
    });
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'payment.return',
      {
        resourceId: result.returnFileId,
        tableName: 'payroll.payment_return_file',
        metadata: { ...result },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST :id/reprocess-rejected' })
  @Post(':id/reprocess-rejected')
  @RequirePermission('payment.return.write')
  @ApiCreatedResponse({
    description:
      'Create a new remittance containing only rejected return details.',
  })
  async reprocessRejected(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const result = await this.service.reprocessRejected(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'payment.return',
      {
        resourceId: result.remittanceFileId,
        tableName: 'payroll.payment_remittance_file',
        metadata: { ...result },
      },
    );
    return result;
  }
}

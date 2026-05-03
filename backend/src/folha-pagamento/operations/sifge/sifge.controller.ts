import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../../audit/audit.service';
import type { RequestWithContext } from '../../../common/request-id/request-with-context';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { CreateFgtsRemittanceDto } from './sifge.dto';
import { SifgeService } from './sifge.service';

@ApiTags('fgts-remittances')
@ApiBearerAuth()
@Controller('v1/admin/fgts/remittances')
export class SifgeController {
  constructor(
    private readonly sifgeService: SifgeService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST Generate' })
  @Post()
  @RequirePermission('payment.remittance.write')
  @ApiCreatedResponse({
    description: 'Generate a GRF or GRRF FGTS remittance.',
  })
  async generate(
    @Req() request: RequestWithContext,
    @Body() body: CreateFgtsRemittanceDto,
  ) {
    const tenantId = request.actor?.tenantId ?? request.tenantId ?? '';
    const result =
      body.kind === 'GRF_MONTHLY'
        ? await this.sifgeService.generateMonthlyGRF(
            tenantId,
            body.competence ?? '',
          )
        : await this.sifgeService.generateTerminationGRRF(
            body.employmentLinkId ?? '',
            body.terminationId ?? '',
          );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'payment.fgts_remittance',
      {
        resourceId: result.id,
        tableName: 'payment.fgts_remittance',
        metadata: {
          kind: body.kind,
          competence: result.competence,
          totalAmount: result.totalAmount,
          adapterKey: result.adapterKey,
          layoutVersion: result.layoutVersion,
        },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'GET :id' })
  @Get(':id')
  @RequirePermission('payroll.fgts.read')
  @ApiOkResponse({ description: 'Get a generated FGTS remittance.' })
  find(@Param('id') id: string) {
    return this.sifgeService.find(id);
  }
}

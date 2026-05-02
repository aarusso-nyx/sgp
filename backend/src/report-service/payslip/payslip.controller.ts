import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentActor } from '../../auth/current-actor.decorator';
import type { AuthenticatedActor } from '../../auth/auth.types';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PayslipBatchRequestDto } from './payslip.dto';
import { PayslipRenderService } from './payslip-render.service';

@ApiTags('payslips')
@ApiBearerAuth()
@Controller()
export class PayslipController {
  constructor(private readonly payslipRenderService: PayslipRenderService) {}

  @Get('v1/portal/payslips')
  @RequirePermission('portal.paystub.read')
  @ApiOkResponse({
    description: 'List authenticated employee payslip PDF files.',
  })
  listPortal(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.payslipRenderService.listPortalFiles(actor);
  }

  @Get('v1/portal/payslips/:id/pdf')
  @RequirePermission('portal.paystub.read')
  @Header('Content-Type', 'application/pdf')
  @ApiOkResponse({
    description: 'Download authenticated employee payslip PDF.',
  })
  async portalDownload(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rendered = await this.payslipRenderService.renderPortalDownload(
      actor,
      id,
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${rendered.fileName}"`,
    );
    response.setHeader('X-Content-SHA256', rendered.fileHash);
    return new StreamableFile(rendered.buffer);
  }

  @Post('v1/admin/payslip-batches')
  @RequirePermission('report.payslip.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'public.payslip_batch',
    tableName: 'public.payslip_batch',
  })
  @ApiCreatedResponse({
    description: 'Generate official payslip PDFs for a competence.',
  })
  createBatch(@Body() body: PayslipBatchRequestDto) {
    return this.payslipRenderService.renderBatch(
      body.payrollRunId,
      body.competence,
    );
  }
}

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
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
import { YearlyIncomeBatchService } from './yearly-income-batch.service';
import { YearlyIncomeBatchRequestDto } from './yearly-income.dto';
import { YearlyIncomeRenderService } from './yearly-income-render.service';

@ApiTags('yearly-income')
@ApiBearerAuth()
@Controller()
export class YearlyIncomeController {
  constructor(
    private readonly renderService: YearlyIncomeRenderService,
    private readonly batchService: YearlyIncomeBatchService,
  ) {}

  @Get('v1/portal/yearly-income')
  @RequirePermission('portal.yearly_income.read')
  @ApiOkResponse({
    description: 'List authenticated employee yearly income reports.',
  })
  listPortal(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.renderService.listPortalFiles(actor);
  }

  @Get('v1/portal/yearly-income/:year/pdf')
  @RequirePermission('portal.yearly_income.read')
  @Header('Content-Type', 'application/pdf')
  @ApiOkResponse({
    description: 'Download authenticated employee yearly income PDF.',
  })
  async portalDownload(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Param('year', ParseIntPipe) year: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rendered = await this.renderService.renderPortalDownload(actor, year);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${rendered.fileName}"`,
    );
    response.setHeader('X-Content-SHA256', rendered.fileHash);
    return new StreamableFile(rendered.buffer);
  }

  @Post('v1/admin/yearly-income-batches')
  @RequirePermission('fiscal.yearly_income.write')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'fiscal.yearly_income_aggregate',
    tableName: 'fiscal.yearly_income_aggregate',
  })
  @ApiCreatedResponse({
    description: 'Generate yearly income PDFs for a year-base.',
  })
  createBatch(@Body() body: YearlyIncomeBatchRequestDto) {
    return this.batchService.generate(body.yearBase);
  }
}

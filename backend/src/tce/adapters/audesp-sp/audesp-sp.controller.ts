import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../../audit/audit.service';
import type { RequestWithContext } from '../../../common/request-id/request-with-context';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { AudespSpSubmissionService } from './audesp-sp.submission.service';

interface CreateAudespSubmissionDto {
  payrollRunId: string;
}

@ApiTags('tce-audesp-sp')
@Controller('v1/tce/audesp-sp/submissions')
export class AudespSpController {
  constructor(
    private readonly service: AudespSpSubmissionService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('tce.submission.read')
  list(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.list(optionalNumber(year), optionalNumber(month));
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('tce.submission.manage')
  async create(
    @Body() body: CreateAudespSubmissionDto,
    @Req() request: RequestWithContext,
  ) {
    const submission = await this.service.createDraft(body.payrollRunId);
    await this.auditService.auditMutation(request, 'CREATE', 'tce.submission', {
      tableName: 'tce.submission',
      resourceId: submission.id,
      metadata: { event: 'tce.audesp_sp.submission.created' },
    });
    return submission;
  }

  @ApiOperation({ summary: 'POST :id/validate' })
  @Post(':id/validate')
  @RequirePermission('tce.submission.manage')
  async validate(@Param('id') id: string, @Req() request: RequestWithContext) {
    const submission = await this.service.validate(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'tce.submission',
      {
        tableName: 'tce.submission',
        resourceId: submission.id,
        metadata: { event: 'tce.audesp_sp.submission.validated' },
      },
    );
    return submission;
  }

  @ApiOperation({ summary: 'POST :id/submit' })
  @Post(':id/submit')
  @RequirePermission('tce.submission.manage')
  async submit(@Param('id') id: string, @Req() request: RequestWithContext) {
    const submission = await this.service.submit(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'tce.submission',
      {
        tableName: 'tce.submission',
        resourceId: submission.id,
        metadata: { event: 'tce.audesp_sp.submission.stub_submitted' },
      },
    );
    return submission;
  }

  @ApiOperation({ summary: 'GET :id/envelope.xml' })
  @Get(':id/envelope.xml')
  @RequirePermission('tce.submission.read')
  envelope(@Param('id') id: string) {
    return this.service.envelopeXml(id);
  }
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  return Number(value);
}

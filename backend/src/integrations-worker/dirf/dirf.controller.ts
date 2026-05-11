import {
  Body,
  Controller,
  Get,
  GoneException,
  Header,
  Param,
  ParseIntPipe,
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

import { AuditService } from '../../audit/audit.service';
import { Idempotent } from '../../common/idempotency/idempotency.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DirfBuilderService } from './dirf-builder.service';
import { GenerateDirfDto } from './dirf.dto';

const DIRF_DEPRECATED_FROM_YEAR_BASE = 2025;

/**
 * @deprecated DIRF generation is retained only for year-base competences before
 * 2025-01-01. Use EFD-Reinf R-4000 for facts from 2025-01-01 onward.
 */
@ApiTags('fiscal-dirf')
@ApiBearerAuth()
@Controller('v1/admin/fiscal/dirf')
export class DirfController {
  constructor(
    private readonly builder: DirfBuilderService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('fiscal.dirf.read')
  @ApiOkResponse({ description: 'List DIRF annual files.' })
  list(
    @Query('yearBase', new ParseIntPipe({ optional: true })) yearBase?: number,
  ) {
    return this.builder.list(yearBase);
  }

  @ApiOperation({ summary: 'GET :id' })
  @Get(':id')
  @RequirePermission('fiscal.dirf.read')
  @ApiOkResponse({ description: 'Get a DIRF annual file with beneficiaries.' })
  find(@Param('id') id: string) {
    return this.builder.find(id);
  }

  @ApiOperation({ summary: 'GET :id/txt' })
  @Get(':id/txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @RequirePermission('fiscal.dirf.read')
  @ApiOkResponse({ description: 'Download generated DIRF TXT content.' })
  async txt(@Param('id') id: string) {
    const result = await this.builder.find(id);
    return result.txtContent;
  }

  @ApiOperation({ summary: 'POST gerar' })
  @Idempotent()
  @Post('gerar')
  @RequirePermission('fiscal.dirf.write')
  @ApiCreatedResponse({ description: 'Generate annual DIRF TXT.' })
  async generate(
    @Req() request: RequestWithContext,
    @Body() body: GenerateDirfDto,
  ) {
    if (body.yearBase >= DIRF_DEPRECATED_FROM_YEAR_BASE) {
      throw new GoneException(
        'DIRF generation is deprecated for competences from 2025-01-01 onward',
      );
    }

    const result = await this.builder.generate(body);
    await this.auditService.auditMutation(request, 'GENERATE', 'fiscal.dirf', {
      resourceId: result.id,
      tableName: 'fiscal.dirf_arquivo',
      metadata: {
        yearBase: result.yearBase,
        kind: result.kind,
        layoutVersion: result.layoutVersion,
        txtHash: result.txtHash,
        totalAmount: result.totalAmount,
        totalIrrf: result.totalIrrf,
      },
    });
    return result;
  }
}

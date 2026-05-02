import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateRepIngestionBatchDto } from '../ponto.dto';
import { RepIngestionService } from './rep-ingestion.service';

@ApiTags('ponto-rep-ingestion')
@ApiBearerAuth()
@Controller('v1/ponto/rep')
export class RepIngestionController {
  constructor(private readonly repIngestionService: RepIngestionService) {}

  @Get('batches')
  @RequirePermission('ponto.rep.read')
  @ApiOkResponse({ description: 'REP ingestion batches.' })
  list() {
    return this.repIngestionService.list();
  }

  @Get('batches/:batchId/original')
  @RequirePermission('ponto.rep.read')
  @Header('content-type', 'text/plain; charset=utf-8')
  @ApiOkResponse({ description: 'Original REP batch file.' })
  async original(@Param('batchId') batchId: string, @Res() response: Response) {
    const original = await this.repIngestionService.getOriginal(batchId);
    response.setHeader(
      'content-disposition',
      `attachment; filename="${original.fileName.replace(/"/g, '')}"`,
    );
    response.send(original.content);
  }

  @Post(':repDeviceId/batches')
  @RequirePermission('ponto.rep.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'ponto.rep_ingestion_batch',
    tableName: 'ponto.rep_ingestion_batch',
  })
  @ApiCreatedResponse({ description: 'Ingest REP batch.' })
  ingest(
    @Param('repDeviceId') repDeviceId: string,
    @Body() body: CreateRepIngestionBatchDto,
  ) {
    return this.repIngestionService.ingest(repDeviceId, body);
  }
}

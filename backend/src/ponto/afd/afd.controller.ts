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
import { CreateAfdExportDto, CreateAfdImportDto } from '../ponto.dto';
import { AfdGeneratorService } from './afd-generator.service';
import { AfdImporterService } from './afd-importer.service';

@ApiTags('ponto-afd')
@ApiBearerAuth()
@Controller('v1/ponto/afd')
export class AfdController {
  constructor(
    private readonly afdGeneratorService: AfdGeneratorService,
    private readonly afdImporterService: AfdImporterService,
  ) {}

  @Get('exports')
  @RequirePermission('ponto.afd.read')
  @ApiOkResponse({ description: 'AFD export history.' })
  listExports() {
    return this.afdGeneratorService.listExports();
  }

  @Post('exports')
  @RequirePermission('ponto.afd.write')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'ponto.afd_export',
    tableName: 'ponto.afd_export',
  })
  @ApiCreatedResponse({ description: 'Generate an AFD export.' })
  createExport(@Body() body: CreateAfdExportDto) {
    return this.afdGeneratorService.createExport(body);
  }

  @Get('exports/:afdExportId/download')
  @RequirePermission('ponto.afd.read')
  @Header('content-type', 'text/plain; charset=iso-8859-1')
  @ApiOkResponse({ description: 'Generated AFD file.' })
  async downloadExport(
    @Param('afdExportId') afdExportId: string,
    @Res() response: Response,
  ) {
    const download = await this.afdGeneratorService.downloadExport(afdExportId);
    response.setHeader(
      'content-disposition',
      `attachment; filename="${download.fileName.replace(/"/g, '')}"`,
    );
    download.stream.pipe(response);
  }

  @Get('imports')
  @RequirePermission('ponto.afd.read')
  @ApiOkResponse({ description: 'AFD import history.' })
  listImports() {
    return this.afdImporterService.listImports();
  }

  @Post('imports')
  @RequirePermission('ponto.afd.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'ponto.afd_import',
    tableName: 'ponto.afd_import',
  })
  @ApiCreatedResponse({ description: 'Import an AFD file.' })
  importAfd(@Body() body: CreateAfdImportDto) {
    return this.afdImporterService.importAfd(body);
  }
}

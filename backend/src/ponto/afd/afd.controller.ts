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
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateAfdExportDto, CreateAfdImportDto } from '../ponto.dto';
import { AfdtAcjefGeneratorService } from './afdt-acjef-generator.service';
import { AfdGeneratorService } from './afd-generator.service';
import { AfdImporterService } from './afd-importer.service';

@ApiTags('ponto-afd')
@ApiBearerAuth()
@Controller('v1/ponto/afd')
export class AfdController {
  constructor(
    private readonly afdGeneratorService: AfdGeneratorService,
    private readonly afdImporterService: AfdImporterService,
    private readonly afdtAcjefGeneratorService: AfdtAcjefGeneratorService,
  ) {}

  @ApiOperation({ summary: 'GET exports' })
  @Get('exports')
  @RequirePermission('ponto.afd.read')
  @ApiOkResponse({ description: 'AFD export history.' })
  listExports() {
    return this.afdGeneratorService.listExports();
  }

  @ApiOperation({ summary: 'POST exports' })
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

  @ApiOperation({ summary: 'POST afdt' })
  @Post('afdt')
  @RequirePermission('ponto.afd.read')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'ponto.afdt_export',
  })
  @Header('content-type', 'text/plain; charset=utf-8')
  @ApiOkResponse({ description: 'Generated AFDT flat file.' })
  async generateAfdt(
    @Body() body: CreateAfdExportDto,
    @Res() response: Response,
  ) {
    const download = await this.afdtAcjefGeneratorService.downloadAfdt(body);
    response.setHeader(
      'content-disposition',
      `attachment; filename="${download.fileName.replace(/"/g, '')}"`,
    );
    download.stream.pipe(response);
  }

  @ApiOperation({ summary: 'POST acjef' })
  @Post('acjef')
  @RequirePermission('ponto.afd.read')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'ponto.acjef_export',
  })
  @Header('content-type', 'text/plain; charset=utf-8')
  @ApiOkResponse({ description: 'Generated ACJEF flat file.' })
  async generateAcjef(
    @Body() body: CreateAfdExportDto,
    @Res() response: Response,
  ) {
    const download = await this.afdtAcjefGeneratorService.downloadAcjef(body);
    response.setHeader(
      'content-disposition',
      `attachment; filename="${download.fileName.replace(/"/g, '')}"`,
    );
    download.stream.pipe(response);
  }

  @ApiOperation({ summary: 'GET exports/:afdExportId/download' })
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

  @ApiOperation({ summary: 'GET imports' })
  @Get('imports')
  @RequirePermission('ponto.afd.read')
  @ApiOkResponse({ description: 'AFD import history.' })
  listImports() {
    return this.afdImporterService.listImports();
  }

  @ApiOperation({ summary: 'POST imports' })
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

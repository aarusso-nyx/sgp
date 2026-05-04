import {
  Body,
  Controller,
  Get,
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
import { recordDctfwebTransmission } from '../../common/observability/prometheus.metrics';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { GenerateDctfwebDto, GenerateDctfwebMitDto } from './dctfweb.dto';
import { DctfwebSignerService } from './dctfweb-signer.service';
import { DctfwebTransmitterService } from './dctfweb-transmitter.service';
import { MitInclusionService } from './mit-inclusion.service';

@ApiTags('fiscal-dctfweb')
@ApiBearerAuth()
@Controller('v1/admin/fiscal/dctfweb')
export class DctfwebController {
  constructor(
    private readonly builder: DctfwebBuilderService,
    private readonly signer: DctfwebSignerService,
    private readonly transmitter: DctfwebTransmitterService,
    private readonly mitInclusion: MitInclusionService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('fiscal.dctfweb.read')
  @ApiOkResponse({ description: 'List DCTFWeb declarations.' })
  list(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
  ) {
    return this.builder.list(year, month);
  }

  @ApiOperation({ summary: 'GET :id' })
  @Get(':id')
  @RequirePermission('fiscal.dctfweb.read')
  @ApiOkResponse({ description: 'Get a DCTFWeb declaration with items.' })
  find(@Param('id') id: string) {
    return this.builder.find(id);
  }

  @ApiOperation({ summary: 'POST gerar' })
  @Post('gerar')
  @RequirePermission('fiscal.dctfweb.write')
  @ApiCreatedResponse({
    description: 'Generate a DCTFWeb declaration from accepted totalizers.',
  })
  async generate(
    @Req() request: RequestWithContext,
    @Body() body: GenerateDctfwebDto,
  ) {
    const result = await this.builder.generate(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      {
        resourceId: result.id,
        tableName: 'fiscal.dctfweb_declaration',
        metadata: {
          competence: result.competence,
          kind: result.kind,
          itemCount: result.itemCount,
          totalAmount: result.totalAmount,
        },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST mit/gerar' })
  @Post('mit/gerar')
  @RequirePermission('fiscal.dctfweb.write')
  @ApiCreatedResponse({
    description:
      'Generate DCTFWeb MIT inclusion XML from pending PGD-DCTF tax debits.',
  })
  async generateMit(
    @Req() request: RequestWithContext,
    @Body() body: GenerateDctfwebMitDto,
  ) {
    const result = await this.mitInclusion.generate(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.dctfweb.mit',
      {
        tableName: 'fiscal.dctf_pgd_tax_debit',
        metadata: {
          competence: result.competence,
          debitCount: result.debitCount,
          totalAmount: result.totalAmount,
          totalCsllAdicionalAmount: result.totalCsllAdicionalAmount,
        },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST :id/assinar' })
  @Post(':id/assinar')
  @RequirePermission('fiscal.dctfweb.write')
  @ApiCreatedResponse({
    description:
      'Sign a DCTFWeb declaration with the tenant ICP-Brasil certificate.',
  })
  async sign(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.signer.sign(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      {
        resourceId: result.id,
        tableName: 'fiscal.dctfweb_declaration',
        metadata: { signedXmlHash: result.signedXmlHash },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST :id/transmitir' })
  @Post(':id/transmitir')
  @RequirePermission('fiscal.dctfweb.write')
  @ApiCreatedResponse({
    description:
      'Transmit a signed DCTFWeb declaration to RFB or sandbox endpoint.',
  })
  async transmit(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.transmitter.transmit(id);
    recordDctfwebTransmission(result.status);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.dctfweb',
      {
        resourceId: result.id,
        tableName: 'fiscal.dctfweb_declaration',
        metadata: {
          status: result.status,
          receiptNumber: result.receiptNumber,
          transmittedXmlHash: result.transmittedXmlHash,
        },
      },
    );
    return result;
  }
}

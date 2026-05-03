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
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { GenerateEfdReinfDto } from './efd-reinf.dto';
import type { EfdReinfEventType } from './efd-reinf.dto';
import { EfdReinfSignerService } from './efd-reinf-signer.service';
import { EfdReinfTransmitterService } from './efd-reinf-transmitter.service';

@ApiTags('fiscal-efd-reinf')
@ApiBearerAuth()
@Controller('v1/admin/fiscal/efd-reinf')
export class EfdReinfController {
  constructor(
    private readonly builder: EfdReinfBuilderService,
    private readonly signer: EfdReinfSignerService,
    private readonly transmitter: EfdReinfTransmitterService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('fiscal.dctfweb.read')
  @ApiOkResponse({ description: 'List EFD-Reinf R-4000 events.' })
  list(
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('eventType') eventType?: EfdReinfEventType,
  ) {
    return this.builder.list(year, month, eventType);
  }

  @ApiOperation({ summary: 'GET :id' })
  @Get(':id')
  @RequirePermission('fiscal.dctfweb.read')
  @ApiOkResponse({ description: 'Get an EFD-Reinf event with items.' })
  find(@Param('id') id: string) {
    return this.builder.find(id);
  }

  @ApiOperation({ summary: 'POST gerar' })
  @Post('gerar')
  @RequirePermission('fiscal.dctfweb.write')
  @ApiCreatedResponse({ description: 'Generate an EFD-Reinf R-4000 event.' })
  async generate(
    @Req() request: RequestWithContext,
    @Body() body: GenerateEfdReinfDto,
  ) {
    const result = await this.builder.generate(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.efd_reinf',
      {
        resourceId: result.id,
        tableName: 'fiscal.efd_reinf_event',
        metadata: {
          competence: result.competence,
          eventType: result.eventType,
          kind: result.kind,
          itemCount: result.itemCount,
          totalRetainedAmount: result.totalRetainedAmount,
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
      'Sign an EFD-Reinf event with the tenant ICP-Brasil certificate.',
  })
  async sign(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.signer.sign(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.efd_reinf',
      {
        resourceId: result.id,
        tableName: 'fiscal.efd_reinf_event',
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
      'Transmit a signed EFD-Reinf event to RFB or sandbox endpoint.',
  })
  async transmit(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.transmitter.transmit(id);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'fiscal.efd_reinf',
      {
        resourceId: result.id,
        tableName: 'fiscal.efd_reinf_event',
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

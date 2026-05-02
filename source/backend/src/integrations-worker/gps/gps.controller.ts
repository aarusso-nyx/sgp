import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { GenerateGpsDto } from './gps.dto';
import type { GpsReason, GpsStatus } from './gps.dto';
import { GpsService } from './gps.service';

@ApiTags('fiscal-gps')
@ApiBearerAuth()
@Controller('v1/admin/fiscal/gps')
export class GpsController {
  constructor(
    private readonly service: GpsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('fiscal.gps.read')
  @ApiOkResponse({ description: 'List residual GPS remittances.' })
  list(@Query('reason') reason?: string, @Query('status') status?: string) {
    return this.service.list(
      reason as GpsReason | undefined,
      status as GpsStatus | undefined,
    );
  }

  @Get('payment-codes')
  @RequirePermission('fiscal.gps.read')
  @ApiOkResponse({ description: 'List active RFB GPS payment codes.' })
  paymentCodes() {
    return this.service.paymentCodes();
  }

  @Get(':id')
  @RequirePermission('fiscal.gps.read')
  @ApiOkResponse({ description: 'Get residual GPS remittance details.' })
  find(@Param('id') id: string) {
    return this.service.find(id);
  }

  @Get(':id/txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @RequirePermission('fiscal.gps.read')
  @ApiOkResponse({ description: 'Download generated GPS TXT content.' })
  async txt(@Param('id') id: string) {
    const result = await this.service.find(id);
    return result.txtContent;
  }

  @Post()
  @RequirePermission('fiscal.gps.write')
  @ApiCreatedResponse({ description: 'Generate residual GPS TXT.' })
  async generate(
    @Req() request: RequestWithContext,
    @Body() body: GenerateGpsDto,
  ) {
    const result = await this.service.generateResidualGPS(body);
    await this.auditService.auditMutation(request, 'GENERATE', 'fiscal.gps', {
      resourceId: result.id,
      tableName: 'fiscal.gps_remittance',
      metadata: {
        competence: result.competence,
        paymentCode: result.paymentCode,
        reason: result.reason,
        totalAmount: result.totalAmount,
        txtHash: result.txtHash,
      },
    });
    return result;
  }
}

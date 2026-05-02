import {
  Body,
  Controller,
  Get,
  Headers,
  Header,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentActor } from '../../auth/current-actor.decorator';
import type { AuthenticatedActor } from '../../auth/auth.types';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import {
  PublishTransparencyDto,
  TransparencyQueryDto,
} from './transparency-query.dto';
import { TransparencyCsvService } from './transparency-csv.service';
import { TransparencyPublishService } from './transparency-publish.service';
import { TransparencyQueryService } from './transparency-query.service';

@ApiTags('public-transparency')
@Controller('v1/public/transparency/:tenantId')
export class TransparencyController {
  constructor(
    private readonly queryService: TransparencyQueryService,
    private readonly csvService: TransparencyCsvService,
    private readonly publishService: TransparencyPublishService,
  ) {}

  @Get('payroll')
  @Public()
  @ApiOkResponse({ description: 'Public payroll transparency snapshot.' })
  async list(
    @Param('tenantId') tenantId: string,
    @Query() query: TransparencyQueryDto,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const etag = `"${await this.queryService.currentHash(tenantId, query.competence)}"`;
    response.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=60',
    );
    response.setHeader('ETag', etag);
    if (ifNoneMatch === etag) {
      response.status(304);
      return undefined;
    }
    return this.queryService.list(tenantId, query);
  }

  @Get('payroll.csv')
  @Public()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="transparency-payroll.csv"',
  )
  async csv(
    @Param('tenantId') tenantId: string,
    @Query() query: TransparencyQueryDto,
  ) {
    return this.csvService.export(tenantId, query);
  }

  @Post('publish')
  @RequirePermission('transparency.publish')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'public_data.transparency_payroll_snapshot',
    tableName: 'public_data.transparency_payroll_snapshot',
  })
  publish(
    @Body() body: PublishTransparencyDto,
    @CurrentActor() actor?: AuthenticatedActor,
  ) {
    return this.publishService.publish(
      body.tenantId,
      body.payrollRunId,
      actor?.sub,
    );
  }
}

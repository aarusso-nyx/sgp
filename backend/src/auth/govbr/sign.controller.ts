import { Body, Controller, Get, Post, Query, Redirect } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import type { AuthenticatedActor } from '../auth.types';
import { CurrentActor } from '../current-actor.decorator';
import type {
  GovBrSignCallbackQueryDto,
  GovBrSignRequestDto,
} from './sign.dto';
import { GovBrSignService } from './sign.service';

@ApiTags('portal-govbr-sign')
@Controller('portal/v1/auth/govbr/sign')
export class GovBrSignController {
  constructor(private readonly signService: GovBrSignService) {}

  @ApiOperation({ summary: 'POST Initiate' })
  @Post()
  @RequirePermission('portal.profile.write')
  @ApiBearerAuth()
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'govbr.advanced_signature_request',
  })
  @ApiCreatedResponse({
    description: 'Create a local gov.br advanced signature sandbox request.',
  })
  initiate(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Body() body: GovBrSignRequestDto,
  ) {
    return this.signService.initiate(actor, body);
  }

  @ApiOperation({ summary: 'GET callback' })
  @Get('callback')
  @Public()
  @Redirect()
  @ApiFoundResponse({
    description:
      'Apply the local sandbox gov.br decision and redirect back to the portal callback route.',
  })
  callback(@Query() query: GovBrSignCallbackQueryDto) {
    const result = this.signService.complete(query);
    return { url: result.redirectUrl, statusCode: 302 };
  }
}

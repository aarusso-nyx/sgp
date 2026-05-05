import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentActor } from '../auth/current-actor.decorator';
import { AuthenticatedActor } from '../auth/actor.types';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { CreateLgpdRightsRequestDto } from './lgpd-rights.dto';
import { LgpdRightsService } from './lgpd-rights.service';

@ApiTags('portal-lgpd')
@ApiBearerAuth()
@Controller('portal/v1/lgpd/direitos')
export class LgpdRightsController {
  constructor(private readonly lgpdRightsService: LgpdRightsService) {}

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('portal.profile.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'lgpd_data_subject_request',
    tableName: 'lgpd.data_subject_request',
  })
  @ApiCreatedResponse({
    description: 'Create an LGPD Art. 18 rights request ticket.',
  })
  create(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Body() body: CreateLgpdRightsRequestDto,
  ) {
    return this.lgpdRightsService.create(actor, body);
  }
}

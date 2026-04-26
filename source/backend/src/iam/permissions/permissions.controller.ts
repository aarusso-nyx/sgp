import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { PermissionsService } from './permissions.service';

@ApiTags('iam')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/iam/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('iam:read')
  @ApiOkResponse({ description: 'List available runtime permissions.' })
  listPermissions() {
    return this.permissionsService.listPermissions();
  }
}

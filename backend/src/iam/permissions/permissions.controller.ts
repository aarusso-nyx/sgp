import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('iam')
@ApiBearerAuth()
@Controller('v1/iam/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @ApiOperation({ summary: 'GET List permissions' })
  @Get()
  @RequirePermission('iam.read')
  @ApiOkResponse({ description: 'List available runtime permissions.' })
  listPermissions() {
    return this.permissionsService.listPermissions();
  }
}

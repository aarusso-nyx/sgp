import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import {
  AssignProfilePermissionsDto,
  CreateProfileDto,
  ProfileListQueryDto,
  UpdateProfileDto,
} from './profiles.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'access_profile', tableName: 'access_profile' })
@Controller('v1/admin/perfis')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'List access profiles.' })
  list(@Query() query: ProfileListQueryDto) {
    return this.profilesService.list(query);
  }

  @ApiOperation({ summary: 'GET :id' })
  @Get(':id')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Fetch one profile with permissions.' })
  getById(@Param('id') id: string) {
    return this.profilesService.getById(id);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create an access profile.' })
  create(@Body() body: CreateProfileDto) {
    return this.profilesService.create(body);
  }

  @ApiOperation({ summary: 'PUT :id' })
  @Put(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Update profile metadata.' })
  update(@Param('id') id: string, @Body() body: UpdateProfileDto) {
    return this.profilesService.update(id, body);
  }

  @ApiOperation({ summary: 'DELETE :id' })
  @Delete(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Deactivate an access profile.' })
  deactivate(@Param('id') id: string) {
    return this.profilesService.deactivate(id);
  }

  @ApiOperation({ summary: 'PUT :id/papeis' })
  @Put(':id/papeis')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Replace profile permission mappings.' })
  setPermissions(
    @Param('id') id: string,
    @Body() body: AssignProfilePermissionsDto,
  ) {
    return this.profilesService.setPermissions(id, body);
  }
}

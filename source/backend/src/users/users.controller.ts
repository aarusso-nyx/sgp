import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  AssignDirectRolesDto,
  AssignProfilesDto,
  CreateUserDto,
  UpdateUserDto,
  UserListQueryDto,
} from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/admin/usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('gestao:read')
  @ApiOkResponse({
    description: 'List admin users with current profile assignments.',
  })
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }

  @Post()
  @RequirePermissions('gestao:write')
  @ApiCreatedResponse({ description: 'Create a new admin user.' })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Update admin user identity/status.' })
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Put(':id/perfis')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Replace admin user profile assignments.' })
  assignProfiles(@Param('id') id: string, @Body() body: AssignProfilesDto) {
    return this.usersService.assignProfiles(id, body);
  }

  @Put(':id/papeis-diretos')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Replace direct role snapshots for a user.' })
  assignDirectRoles(
    @Param('id') id: string,
    @Body() body: AssignDirectRolesDto,
  ) {
    return this.usersService.assignDirectRoles(id, body);
  }
}

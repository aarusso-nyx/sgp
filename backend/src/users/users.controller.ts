import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
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
@AuditMutation({ resourceType: 'user_account', tableName: 'user_account' })
@Controller('v1/admin/usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('gestao.read')
  @ApiOkResponse({
    description: 'List admin users with current profile assignments.',
  })
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }

  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create a new admin user.' })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Update admin user identity/status.' })
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Put(':id/perfis')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Replace admin user profile assignments.' })
  assignProfiles(@Param('id') id: string, @Body() body: AssignProfilesDto) {
    return this.usersService.assignProfiles(id, body);
  }

  @Put(':id/papeis-diretos')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Replace direct role snapshots for a user.' })
  assignDirectRoles(
    @Param('id') id: string,
    @Body() body: AssignDirectRolesDto,
  ) {
    return this.usersService.assignDirectRoles(id, body);
  }
}

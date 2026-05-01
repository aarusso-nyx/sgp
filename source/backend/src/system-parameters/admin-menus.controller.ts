import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { AdminMenusService } from './admin-menus.service';

@ApiTags('menus')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@AuditMutation({ resourceType: 'menu_item', tableName: 'menu_item' })
@Controller('v1/admin/menus')
export class AdminMenusController {
  constructor(private readonly adminMenusService: AdminMenusService) {}

  @Get()
  @RequirePermissions('gestao:read')
  @ApiOkResponse({ description: 'List admin menus.' })
  list() {
    return this.adminMenusService.listMenus();
  }

  @Post()
  @RequirePermissions('gestao:write')
  @ApiCreatedResponse({ description: 'Create admin menu.' })
  create(
    @Body()
    body: {
      codigo: string;
      nome: string;
      rota: string;
      ativo?: boolean;
    },
  ) {
    return this.adminMenusService.createMenu(body);
  }

  @Put(':id')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Update admin menu.' })
  update(
    @Param('id') id: string,
    @Body()
    body: {
      codigo?: string;
      nome?: string;
      rota?: string;
      ativo?: boolean;
    },
  ) {
    return this.adminMenusService.updateMenu(id, body);
  }

  @Delete(':id')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Delete admin menu.' })
  delete(@Param('id') id: string) {
    return this.adminMenusService.deleteMenu(id);
  }
}

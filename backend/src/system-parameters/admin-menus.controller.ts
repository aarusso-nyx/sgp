import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { AdminMenusService } from './admin-menus.service';

@ApiTags('menus')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'menu_item', tableName: 'menu_item' })
@Controller('v1/admin/menus')
export class AdminMenusController {
  constructor(private readonly adminMenusService: AdminMenusService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'List admin menus.' })
  list() {
    return this.adminMenusService.listMenus();
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.write')
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

  @ApiOperation({ summary: 'PUT :id' })
  @Put(':id')
  @RequirePermission('gestao.write')
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

  @ApiOperation({ summary: 'DELETE :id' })
  @Delete(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Delete admin menu.' })
  delete(@Param('id') id: string) {
    return this.adminMenusService.deleteMenu(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { OrganicDefinitionMutationDto } from './organic-definition.dto';
import { OrganicDefinitionService } from './organic-definition.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/rh/organic-definitions')
export class OrganicDefinitionController {
  constructor(
    private readonly organicDefinitionService: OrganicDefinitionService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List organic staffing definitions.' })
  list(@Query() query: DomainListQueryDto) {
    return this.organicDefinitionService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('rh.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.organic_definition',
    tableName: 'hr.organic_definition',
  })
  @ApiCreatedResponse({ description: 'Create an organic staffing definition.' })
  create(@Body() body: OrganicDefinitionMutationDto) {
    return this.organicDefinitionService.create(body);
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('rh.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.organic_definition',
    tableName: 'hr.organic_definition',
  })
  @ApiOkResponse({ description: 'Update an organic staffing definition.' })
  update(@Param('id') id: string, @Body() body: OrganicDefinitionMutationDto) {
    return this.organicDefinitionService.update(id, body);
  }

  @ApiOperation({ summary: 'DELETE :id' })
  @Delete(':id')
  @RequirePermission('rh.write')
  @AuditMutation({
    action: 'DELETE',
    resourceType: 'hr.organic_definition',
    tableName: 'hr.organic_definition',
  })
  @ApiOkResponse({ description: 'Deactivate an organic staffing definition.' })
  deactivate(@Param('id') id: string) {
    return this.organicDefinitionService.deactivate(id);
  }
}

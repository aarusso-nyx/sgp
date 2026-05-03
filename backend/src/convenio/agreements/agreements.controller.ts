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
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { AgreementMutationDto, AgreementPatchDto } from './agreements.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('convenio')
@ApiBearerAuth()
@Controller('v1/convenios')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('convenio.read')
  @ApiOkResponse({ description: 'List agreements.' })
  list(@Query() query: DomainListQueryDto) {
    return this.agreementsService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.agreement',
    tableName: 'hr.agreement',
  })
  @ApiCreatedResponse({ description: 'Create an agreement.' })
  create(@Body() body: AgreementMutationDto) {
    return this.agreementsService.create(body);
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.agreement',
    tableName: 'hr.agreement',
  })
  @ApiOkResponse({ description: 'Update an agreement.' })
  update(@Param('id') id: string, @Body() body: AgreementPatchDto) {
    return this.agreementsService.update(id, body);
  }

  @ApiOperation({ summary: 'DELETE :id' })
  @Delete(':id')
  @RequirePermission('convenio.write')
  @AuditMutation({
    action: 'DELETE',
    resourceType: 'hr.agreement',
    tableName: 'hr.agreement',
  })
  @ApiOkResponse({ description: 'Terminate an agreement.' })
  deactivate(@Param('id') id: string) {
    return this.agreementsService.deactivate(id);
  }
}

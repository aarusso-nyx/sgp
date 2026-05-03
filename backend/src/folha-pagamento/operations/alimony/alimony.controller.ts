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

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import {
  CreateEmployeeAlimonyDto,
  UpdateEmployeeAlimonyDto,
} from './alimony.dto';
import { EmployeeAlimonyService } from './alimony.service';

@ApiTags('rh')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'hr.employee_alimony',
  tableName: 'hr.employee_alimony',
})
@Controller('v1/employees')
export class EmployeeAlimonyController {
  constructor(private readonly alimonyService: EmployeeAlimonyService) {}

  @ApiOperation({ summary: 'GET :id/alimonies' })
  @Get(':id/alimonies')
  @RequirePermission('hr.alimony.read')
  @ApiOkResponse({ description: 'Employee alimony court orders.' })
  list(@Param('id') id: string, @Query('status') status?: string) {
    return this.alimonyService.list(id, status);
  }

  @ApiOperation({ summary: 'POST :id/alimonies' })
  @Post(':id/alimonies')
  @RequirePermission('hr.alimony.write')
  @ApiCreatedResponse({ description: 'Create an employee alimony order.' })
  create(@Param('id') id: string, @Body() body: CreateEmployeeAlimonyDto) {
    return this.alimonyService.create(id, body);
  }

  @ApiOperation({ summary: 'PATCH :id/alimonies/:alimonyId' })
  @Patch(':id/alimonies/:alimonyId')
  @RequirePermission('hr.alimony.write')
  @ApiOkResponse({ description: 'Update an employee alimony order.' })
  update(
    @Param('id') id: string,
    @Param('alimonyId') alimonyId: string,
    @Body() body: UpdateEmployeeAlimonyDto,
  ) {
    return this.alimonyService.update(id, alimonyId, body);
  }

  @ApiOperation({ summary: 'DELETE :id/alimonies/:alimonyId' })
  @Delete(':id/alimonies/:alimonyId')
  @RequirePermission('hr.alimony.write')
  @ApiOkResponse({ description: 'Delete an employee alimony order.' })
  remove(@Param('id') id: string, @Param('alimonyId') alimonyId: string) {
    return this.alimonyService.remove(id, alimonyId);
  }
}

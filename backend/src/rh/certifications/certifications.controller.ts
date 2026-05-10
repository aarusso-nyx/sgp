import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateTrainingCertificateDto,
  UpdateTrainingCertificateDto,
} from './certifications.dto';
import { TrainingCertificationsService } from './certifications.service';

@ApiTags('rh-certificacoes')
@ApiBearerAuth()
@Controller('v1/rh/certificacoes')
export class TrainingCertificationsController {
  constructor(private readonly service: TrainingCertificationsService) {}

  @ApiOperation({ summary: 'List certifications for an employee' })
  @Get()
  @RequirePermission('rh.certification.read')
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiOkResponse({ description: 'Training certificates for the employee.' })
  list(@Query('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.listForEmployee(employeeId);
  }

  @ApiOperation({ summary: 'Register a training certificate' })
  @Post()
  @RequirePermission('rh.certification.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.training_certificate',
    tableName: 'hr.training_certificate',
  })
  @ApiCreatedResponse({ description: 'Training certificate created.' })
  create(@Body() body: CreateTrainingCertificateDto) {
    return this.service.create(body);
  }

  @ApiOperation({ summary: 'Update an existing training certificate' })
  @Patch(':id')
  @RequirePermission('rh.certification.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.training_certificate',
    tableName: 'hr.training_certificate',
  })
  @ApiOkResponse({ description: 'Training certificate updated.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTrainingCertificateDto,
  ) {
    return this.service.update(id, body);
  }

  @ApiOperation({ summary: 'Remove a training certificate' })
  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('rh.certification.write')
  @AuditMutation({
    action: 'DELETE',
    resourceType: 'hr.training_certificate',
    tableName: 'hr.training_certificate',
  })
  @ApiNoContentResponse({ description: 'Training certificate removed.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}

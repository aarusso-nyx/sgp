import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  CreateEnvironmentalExposureDto,
  UpdateEnvironmentalExposureDto,
} from './environmental-exposure.dto';
import { EnvironmentalExposureService } from './environmental-exposure.service';

@ApiTags('saude-exposicoes')
@ApiBearerAuth()
@Controller('v1/saude/exposicoes')
export class EnvironmentalExposureController {
  constructor(private readonly service: EnvironmentalExposureService) {}

  @Get()
  @RequirePermission('saude.exposure.read')
  @ApiOkResponse({ description: 'Environmental exposure records.' })
  list() {
    return this.service.list();
  }

  @Get('folha')
  @RequirePermission('saude.exposure.read')
  @ApiOkResponse({
    description: 'CALC-07 environmental exposure read contract.',
  })
  readForPayroll(
    @Query('employeeId') employeeId: string,
    @Query('refDate') refDate: string,
  ) {
    return this.service.readForPayroll(employeeId, refDate);
  }

  @Post()
  @RequirePermission('saude.exposure.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.environmental_exposure',
    tableName: 'saude.environmental_exposure',
  })
  @ApiCreatedResponse({
    description: 'Create an environmental exposure record.',
  })
  create(@Body() body: CreateEnvironmentalExposureDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  @RequirePermission('saude.exposure.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'saude.environmental_exposure',
    tableName: 'saude.environmental_exposure',
  })
  @ApiOkResponse({ description: 'Update an environmental exposure record.' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateEnvironmentalExposureDto,
  ) {
    return this.service.update(id, body);
  }
}

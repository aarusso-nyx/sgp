import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  CreateLgpdPublicPowerTreatmentDto,
  LgpdPublicPowerTreatmentListQueryDto,
  UpdateLgpdPublicPowerTreatmentDto,
} from './public-power.dto';
import {
  LgpdPublicPowerTreatmentDto,
  LgpdPublicPowerTreatmentService,
} from './public-power.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'lgpd_public_power_treatment',
  tableName: 'lgpd.public_power_treatment',
})
@Controller('v1/admin/lgpd/public-power-treatments')
export class LgpdPublicPowerTreatmentController {
  constructor(
    private readonly treatmentService: LgpdPublicPowerTreatmentService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('auditoria.read')
  @ApiOkResponse({
    description: 'List LGPD treatment-by-public-power workflow records.',
  })
  list(@Query() query: LgpdPublicPowerTreatmentListQueryDto) {
    return this.treatmentService.list(query);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({
    description: 'Create an LGPD treatment-by-public-power workflow record.',
  })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateLgpdPublicPowerTreatmentDto,
  ) {
    const created = await this.treatmentService.create(body);
    await this.auditTreatment(request, 'CREATE', created);
    return created;
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({
    description: 'Patch an LGPD treatment-by-public-power workflow record.',
  })
  async update(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLgpdPublicPowerTreatmentDto,
  ) {
    const updated = await this.treatmentService.update(id, body);
    await this.auditTreatment(request, 'UPDATE', updated);
    return updated;
  }

  private auditTreatment(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE',
    treatment: LgpdPublicPowerTreatmentDto,
  ) {
    return this.auditService.auditMutation(
      request,
      action,
      'lgpd_public_power_treatment',
      {
        resourceId: treatment.id,
        tableName: 'lgpd.public_power_treatment',
        metadata: {
          status: treatment.status,
          flowKey: treatment.flowKey,
          legalBasisReference: treatment.legalBasisReference,
          responsibleArea: treatment.responsibleArea,
        },
      },
    );
  }
}

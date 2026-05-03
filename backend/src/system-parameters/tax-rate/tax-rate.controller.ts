import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  UpsertIrrfTaxRateTableDto,
  UpsertRppsTaxRateTableDto,
} from './tax-rate.dto';
import { TaxRateService } from './tax-rate.service';

@ApiTags('tax-rate')
@ApiBearerAuth()
@Controller('v1/admin/parametros/tax-rate/irrf')
export class TaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('system.tax-rate.read')
  @ApiOkResponse({ description: 'List IRRF progressive tax-rate brackets.' })
  list(@Query('competence') competence?: string) {
    return this.taxRateService.listIrrfTables(competence);
  }

  @ApiOperation({ summary: 'PUT Upsert' })
  @Put()
  @RequirePermission('system.tax-rate.write')
  @AuditMutation({
    resourceType: 'system.tax_rate',
    tableName: 'public.tax_rate',
  })
  @ApiOkResponse({
    description: 'Replace one IRRF progressive table by competence.',
  })
  upsert(@Body() body: UpsertIrrfTaxRateTableDto) {
    return this.taxRateService.upsertIrrfTable(body);
  }
}

@ApiTags('tax-rate')
@ApiBearerAuth()
@Controller('v1/admin/parametros/tax-rate/rpps')
export class RppsTaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('system.tax-rate.read')
  @ApiOkResponse({ description: 'List RPPS progressive tax-rate brackets.' })
  list(@Query('competence') competence?: string) {
    return this.taxRateService.listRppsTables(competence);
  }

  @ApiOperation({ summary: 'PUT Upsert' })
  @Put()
  @RequirePermission('system.tax-rate.write')
  @AuditMutation({
    resourceType: 'system.tax_rate',
    tableName: 'public.tax_rate',
  })
  @ApiOkResponse({
    description: 'Replace one RPPS progressive table by competence.',
  })
  upsert(@Body() body: UpsertRppsTaxRateTableDto) {
    return this.taxRateService.upsertRppsTable(body);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  BlockedPaymentQueryDto,
  FinancialRecordQueryDto,
  FunctionalRecordQueryDto,
  OperationalHistoryQueryDto,
} from './consultas.dto';
import { ManagerialQueriesService } from './managerial-queries.service';

@ApiTags('consultas')
@ApiBearerAuth()
@Controller('v1/consultas')
export class ManagerialQueriesController {
  constructor(
    private readonly managerialQueriesService: ManagerialQueriesService,
  ) {}

  @Get('ficha-financeira')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List employee financial records.' })
  listFinancialRecords(@Query() query: FinancialRecordQueryDto) {
    return this.managerialQueriesService.listFinancialRecords(query);
  }

  @Get('ficha-funcional')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List functional employee records.' })
  listFunctionalRecords(@Query() query: FunctionalRecordQueryDto) {
    return this.managerialQueriesService.listFunctionalRecords(query);
  }

  @Get('relatorios-situacao')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List grouped personnel status totals.' })
  listSituationReports() {
    return this.managerialQueriesService.listSituationReports();
  }

  @Get('pagamentos-bloqueados')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List blocked payments.' })
  listBlockedPayments(@Query() query: BlockedPaymentQueryDto) {
    return this.managerialQueriesService.listBlockedPayments(query);
  }

  @Get('historico-operacional')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List operational audit history.' })
  listOperationalHistory(@Query() query: OperationalHistoryQueryDto) {
    return this.managerialQueriesService.listOperationalHistory(query);
  }

  @Get('dashboards')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'Return managerial dashboard totals.' })
  dashboard() {
    return this.managerialQueriesService.dashboard();
  }
}

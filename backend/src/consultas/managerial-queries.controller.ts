import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

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

  @ApiOperation({ summary: 'GET ficha-financeira' })
  @Get('ficha-financeira')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List employee financial records.' })
  listFinancialRecords(@Query() query: FinancialRecordQueryDto) {
    return this.managerialQueriesService.listFinancialRecords(query);
  }

  @ApiOperation({ summary: 'GET ficha-funcional' })
  @Get('ficha-funcional')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List functional employee records.' })
  listFunctionalRecords(@Query() query: FunctionalRecordQueryDto) {
    return this.managerialQueriesService.listFunctionalRecords(query);
  }

  @ApiOperation({ summary: 'GET relatorios-situacao' })
  @Get('relatorios-situacao')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List grouped personnel status totals.' })
  listSituationReports() {
    return this.managerialQueriesService.listSituationReports();
  }

  @ApiOperation({ summary: 'GET pagamentos-bloqueados' })
  @Get('pagamentos-bloqueados')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List blocked payments.' })
  listBlockedPayments(@Query() query: BlockedPaymentQueryDto) {
    return this.managerialQueriesService.listBlockedPayments(query);
  }

  @ApiOperation({ summary: 'GET historico-operacional' })
  @Get('historico-operacional')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'List operational audit history.' })
  listOperationalHistory(@Query() query: OperationalHistoryQueryDto) {
    return this.managerialQueriesService.listOperationalHistory(query);
  }

  @ApiOperation({ summary: 'GET dashboards' })
  @Get('dashboards')
  @RequirePermission('consultas.read')
  @ApiOkResponse({ description: 'Return managerial dashboard totals.' })
  dashboard() {
    return this.managerialQueriesService.dashboard();
  }
}

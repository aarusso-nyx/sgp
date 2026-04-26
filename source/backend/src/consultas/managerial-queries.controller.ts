import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import {
  BlockedPaymentQueryDto,
  FinancialRecordQueryDto,
  FunctionalRecordQueryDto,
  OperationalHistoryQueryDto,
} from './consultas.dto';
import { ManagerialQueriesService } from './managerial-queries.service';

@ApiTags('consultas')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/consultas')
export class ManagerialQueriesController {
  constructor(
    private readonly managerialQueriesService: ManagerialQueriesService,
  ) {}

  @Get('ficha-financeira')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'List employee financial records.' })
  listFinancialRecords(@Query() query: FinancialRecordQueryDto) {
    return this.managerialQueriesService.listFinancialRecords(query);
  }

  @Get('ficha-funcional')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'List functional employee records.' })
  listFunctionalRecords(@Query() query: FunctionalRecordQueryDto) {
    return this.managerialQueriesService.listFunctionalRecords(query);
  }

  @Get('relatorios-situacao')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'List grouped personnel status totals.' })
  listSituationReports() {
    return this.managerialQueriesService.listSituationReports();
  }

  @Get('pagamentos-bloqueados')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'List blocked payments.' })
  listBlockedPayments(@Query() query: BlockedPaymentQueryDto) {
    return this.managerialQueriesService.listBlockedPayments(query);
  }

  @Get('historico-operacional')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'List operational audit history.' })
  listOperationalHistory(@Query() query: OperationalHistoryQueryDto) {
    return this.managerialQueriesService.listOperationalHistory(query);
  }

  @Get('dashboards')
  @RequirePermissions('consultas:read')
  @ApiOkResponse({ description: 'Return managerial dashboard totals.' })
  dashboard() {
    return this.managerialQueriesService.dashboard();
  }
}

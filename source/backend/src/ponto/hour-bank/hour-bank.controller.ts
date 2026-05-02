import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  AccrueHourBankDayDto,
  CompensateHourBankDto,
  CreateHourBankDto,
  ManualHourBankAdjustmentDto,
  SettleHourBankDto,
} from '../ponto.dto';
import { HourBankAccrualService } from './hour-bank-accrual.service';
import { HourBankCompensationService } from './hour-bank-compensation.service';
import { HourBankSettlementService } from './hour-bank-settlement.service';
import { HourBankService } from './hour-bank.service';

@ApiTags('ponto-hour-bank')
@ApiBearerAuth()
@Controller('v1/ponto/banco-horas')
export class HourBankController {
  constructor(
    private readonly hourBankService: HourBankService,
    private readonly accrualService: HourBankAccrualService,
    private readonly compensationService: HourBankCompensationService,
    private readonly settlementService: HourBankSettlementService,
  ) {}

  @Get()
  @RequirePermission('ponto.hourbank.read')
  @ApiOkResponse({ description: 'Hour-bank balances.' })
  list() {
    return this.hourBankService.list();
  }

  @Post()
  @RequirePermission('ponto.hourbank.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.hour_bank',
    tableName: 'ponto.hour_bank',
  })
  @ApiCreatedResponse({ description: 'Open an hour bank.' })
  create(@Body() body: CreateHourBankDto) {
    return this.hourBankService.create(body);
  }

  @Get(':hourBankId/movimentos')
  @RequirePermission('ponto.hourbank.read')
  @ApiOkResponse({ description: 'Hour-bank movement ledger.' })
  movements(@Param('hourBankId') hourBankId: string) {
    return this.hourBankService.movements(hourBankId);
  }

  @Post('acumular-dia')
  @RequirePermission('ponto.hourbank.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.hour_bank_movement',
    tableName: 'ponto.hour_bank_movement',
  })
  @ApiCreatedResponse({ description: 'Accrue a daily delta.' })
  accrueDay(@Body() body: AccrueHourBankDayDto) {
    return this.accrualService.accrueDay(body);
  }

  @Post('compensar')
  @RequirePermission('ponto.hourbank.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.hour_bank_movement',
    tableName: 'ponto.hour_bank_movement',
  })
  @ApiCreatedResponse({ description: 'Compensate positive balance.' })
  compensate(@Body() body: CompensateHourBankDto) {
    return this.compensationService.compensate(body);
  }

  @Post('ajuste-manual')
  @RequirePermission('ponto.hourbank.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.hour_bank_movement',
    tableName: 'ponto.hour_bank_movement',
  })
  @ApiCreatedResponse({ description: 'Create an audited manual adjustment.' })
  manualAdjustment(@Body() body: ManualHourBankAdjustmentDto) {
    return this.hourBankService.manualAdjustment(body);
  }

  @Post('zerar-vencidos')
  @RequirePermission('ponto.hourbank.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'ponto.hour_bank',
    tableName: 'ponto.hour_bank',
  })
  @ApiOkResponse({ description: 'Settle expired hour banks.' })
  settleExpired(@Body() body: SettleHourBankDto) {
    return this.settlementService.settleExpired(body);
  }
}

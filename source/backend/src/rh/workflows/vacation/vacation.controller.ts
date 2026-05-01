import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { ScheduleVacationDto } from './vacation.dto';
import { VacationService } from './vacation.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/ferias')
export class VacationController {
  constructor(private readonly vacationService: VacationService) {}

  @Get('saldo/:employee_id')
  @RequirePermission('rh.vacation.read')
  @ApiOkResponse({
    description: 'Employee vacation balance by accrual period.',
  })
  balance(
    @Param('employee_id') employeeId: string,
    @Query('referenceDate') referenceDate?: string,
  ) {
    return this.vacationService.getBalance(
      employeeId,
      referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : undefined,
    );
  }

  @Post('programacao')
  @RequirePermission('rh.vacation.request')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.vacation_record',
    tableName: 'hr.vacation_record',
  })
  @ApiCreatedResponse({
    description: 'Schedule employee vacation installments.',
  })
  schedule(@Body() body: ScheduleVacationDto) {
    return this.vacationService.schedule(body);
  }

  @Post('programacao/:id/aprovar')
  @RequirePermission('rh.vacation.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.vacation_record',
    tableName: 'hr.vacation_record',
  })
  @ApiOkResponse({ description: 'Approve a scheduled vacation installment.' })
  approve(@Param('id') id: string) {
    return this.vacationService.approve(id);
  }

  @Post('programacao/:id/cancelar')
  @RequirePermission('rh.vacation.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.vacation_record',
    tableName: 'hr.vacation_record',
  })
  @ApiOkResponse({ description: 'Cancel a scheduled vacation installment.' })
  cancel(@Param('id') id: string) {
    return this.vacationService.cancel(id);
  }
}

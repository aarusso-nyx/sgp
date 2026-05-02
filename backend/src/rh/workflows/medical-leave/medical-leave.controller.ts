import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { ScheduleMedicalLeaveAppointmentDto } from './medical-leave.dto';
import { MedicalLeaveService } from './medical-leave.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/licencas/saude')
export class MedicalLeaveController {
  constructor(private readonly medicalLeaveService: MedicalLeaveService) {}

  @Get(':employee_id')
  @RequirePermission('rh.medical_leave.read')
  @ApiOkResponse({ description: 'List employee medical leaves.' })
  list(@Param('employee_id') employeeId: string) {
    return this.medicalLeaveService.listByEmployee(employeeId);
  }

  @Post('agendamento')
  @RequirePermission('saude.appointment.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.medical_appointment',
    tableName: 'hr.medical_appointment',
  })
  @ApiCreatedResponse({
    description: 'Schedule an official medical leave appointment.',
  })
  schedule(@Body() body: ScheduleMedicalLeaveAppointmentDto) {
    return this.medicalLeaveService.schedule(body);
  }
}

import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CreateMedicalRecordDto,
  ReplicateMedicalRecordDto,
  SchedulePericiaDto,
  UpdatePericiaAppointmentDto,
  ValidateMedicalRecordDto,
} from './pericia.dto';
import { PericiaService } from './pericia.service';

@ApiTags('saude')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/pericia')
export class PericiaController {
  constructor(
    private readonly periciaService: PericiaService,
    private readonly auditService: AuditService,
  ) {}

  @Post('agendamentos')
  @RequirePermissions('saude:write')
  @ApiCreatedResponse({ description: 'Schedule a medical appointment.' })
  async scheduleAppointment(
    @Req() request: RequestWithContext,
    @Body() body: SchedulePericiaDto,
  ) {
    const created = await this.periciaService.scheduleAppointment(body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'medical_appointment',
      {
        resourceId: created.id,
        tableName: 'medical_appointment',
      },
    );
    return created;
  }

  @Patch('agendamentos/:agendamento_id')
  @RequirePermissions('saude:write')
  @ApiOkResponse({
    description: 'Update a medical appointment attendance status.',
  })
  async updateAppointment(
    @Req() request: RequestWithContext,
    @Param('agendamento_id') appointmentId: string,
    @Body() body: UpdatePericiaAppointmentDto,
  ) {
    const updated = await this.periciaService.updateAppointment(
      appointmentId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'UPDATE',
      'medical_appointment',
      {
        resourceId: updated.id,
        tableName: 'medical_appointment',
      },
    );
    return updated;
  }

  @Post('prontuarios')
  @RequirePermissions('saude:write')
  @ApiCreatedResponse({
    description: 'Create a medical record and optional leave.',
  })
  async createMedicalRecord(
    @Req() request: RequestWithContext,
    @Body() body: CreateMedicalRecordDto,
  ) {
    const created = await this.periciaService.createMedicalRecord(body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'medical_record',
      {
        resourceId: created.id,
        tableName: 'medical_record',
        metadata: { leaveId: created.licenca?.id ?? null },
      },
    );
    return created;
  }

  @Patch('prontuarios/:prontuario_id/validar')
  @RequirePermissions('saude:write')
  @ApiOkResponse({ description: 'Approve or reject a medical record.' })
  async validateMedicalRecord(
    @Req() request: RequestWithContext,
    @Param('prontuario_id') medicalRecordId: string,
    @Body() body: ValidateMedicalRecordDto,
  ) {
    const updated = await this.periciaService.validateMedicalRecord(
      medicalRecordId,
      body,
    );
    await this.auditService.appendEvent(
      request,
      body.decisao === 'APROVAR' ? 'APPROVE' : 'REJECT',
      'medical_record',
      {
        resourceId: updated.id,
        tableName: 'medical_record',
        metadata: { decision: body.decisao },
      },
    );
    return updated;
  }

  @Post('prontuarios/:prontuario_id/replicar')
  @RequirePermissions('saude:write')
  @ApiCreatedResponse({
    description: 'Replicate medical leave to additional registrations.',
  })
  async replicateMedicalRecord(
    @Req() request: RequestWithContext,
    @Param('prontuario_id') medicalRecordId: string,
    @Body() body: ReplicateMedicalRecordDto,
  ) {
    const replicated = await this.periciaService.replicateMedicalRecord(
      medicalRecordId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'PROCESS',
      'medical_leave',
      {
        resourceId: medicalRecordId,
        tableName: 'medical_leave',
        metadata: { replicatedEmployees: replicated.matriculasReplicadas },
      },
    );
    return replicated;
  }
}

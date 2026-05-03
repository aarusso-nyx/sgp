import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CreateMedicalRecordDto,
  ReplicateMedicalRecordDto,
  RecordMedicalOpinionDto,
  SchedulePericiaDto,
  UpdatePericiaAppointmentDto,
  ValidateMedicalRecordDto,
} from './pericia.dto';
import { PericiaService } from './pericia.service';

@ApiTags('saude')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'medical_record', tableName: 'medical_record' })
@Controller('v1/pericia')
export class PericiaController {
  constructor(
    private readonly periciaService: PericiaService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST agendamentos' })
  @Post('agendamentos')
  @RequirePermission('saude.write')
  @ApiCreatedResponse({ description: 'Schedule a medical appointment.' })
  async scheduleAppointment(
    @Req() request: RequestWithContext,
    @Body() body: SchedulePericiaDto,
  ) {
    const created = await this.periciaService.scheduleAppointment(body);
    await this.auditService.auditMutation(
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

  @ApiOperation({ summary: 'PATCH agendamentos/:agendamento_id' })
  @Patch('agendamentos/:agendamento_id')
  @RequirePermission('saude.write')
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
    await this.auditService.auditMutation(
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

  @ApiOperation({ summary: 'POST prontuarios' })
  @Post('prontuarios')
  @RequirePermission('saude.write')
  @ApiCreatedResponse({
    description: 'Create a medical record and optional leave.',
  })
  async createMedicalRecord(
    @Req() request: RequestWithContext,
    @Body() body: CreateMedicalRecordDto,
  ) {
    const created = await this.periciaService.createMedicalRecord(body);
    await this.auditService.auditMutation(request, 'CREATE', 'medical_record', {
      resourceId: created.id,
      tableName: 'medical_record',
      metadata: { leaveId: created.licenca?.id ?? null },
    });
    return created;
  }

  @ApiOperation({ summary: 'POST agendamentos/:agendamento_id/parecer' })
  @Post('agendamentos/:agendamento_id/parecer')
  @RequirePermission('saude.opinion.write')
  @ApiCreatedResponse({
    description: 'Record an official medical opinion for an appointment.',
  })
  async recordOpinion(
    @Req() request: RequestWithContext,
    @Param('agendamento_id') appointmentId: string,
    @Body() body: RecordMedicalOpinionDto,
  ) {
    const created = await this.periciaService.recordOpinion(
      appointmentId,
      body,
    );
    await this.auditService.auditMutation(request, 'CREATE', 'medical_record', {
      resourceId: created.id,
      tableName: 'medical_record',
      metadata: {
        appointmentId,
        leaveId: created.licenca?.id ?? null,
      },
    });
    return created;
  }

  @ApiOperation({ summary: 'PATCH prontuarios/:prontuario_id/validar' })
  @Patch('prontuarios/:prontuario_id/validar')
  @RequirePermission('saude.write')
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

  @ApiOperation({ summary: 'POST prontuarios/:prontuario_id/replicar' })
  @Post('prontuarios/:prontuario_id/replicar')
  @RequirePermission('saude.write')
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
    await this.auditService.auditMutation(request, 'PROCESS', 'medical_leave', {
      resourceId: medicalRecordId,
      tableName: 'medical_leave',
      metadata: { replicatedEmployees: replicated.matriculasReplicadas },
    });
    return replicated;
  }
}

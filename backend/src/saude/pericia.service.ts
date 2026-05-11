import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { PericiaAppointmentWorkflowService } from './pericia-appointment-workflow.service';
import {
  CreateMedicalRecordDto,
  RecordMedicalOpinionDto,
  ReplicateMedicalRecordDto,
  SchedulePericiaDto,
  UpdatePericiaAppointmentDto,
  ValidateMedicalRecordDto,
} from './pericia.dto';
import { PericiaMedicalRecordWorkflowService } from './pericia-medical-record-workflow.service';
import { PericiaReplicationWorkflowService } from './pericia-replication-workflow.service';
import type {
  MedicalRecordSummary,
  PericiaAppointmentSummary,
} from './pericia.shared';

export type {
  MedicalLeaveSummary,
  MedicalRecordSummary,
  PericiaAppointmentSummary,
} from './pericia.shared';

@Injectable()
export class PericiaService {
  constructor(
    databaseService: DatabaseService,
    private readonly appointmentWorkflow = new PericiaAppointmentWorkflowService(
      databaseService,
    ),
    private readonly medicalRecordWorkflow = new PericiaMedicalRecordWorkflowService(
      databaseService,
    ),
    private readonly replicationWorkflow = new PericiaReplicationWorkflowService(
      databaseService,
    ),
  ) {}

  async scheduleAppointment(
    input: SchedulePericiaDto,
  ): Promise<PericiaAppointmentSummary> {
    return this.appointmentWorkflow.scheduleAppointment(input);
  }

  async updateAppointment(
    appointmentId: string,
    input: UpdatePericiaAppointmentDto,
  ): Promise<PericiaAppointmentSummary> {
    return this.appointmentWorkflow.updateAppointment(appointmentId, input);
  }

  async createMedicalRecord(
    input: CreateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    return this.medicalRecordWorkflow.createMedicalRecord(input);
  }

  async validateMedicalRecord(
    medicalRecordId: string,
    input: ValidateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    return this.medicalRecordWorkflow.validateMedicalRecord(
      medicalRecordId,
      input,
    );
  }

  async recordOpinion(
    appointmentId: string,
    opinion: RecordMedicalOpinionDto,
  ): Promise<MedicalRecordSummary> {
    return this.medicalRecordWorkflow.recordOpinion(appointmentId, opinion);
  }

  async replicateMedicalRecord(
    medicalRecordId: string,
    input: ReplicateMedicalRecordDto,
  ): Promise<{ prontuarioId: string; matriculasReplicadas: string[] }> {
    return this.replicationWorkflow.replicateMedicalRecord(
      medicalRecordId,
      input,
    );
  }
}

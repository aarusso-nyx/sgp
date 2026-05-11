import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  CreateMedicalRecordDto,
  RecordMedicalOpinionDto,
  ValidateMedicalRecordDto,
} from './pericia.dto';
import {
  AppointmentRow,
  MedicalLeaveRow,
  MedicalLeaveSummary,
  MedicalRecordRow,
  MedicalRecordSummary,
  PERICIA_ERRORS,
  ensurePericiaDatabase,
  toLeaveSummary,
  toMedicalRecordSummary,
  toOptionalLeave,
} from './pericia.shared';

@Injectable()
export class PericiaMedicalRecordWorkflowService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createMedicalRecord(
    input: CreateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    ensurePericiaDatabase(this.databaseService);

    const appointment = await this.databaseService.query<AppointmentRow>(
      `
      SELECT
        id,
        employee_id::text,
        slot_ref,
        scheduled_on,
        scheduled_time,
        contact_phone,
        status::text AS status
      FROM hr.medical_appointment
      WHERE id = $1::uuid
      `,
      [input.agendamentoId],
    );
    const currentAppointment = appointment[0];
    if (!currentAppointment) {
      throw PERICIA_ERRORS.appointmentNotFound();
    }
    if (!['ATTENDED', 'SCHEDULED'].includes(currentAppointment.status)) {
      throw PERICIA_ERRORS.appointmentRecordCreationUnavailable();
    }

    const recordRows = await this.databaseService.query<MedicalRecordRow>(
      `
      WITH updated_appointment AS (
        UPDATE hr.medical_appointment
        SET status = 'ATTENDED'::"MedicalAppointmentStatus",
            attended_at = COALESCE(attended_at, now()),
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, employee_id
      )
      INSERT INTO hr.medical_record (
        appointment_id,
        employee_id,
        physician_ref,
        reason,
        current_illness_story,
        physical_exam,
        diagnosis,
        expert_action,
        report_type,
        report_status,
        primary_icd_ref,
        multidisciplinary_team
      )
      SELECT
        appointment.id,
        appointment.employee_id,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        CASE $9
          WHEN 'APROVADO' THEN 'APPROVED'::"MedicalReportStatus"
          WHEN 'REPROVADO' THEN 'REJECTED'::"MedicalReportStatus"
          ELSE 'PENDING_SUBMISSION'::"MedicalReportStatus"
        END,
        NULLIF($10, ''),
        $11::jsonb
      FROM updated_appointment appointment
      RETURNING
        id,
        appointment_id::text,
        employee_id::text,
        report_status::text AS report_status,
        approved_by_ref,
        approved_at
      `,
      [
        input.agendamentoId,
        input.medicoId.trim(),
        input.motivo.trim(),
        input.hda?.trim() ?? '',
        input.exameFisico?.trim() ?? '',
        input.diagnostico?.trim() ?? '',
        input.acaoPericial?.trim() ?? '',
        input.tipoLaudo?.trim() ?? '',
        input.situacaoLaudo?.trim() ?? '',
        input.cidPrincipalId ?? '',
        JSON.stringify(input.equipeMultiprofissional ?? []),
      ],
    );
    const record = recordRows[0];
    if (!record) {
      throw PERICIA_ERRORS.recordCreationFailed();
    }

    let leave: MedicalLeaveSummary | null = null;
    if (input.licenca) {
      const leaveRows = await this.databaseService.query<MedicalLeaveRow>(
        `
        WITH inserted_leave AS (
          INSERT INTO hr.medical_leave (
            medical_record_id,
            employee_id,
            evaluation_type,
            social_security_benefit,
            absence_reason_id,
            icd_ref,
            granted_days,
            starts_on,
            ends_on
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            NULLIF($4, ''),
            NULLIF($5, '')::uuid,
            NULLIF($6, ''),
            $7,
            $8::date,
            $9::date
          )
          RETURNING id, employee_id, granted_days, starts_on, ends_on
        ),
        updated_employee AS (
          UPDATE hr.employee
          SET lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
              updated_at = now()
          WHERE id = $2::uuid
        )
        SELECT
          id,
          employee_id::text,
          granted_days,
          starts_on,
          ends_on
        FROM inserted_leave
        `,
        [
          record.id,
          record.employee_id,
          input.licenca.tipoAvaliacao.trim(),
          input.licenca.beneficioPrevidenciario ?? '',
          input.licenca.motivoAfastamentoId ?? '',
          input.licenca.cidId ?? '',
          input.licenca.diasConcedidos,
          input.licenca.dataInicio,
          input.licenca.dataFim,
        ],
      );
      leave = toLeaveSummary(leaveRows[0]);
    }

    return toMedicalRecordSummary(record, leave);
  }

  async validateMedicalRecord(
    medicalRecordId: string,
    input: ValidateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    ensurePericiaDatabase(this.databaseService);

    const recordRows = await this.databaseService.query<MedicalRecordRow>(
      `
      UPDATE hr.medical_record
      SET
        report_status =
          CASE $2
            WHEN 'APROVAR' THEN 'APPROVED'::"MedicalReportStatus"
            WHEN 'REPROVAR' THEN 'REJECTED'::"MedicalReportStatus"
          END,
        approved_by_ref = $3,
        approved_at = now(),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        appointment_id::text,
        employee_id::text,
        report_status::text AS report_status,
        approved_by_ref,
        approved_at
      `,
      [medicalRecordId, input.decisao, input.coordenadorId.trim()],
    );
    const record = recordRows[0];

    const leaveRows = await this.databaseService.query<MedicalLeaveRow>(
      `
      SELECT id, employee_id::text, granted_days, starts_on, ends_on
      FROM hr.medical_leave
      WHERE medical_record_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [medicalRecordId],
    );

    return toMedicalRecordSummary(record, toOptionalLeave(leaveRows[0]));
  }

  async recordOpinion(
    appointmentId: string,
    opinion: RecordMedicalOpinionDto,
  ): Promise<MedicalRecordSummary> {
    ensurePericiaDatabase(this.databaseService);

    if (opinion.decision === 'granted') {
      if (!opinion.grantedDays || !opinion.startsOn || !opinion.endsOn) {
        throw PERICIA_ERRORS.grantedOpinionIncomplete();
      }
    }

    const recordRows = await this.databaseService.query<MedicalRecordRow>(
      `
      WITH appointment AS (
        UPDATE hr.medical_appointment
        SET status = 'ATTENDED'::"MedicalAppointmentStatus",
            attended_at = COALESCE(attended_at, now()),
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, employee_id
      )
      INSERT INTO hr.medical_record (
        appointment_id,
        employee_id,
        physician_ref,
        reason,
        diagnosis,
        expert_action,
        report_type,
        report_status,
        primary_icd_ref,
        decision,
        opinion_notes,
        evaluation_type,
        granted_days,
        leave_starts_on,
        leave_ends_on,
        cid_code,
        cid_secondary
      )
      SELECT
        appointment.id,
        appointment.employee_id,
        $2,
        $3,
        $4,
        'official_pericia',
        'medical_leave',
        CASE $5
          WHEN 'granted' THEN 'APPROVED'::"MedicalReportStatus"
          ELSE 'REJECTED'::"MedicalReportStatus"
        END,
        NULLIF($6, ''),
        $5,
        $7,
        'official_pericia',
        $8::integer,
        NULLIF($9, '')::date,
        NULLIF($10, '')::date,
        NULLIF($6, ''),
        NULLIF($11, '')
      FROM appointment
      RETURNING
        id,
        appointment_id::text,
        employee_id::text,
        report_status::text AS report_status,
        approved_by_ref,
        approved_at
      `,
      [
        appointmentId,
        opinion.physicianId.trim(),
        opinion.reason.trim(),
        opinion.diagnosis?.trim() ?? '',
        opinion.decision,
        opinion.cidCode?.trim() ?? '',
        opinion.opinionNotes?.trim() ?? '',
        opinion.grantedDays ?? null,
        opinion.startsOn ?? '',
        opinion.endsOn ?? '',
        opinion.cidSecondary?.trim() ?? '',
      ],
    );
    const record = recordRows[0];
    if (!record) {
      throw PERICIA_ERRORS.appointmentNotFound();
    }

    const leaveRows = await this.databaseService.query<MedicalLeaveRow>(
      `
      SELECT id, employee_id::text, granted_days, starts_on, ends_on
      FROM hr.medical_leave
      WHERE medical_record_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [record.id],
    );

    return toMedicalRecordSummary(record, toOptionalLeave(leaveRows[0]));
  }
}

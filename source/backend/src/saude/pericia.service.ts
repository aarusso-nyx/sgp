import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  CreateMedicalRecordDto,
  ReplicateMedicalRecordDto,
  SchedulePericiaDto,
  UpdatePericiaAppointmentDto,
  ValidateMedicalRecordDto,
} from './pericia.dto';

interface EmployeeStateRow extends QueryResultRow {
  id: string;
  lifecycle_status: string;
}

interface AppointmentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  slot_ref: string;
  scheduled_on: Date | string;
  scheduled_time: string;
  contact_phone: string | null;
  status: string;
}

interface MedicalRecordRow extends QueryResultRow {
  id: string;
  appointment_id: string;
  employee_id: string;
  report_status: string;
  approved_by_ref: string | null;
  approved_at: Date | string | null;
}

interface MedicalLeaveRow extends QueryResultRow {
  id: string;
  employee_id: string;
  granted_days: number;
  starts_on: Date | string;
  ends_on: Date | string;
}

interface ReplicationRow extends QueryResultRow {
  employee_id: string;
}

export interface PericiaAppointmentSummary {
  id: string;
  funcionarioId: string;
  janelaId: string;
  data: string;
  hora: string;
  telefoneContato: string | null;
  status: string;
}

export interface MedicalLeaveSummary {
  id: string;
  funcionarioId: string;
  diasConcedidos: number;
  dataInicio: string;
  dataFim: string;
}

export interface MedicalRecordSummary {
  id: string;
  agendamentoId: string;
  funcionarioId: string;
  situacaoLaudo: string;
  licenca: MedicalLeaveSummary | null;
  validadoPor: string | null;
  validadoEm: string | null;
}

@Injectable()
export class PericiaService {
  constructor(private readonly databaseService: DatabaseService) {}

  async scheduleAppointment(
    input: SchedulePericiaDto,
  ): Promise<PericiaAppointmentSummary> {
    this.ensureDatabase();

    const employee = await this.employeeState(input.funcionarioId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.lifecycle_status === 'ON_LEAVE') {
      throw new BadRequestException('Funcionário não se encontra em exercício');
    }

    try {
      const rows = await this.databaseService.query<AppointmentRow>(
        `
        INSERT INTO hr.medical_appointment (
          employee_id,
          specialty_ref,
          schedule_ref,
          slot_ref,
          scheduled_on,
          scheduled_time,
          contact_phone,
          instructor_attachment
        )
        VALUES (
          $1::uuid,
          NULLIF($2, ''),
          NULLIF($3, ''),
          $4,
          $5::date,
          $6,
          NULLIF($7, ''),
          $8::jsonb
        )
        RETURNING
          id,
          employee_id::text,
          slot_ref,
          scheduled_on,
          scheduled_time,
          contact_phone,
          status::text AS status
        `,
        [
          input.funcionarioId,
          input.especialidadeId ?? '',
          input.agendaId ?? '',
          input.janelaId.trim(),
          input.data,
          input.hora,
          input.telefoneContato ?? '',
          JSON.stringify(input.anexoInstrutor ?? {}),
        ],
      );

      return this.toAppointmentSummary(rows[0]);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Appointment slot already occupied');
      }
      throw error;
    }
  }

  async updateAppointment(
    appointmentId: string,
    input: UpdatePericiaAppointmentDto,
  ): Promise<PericiaAppointmentSummary> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<AppointmentRow>(
      `
      UPDATE hr.medical_appointment
      SET
        status =
          CASE $2
            WHEN 'COMPARECEU' THEN 'ATTENDED'::"MedicalAppointmentStatus"
            WHEN 'NAO_COMPARECEU' THEN 'NO_SHOW'::"MedicalAppointmentStatus"
            WHEN 'CANCELADO' THEN 'CANCELED'::"MedicalAppointmentStatus"
          END,
        attended_at =
          CASE WHEN $2 = 'COMPARECEU' THEN COALESCE(attended_at, now()) ELSE attended_at END,
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        employee_id::text,
        slot_ref,
        scheduled_on,
        scheduled_time,
        contact_phone,
        status::text AS status
      `,
      [appointmentId, input.status],
    );
    return this.toAppointmentSummary(rows[0]);
  }

  async createMedicalRecord(
    input: CreateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    this.ensureDatabase();

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
      throw new NotFoundException('Medical appointment not found');
    }
    if (!['ATTENDED', 'SCHEDULED'].includes(currentAppointment.status)) {
      throw new BadRequestException(
        'Medical appointment is not available for record creation',
      );
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
      throw new NotFoundException('Medical record could not be created');
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
      leave = this.toLeaveSummary(leaveRows[0]);
    }

    return this.toMedicalRecordSummary(record, leave);
  }

  async validateMedicalRecord(
    medicalRecordId: string,
    input: ValidateMedicalRecordDto,
  ): Promise<MedicalRecordSummary> {
    this.ensureDatabase();

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

    return this.toMedicalRecordSummary(
      record,
      this.toOptionalLeave(leaveRows[0]),
    );
  }

  async replicateMedicalRecord(
    medicalRecordId: string,
    input: ReplicateMedicalRecordDto,
  ) {
    this.ensureDatabase();

    const leaveRows = await this.databaseService.query<MedicalLeaveRow>(
      `
      SELECT id, employee_id::text, granted_days, starts_on, ends_on
      FROM hr.medical_leave
      WHERE medical_record_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [medicalRecordId],
    );
    const sourceLeave = leaveRows[0];
    if (!sourceLeave) {
      throw new NotFoundException(
        'Medical leave not found for record replication',
      );
    }

    const replicated = await this.databaseService.query<ReplicationRow>(
      `
      WITH source_leave AS (
        SELECT *
        FROM hr.medical_leave
        WHERE id = $1::uuid
      ),
      inserted_leaves AS (
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
        SELECT
          source_leave.medical_record_id,
          target.employee_id::uuid,
          source_leave.evaluation_type,
          source_leave.social_security_benefit,
          source_leave.absence_reason_id,
          source_leave.icd_ref,
          source_leave.granted_days,
          source_leave.starts_on,
          source_leave.ends_on
        FROM source_leave
        CROSS JOIN LATERAL jsonb_to_recordset($2::jsonb) AS target(employee_id text)
        RETURNING employee_id
      ),
      updated_employees AS (
        UPDATE hr.employee employee
        SET lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
            updated_at = now()
        FROM inserted_leaves leave_row
        WHERE employee.id = leave_row.employee_id
        RETURNING employee.id
      )
      SELECT employee_id::text
      FROM inserted_leaves
      `,
      [
        sourceLeave.id,
        JSON.stringify(
          input.matriculasAlvo.map((employeeId) => ({
            employee_id: employeeId,
          })),
        ),
      ],
    );

    return {
      prontuarioId: medicalRecordId,
      matriculasReplicadas: replicated.map((row) => row.employee_id),
    };
  }

  private async employeeState(
    employeeId: string,
  ): Promise<EmployeeStateRow | null> {
    const rows = await this.databaseService.query<EmployeeStateRow>(
      `
      SELECT id, lifecycle_status::text AS lifecycle_status
      FROM hr.employee
      WHERE id = $1::uuid
      `,
      [employeeId],
    );
    return rows[0] ?? null;
  }

  private toAppointmentSummary(
    row: AppointmentRow | undefined,
  ): PericiaAppointmentSummary {
    if (!row) {
      throw new NotFoundException('Medical appointment not found');
    }

    return {
      id: row.id,
      funcionarioId: row.employee_id,
      janelaId: row.slot_ref,
      data: this.toDateOnly(row.scheduled_on),
      hora: row.scheduled_time,
      telefoneContato: row.contact_phone,
      status: this.toApiAppointmentStatus(row.status),
    };
  }

  private toMedicalRecordSummary(
    row: MedicalRecordRow | undefined,
    leave: MedicalLeaveSummary | null,
  ): MedicalRecordSummary {
    if (!row) {
      throw new NotFoundException('Medical record not found');
    }

    return {
      id: row.id,
      agendamentoId: row.appointment_id,
      funcionarioId: row.employee_id,
      situacaoLaudo: this.toApiReportStatus(row.report_status),
      licenca: leave,
      validadoPor: row.approved_by_ref,
      validadoEm: row.approved_at ? this.toIso(row.approved_at) : null,
    };
  }

  private toLeaveSummary(
    row: MedicalLeaveRow | undefined,
  ): MedicalLeaveSummary {
    if (!row) {
      throw new NotFoundException('Medical leave not found');
    }
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      diasConcedidos: row.granted_days,
      dataInicio: this.toDateOnly(row.starts_on),
      dataFim: this.toDateOnly(row.ends_on),
    };
  }

  private toOptionalLeave(
    row: MedicalLeaveRow | undefined,
  ): MedicalLeaveSummary | null {
    return row ? this.toLeaveSummary(row) : null;
  }

  private toApiAppointmentStatus(status: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'AGENDADO';
      case 'ATTENDED':
        return 'COMPARECEU';
      case 'NO_SHOW':
        return 'NAO_COMPARECEU';
      case 'CANCELED':
        return 'CANCELADO';
      default:
        return status;
    }
  }

  private toApiReportStatus(status: string): string {
    switch (status) {
      case 'PENDING_SUBMISSION':
        return 'PENDENTE_ENVIO';
      case 'APPROVED':
        return 'APROVADO';
      case 'REJECTED':
        return 'REPROVADO';
      default:
        return status;
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for pericia operations',
      );
    }
  }

  private toDateOnly(value: Date | string): string {
    const normalized =
      value instanceof Date ? value.toISOString() : String(value);
    return normalized.slice(0, 10);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}

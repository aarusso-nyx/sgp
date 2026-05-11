import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { SchedulePericiaDto, UpdatePericiaAppointmentDto } from './pericia.dto';
import {
  AppointmentRow,
  EmployeeStateRow,
  PERICIA_ERRORS,
  PericiaAppointmentSummary,
  ensurePericiaDatabase,
  toAppointmentSummary,
} from './pericia.shared';

@Injectable()
export class PericiaAppointmentWorkflowService {
  constructor(private readonly databaseService: DatabaseService) {}

  async scheduleAppointment(
    input: SchedulePericiaDto,
  ): Promise<PericiaAppointmentSummary> {
    ensurePericiaDatabase(this.databaseService);

    const employee = await this.employeeState(input.funcionarioId);
    if (!employee) {
      throw PERICIA_ERRORS.employeeNotFound();
    }
    if (employee.lifecycle_status === 'ON_LEAVE') {
      throw PERICIA_ERRORS.employeeNotActive();
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

      return toAppointmentSummary(rows[0]);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw PERICIA_ERRORS.appointmentSlotOccupied();
      }
      throw error;
    }
  }

  async updateAppointment(
    appointmentId: string,
    input: UpdatePericiaAppointmentDto,
  ): Promise<PericiaAppointmentSummary> {
    ensurePericiaDatabase(this.databaseService);

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
    return toAppointmentSummary(rows[0]);
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
}

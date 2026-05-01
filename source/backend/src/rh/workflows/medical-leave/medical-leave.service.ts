import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { ScheduleMedicalLeaveAppointmentDto } from './medical-leave.dto';

interface MedicalLeaveRow extends QueryResultRow {
  id: string;
  employee_id: string;
  medical_record_id: string;
  granted_days: number;
  starts_on: Date | string;
  ends_on: Date | string;
  status: string;
  cid_code: string | null;
  cid_secondary: string | null;
  expert_opinion_id: string | null;
}

interface AppointmentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  slot_ref: string;
  scheduled_on: Date | string;
  scheduled_time: string;
  status: string;
}

export interface MedicalLeave {
  id: string;
  employeeId: string;
  medicalRecordId: string;
  grantedDays: number;
  startsOn: string;
  endsOn: string;
  status: string;
  cidCode: string | null;
  cidSecondary: string | null;
  expertOpinionId: string | null;
}

export interface ScheduledMedicalAppointment {
  appointment_id: string;
  employeeId: string;
  slotRef: string;
  scheduledOn: string;
  scheduledTime: string;
  status: string;
}

@Injectable()
export class MedicalLeaveService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listByEmployee(employeeId: string): Promise<MedicalLeave[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<MedicalLeaveRow>(
      `
      SELECT
        id::text,
        employee_id::text,
        medical_record_id::text,
        granted_days,
        starts_on,
        ends_on,
        status::text,
        cid_code,
        cid_secondary,
        expert_opinion_id::text
      FROM hr.medical_leave
      WHERE employee_id = $1::uuid
      ORDER BY starts_on DESC, created_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toLeave(row));
  }

  async schedule(
    body: ScheduleMedicalLeaveAppointmentDto,
  ): Promise<ScheduledMedicalAppointment> {
    this.ensureDatabase();
    const employeeId = body.employeeId ?? body.employee_id;
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }

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
        '{}'::jsonb
      )
      RETURNING
        id::text,
        employee_id::text,
        slot_ref,
        scheduled_on,
        scheduled_time,
        status::text
      `,
      [
        employeeId,
        body.specialtyRef ?? '',
        body.scheduleRef ?? '',
        body.slotRef.trim(),
        body.scheduledOn,
        body.scheduledTime,
        body.contactPhone ?? '',
      ],
    );
    const appointment = rows[0];
    if (!appointment) {
      throw new NotFoundException('Medical appointment could not be scheduled');
    }
    return {
      appointment_id: appointment.id,
      employeeId: appointment.employee_id,
      slotRef: appointment.slot_ref,
      scheduledOn: this.toDateOnly(appointment.scheduled_on),
      scheduledTime: appointment.scheduled_time,
      status: appointment.status,
    };
  }

  private toLeave(row: MedicalLeaveRow): MedicalLeave {
    return {
      id: row.id,
      employeeId: row.employee_id,
      medicalRecordId: row.medical_record_id,
      grantedDays: row.granted_days,
      startsOn: this.toDateOnly(row.starts_on),
      endsOn: this.toDateOnly(row.ends_on),
      status: row.status,
      cidCode: row.cid_code,
      cidSecondary: row.cid_secondary,
      expertOpinionId: row.expert_opinion_id,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for medical leave workflows',
      );
    }
  }

  private toDateOnly(value: Date | string): string {
    const normalized =
      value instanceof Date ? value.toISOString() : String(value);
    return normalized.slice(0, 10);
  }
}

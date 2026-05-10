import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';
import { CreateMedicalExamDto, PerformAsoDto, ScheduleAsoDto } from './aso.dto';

interface AsoRecordRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_name: string | null;
  aso_kind: string;
  scheduled_at: Date | string;
  performed_at: Date | string | null;
  doctor_crm: string | null;
  doctor_name: string | null;
  conclusion: string | null;
  restriction_text: string | null;
  next_exam_due_at: Date | string | null;
  status: string;
  attachment_count?: string | undefined;
  s2220_spool_message_id?: string | null | undefined;
}

interface MedicalExamRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  exam_type: string;
  is_mandatory_admission: boolean;
  is_mandatory_periodic: boolean;
  periodicity_months: number | null;
  active: boolean;
}

interface EmployeeRow extends QueryResultRow {
  id: string;
  name: string;
  contract_type_code: string | null;
}

interface PeriodicityRow extends QueryResultRow {
  periodicity_months: number | null;
  contract_type_code: string | null;
}

export interface AsoRecordSummary {
  id: string;
  employeeId: string;
  employeeName: string | null;
  asoKind: string;
  scheduledAt: string;
  performedAt: string | null;
  doctorCrm: string | null;
  doctorName: string | null;
  conclusion: string | null;
  restrictionText: string | null;
  nextExamDueAt: string | null;
  status: string;
  attachmentCount: number;
}

export interface MedicalExamSummary {
  id: string;
  code: string;
  name: string;
  examType: string;
  isMandatoryAdmission: boolean;
  isMandatoryPeriodic: boolean;
  periodicityMonths: number | null;
  active: boolean;
}

@Injectable()
export class AsoService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stynxEsocialClient: StynxEsocialClient,
  ) {}

  async listMedicalExams(): Promise<MedicalExamSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<MedicalExamRow>(
      `
      SELECT id::text, code, name, exam_type::text, is_mandatory_admission,
             is_mandatory_periodic, periodicity_months, active
      FROM saude.medical_exam
      ORDER BY active DESC, code
      `,
    );
    return rows.map((row) => this.toMedicalExam(row));
  }

  async createMedicalExam(
    input: CreateMedicalExamDto,
  ): Promise<MedicalExamSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<MedicalExamRow>(
      `
      INSERT INTO saude.medical_exam (
        code, name, exam_type, is_mandatory_admission,
        is_mandatory_periodic, periodicity_months, active
      )
      VALUES ($1, $2, $3::saude.medical_exam_type, $4, $5, $6, $7)
      RETURNING id::text, code, name, exam_type::text, is_mandatory_admission,
                is_mandatory_periodic, periodicity_months, active
      `,
      [
        input.code.trim(),
        input.name.trim(),
        input.examType,
        input.isMandatoryAdmission ?? false,
        input.isMandatoryPeriodic ?? false,
        input.periodicityMonths ?? null,
        input.active ?? true,
      ],
    );
    return this.toMedicalExam(rows[0]!);
  }

  async listAsoRecords(): Promise<AsoRecordSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      SELECT
        ar.id::text,
        ar.employee_id::text,
        e.name AS employee_name,
        ar.aso_kind::text,
        ar.scheduled_at,
        ar.performed_at,
        ar.doctor_crm,
        ar.doctor_name,
        ar.conclusion::text,
        ar.restriction_text,
        ar.next_exam_due_at,
        ar.status::text,
        count(att.id)::text AS attachment_count
      FROM saude.aso_record ar
      JOIN hr.employee e ON e.id = ar.employee_id
      LEFT JOIN saude.aso_attachment att ON att.aso_record_id = ar.id
      GROUP BY ar.id, e.name
      ORDER BY ar.scheduled_at DESC
      `,
    );
    return rows.map((row) => this.toAsoRecord(row));
  }

  async listDueSoon(referenceDate = new Date()): Promise<AsoRecordSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      SELECT
        ar.id::text,
        ar.employee_id::text,
        e.name AS employee_name,
        ar.aso_kind::text,
        ar.scheduled_at,
        ar.performed_at,
        ar.doctor_crm,
        ar.doctor_name,
        ar.conclusion::text,
        ar.restriction_text,
        ar.next_exam_due_at,
        ar.status::text,
        count(att.id)::text AS attachment_count
      FROM saude.aso_record ar
      JOIN hr.employee e ON e.id = ar.employee_id
      LEFT JOIN saude.aso_attachment att ON att.aso_record_id = ar.id
      WHERE ar.next_exam_due_at <= ($1::timestamptz + interval '30 days')
        AND ar.status <> 'CANCELLED'::saude.aso_status
      GROUP BY ar.id, e.name
      ORDER BY ar.next_exam_due_at ASC NULLS LAST
      `,
      [referenceDate.toISOString()],
    );
    return rows.map((row) => this.toAsoRecord(row));
  }

  async schedule(input: ScheduleAsoDto): Promise<AsoRecordSummary> {
    this.ensureDatabase();
    await this.ensureEmployee(input.employeeId);
    const nextDue = await this.calculateNextExamDueAt(
      input.employeeId,
      input.asoKind,
      input.scheduledAt,
    );
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      INSERT INTO saude.aso_record (
        employee_id, aso_kind, scheduled_at, next_exam_due_at, status
      )
      VALUES ($1::uuid, $2::saude.aso_kind, $3::timestamptz, $4::timestamptz, 'SCHEDULED'::saude.aso_status)
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        aso_kind::text,
        scheduled_at,
        performed_at,
        doctor_crm,
        doctor_name,
        conclusion::text,
        restriction_text,
        next_exam_due_at,
        status::text,
        '0'::text AS attachment_count
      `,
      [input.employeeId, input.asoKind, input.scheduledAt, nextDue],
    );
    return this.toAsoRecord(rows[0]!);
  }

  async createAdmissionPending(employeeId: string): Promise<AsoRecordSummary> {
    return this.schedule({
      employeeId,
      asoKind: 'ADMISSIONAL',
      scheduledAt: new Date().toISOString(),
    });
  }

  async perform(id: string, input: PerformAsoDto): Promise<AsoRecordSummary> {
    this.ensureDatabase();
    const current = await this.findRecord(id);
    if (current.status === 'ARCHIVED' || current.status === 'CANCELLED') {
      throw new BadRequestException('ASO cannot be performed from this status');
    }
    const nextDue = await this.calculateNextExamDueAt(
      current.employeeId,
      current.asoKind,
      input.performedAt,
    );
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      UPDATE saude.aso_record
      SET performed_at = $2::timestamptz,
          doctor_crm = $3,
          doctor_name = $4,
          conclusion = $5::saude.aso_conclusion,
          restriction_text = NULLIF($6, ''),
          next_exam_due_at = $7::timestamptz,
          status = 'PERFORMED'::saude.aso_status
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        aso_kind::text,
        scheduled_at,
        performed_at,
        doctor_crm,
        doctor_name,
        conclusion::text,
        restriction_text,
        next_exam_due_at,
        status::text,
        '0'::text AS attachment_count
      `,
      [
        id,
        input.performedAt,
        input.doctorCrm.trim(),
        input.doctorName.trim(),
        input.conclusion,
        input.restrictionText?.trim() ?? '',
        nextDue,
      ],
    );
    return this.toAsoRecord(rows[0]!);
  }

  async archive(id: string): Promise<AsoRecordSummary> {
    this.ensureDatabase();
    const current = await this.findRecord(id);
    if (current.status !== 'PERFORMED') {
      throw new BadRequestException(
        'Only performed ASO records can be archived',
      );
    }
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      UPDATE saude.aso_record
      SET status = 'ARCHIVED'::saude.aso_status
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        aso_kind::text,
        scheduled_at,
        performed_at,
        doctor_crm,
        doctor_name,
        conclusion::text,
        restriction_text,
        next_exam_due_at,
        status::text,
        s2220_spool_message_id::text,
        '0'::text AS attachment_count
      `,
      [id],
    );
    const archived = rows[0]!;
    const queued = await this.stynxEsocialClient.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2220',
      sourceRef: {
        sourceEntityKind: 'saude.aso_record',
        sourceEntityId: archived.id,
        asoRecordId: archived.id,
        employeeId: archived.employee_id,
        asoKind: archived.aso_kind,
      },
      payload: {
        asoRecordId: archived.id,
        employeeId: archived.employee_id,
        asoKind: archived.aso_kind,
        performedAt: archived.performed_at
          ? new Date(archived.performed_at).toISOString()
          : null,
        conclusion: archived.conclusion,
      },
    });
    const updated = await this.databaseService.query<AsoRecordRow>(
      `
      UPDATE saude.aso_record
      SET s2220_spool_message_id = $2::uuid
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        aso_kind::text,
        scheduled_at,
        performed_at,
        doctor_crm,
        doctor_name,
        conclusion::text,
        restriction_text,
        next_exam_due_at,
        status::text,
        s2220_spool_message_id::text,
        '0'::text AS attachment_count
      `,
      [id, queued.messageId],
    );
    return this.toAsoRecord(updated[0] ?? archived);
  }

  async findRecord(id: string): Promise<AsoRecordSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AsoRecordRow>(
      `
      SELECT
        ar.id::text,
        ar.employee_id::text,
        e.name AS employee_name,
        ar.aso_kind::text,
        ar.scheduled_at,
        ar.performed_at,
        ar.doctor_crm,
        ar.doctor_name,
        ar.conclusion::text,
        ar.restriction_text,
        ar.next_exam_due_at,
        ar.status::text,
        count(att.id)::text AS attachment_count
      FROM saude.aso_record ar
      JOIN hr.employee e ON e.id = ar.employee_id
      LEFT JOIN saude.aso_attachment att ON att.aso_record_id = ar.id
      WHERE ar.id = $1::uuid
      GROUP BY ar.id, e.name
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('ASO record not found');
    return this.toAsoRecord(row);
  }

  calculateDueDate(
    referenceDate: string,
    months: number | null,
  ): string | null {
    if (!months) return null;
    const date = new Date(referenceDate);
    date.setUTCMonth(date.getUTCMonth() + months);
    return date.toISOString();
  }

  private async calculateNextExamDueAt(
    employeeId: string,
    asoKind: string,
    referenceDate: string,
  ): Promise<string | null> {
    if (!['PERIODICO', 'RETORNO_TRABALHO'].includes(asoKind)) return null;
    const rows = await this.databaseService.query<PeriodicityRow>(
      `
      SELECT
        max(me.periodicity_months)::integer AS periodicity_months,
        max(ct.code) AS contract_type_code
      FROM hr.employee e
      LEFT JOIN hr.contract_type ct ON ct.id = e.contract_type_id
      LEFT JOIN saude.medical_exam me
        ON me.active
       AND me.is_mandatory_periodic
       AND me.periodicity_months IS NOT NULL
      WHERE e.id = $1::uuid
      `,
      [employeeId],
    );
    const row = rows[0];
    const defaultMonths =
      row?.contract_type_code?.toUpperCase().includes('CLT') === true ? 12 : 24;
    return this.calculateDueDate(
      referenceDate,
      row?.periodicity_months ?? defaultMonths,
    );
  }

  private async ensureEmployee(employeeId: string): Promise<EmployeeRow> {
    const rows = await this.databaseService.query<EmployeeRow>(
      `
      SELECT e.id::text, e.name, ct.code AS contract_type_code
      FROM hr.employee e
      LEFT JOIN hr.contract_type ct ON ct.id = e.contract_type_id
      WHERE e.id = $1::uuid
      `,
      [employeeId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return row;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toMedicalExam(row: MedicalExamRow): MedicalExamSummary {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      examType: row.exam_type,
      isMandatoryAdmission: row.is_mandatory_admission,
      isMandatoryPeriodic: row.is_mandatory_periodic,
      periodicityMonths: row.periodicity_months,
      active: row.active,
    };
  }

  private toAsoRecord(row: AsoRecordRow): AsoRecordSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      asoKind: row.aso_kind,
      scheduledAt: this.dateValue(row.scheduled_at),
      performedAt: this.optionalDateValue(row.performed_at),
      doctorCrm: row.doctor_crm,
      doctorName: row.doctor_name,
      conclusion: row.conclusion,
      restrictionText: row.restriction_text,
      nextExamDueAt: this.optionalDateValue(row.next_exam_due_at),
      status: row.status,
      attachmentCount: Number(row.attachment_count ?? '0'),
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }

  private optionalDateValue(value: Date | string | null): string | null {
    if (!value) return null;
    return this.dateValue(value);
  }
}

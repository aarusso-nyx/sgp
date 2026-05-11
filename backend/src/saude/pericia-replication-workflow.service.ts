import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ReplicateMedicalRecordDto } from './pericia.dto';
import {
  MedicalLeaveRow,
  PERICIA_ERRORS,
  ReplicationRow,
  ensurePericiaDatabase,
} from './pericia.shared';

@Injectable()
export class PericiaReplicationWorkflowService {
  constructor(private readonly databaseService: DatabaseService) {}

  async replicateMedicalRecord(
    medicalRecordId: string,
    input: ReplicateMedicalRecordDto,
  ): Promise<{ prontuarioId: string; matriculasReplicadas: string[] }> {
    ensurePericiaDatabase(this.databaseService);

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
      throw PERICIA_ERRORS.leaveReplicationSourceNotFound();
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
}

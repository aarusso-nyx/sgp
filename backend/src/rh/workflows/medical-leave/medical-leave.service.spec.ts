import { BadRequestException } from '@nestjs/common';

import { MedicalLeaveService } from './medical-leave.service';

describe('MedicalLeaveService', () => {
  const employeeId = '00000000-0000-4000-8000-000000000001';

  function database() {
    return {
      configured: true,
      query: jest.fn(async (sql: string, values: readonly unknown[] = []) => {
        if (sql.includes('FROM hr.medical_leave')) {
          return [
            {
              id: 'leave-1',
              employee_id: values[0],
              medical_record_id: 'record-1',
              granted_days: 10,
              starts_on: '2026-05-01',
              ends_on: '2026-05-10',
              status: 'ACTIVE',
              cid_code: 'J10',
              cid_secondary: null,
              expert_opinion_id: 'record-1',
            },
          ];
        }
        if (sql.includes('INSERT INTO hr.medical_appointment')) {
          return [
            {
              id: 'appointment-1',
              employee_id: values[0],
              slot_ref: values[3],
              scheduled_on: values[4],
              scheduled_time: values[5],
              status: 'SCHEDULED',
            },
          ];
        }
        return [];
      }),
    };
  }

  it('lists medical leaves by employee', async () => {
    const service = new MedicalLeaveService(database() as never);

    await expect(service.listByEmployee(employeeId)).resolves.toEqual([
      expect.objectContaining({
        employeeId,
        grantedDays: 10,
        cidCode: 'J10',
      }),
    ]);
  });

  it('schedules an official pericia appointment', async () => {
    const service = new MedicalLeaveService(database() as never);

    await expect(
      service.schedule({
        employeeId,
        slotRef: 'slot-1',
        scheduledOn: '2026-05-01',
        scheduledTime: '09:00',
      }),
    ).resolves.toMatchObject({
      appointment_id: 'appointment-1',
      employeeId,
      slotRef: 'slot-1',
    });
  });

  it('requires employee id when scheduling', async () => {
    const service = new MedicalLeaveService(database() as never);

    await expect(
      service.schedule({
        slotRef: 'slot-1',
        scheduledOn: '2026-05-01',
        scheduledTime: '09:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

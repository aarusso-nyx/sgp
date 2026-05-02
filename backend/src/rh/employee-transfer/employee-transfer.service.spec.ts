import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { EmployeeTransferService } from './employee-transfer.service';

class FakeDatabaseService {
  readonly configured = true;
  status = 'solicitada';
  closed = false;
  employeeWorkLocationId = '00000000-0000-4000-8000-000000000011';

  query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    if (sql.includes('UPDATE hr.employee_transfer')) {
      this.status = String(values[1] ?? this.status);
      return Promise.resolve([this.transferRow()] as T[]);
    }
    return Promise.resolve([] as T[]);
  }

  transaction<T>(
    callback: (client: {
      query: (
        sql: string,
        values?: readonly unknown[],
      ) => Promise<{ rows: unknown[] }>;
    }) => Promise<T>,
  ): Promise<T> {
    return callback({
      query: async (sql: string, values: readonly unknown[] = []) => {
        if (
          sql.includes('FROM hr.employee') &&
          !sql.includes('employee_transfer')
        ) {
          return {
            rows: [
              {
                employee_id: values[0],
                tenant_id: '00000000-0000-0000-0000-000000000100',
                work_location_id: this.employeeWorkLocationId,
                job_position_id: null,
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO hr.employee_transfer')) {
          this.status = 'solicitada';
          return { rows: [this.transferRow()] };
        }
        if (sql.includes('SELECT EXISTS')) {
          return { rows: [{ has_closed_run: this.closed }] };
        }
        if (sql.includes('FOR UPDATE')) {
          return { rows: [this.transferRow()] };
        }
        if (sql.includes('UPDATE hr.employee_transfer')) {
          this.status = 'efetivada';
          return { rows: [this.transferRow()] };
        }
        return { rows: [] };
      },
    });
  }

  transferRow() {
    return {
      id: '00000000-0000-4000-8000-000000000020',
      tenant_id: '00000000-0000-0000-0000-000000000100',
      employee_id: '00000000-0000-4000-8000-000000000001',
      origem_work_location_id: this.employeeWorkLocationId,
      destino_work_location_id: '00000000-0000-4000-8000-000000000012',
      origem_job_position_id: null,
      destino_job_position_id: null,
      tipo: 'oficio',
      data_solicitacao: '2026-05-01',
      data_efeito: '2026-06-01',
      processo_administrativo_id: null,
      status: this.status,
      aprovador_user_id: null,
      notes: '',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    };
  }
}

describe('EmployeeTransferService', () => {
  it('creates transfer requests and preserves the origin assignment', async () => {
    const database = new FakeDatabaseService();
    const service = new EmployeeTransferService(database as never);

    const result = await service.create({
      employeeId: '00000000-0000-4000-8000-000000000001',
      destinoWorkLocationId: '00000000-0000-4000-8000-000000000012',
      tipo: 'oficio',
      dataEfeito: '2026-06-01',
    });

    expect(result.status).toBe('solicitada');
    expect(result.origemWorkLocationId).toBe(database.employeeWorkLocationId);
  });

  it('enforces state machine approval before effecting', async () => {
    const database = new FakeDatabaseService();
    const service = new EmployeeTransferService(database as never);

    await expect(
      service.effect('00000000-0000-4000-8000-000000000020'),
    ).rejects.toBeInstanceOf(BadRequestException);

    database.status = 'aprovada';
    await expect(
      service.effect('00000000-0000-4000-8000-000000000020'),
    ).resolves.toMatchObject({ status: 'efetivada' });
  });

  it('is idempotent for already effected transfers', async () => {
    const database = new FakeDatabaseService();
    database.status = 'efetivada';
    const service = new EmployeeTransferService(database as never);

    await expect(
      service.effect('00000000-0000-4000-8000-000000000020'),
    ).resolves.toMatchObject({ status: 'efetivada' });
  });

  it('rejects effecting inside a closed payroll competence', async () => {
    const database = new FakeDatabaseService();
    database.status = 'aprovada';
    database.closed = true;
    const service = new EmployeeTransferService(database as never);

    await expect(
      service.effect('00000000-0000-4000-8000-000000000020'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

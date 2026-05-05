import { ConflictException } from '@nestjs/common';

import { PosseService } from './posse.service';

const tenantId = '00000000-0000-4000-8000-000000000001';
const nomeacaoId = '00000000-0000-4000-8000-000000000503';
const posseId = '00000000-0000-4000-8000-000000000603';
const employeeId = '00000000-0000-4000-8000-000000000703';

describe('PosseService', () => {
  it('rejects realizarPosse when nomeacao is not CONVOCADO or POSSE_EM_ANDAMENTO', async () => {
    const database = new FakePosseDatabase({ nomeacaoStatus: 'NOMEADO' });
    const service = new PosseService(database as never, fakeS22xx() as never);

    await expect(service.realizarPosse(posseId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('blocks direct cancellation after employee creation', async () => {
    const database = new FakePosseDatabase({
      posseStatus: 'EXERCICIO',
      employeeId,
    });
    const service = new PosseService(database as never, fakeS22xx() as never);

    await expect(service.cancelar(posseId, 'nao compareceu')).rejects.toThrow(
      'requires CALC-12 rescisao',
    );
  });

  it('starts exercise and dispatches exactly one S-2200 for the created employee', async () => {
    const s22xx = fakeS22xx();
    const database = new FakePosseDatabase({ nomeacaoStatus: 'POSSE' });
    const service = new PosseService(database as never, s22xx as never);

    const result = await service.iniciarExercicio(posseId);

    expect(s22xx.enqueue).toHaveBeenCalledWith({
      kind: 'trabalhador',
      eventClass: 'S-2200',
      sourceRef: {
        sourceEntityKind: 'hr.employee',
        sourceEntityId: employeeId,
      },
      payload: {
        posseId,
        nomeacaoId,
        employeeId,
      },
    });
    expect(result).toMatchObject({
      employeeId,
      status: 'EXERCICIO',
      s2200EventCount: 1,
      s2200: { status: 'PENDING', eventClass: 'S-2200' },
    });
  });
});

function fakeS22xx() {
  return {
    enqueue: jest.fn(async () => ({
      messageId: 'message-1',
      tenantId,
      kind: 'trabalhador',
      eventClass: 'S-2200',
      status: 'PENDING',
      sourceRef: {
        sourceEntityKind: 'hr.employee',
        sourceEntityId: employeeId,
      },
      createdAt: '2026-05-01T00:00:00.000Z',
    })),
  };
}

class FakePosseDatabase {
  readonly configured = true;
  private posseStatus: string;
  private nomeacaoStatus: string;
  private currentEmployeeId: string | null;

  constructor(
    input: {
      posseStatus?: string;
      nomeacaoStatus?: string;
      employeeId?: string | null;
    } = {},
  ) {
    this.posseStatus = input.posseStatus ?? 'AGENDADA';
    this.nomeacaoStatus = input.nomeacaoStatus ?? 'CONVOCADO';
    this.currentEmployeeId = input.employeeId ?? null;
  }

  async query<T>(sql: string): Promise<T[]> {
    if (sql.includes('SELECT') && sql.includes('FROM recrutamento.posse')) {
      return [
        {
          ...this.posseRow(),
          s2200_event_count: this.currentEmployeeId ? '1' : '0',
        },
      ] as T[];
    }
    if (
      sql.includes('UPDATE recrutamento.posse') &&
      sql.includes('CANCELADA')
    ) {
      this.posseStatus = 'CANCELADA';
      return [this.posseRow()] as T[];
    }
    return [] as T[];
  }

  async transaction<T>(
    callback: (client: { query: typeof this.clientQuery }) => Promise<T>,
  ) {
    return callback({ query: this.clientQuery });
  }

  private clientQuery = async (sql: string) => {
    if (sql.includes('FROM recrutamento.posse')) {
      return { rows: [this.posseRow()] };
    }
    if (sql.includes('FROM recrutamento.nomeacao')) {
      return {
        rows: [
          {
            id: nomeacaoId,
            tenant_id: tenantId,
            status: this.nomeacaoStatus,
          },
        ],
      };
    }
    if (
      sql.includes('UPDATE recrutamento.posse') &&
      sql.includes('POSSE_REALIZADA')
    ) {
      this.posseStatus = 'POSSE_REALIZADA';
      return { rows: [this.posseRow()] };
    }
    if (sql.includes('recrutamento.efetivar_posse')) {
      this.posseStatus = 'EXERCICIO';
      this.currentEmployeeId = employeeId;
      return {
        rows: [
          {
            tenant_id: tenantId,
            posse_id: posseId,
            nomeacao_id: nomeacaoId,
            employee_id: employeeId,
          },
        ],
      };
    }
    return { rows: [] };
  };

  private posseRow() {
    return {
      id: posseId,
      tenant_id: tenantId,
      nomeacao_id: nomeacaoId,
      posse_at: '2026-06-03T09:00:00.000Z',
      exercicio_at: this.currentEmployeeId ? '2026-06-05T09:00:00.000Z' : null,
      exercicio_due_at: '2026-06-24',
      lotacao_id: '00000000-0000-4000-8000-000000000803',
      employee_id: this.currentEmployeeId,
      status: this.posseStatus,
      cancellation_reason: null,
    };
  }
}

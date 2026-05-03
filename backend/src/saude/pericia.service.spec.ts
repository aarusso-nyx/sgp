import { HttpStatus } from '@nestjs/common';

import { PericiaService } from './pericia.service';

describe('PericiaService', () => {
  const appointment = (status = 'SCHEDULED') => ({
    id: 'appt-1',
    employee_id: 'emp-1',
    slot_ref: 'janela-20260422-0900',
    scheduled_on: new Date('2026-04-22T00:00:00.000Z'),
    scheduled_time: '09:00',
    contact_phone: '(11) 99000-0001',
    status,
  });
  const record = (status = 'PENDING_SUBMISSION') => ({
    id: 'record-1',
    appointment_id: 'appt-1',
    employee_id: 'emp-1',
    report_status: status,
    approved_by_ref: status === 'PENDING_SUBMISSION' ? null : 'coord-1',
    approved_at:
      status === 'PENDING_SUBMISSION' ? null : '2026-04-22T10:00:00.000Z',
  });
  const leave = {
    id: 'leave-1',
    employee_id: 'emp-1',
    granted_days: 15,
    starts_on: '2026-04-23',
    ends_on: '2026-05-07',
  };

  const createQuery = (overrides: Record<string, unknown> = {}) =>
    jest.fn(async (sql: string, params?: unknown[]) => {
      const compact = sql.replace(/\s+/g, ' ');
      if (compact.includes('FROM hr.employee')) {
        if (overrides.employeeMissing) return [];
        return [
          {
            id: 'emp-1',
            lifecycle_status: overrides.lifecycleStatus ?? 'ACTIVE',
          },
        ];
      }
      if (compact.includes('INSERT INTO hr.medical_appointment')) {
        if (overrides.duplicateSlot) throw { code: '23505' };
        return [appointment('SCHEDULED')];
      }
      if (
        compact.includes('FROM hr.medical_appointment') &&
        compact.includes('WHERE id = $1::uuid')
      ) {
        if (overrides.appointmentMissing) return [];
        return [
          appointment(String(overrides.appointmentStatus ?? 'SCHEDULED')),
        ];
      }
      if (compact.includes('INSERT INTO hr.medical_record')) {
        if (overrides.recordMissing) return [];
        const statusMap: Record<string, string> = {
          APROVADO: 'APPROVED',
          REPROVADO: 'REJECTED',
        };
        return [record(statusMap[String(params?.[8])] ?? 'PENDING_SUBMISSION')];
      }
      if (compact.includes('UPDATE hr.medical_appointment')) {
        const statusMap: Record<string, string> = {
          COMPARECEU: 'ATTENDED',
          NAO_COMPARECEU: 'NO_SHOW',
          CANCELADO: 'CANCELED',
        };
        return [appointment(statusMap[String(params?.[1])] ?? 'ATTENDED')];
      }
      if (compact.includes('UPDATE hr.medical_record')) {
        const statusMap: Record<string, string> = {
          APROVAR: 'APPROVED',
          REPROVAR: 'REJECTED',
        };
        return [record(statusMap[String(params?.[1])] ?? 'APPROVED')];
      }
      if (compact.includes('inserted_leaves')) {
        return [{ employee_id: 'emp-2' }, { employee_id: 'emp-3' }];
      }
      if (compact.includes('hr.medical_leave')) {
        if (overrides.leaveMissing) return [];
        return [leave];
      }
      return [];
    });

  it('schedules a medical appointment summary', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          lifecycle_status: 'ACTIVE',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'appt-1',
          employee_id: 'emp-1',
          slot_ref: 'janela-20260422-0900',
          scheduled_on: '2026-04-22',
          scheduled_time: '09:00',
          contact_phone: '(11) 99000-0001',
          status: 'SCHEDULED',
        },
      ]);

    const service = new PericiaService({ configured: true, query } as never);

    const result = await service.scheduleAppointment({
      funcionarioId: 'emp-1',
      especialidadeId: 'esp-1',
      agendaId: 'agenda-1',
      janelaId: 'janela-20260422-0900',
      data: '2026-04-22',
      hora: '09:00',
      telefoneContato: '(11) 99000-0001',
    });

    expect(result.status).toBe('AGENDADO');
    expect(result.janelaId).toBe('janela-20260422-0900');
  });

  it('updates appointments and medical records across supported statuses', async () => {
    const service = new PericiaService({
      configured: true,
      query: createQuery(),
    } as never);

    for (const status of [
      'COMPARECEU',
      'NAO_COMPARECEU',
      'CANCELADO',
    ] as const) {
      await expect(
        service.updateAppointment('appt-1', { status }),
      ).resolves.toHaveProperty('status', status);
    }

    await expect(
      service.createMedicalRecord({
        agendamentoId: 'appt-1',
        medicoId: ' medico-1 ',
        motivo: ' Avaliacao ',
        hda: ' Historia ',
        exameFisico: ' Exame ',
        diagnostico: ' Diagnostico ',
        acaoPericial: ' Acao ',
        tipoLaudo: ' Inicial ',
        situacaoLaudo: 'APROVADO',
        cidPrincipalId: 'CID-1',
        equipeMultiprofissional: [{ nome: 'Equipe' }],
        licenca: {
          tipoAvaliacao: 'INICIAL',
          beneficioPrevidenciario: 'B31',
          motivoAfastamentoId: 'motivo-1',
          cidId: 'CID-1',
          diasConcedidos: 15,
          dataInicio: '2026-04-23',
          dataFim: '2026-05-07',
        },
      }),
    ).resolves.toMatchObject({
      situacaoLaudo: 'APROVADO',
      licenca: { diasConcedidos: 15 },
    });
    await expect(
      service.createMedicalRecord({
        agendamentoId: 'appt-1',
        medicoId: 'medico-1',
        motivo: 'Avaliacao',
        situacaoLaudo: 'PENDENTE',
      }),
    ).resolves.toHaveProperty('situacaoLaudo', 'PENDENTE_ENVIO');

    for (const decisao of ['APROVAR', 'REPROVAR'] as const) {
      await expect(
        service.validateMedicalRecord('record-1', {
          decisao,
          coordenadorId: ' coord-1 ',
        }),
      ).resolves.toHaveProperty(
        'situacaoLaudo',
        decisao === 'APROVAR' ? 'APROVADO' : 'REPROVADO',
      );
    }
    await expect(
      service.replicateMedicalRecord('record-1', {
        matriculasAlvo: ['emp-2', 'emp-3'],
      }),
    ).resolves.toEqual({
      prontuarioId: 'record-1',
      matriculasReplicadas: ['emp-2', 'emp-3'],
    });
  });

  it('rejects invalid pericia states and duplicate appointments', async () => {
    await expect(
      new PericiaService({ configured: false } as never).scheduleAppointment({
        funcionarioId: 'emp-1',
        janelaId: 'janela',
        data: '2026-04-22',
        hora: '09:00',
      }),
    ).rejects.toMatchObject({
      code: 'SAUDE.PERICIA.DATABASE_UNAVAILABLE',
      message: 'DATABASE_URL is required for pericia operations',
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ employeeMissing: true }),
      } as never).scheduleAppointment({
        funcionarioId: 'missing',
        janelaId: 'janela',
        data: '2026-04-22',
        hora: '09:00',
      }),
    ).rejects.toMatchObject({
      code: 'SAUDE.PERICIA.EMPLOYEE_NOT_FOUND',
      message: 'Employee not found',
      status: HttpStatus.NOT_FOUND,
    });
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ lifecycleStatus: 'ON_LEAVE' }),
      } as never).scheduleAppointment({
        funcionarioId: 'emp-1',
        janelaId: 'janela',
        data: '2026-04-22',
        hora: '09:00',
      }),
    ).rejects.toMatchObject({
      code: 'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
      message: 'Funcionário não se encontra em exercício',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ duplicateSlot: true }),
      } as never).scheduleAppointment({
        funcionarioId: 'emp-1',
        janelaId: 'janela',
        data: '2026-04-22',
        hora: '09:00',
      }),
    ).rejects.toMatchObject({
      code: 'SAUDE.PERICIA.APPOINTMENT_SLOT_OCCUPIED',
      message: 'Appointment slot already occupied',
      status: HttpStatus.CONFLICT,
    });
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ appointmentMissing: true }),
      } as never).createMedicalRecord({
        agendamentoId: 'missing',
        medicoId: 'medico-1',
        motivo: 'Avaliacao',
      }),
    ).rejects.toThrow('Medical appointment not found');
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ appointmentStatus: 'CANCELED' }),
      } as never).createMedicalRecord({
        agendamentoId: 'appt-1',
        medicoId: 'medico-1',
        motivo: 'Avaliacao',
      }),
    ).rejects.toThrow('not available for record creation');
    await expect(
      new PericiaService({
        configured: true,
        query: createQuery({ leaveMissing: true }),
      } as never).replicateMedicalRecord('record-1', {
        matriculasAlvo: ['emp-2'],
      }),
    ).rejects.toThrow('Medical leave not found');
  });

  it('records a granted opinion and returns the generated leave', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO hr.medical_record')) {
        return [record('APPROVED')];
      }
      if (sql.includes('FROM hr.medical_leave')) {
        return [leave];
      }
      return [];
    });
    const service = new PericiaService({ configured: true, query } as never);

    await expect(
      service.recordOpinion('appt-1', {
        decision: 'granted',
        physicianId: 'medico-1',
        reason: 'Official pericia',
        cidCode: 'J10',
        grantedDays: 15,
        startsOn: '2026-04-23',
        endsOn: '2026-05-07',
      }),
    ).resolves.toMatchObject({
      situacaoLaudo: 'APROVADO',
      licenca: { diasConcedidos: 15 },
    });
  });
});

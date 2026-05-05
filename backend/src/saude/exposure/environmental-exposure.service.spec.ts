import { BadRequestException } from '@nestjs/common';

import { EnvironmentalExposureService } from './environmental-exposure.service';

describe('EnvironmentalExposureService', () => {
  it('creates exposure linked to an active PGR and relies on DB trigger for enforcement', async () => {
    const database = databaseStub([
      [
        {
          id: 'exposure-1',
          employee_id: 'employee-1',
          employee_name: null,
          risk_management_program_id: 'pgr-1',
          harmful_agent_code: '01.01.001',
          agent_kind: 'FISICO',
          intensity_value: '88.000000',
          intensity_unit: 'dB(A)',
          exposure_start: '2026-05-02',
          exposure_end: null,
          mitigated_by_epi: false,
          mitigated_by_epc: false,
          special_retirement_eligible: true,
          pending_events: 'START',
        },
      ],
    ]);
    const stynxEsocial = { enqueue: jest.fn().mockResolvedValue({}) };
    const service = new EnvironmentalExposureService(
      database as never,
      stynxEsocial as never,
    );

    const result = await service.create({
      employeeId: 'employee-1',
      riskManagementProgramId: 'pgr-1',
      harmfulAgentCode: '01.01.001',
      agentKind: 'FISICO',
      intensityValue: 88,
      intensityUnit: 'dB(A)',
      exposureStart: '2026-05-02',
      specialRetirementEligible: true,
    });

    expect(result.pendingEvents).toEqual(['START']);
    expect(database.sql()).toContain('risk_management_program_id');
    expect(database.sql()).toContain('saude.environmental_exposure');
    expect(stynxEsocial.enqueue).toHaveBeenCalledWith({
      kind: 'trabalhador',
      eventClass: 'S-2240',
      sourceRef: {
        sourceEntityKind: 'saude.environmental_exposure',
        sourceEntityId: 'exposure-1',
        environmentalExposureId: 'exposure-1',
        employeeId: 'employee-1',
        triggerEvent: 'START',
      },
      payload: {
        environmentalExposureId: 'exposure-1',
        employeeId: 'employee-1',
        harmfulAgentCode: '01.01.001',
        agentKind: 'FISICO',
        exposureStart: '2026-05-02',
        exposureEnd: null,
        mitigatedByEpi: false,
        mitigatedByEpc: false,
        specialRetirementEligible: true,
        triggerEvent: 'START',
      },
    });
  });

  it('rejects inverted periods before hitting the database', async () => {
    const service = new EnvironmentalExposureService(
      databaseStub([]) as never,
      { enqueue: jest.fn() } as never,
    );

    await expect(
      service.create({
        employeeId: 'employee-1',
        riskManagementProgramId: 'pgr-1',
        harmfulAgentCode: '01.01.001',
        agentKind: 'FISICO',
        exposureStart: '2026-06-02',
        exposureEnd: '2026-05-02',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function databaseStub(results: unknown[][]) {
  const sql: string[] = [];
  let index = 0;
  return {
    configured: true,
    query: jest.fn(async (statement: string) => {
      sql.push(statement);
      return results[index++] ?? [];
    }),
    sql: () => sql.join('\n'),
  };
}

import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import {
  EligibilityService,
  ProgressionApplyService,
  ProgressionSimulationService,
} from './progression.service';
import { TEST_INSTANT_2026_05_01T12_00_00Z } from '../../../../tests/backend/helpers/date-fixtures';

const eligibleRow = {
  employee_id: '11111111-1111-4111-8111-111111111111',
  registration: 'MAT-1',
  employee_name: 'Ana Silva',
  hired_on: '2024-01-01',
  current_level_id: '22222222-2222-4222-8222-222222222222',
  current_class_number: 1,
  current_level_number: 1,
  current_salary: '1000.00',
  next_level_id: '33333333-3333-4333-8333-333333333333',
  next_class_number: 1,
  next_level_number: 2,
  next_salary: '1100.00',
  approved_evaluation_id: '44444444-4444-4444-8444-444444444444',
  approved_evaluation_on: '2026-01-01',
  last_progression_on: null,
  interstice_reference_on: '2024-01-01',
  interstice_met: true,
};

describe('FOL-03 progression services', () => {
  it('checks interstice and approved evaluation eligibility', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [eligibleRow] });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const service = new EligibilityService(database as never);

    await expect(
      service.checkInterstice(eligibleRow.employee_id, '2026-05-01'),
    ).resolves.toMatchObject({
      eligible: true,
      approvedEvaluationId: eligibleRow.approved_evaluation_id,
      nextLevel: { id: eligibleRow.next_level_id },
    });
  });

  it('blocks simulation when the minimum interstice is missing', async () => {
    const query = jest
      .fn()
      .mockResolvedValue({ rows: [{ ...eligibleRow, interstice_met: false }] });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const eligibility = new EligibilityService(database as never);
    const service = new ProgressionSimulationService(
      database as never,
      eligibility,
    );

    await expect(
      service.simulate({
        employeeId: eligibleRow.employee_id,
        effectDate: '2026-05-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('simulates with vencimento vigente and payroll formula evaluation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [eligibleRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            source_salary: '1000.00',
            target_salary: '1100.00',
            net_delta: '100.00',
            formula_amount: '50.00',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'progression-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'simulation-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const eligibility = new EligibilityService(database as never);
    const service = new ProgressionSimulationService(
      database as never,
      eligibility,
    );

    await expect(
      service.simulate({
        employeeId: eligibleRow.employee_id,
        effectDate: '2026-05-01',
        earningDeductionId: '55555555-5555-4555-8555-555555555555',
      }),
    ).resolves.toMatchObject({
      netDelta: '100.00',
      salaryResolver: 'avaliacao.fn_get_vencimento_vigente',
      formulaEvaluator: 'payroll_calc.evaluate_earning_deduction',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('payroll_calc.evaluate_earning_deduction'),
      expect.any(Array),
    );
  });

  it('returns HTTP 409 semantics when re-applying an applied progression', async () => {
    const query = jest.fn().mockResolvedValueOnce({
      rows: [{ id: 'progression-1', status: 'applied' }],
    });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const service = new ProgressionApplyService(database as never);

    await expect(service.apply('progression-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('applies progression and appends avaliacao.progressao.applied audit metadata', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: 'progression-1', status: 'simulated' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'progression-1',
            employee_id: eligibleRow.employee_id,
            status: 'applied',
            applied_at: new Date(TEST_INSTANT_2026_05_01T12_00_00Z),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] });
    const client = { query } as unknown as PoolClient;
    const database = {
      transaction: jest.fn(<T>(callback: (client: PoolClient) => Promise<T>) =>
        callback(client),
      ),
    };
    const service = new ProgressionApplyService(database as never);

    await expect(service.apply('progression-1')).resolves.toMatchObject({
      id: 'progression-1',
      employeeId: eligibleRow.employee_id,
      status: 'applied',
    });
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('avaliacao.progressao.applied'),
      ['progression-1'],
    );
  });
});

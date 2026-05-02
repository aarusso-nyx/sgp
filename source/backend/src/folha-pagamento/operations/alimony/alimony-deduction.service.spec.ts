import { AlimonyDeductionService } from './alimony-deduction.service';

describe('AlimonyDeductionService', () => {
  it('emits active alimony deductions through payroll_calc for gross, net, and specific bases', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ inserted_count: '3' }] }),
    };
    const service = new AlimonyDeductionService();

    const count = await service.insertActiveOrderDeductions(client as never, {
      payrollRunId: '00000000-0000-4000-8000-000000000001',
      earningDeductionId: '00000000-0000-4000-8000-000000000002',
      competenceYear: 2026,
      competenceMonth: 5,
    });

    expect(count).toBe(3);
    const sql = client.query.mock.calls[0][0] as string;
    expect(sql).toContain('payroll_calc.evaluate_earning_deduction');
    expect(sql).toContain("WHEN 'GROSS'::hr.alimony_calculation_basis");
    expect(sql).toContain("WHEN 'NET'::hr.alimony_calculation_basis");
    expect(sql).toContain('base_specific.amount');
    expect(sql).toContain(
      "alimony.status = 'ACTIVE'::hr.employee_alimony_status",
    );
  });

  it('ignores suspended orders by filtering active status before insert', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ inserted_count: '0' }] }),
    };
    const service = new AlimonyDeductionService();

    await service.insertActiveOrderDeductions(client as never, {
      payrollRunId: '00000000-0000-4000-8000-000000000001',
      earningDeductionId: '00000000-0000-4000-8000-000000000002',
      competenceYear: 2026,
      competenceMonth: 5,
    });

    expect(client.query.mock.calls[0][0]).not.toContain('SUSPENDED');
  });
});

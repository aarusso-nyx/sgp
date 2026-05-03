import { TransitBenefitWorkflowService } from './transit-benefit-workflow.service';

describe('TransitBenefitWorkflowService', () => {
  it('inserts transit benefit assignments with the existing table contract', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const workflow = new TransitBenefitWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (!value) throw new Error(`${field} is required`);
      },
    } as never);

    await workflow.insert(
      {
        transitBenefitId: 'benefit-1',
        startsOn: '2026-01-01',
        quantity: '44',
      },
      'employee-1',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.employee_transit_benefit'),
      ['employee-1', 'benefit-1', '44', '2026-01-01', '', ''],
    );
  });
});

import { JudicialAlimonyWorkflowService } from './judicial-alimony-workflow.service';

describe('JudicialAlimonyWorkflowService', () => {
  it('updates judicial alimony rows with cleaned beneficiary CPF', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const workflow = new JudicialAlimonyWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (!value) throw new Error(`${field} is required`);
      },
    } as never);

    await workflow.update('alimony-1', {
      beneficiaryName: 'Pessoa',
      beneficiaryCpf: ' 12345678901 ',
      amount: '250.00',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.employee_alimony'),
      ['alimony-1', 'Pessoa', '12345678901', null, '250.00', '', '', ''],
    );
  });
});

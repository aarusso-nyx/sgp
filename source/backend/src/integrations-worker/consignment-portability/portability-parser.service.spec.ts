import { PortabilityParserService } from './portability-parser.service';

describe('PortabilityParserService', () => {
  const service = new PortabilityParserService();

  it('parses the canonical CSV layout', () => {
    const details = service.parse(
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total',
        '123.456.789-01;OLD-1;NEW-1;1500.25;120.10;1.450000;24',
      ].join('\n'),
      'CANONICAL_CSV',
    );

    expect(details).toEqual([
      {
        sequence: 1,
        employeeCpf: '12345678901',
        sourceContractNumber: 'OLD-1',
        targetContractNumber: 'NEW-1',
        transferredBalance: '1500.25',
        newMonthlyAmount: '120.10',
        newRate: '1.450000',
        newInstallmentsTotal: 24,
      },
    ]);
  });

  it('parses bank-x fixed-width details', () => {
    const details = service.parse(
      [
        '12345678901',
        'OLD-2'.padEnd(20),
        'NEW-2'.padEnd(20),
        '00000000150025',
        '00000000012010',
        '000001450000',
        '024',
      ].join(''),
      'BANK_X',
    );

    expect(details[0]).toMatchObject({
      employeeCpf: '12345678901',
      sourceContractNumber: 'OLD-2',
      targetContractNumber: 'NEW-2',
      transferredBalance: '1500.25',
      newMonthlyAmount: '120.10',
      newRate: '1.450000',
      newInstallmentsTotal: 24,
    });
  });

  it('parses bank-y pipe details', () => {
    const details = service.parse(
      [
        'employee_cpf,source_contract_number,target_contract_number,transferred_balance,new_monthly_amount,new_rate,new_installments_total',
        '12345678901|OLD-3|NEW-3|1500.25|120.10|1.450000|24',
      ].join('\n'),
      'BANK_Y',
    );

    expect(details[0].targetContractNumber).toBe('NEW-3');
  });
});

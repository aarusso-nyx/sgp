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

  it('accepts buffers and normalizes canonical headers and decimal formats', () => {
    const details = service.parse(
      Buffer.from(
        [
          'employee-cpf;source-contract-number;target-contract-number;transferred-balance;new-monthly-amount;new-rate;new-installments-total',
          '12345678901; OLD-4 ; NEW-4 ;1500,255;120,1;1,45;12',
          '',
        ].join('\r\n'),
      ),
      'CANONICAL_CSV',
    );

    expect(details).toEqual([
      expect.objectContaining({
        sourceContractNumber: 'OLD-4',
        targetContractNumber: 'NEW-4',
        transferredBalance: '1500.26',
        newMonthlyAmount: '120.10',
        newRate: '1.450000',
        newInstallmentsTotal: 12,
      }),
    ]);
  });

  it.each([
    ['missing detail line', 'employee_cpf;source_contract_number'],
    [
      'missing required column',
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate',
        '12345678901;OLD;NEW;10.00;1.00;0.010000',
      ].join('\n'),
    ],
    [
      'invalid cpf',
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total',
        '123;OLD;NEW;10.00;1.00;0.010000;1',
      ].join('\n'),
    ],
    [
      'missing contract number',
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total',
        '12345678901; ;NEW;10.00;1.00;0.010000;1',
      ].join('\n'),
    ],
    [
      'invalid installment count',
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total',
        '12345678901;OLD;NEW;10.00;1.00;0.010000;0',
      ].join('\n'),
    ],
    [
      'invalid decimal',
      [
        'employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total',
        '12345678901;OLD;NEW;-10.00;1.00;0.010000;1',
      ].join('\n'),
    ],
  ])('rejects canonical CSV with %s', (_name, content) => {
    expect(() => service.parse(content, 'CANONICAL_CSV')).toThrow();
  });

  it('rejects unsupported layouts explicitly', () => {
    expect(() => service.parse('', 'UNKNOWN' as never)).toThrow(
      'Unsupported portability layout: UNKNOWN',
    );
  });
});

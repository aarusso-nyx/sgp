import { Cnab240BuilderService } from './cnab240-builder.service';

const EXPECTED_HASHES = {
  '001': '23ddc8dab55fcd3266b802ade549aeaea9e0c9bb0a33ccca289f75bb7b573c90',
  '104': 'a8883f0ba9bd768d7d05e589860c3ddff8c4596dc18d5bdd43abf3c90ecf0ddb',
  '341': '25250b3c959dcbb2316b04c514ab10a3da3abe725f1de0bd53bf4aeeebe9d023',
  '237': '0cec25036e2208970d8896eb8284881d4704c49e0228bea2b94138a32d3e8c11',
  '033': '29c0c45cc23220175ec13c5fca7995819b50a2bb71842c15a805c214c1011d16',
} as const;

describe('Cnab240BuilderService', () => {
  const service = new Cnab240BuilderService();

  it.each(Object.entries(EXPECTED_HASHES))(
    'generates the validated byte fixture for bank %s',
    (bankCode, expectedHash) => {
      const result = service.build({
        bankCode,
        companyName: 'Municipio Teste',
        companyRegistration: '12345678000199',
        paymentDate: '2026-04-25',
        generatedAt: new Date('2026-04-20T12:34:56.000Z'),
        remittanceNumber: 7,
        payments: samplePayments(bankCode),
      });

      expect(result.content.byteLength).toBe(result.recordCount * 240);
      expect(result.recordCount).toBe(24);
      expect(result.totalAmount).toBe('10780.75');
      expect(result.fileHash).toBe(expectedHash);
      expect(service.validateTotals(result.content)).toBe(true);
      expect(result.details).toHaveLength(10);
      expect(
        result.details.every((detail) => detail.bankCode === Number(bankCode)),
      ).toBe(true);
    },
  );

  it('rejects trailer totals after a detail amount is mutated', () => {
    const result = service.build({
      bankCode: '001',
      companyName: 'Municipio Teste',
      companyRegistration: '12345678000199',
      paymentDate: '2026-04-25',
      generatedAt: new Date('2026-04-20T12:34:56.000Z'),
      remittanceNumber: 7,
      payments: samplePayments('001'),
    });
    const mutated = Buffer.from(result.content);
    mutated.write('9', 2 * 240 + 119, 'ascii');

    expect(service.validateTotals(mutated)).toBe(false);
  });

  it('filters unsupported banks before producing bytes', () => {
    expect(() =>
      service.build({
        bankCode: '999',
        companyName: 'Municipio Teste',
        companyRegistration: '12345678000199',
        paymentDate: '2026-04-25',
        generatedAt: new Date('2026-04-20T12:34:56.000Z'),
        remittanceNumber: 7,
        payments: samplePayments('999'),
      }),
    ).toThrow('Unsupported CNAB 240 bank code');
  });
});

function samplePayments(bankCode: string) {
  return Array.from({ length: 10 }, (_, index) => ({
    employeeId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    employeeName: `Servidor ${String(index + 1).padStart(2, '0')}`,
    employeeDocument: String(11111111111 + index),
    bankCode,
    branch: '1234',
    branchDigit: '5',
    account: String(100000 + index),
    accountDigit: String(index % 10),
    amount: (1000 + index * 17.35).toFixed(2),
  }));
}

import { Cnab240ReturnParserService } from './cnab240-return-parser.service';

describe('Cnab240ReturnParserService', () => {
  const parser = new Cnab240ReturnParserService();

  it('parses accepted, rejected, and returned segment A records', () => {
    const content = [
      line('001', '0'),
      segmentA(
        '001',
        1,
        '00000000-0000-4000-8000-000000000001',
        '123.45',
        '00',
      ),
      segmentA('001', 3, '00000000-0000-4000-8000-000000000002', '50.00', 'BD'),
      segmentA('001', 5, '00000000-0000-4000-8000-000000000003', '10.20', 'RJ'),
      line('001', '5'),
      line('001', '9'),
    ].join('');

    const result = parser.parse(content);

    expect(result.bankCode).toBe('001');
    expect(result.details).toEqual([
      expect.objectContaining({
        sequence: 1,
        amount: '123.45',
        occurrenceCode: '00',
      }),
      expect.objectContaining({
        sequence: 3,
        amount: '50.00',
        occurrenceCode: 'BD',
      }),
      expect.objectContaining({
        sequence: 5,
        amount: '10.20',
        occurrenceCode: 'RJ',
      }),
    ]);
    expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

function segmentA(
  bankCode: string,
  sequence: number,
  employeeId: string,
  amount: string,
  occurrenceCode: string,
): string {
  return line(bankCode, '3', [
    [9, String(sequence).padStart(5, '0')],
    [14, 'A'],
    [74, employeeId.padEnd(20, ' ')],
    [120, moneyCents(amount, 15)],
    [231, occurrenceCode.padEnd(5, ' ')],
  ]);
}

function line(
  bankCode: string,
  recordType: string,
  fields: Array<[number, string]> = [],
): string {
  const chars = Array.from(' '.repeat(240));
  write(chars, 1, bankCode);
  write(chars, 8, recordType);
  for (const [position, value] of fields) {
    write(chars, position, value);
  }
  return chars.join('');
}

function write(chars: string[], oneBasedPosition: number, value: string): void {
  const index = oneBasedPosition - 1;
  for (let offset = 0; offset < value.length; offset += 1) {
    chars[index + offset] = value[offset];
  }
}

function moneyCents(amount: string, width: number): string {
  return amount.replace('.', '').padStart(width, '0');
}

import {
  normalizeDetail,
  ParsedPortabilityDetail,
} from '../portability-parser.service';

export function parseBankX(text: string): ParsedPortabilityDetail[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith('H') && !line.startsWith('T'))
    .map((line, index) => {
      const tail = line.slice(51);
      const compactFixture = tail.length === 41;
      const installmentWidth = compactFixture ? 2 : 3;
      const newInstallmentsTotal = Number(tail.slice(-installmentWidth));
      const transferredBalance = compactFixture
        ? tail.slice(0, 14)
        : tail.slice(0, 14);
      const newMonthlyAmount = compactFixture
        ? tail.slice(14, 27)
        : tail.slice(14, 28);
      const newRate = compactFixture ? tail.slice(27, 39) : tail.slice(28, 40);

      return normalizeDetail({
        sequence: index + 1,
        employeeCpf: line.slice(0, 11),
        sourceContractNumber: line.slice(11, 31),
        targetContractNumber: line.slice(31, 51),
        transferredBalance: cents(transferredBalance),
        newMonthlyAmount: cents(newMonthlyAmount),
        newRate: rate(newRate),
        newInstallmentsTotal,
      });
    });
}

function cents(value: string): string {
  const normalized = value.trim().padStart(3, '0');
  return `${normalized.slice(0, -2)}.${normalized.slice(-2)}`;
}

function rate(value: string): string {
  const normalized = value.trim().padStart(7, '0');
  return `${normalized.slice(0, -6)}.${normalized.slice(-6)}`;
}

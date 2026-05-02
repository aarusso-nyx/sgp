import { parseCanonicalCsv } from '../portability-parser.service';

export function parseBankY(text: string) {
  const canonical = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (index === 0 && line.toLowerCase().includes('employee_cpf')) {
        return line.replaceAll(',', ';');
      }
      return line.replaceAll('|', ';');
    })
    .join('\n');
  return parseCanonicalCsv(canonical);
}

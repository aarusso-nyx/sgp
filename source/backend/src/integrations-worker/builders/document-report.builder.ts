import { Buffer } from 'node:buffer';

import type { GeneratedArtifact } from './cnab-remittance.builder';

export interface SimplePdfInput {
  fileName: string;
  title: string;
  lines: string[];
  recordCount?: number;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function buildSimplePdfReport(input: SimplePdfInput): GeneratedArtifact {
  const textLines = [input.title, '', ...input.lines];
  const operations = ['BT', '/F1 12 Tf', '72 760 Td'];

  textLines.forEach((line, index) => {
    if (index === 0) {
      operations.push(`(${escapePdfText(line)}) Tj`);
      return;
    }
    operations.push('0 -18 Td');
    operations.push(`(${escapePdfText(line)}) Tj`);
  });
  operations.push('ET');
  const contentStream = operations.join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf8')} >> stream\n${contentStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return {
    fileName: input.fileName,
    contentType: 'application/pdf',
    format: 'PDF',
    content: Buffer.from(pdf, 'utf8'),
    recordCount: input.recordCount ?? textLines.length,
  };
}

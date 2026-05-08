import { Buffer } from 'node:buffer';

export interface ReportArtifact {
  fileName: string;
  contentType: string;
  format: 'PDF' | 'XLSX';
  content: Buffer;
  recordCount: number;
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export function buildReportPdf(input: {
  fileName: string;
  title: string;
  subtitle: string;
  lines: string[];
  tables?: ReportTable[] | undefined;
  recordCount: number;
}): ReportArtifact {
  const textLines = [
    input.title,
    input.subtitle,
    '',
    ...input.lines,
    ...tableLines(input.tables ?? []),
  ];
  const operations = ['BT', '/F1 11 Tf', '54 790 Td'];

  textLines.slice(0, 38).forEach((line, index) => {
    if (index > 0) operations.push('0 -18 Td');
    operations.push(`(${escapePdfText(line.slice(0, 110))}) Tj`);
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
    recordCount: input.recordCount,
  };
}

export function buildReportXlsx(input: {
  fileName: string;
  sheets: ReportTable[];
  recordCount: number;
}): ReportArtifact {
  const workbookXml =
    xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${input.sheets
  .map(
    (sheet, index) =>
      `    <sheet name="${escapeXml(sheet.title.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  )
  .join('\n')}
  </sheets>
</workbook>`);
  const workbookRelsXml =
    xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${input.sheets
  .map(
    (_sheet, index) =>
      `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  )
  .join('\n')}
</Relationships>`);
  const rootRelsXml =
    xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  const contentTypesXml =
    xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${input.sheets
  .map(
    (_sheet, index) =>
      `  <Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join('\n')}
</Types>`);

  const files = [
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    ...input.sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: xml(worksheetXml(sheet)),
    })),
  ];

  return {
    fileName: input.fileName,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    format: 'XLSX',
    content: buildZip(files),
    recordCount: input.recordCount,
  };
}

function tableLines(tables: ReportTable[]): string[] {
  return tables.flatMap((table) => [
    '',
    table.title,
    table.columns.join(' | '),
    ...table.rows.slice(0, 12).map((row) => row.map(formatCell).join(' | ')),
  ]);
}

function worksheetXml(table: ReportTable): string {
  const rows = [table.columns, ...table.rows].map((row, rowIndex) => {
    const cells = row
      .map((value, columnIndex) => {
        const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
        return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(formatCell(value))}</t></is></c>`;
      })
      .join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`;
}

function buildZip(files: Array<{ path: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, 'utf8');
    const crc = crc32(file.content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.content.length, 18);
    local.writeUInt32LE(file.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, file.content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.content.length, 20);
    central.writeUInt32LE(file.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + file.content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const CRC32_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function xml(value: string): Buffer {
  return Buffer.from(value, 'utf8');
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function columnName(index: number): string {
  let name = '';
  let remaining = index;
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return name;
}

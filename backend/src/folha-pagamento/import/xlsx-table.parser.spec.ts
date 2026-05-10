import { deflateRawSync } from 'node:zlib';

import { buildSimpleXlsx } from '../../../../tests/backend/helpers/simple-xlsx-fixture';
import { normalizeHeader, parseFirstWorksheet } from './xlsx-table.parser';

const CRC32_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

describe('xlsx-table.parser', () => {
  it('parses inline, shared-string, numeric, sparse, and compressed worksheet cells', () => {
    const workbook = buildZip([
      xmlFile('[Content_Types].xml', '<Types />'),
      xmlFile(
        'xl/workbook.xml',
        '<workbook><sheets><sheet name="dados" sheetId="1" r:id="sheetA"/></sheets></workbook>',
      ),
      xmlFile(
        'xl/_rels/workbook.xml.rels',
        '<Relationships><Relationship Id="sheetA" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
      ),
      xmlFile(
        'xl/sharedStrings.xml',
        '<sst><si><t>Servidor</t></si><si><t>Valor &amp; Extra</t></si><si><t>Ana</t></si></sst>',
        true,
      ),
      xmlFile(
        'xl/worksheets/sheet2.xml',
        [
          '<worksheet><sheetData>',
          '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>',
          '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>ignored</v></c><c r="C2"><v>123</v></c></row>',
          '<row r="3"><c r="A3" t="inlineStr"><is><t>  </t></is></c><c r="C3"><v></v></c></row>',
          '</sheetData></worksheet>',
        ].join(''),
      ),
    ]);

    expect(parseFirstWorksheet(workbook)).toEqual([
      { servidor: 'Ana', valor_extra: '123' },
    ]);
  });

  it('normalizes accented and punctuated headers', () => {
    expect(normalizeHeader('  Matrícula / Vínculo Nº  ')).toBe(
      'matricula_vinculo_n',
    );
  });

  it.each([
    ['invalid zip', Buffer.from('not-a-zip'), 'Invalid XLSX ZIP structure'],
    [
      'missing worksheet',
      buildZip([
        xmlFile('xl/workbook.xml', '<workbook />'),
        xmlFile('xl/_rels/workbook.xml.rels', '<Relationships />'),
      ]),
      'XLSX has no worksheet',
    ],
    [
      'empty worksheet file',
      buildZip([xmlFile('xl/worksheets/sheet1.xml', '')]),
      'XLSX worksheet is empty or missing',
    ],
    [
      'header only',
      buildSimpleXlsx([['Nome']]),
      'XLSX must include a header row and data rows',
    ],
    [
      'blank header',
      buildSimpleXlsx([
        ['   ', ''],
        ['value', 'other'],
      ]),
      'XLSX header row is empty',
    ],
    [
      'unsupported compression',
      withCompressionMethod(buildSimpleXlsx([['Nome'], ['Ana']]), 99),
      'Unsupported XLSX compression method 99',
    ],
    [
      'invalid entry size',
      withCentralUncompressedSize(buildSimpleXlsx([['Nome'], ['Ana']]), 999),
      'Invalid XLSX entry size',
    ],
  ])('rejects %s', (_name, buffer, message) => {
    expect(() => parseFirstWorksheet(buffer)).toThrow(message);
  });
});

type ZipFile = Readonly<{
  path: string;
  content: Buffer;
  compress?: boolean;
}>;

function xmlFile(path: string, content: string, compress = false): ZipFile {
  return { path, content: Buffer.from(content, 'utf8'), compress };
}

function buildZip(files: ZipFile[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, 'utf8');
    const content = file.compress ? deflateRawSync(file.content) : file.content;
    const method = file.compress ? 8 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(file.content), 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(file.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc32(file.content), 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(file.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function withCompressionMethod(buffer: Buffer, method: number): Buffer {
  const copy = Buffer.from(buffer);
  const centralOffset = copy.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  copy.writeUInt16LE(method, 8);
  copy.writeUInt16LE(method, centralOffset + 10);
  return copy;
}

function withCentralUncompressedSize(buffer: Buffer, size: number): Buffer {
  const copy = Buffer.from(buffer);
  const centralOffset = copy.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  copy.writeUInt32LE(size, centralOffset + 24);
  return copy;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

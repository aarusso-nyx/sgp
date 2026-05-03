import { BadRequestException } from '@nestjs/common';
import { inflateRawSync } from 'node:zlib';

export type XlsxTableRow = Record<string, string>;

interface ZipEntry {
  path: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const XML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

export function parseFirstWorksheet(buffer: Buffer): XlsxTableRow[] {
  const files = unzip(buffer);
  const sheetPath = firstWorksheetPath(files);
  const sheetXml = files.get(sheetPath)?.toString('utf8');
  if (!sheetXml) {
    throw new BadRequestException('XLSX worksheet is empty or missing');
  }

  const sharedStrings = parseSharedStrings(files.get('xl/sharedStrings.xml'));
  const rows = parseSheetRows(sheetXml, sharedStrings);
  if (rows.length < 2) {
    throw new BadRequestException(
      'XLSX must include a header row and data rows',
    );
  }

  const headers = rows[0]!.map((value) => normalizeHeader(value));
  if (headers.every((header) => !header)) {
    throw new BadRequestException('XLSX header row is empty');
  }

  return rows
    .slice(1)
    .map((row) =>
      Object.fromEntries(
        headers
          .map((header, index) => [header, row[index]?.trim() ?? ''] as const)
          .filter(([header]) => Boolean(header)),
      ),
    )
    .filter((row) => Object.values(row).some((value) => value !== ''));
}

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function unzip(buffer: Buffer): Map<string, Buffer> {
  const entries = readCentralDirectory(buffer);
  const files = new Map<string, Buffer>();

  for (const entry of entries) {
    const fileNameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
    const dataStart =
      entry.localHeaderOffset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const compressed = buffer.subarray(dataStart, dataEnd);
    let content: Buffer;

    if (entry.method === 0) {
      content = Buffer.from(compressed);
    } else if (entry.method === 8) {
      content = inflateRawSync(compressed);
    } else {
      throw new BadRequestException(
        `Unsupported XLSX compression method ${entry.method}`,
      );
    }

    if (
      entry.uncompressedSize !== 0 &&
      content.length !== entry.uncompressedSize
    ) {
      throw new BadRequestException(
        `Invalid XLSX entry size for ${entry.path}`,
      );
    }
    files.set(entry.path, content);
  }

  return files;
}

function readCentralDirectory(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    throw new BadRequestException('Invalid XLSX ZIP structure');
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new BadRequestException('Invalid XLSX central directory');
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const path = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');

    entries.push({
      path,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function firstWorksheetPath(files: Map<string, Buffer>): string {
  const workbook = files.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';
  const firstSheet = /<sheet\b[^>]*r:id="([^"]+)"/u.exec(workbook)?.[1];

  if (firstSheet) {
    const relationship = new RegExp(
      `<Relationship\\b[^>]*Id="${escapeRegExp(firstSheet)}"[^>]*Target="([^"]+)"`,
      'u',
    ).exec(rels)?.[1];
    if (relationship) {
      const normalized = relationship.startsWith('/')
        ? relationship.slice(1)
        : `xl/${relationship.replace(/^\.?\//u, '')}`;
      if (files.has(normalized)) return normalized;
    }
  }

  if (files.has('xl/worksheets/sheet1.xml')) return 'xl/worksheets/sheet1.xml';
  const first = [...files.keys()]
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/u.test(path))
    .sort()[0];
  if (!first) throw new BadRequestException('XLSX has no worksheet');
  return first;
}

function parseSharedStrings(buffer?: Buffer): string[] {
  if (!buffer) return [];
  const xml = buffer.toString('utf8');
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gu)].map((match) =>
    cellText(match[1] ?? ''),
  );
}

function parseSheetRows(xml: string, sharedStrings: string[]): string[][] {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gu)].map(
    (rowMatch) => {
      const row: string[] = [];
      for (const cellMatch of (rowMatch[1] ?? '').matchAll(
        /<c\b([^>]*)>([\s\S]*?)<\/c>/gu,
      )) {
        const attrs = cellMatch[1] ?? '';
        const body = cellMatch[2] ?? '';
        const ref = /\br="([A-Z]+)\d+"/u.exec(attrs)?.[1];
        const index = ref ? columnIndex(ref) : row.length;
        row[index] = parseCellValue(attrs, body, sharedStrings);
      }
      return row;
    },
  );
}

function parseCellValue(
  attrs: string,
  body: string,
  sharedStrings: string[],
): string {
  if (/\bt="inlineStr"/u.test(attrs)) return cellText(body);
  const rawValue = /<v>([\s\S]*?)<\/v>/u.exec(body)?.[1] ?? '';
  if (/\bt="s"/u.test(attrs)) {
    return sharedStrings[Number(rawValue)] ?? '';
  }
  return decodeXml(rawValue);
}

function cellText(xml: string): string {
  return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gu)]
    .map((match) => decodeXml(match[1] ?? ''))
    .join('');
}

function columnIndex(ref: string): number {
  return (
    [...ref].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) -
    1
  );
}

function decodeXml(value: string): string {
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/giu,
    (_entity, body: string) => {
      if (body.startsWith('#x'))
        return String.fromCodePoint(parseInt(body.slice(2), 16));
      if (body.startsWith('#'))
        return String.fromCodePoint(parseInt(body.slice(1), 10));
      return XML_ENTITY_MAP[body] ?? `&${body};`;
    },
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

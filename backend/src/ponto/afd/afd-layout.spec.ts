import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AFD_LINE_WIDTH,
  decodeLine,
  encodeGenericRecord,
  encodeType1,
  encodeType4,
  encodeType9,
  parseAfd,
  serializeAfd,
  trailerHashForLines,
} from './afd-layout';
import {
  TEST_INSTANT_2026_05_01T00_00_00_000Z,
  TEST_INSTANT_2026_05_02T12_00_00_000Z,
  TEST_INSTANT_2026_05_31T00_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('AFD layout', () => {
  function fixture(fileName: string): string {
    return readFileSync(join(__dirname, '__fixtures__', fileName), 'utf8');
  }

  it('encodes and decodes all AFD record types with fixed width', () => {
    const bodyLines = [
      encodeType1({
        nsr: 0,
        employerTaxId: '12345678000199',
        employerName: 'Prefeitura Municipal',
        generatedAt: '2026-05-02T12:00:00.000Z',
        periodStart: '2026-05-01T00:00:00.000Z',
        periodEnd: '2026-05-31T23:59:59.000Z',
      }),
      encodeGenericRecord('2', 1, 'REP-C identificacao fiscal'),
      encodeGenericRecord('3', 2, 'Ajuste fiscal'),
      encodeType4({
        nsr: 3,
        employeeIdentifier: '00000000-0000-4000-8000-000000000101',
        employeeName: 'Servidor Um',
        recordedAt: '2026-05-02T11:00:00.000Z',
        source: 'REP_C',
        repDeviceId: '00000000-0000-4000-8000-000000000060',
        recordHash: 'a'.repeat(64),
      }),
      encodeGenericRecord('5', 4, 'Alteracao de empregado'),
      encodeGenericRecord('6', 5, 'Evento sensivel'),
      encodeGenericRecord('7', 6, 'Hash ICP-Brasil'),
      encodeGenericRecord('8', 7, 'Reservado Portaria'),
    ];
    const trailer = encodeType9({
      nsr: 8,
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-05-31T23:59:59.000Z',
      lineCount: bodyLines.length + 1,
      trailerHash: trailerHashForLines(bodyLines),
    });
    const lines = [...bodyLines, trailer];

    expect(lines.every((line) => line.length === AFD_LINE_WIDTH)).toBe(true);
    expect(lines.map((line) => decodeLine(line).type)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]);
    expect(decodeLine(bodyLines[3]).fields['employeeIdentifier']).toBe(
      '00000000-0000-4000-8000-000000000101',
    );
  });

  it('rejects an invalid type 9 hash', () => {
    const header = encodeType1({
      nsr: 0,
      employerTaxId: '12345678000199',
      employerName: 'Prefeitura Municipal',
      generatedAt: '2026-05-02T12:00:00.000Z',
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-05-31T23:59:59.000Z',
    });
    const trailer = encodeType9({
      nsr: 1,
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-05-31T23:59:59.000Z',
      lineCount: 2,
      trailerHash: '0'.repeat(64),
    });

    expect(() => parseAfd(serializeAfd([header, trailer]))).toThrow(
      'AFD trailer hash is invalid',
    );
  });

  it('parses complete files and rejects malformed line/trailer variants', () => {
    const header = encodeType1({
      nsr: 0,
      employerTaxId: '12.345.678/0001-99',
      employerName: 'Prefeitura Municipal',
      generatedAt: '2026-05-02T12:00:00.000Z',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    });
    const punch = encodeType4({
      nsr: 1,
      employeeIdentifier: '00000000-0000-4000-8000-000000000101',
      recordedAt: '2026-05-02T11:00:00.000Z',
      source: 'REP_C',
      repDeviceId: '00000000-0000-4000-8000-000000000060',
    });
    const bodyLines = [header, punch];
    const trailer = encodeType9({
      nsr: 2,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lineCount: 3,
      trailerHash: trailerHashForLines(bodyLines),
    });

    expect(parseAfd(serializeAfd([...bodyLines, trailer]))).toMatchObject({
      records: [{ type: '1' }, { type: '4' }, { type: '9' }],
      bodyLines,
    });
    expect(() =>
      encodeType1({
        nsr: 0,
        employerTaxId: '12345678000199',
        employerName: 'Prefeitura Municipal',
        generatedAt: 'bad-date',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
      }),
    ).toThrow('Invalid AFD timestamp: bad-date');
    expect(decodeLine(punch).fields['recordHash']).toBe('');
    expect(() => decodeLine('short')).toThrow('AFD line 1 must have');
    expect(() =>
      decodeLine(`${'x'.repeat(9)}0${' '.repeat(AFD_LINE_WIDTH - 10)}`),
    ).toThrow('AFD line 1 has invalid NSR or type');
    expect(() => parseAfd(header)).toThrow(
      'AFD content must contain header and trailer',
    );
    expect(() => parseAfd(serializeAfd([header, punch]))).toThrow(
      'AFD trailer type 9 is required',
    );
    const badCountTrailer = encodeType9({
      nsr: 2,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      lineCount: 2,
      trailerHash: trailerHashForLines(bodyLines),
    });
    expect(() =>
      parseAfd(serializeAfd([...bodyLines, badCountTrailer])),
    ).toThrow('AFD trailer line count is invalid');
  });

  it('normalizes CRLF input, Date values, and non-digit identifiers', () => {
    const header = encodeType1({
      nsr: 0,
      employerTaxId: 'not-a-cnpj',
      employerName: 'Prefeitura Municipal',
      generatedAt: new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z),
      periodStart: new Date(TEST_INSTANT_2026_05_01T00_00_00_000Z),
      periodEnd: new Date(TEST_INSTANT_2026_05_31T00_00_00_000Z),
    });
    const generic = encodeGenericRecord('8', 1, 'payload');
    const bodyLines = [header, generic];
    const trailer = encodeType9({
      nsr: 2,
      periodStart: new Date(TEST_INSTANT_2026_05_01T00_00_00_000Z),
      periodEnd: new Date(TEST_INSTANT_2026_05_31T00_00_00_000Z),
      lineCount: 3,
      trailerHash: trailerHashForLines(bodyLines),
    });
    const content = [...bodyLines, trailer].join('\r\n');

    expect(decodeLine(header).fields['employerTaxId']).toBe('00000000000000');
    expect(parseAfd(content)).toMatchObject({
      records: [{ type: '1' }, { type: '8' }, { type: '9' }],
    });
    expect(() =>
      encodeType9({
        nsr: 2,
        periodStart: 'bad-date',
        periodEnd: '2026-05-31',
        lineCount: 3,
        trailerHash: trailerHashForLines(bodyLines),
      }),
    ).toThrow('Invalid AFD date: bad-date');
  });

  it('parses the Portaria 671 REP-P, REP-A, and REP-C AFD golden fixture', () => {
    const parsed = parseAfd(fixture('portaria-671-rep-kinds.golden.afd'));

    expect(parsed.lines).toHaveLength(5);
    expect(parsed.lines.every((line) => line.length === AFD_LINE_WIDTH)).toBe(
      true,
    );
    expect(parsed.records.map((record) => record.type)).toEqual([
      '1',
      '4',
      '4',
      '4',
      '9',
    ]);
    expect(
      parsed.records
        .filter((record) => record.type === '4')
        .map((record) => ({
          nsr: record.nsr,
          employeeIdentifier: record.fields['employeeIdentifier'],
          source: record.fields['source'],
          repDeviceId: record.fields['repDeviceId'],
          recordHash: record.fields['recordHash'],
        })),
    ).toEqual([
      {
        nsr: 10,
        employeeIdentifier: 'MAT-REP-P-001',
        source: 'REP_P',
        repDeviceId: '00000000-0000-4000-8000-000000000061',
        recordHash: '1'.repeat(64),
      },
      {
        nsr: 11,
        employeeIdentifier: 'MAT-REP-A-001',
        source: 'REP_A',
        repDeviceId: '00000000-0000-4000-8000-000000000062',
        recordHash: '2'.repeat(64),
      },
      {
        nsr: 12,
        employeeIdentifier: 'MAT-REP-C-001',
        source: 'REP_C',
        repDeviceId: '00000000-0000-4000-8000-000000000063',
        recordHash: '3'.repeat(64),
      },
    ]);
    expect(parsed.trailer.fields['lineCount']).toBe(5);
    expect(parsed.trailer.fields['trailerHash']).toBe(
      trailerHashForLines(parsed.bodyLines),
    );
  });
});

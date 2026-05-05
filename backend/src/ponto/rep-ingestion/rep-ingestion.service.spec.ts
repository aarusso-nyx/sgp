/* eslint-disable */
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { queryResult } from '../../../../tests/backend/support/mock-db.cjs';
import { RepIngestionService } from './rep-ingestion.service';
import {
  TEST_INSTANT_2026_05_02T10_00_00_000Z,
  TEST_INSTANT_2026_05_02T10_01_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

const line = {
  lineNo: 1,
  nsr: 10,
  rawLine: '10;employee;20260502;08:00;CLOCK',
  recordedAt: '2026-05-02T11:00:00.000Z',
  employeeId: 'employee-1',
  payload: {},
};

function service(overrides: Partial<Record<string, unknown>> = {}) {
  return new RepIngestionService(
    (overrides.databaseService ?? { configured: true }) as never,
    (overrides.aftParser ?? {
      parse: jest.fn().mockReturnValue([line]),
    }) as never,
    (overrides.repPStream ?? {
      parse: jest.fn().mockReturnValue([line]),
    }) as never,
    (overrides.dedupService ?? {
      validate: jest
        .fn()
        .mockResolvedValue({ duplicate: false, duplicateNsrs: new Set() }),
    }) as never,
    (overrides.applyService ?? {
      apply: jest.fn().mockResolvedValue({
        timeRecordId: 'record-1',
        employeeId: 'employee-1',
      }),
    }) as never,
    (overrides.biometricMatcher ?? {
      matchDuringIngestion: jest.fn().mockResolvedValue(undefined),
    }) as never,
  );
}

describe('RepIngestionService', () => {
  it('requires a configured database and content', async () => {
    await expect(
      service({ databaseService: { configured: false } }).list(),
    ).rejects.toThrow('DATABASE_URL is not configured');
    expect(() =>
      (service() as never as { rawContent: Function }).rawContent({}),
    ).toThrow(BadRequestException);
  });

  it('finds active devices and rejects missing or inactive devices', async () => {
    const activeClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(
          queryResult([
            { rep_device_id: 'rep-1', kind: 'REP_C', status: 'ACTIVE' },
          ]),
        )
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(
          queryResult([
            { rep_device_id: 'rep-1', kind: 'REP_C', status: 'INACTIVE' },
          ]),
        ),
    };
    const target = service() as never as { findDevice: Function };

    await expect(
      target.findDevice(activeClient, 'rep-1'),
    ).resolves.toMatchObject({
      rep_device_id: 'rep-1',
    });
    await expect(
      target.findDevice(activeClient, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(target.findDevice(activeClient, 'inactive')).rejects.toThrow(
      'REP device is not active',
    );
  });

  it('parses REP-P records, AFDT content, defaults filenames, and maps biometric sources', () => {
    const aftParser = { parse: jest.fn().mockReturnValue([line]) };
    const repPStream = {
      parse: jest.fn().mockReturnValue([{ ...line, nsr: 11 }]),
    };
    const target = service({ aftParser, repPStream }) as never as {
      parseLines: Function;
      rawContent: Function;
      timeRecordSource: Function;
      defaultFileName: Function;
      errorSummary: Function;
    };

    expect(
      target.parseLines(
        { kind: 'REP_P', program_hash: 'hash' },
        { records: [{ nsr: 11 }], signature: 'sig' },
        'ignored',
      ),
    ).toEqual([{ ...line, nsr: 11 }]);
    expect(
      target.parseLines({ kind: 'REP_C' }, { content: 'raw' }, 'raw'),
    ).toEqual([line]);
    expect(target.rawContent({ records: [{ nsr: 1 }] })).toBe('[{"nsr":1}]');
    expect(target.rawContent({ content: ' raw ' })).toBe(' raw ');
    expect(target.timeRecordSource('FINGERPRINT')).toBe('REP_A');
    expect(target.timeRecordSource('PALM_VEIN')).toBe('REP_A');
    expect(target.timeRecordSource('REP_C')).toBe('REP_C');
    expect(target.defaultFileName('REP_P')).toBe('rep-p-stream.json');
    expect(target.defaultFileName('REP_C')).toBe('afdt.txt');
    expect(target.errorSummary(new Error('bad'))).toEqual({
      rejected: true,
      message: 'bad',
    });
    expect(target.errorSummary('bad')).toEqual({
      rejected: true,
      message: 'bad',
    });
  });

  it('ingests accepted and duplicate lines and maps summaries', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(
          queryResult([
            { rep_device_id: 'rep-1', kind: 'FINGERPRINT', status: 'ACTIVE' },
          ]),
        )
        .mockResolvedValueOnce(queryResult([{ batch_id: 'batch-1' }]))
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(
          queryResult([
            {
              batch_id: 'batch-1',
              rep_device_id: 'rep-1',
              kind: 'FINGERPRINT',
              file_name: null,
              file_sha256: 'hash',
              received_at: '2026-05-02T10:00:00.000Z',
              processed_at: null,
              status: 'PROCESSED',
              error_summary: null,
              accepted_lines: '1',
              duplicate_lines: 0,
              created_time_records: '1',
            },
          ]),
        ),
    };
    const databaseService = {
      configured: true,
      transaction: jest.fn((fn) => fn(client)),
    };
    const biometricMatcher = {
      matchDuringIngestion: jest.fn().mockResolvedValue(undefined),
    };
    const target = service({
      databaseService,
      aftParser: {
        parse: jest.fn().mockReturnValue([
          {
            ...line,
            biometric: {
              kind: 'FINGERPRINT',
              sampleBase64: 'abc',
              threshold: 0.8,
            },
          },
        ]),
      },
      biometricMatcher,
    });

    await expect(
      target.ingest('rep-1', { content: '10;employee;20260502;08:00;CLOCK' }),
    ).resolves.toMatchObject({
      batchId: 'batch-1',
      fileName: null,
      processedAt: null,
      errorSummary: {},
      acceptedLines: 1,
      createdTimeRecords: 1,
    });
    expect(biometricMatcher.matchDuringIngestion).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ kind: 'FINGERPRINT', deviceId: 'rep-1' }),
    );
  });

  it('marks rejected batches and exposes original uploads', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(
          queryResult([
            { rep_device_id: 'rep-1', kind: 'REP_C', status: 'ACTIVE' },
          ]),
        )
        .mockResolvedValueOnce(queryResult([{ batch_id: 'batch-1' }]))
        .mockResolvedValueOnce(queryResult([])),
    };
    const databaseService = {
      configured: true,
      transaction: jest.fn((fn) => fn(client)),
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            batch_id: 'batch-2',
            rep_device_id: 'rep-1',
            kind: 'REP_C',
            file_name: 'afdt.txt',
            file_sha256: 'hash',
            received_at: new Date(TEST_INSTANT_2026_05_02T10_00_00_000Z),
            processed_at: new Date(TEST_INSTANT_2026_05_02T10_01_00_000Z),
            status: 'REJECTED',
            error_summary: { rejected: true },
            accepted_lines: 0,
            duplicate_lines: 1,
            created_time_records: 0,
          },
        ])
        .mockResolvedValueOnce([{ file_name: null, raw_file: 'raw' }])
        .mockResolvedValueOnce([]),
    };
    const target = service({
      databaseService,
      aftParser: {
        parse: jest.fn(() => {
          throw new Error('parse failed');
        }),
      },
    });

    await expect(target.ingest('rep-1', { content: 'bad' })).rejects.toThrow(
      'REP ingestion batch rejected',
    );
    await expect(target.list('rep-1')).resolves.toMatchObject([
      { batchId: 'batch-2', status: 'REJECTED', duplicateLines: 1 },
    ]);
    await expect(target.getOriginal('batch-1')).resolves.toEqual({
      fileName: 'batch-1.txt',
      content: 'raw',
    });
    await expect(target.getOriginal('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AfdImporterService } from './afd-importer.service';
import { fileSha256, parseAfd } from './afd-layout';

describe('AfdImporterService', () => {
  it('imports a deterministic AFD fixture and applies REP-P, REP-A, and REP-C records', async () => {
    const content = readFileSync(
      join(__dirname, '__fixtures__', 'portaria-671-rep-kinds.golden.afd'),
      'utf8',
    );
    const parsed = parseAfd(content);
    const client = {
      query: jest.fn((sql: string, values?: unknown[]) => {
        if (sql.includes('INSERT INTO ponto.afd_import')) {
          return Promise.resolve({
            rows: [{ afd_import_id: '00000000-0000-4000-8000-000000000171' }],
          });
        }
        if (sql.includes('FROM ponto.rep_device')) {
          return Promise.resolve({
            rows: [
              {
                rep_device_id: '00000000-0000-4000-8000-000000000060',
                kind: 'REP_C',
              },
            ],
          });
        }
        if (sql.includes('FROM hr.employee')) {
          return Promise.resolve({
            rows: [{ id: employeeIdFor(String(values?.[0] ?? '')) }],
          });
        }
        if (sql.includes('INSERT INTO ponto.afd_import_line')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE ponto.afd_import')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('LEFT JOIN ponto.afd_import_line')) {
          return Promise.resolve({
            rows: [
              {
                afd_import_id: '00000000-0000-4000-8000-000000000171',
                rep_device_id: '00000000-0000-4000-8000-000000000060',
                file_name: 'portaria-671-rep-kinds.afd',
                file_sha256: Buffer.from(fileSha256(content), 'hex'),
                imported_at: '2026-05-02T12:00:00.000Z',
                line_count: parsed.lines.length,
                status: 'PROCESSED',
                error_summary: { acceptedLines: 3, rejectedLines: 0 },
                object_store_key: 'ponto/afd/imports/test.afd',
                accepted_lines: '3',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    const database = {
      configured: true,
      transaction: jest.fn((callback: (dbClient: typeof client) => unknown) =>
        Promise.resolve(callback(client)),
      ),
    };
    const timeRecordHashService = {
      createWithClient: jest.fn((_, input: { source: string; nsr: number }) =>
        Promise.resolve({
          timeRecordId: `time-record-${input.nsr}`,
          employeeId: 'employee',
          recordedAt: '2026-05-02T12:00:00.000Z',
          source: input.source,
          nsr: input.nsr,
          prevHash: null,
          recordHash: 'a'.repeat(64),
          rawPayload: {},
        }),
      ),
    };
    const service = new AfdImporterService(
      database as never,
      timeRecordHashService as never,
    );

    await expect(
      service.importAfd({
        repDeviceId: '00000000-0000-4000-8000-000000000060',
        fileName: 'portaria-671-rep-kinds.afd',
        content,
      }),
    ).resolves.toMatchObject({
      acceptedLines: 3,
      rejectedLines: 0,
      status: 'PROCESSED',
    });
    expect(timeRecordHashService.createWithClient.mock.calls).toEqual([
      [
        client,
        expect.objectContaining({
          employeeId: '00000000-0000-4000-8000-000000000101',
          nsr: 10,
          source: 'REP_P',
          rawPayload: expect.objectContaining({
            layout: 'AFD',
            repDeviceId: '00000000-0000-4000-8000-000000000060',
          }),
        }),
      ],
      [
        client,
        expect.objectContaining({
          employeeId: '00000000-0000-4000-8000-000000000102',
          nsr: 11,
          source: 'REP_A',
        }),
      ],
      [
        client,
        expect.objectContaining({
          employeeId: '00000000-0000-4000-8000-000000000103',
          nsr: 12,
          source: 'REP_C',
        }),
      ],
    ]);
  });
});

function employeeIdFor(identifier: string): string {
  const ids: Record<string, string> = {
    'MAT-REP-P-001': '00000000-0000-4000-8000-000000000101',
    'MAT-REP-A-001': '00000000-0000-4000-8000-000000000102',
    'MAT-REP-C-001': '00000000-0000-4000-8000-000000000103',
  };
  return ids[identifier] ?? '00000000-0000-4000-8000-000000000199';
}

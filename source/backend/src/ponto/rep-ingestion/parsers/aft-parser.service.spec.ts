import { AftParserService } from './aft-parser.service';

describe('AftParserService', () => {
  it('parses a small AFDT golden file', () => {
    const parser = new AftParserService();
    const records = parser.parse(
      [
        '000000001;00000000-0000-4000-8000-000000000101;20260502;08:00;CLOCK',
        '000000002;00000000-0000-4000-8000-000000000102;20260502;08:05;CLOCK',
        '000000003;00000000-0000-4000-8000-000000000103;20260502;08:10;CLOCK',
      ].join('\n'),
    );

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      lineNo: 1,
      nsr: 1,
      employeeId: '00000000-0000-4000-8000-000000000101',
      recordedAt: '2026-05-02T11:00:00.000Z',
      payload: { event: 'CLOCK', layout: 'AFDT', extra: [] },
    });
  });
});

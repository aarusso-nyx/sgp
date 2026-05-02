import { TceAdapter } from './tce-adapter.interface';

describe('TceAdapter contract', () => {
  it('requires the full pluggable lifecycle surface', () => {
    const adapter: TceAdapter<Record<string, unknown>> = {
      id: () => 'contract',
      state_code: () => 'XX',
      organ_kind: () => 'TCE',
      supported_layouts: () => [{ code: 'NOOP', version: '0.0.1' }],
      validate: () => ({ status: 'OK', errors: [], warnings: [] }),
      serialize: () => ({
        layoutCode: 'NOOP',
        layoutVersion: '0.0.1',
        contentType: 'application/json',
        payloadHash: 'a'.repeat(64),
        body: '{}',
      }),
      submit: async () => ({
        protocol: 'NOOP',
        status: 'ACCEPTED',
        submittedAt: '2026-05-02T00:00:00.000Z',
        rawResponse: {},
      }),
      parseResponse: () => ({
        protocol: 'NOOP',
        status: 'ACCEPTED',
        message: 'ok',
      }),
      health: async () => ({
        status: 'OK',
        checkedAt: '2026-05-02T00:00:00.000Z',
        details: {},
      }),
    };

    expect(Object.keys(adapter).sort()).toEqual([
      'health',
      'id',
      'organ_kind',
      'parseResponse',
      'serialize',
      'state_code',
      'submit',
      'supported_layouts',
      'validate',
    ]);
  });
});

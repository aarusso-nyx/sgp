import { NoopStubAdapter } from './noop-stub.adapter';

describe('NoopStubAdapter', () => {
  it('runs validation, serialization, submission, and response parsing without external calls', async () => {
    const adapter = new NoopStubAdapter();
    const validation = adapter.validate({ payrollRunId: 'run-1' }, '0.0.1');
    expect(validation).toEqual({ status: 'OK', errors: [], warnings: [] });

    const envelope = adapter.serialize({ payrollRunId: 'run-1' }, '0.0.1');
    expect(envelope).toMatchObject({
      layoutCode: 'NOOP',
      layoutVersion: '0.0.1',
      contentType: 'application/json',
    });
    expect(envelope.payloadHash).toMatch(/^[0-9a-f]{64}$/);

    const receipt = await adapter.submit(envelope);
    expect(receipt).toMatchObject({
      protocol: expect.stringMatching(/^NOOP-/),
      status: 'ACCEPTED',
    });

    expect(adapter.parseResponse(receipt.rawResponse)).toEqual({
      protocol: receipt.protocol,
      status: 'ACCEPTED',
      message: 'Accepted by noop adapter',
    });
  });
});

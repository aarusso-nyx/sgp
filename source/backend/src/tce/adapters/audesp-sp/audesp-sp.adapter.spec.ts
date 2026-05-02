import { ConfigService } from '@nestjs/config';

import { AudespSpAdapter } from './audesp-sp.adapter';
import { AudespXmlSerializer } from './serializer/audesp-xml.serializer';
import { AudespStubServerService } from './stub/audesp-stub-server.service';
import { audespFixturePayload } from './testing/audesp-fixtures';

describe('AudespSpAdapter', () => {
  it('defaults to stub mode and submits without network calls', async () => {
    const adapter = buildAdapter(undefined);
    const envelope = adapter.serialize(audespFixturePayload(), '0.0.1');

    await expect(adapter.submit(envelope)).resolves.toEqual(
      expect.objectContaining({ status: 'ACCEPTED' }),
    );
  });

  it('fails safe when production mode is requested', async () => {
    const adapter = buildAdapter('false');
    const envelope = adapter.serialize(audespFixturePayload(), '0.0.1');

    await expect(adapter.submit(envelope)).rejects.toThrow(
      'production submission is disabled',
    );
  });
});

function buildAdapter(stubMode: string | undefined): AudespSpAdapter {
  const config = {
    get: jest.fn((key: string) =>
      key === 'TCE_STUB_MODE' ? stubMode : undefined,
    ),
  } as Partial<ConfigService>;
  return new AudespSpAdapter(
    config as ConfigService,
    new AudespXmlSerializer(),
    new AudespStubServerService(config as ConfigService),
  );
}

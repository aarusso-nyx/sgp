import { ESocialEmitService } from '../src/esocial-worker/esocial-emit.service';
import { IcpSignerService } from '../src/esocial-worker/signature/icp-signer.service';
import {
  createPkcs12Fixture,
  S1000_VALID_XML,
} from '../src/esocial-worker/testing/esocial-fixtures';
import { XsdValidatorService } from '../src/esocial-worker/xsd/xsd-validator.service';

describe('ES-07 eSocial emit gate (e2e)', () => {
  it('rejects invalid XML before it reaches public.esocial_event', async () => {
    const inserts: string[] = [];
    const database = {
      configured: true,
      query: jest.fn(async (sql: string) => {
        if (sql.includes('INSERT INTO esocial.xsd_validation_failure')) {
          inserts.push('xsd_failure');
          return [];
        }
        if (sql.includes('INSERT INTO public.esocial_event')) {
          inserts.push('event_queue');
          return [
            {
              id: 'event-1',
              event_type: 'S-1000',
              reference: 'ID123',
              competence: '2026-01',
              status: 'PENDENTE',
              created_at: '2026-05-01T00:00:00.000Z',
            },
          ];
        }
        return [];
      }),
    };
    const signer = new IcpSignerService();
    const fixture = createPkcs12Fixture();
    const material = signer.readPkcs12(fixture.pkcs12, fixture.password);
    const certificateStore = {
      activeCertificate: jest.fn(async () => ({
        certificateId: 'cert-1',
        alias: 'fixture',
        pkcs12: signer.toUnencryptedPkcs12(material),
        validTo: material.validTo,
      })),
    };
    const service = new ESocialEmitService(
      database as never,
      new XsdValidatorService(),
      signer,
      certificateStore as never,
    );
    const invalidXml = S1000_VALID_XML.replace(
      '<iniValid>2026-01</iniValid>',
      '<iniValid>2026-13</iniValid>',
    );

    await expect(
      service.emit({
        tenantId: '00000000-0000-0000-0000-000000000100',
        eventKind: 'S-1000',
        xml: invalidXml,
      }),
    ).rejects.toThrow('failed XSD validation');

    expect(inserts).toEqual(['xsd_failure']);
    expect(certificateStore.activeCertificate).not.toHaveBeenCalled();
  });
});

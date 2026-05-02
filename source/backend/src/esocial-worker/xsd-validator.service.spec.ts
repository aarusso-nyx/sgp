import { S1000_VALID_XML } from './testing/esocial-fixtures';
import { XsdValidatorService } from './xsd/xsd-validator.service';

describe('XsdValidatorService', () => {
  it('validates an eSocial S-1.3 S-1000 golden XML against the committed XSD bundle', () => {
    const service = new XsdValidatorService();

    expect(service.manifestFileCount()).toBe(52);
    expect(service.bundleHash('evtInfoEmpregador.xsd')).toBe(
      '80ca0aaf6980aaf7b549bcb0201fc49b7b094a50619962618f6768534c0cf26a',
    );
    expect(
      service.validate('S-1000', S1000_VALID_XML, { allowUnsigned: true }),
    ).toMatchObject({
      valid: true,
      eventKind: 'S-1000',
    });
  });

  it('rejects a deliberate XML mutation before queue insertion', () => {
    const service = new XsdValidatorService();
    const invalidXml = S1000_VALID_XML.replace(
      '<iniValid>2026-01</iniValid>',
      '<iniValid>2026-13</iniValid>',
    );

    expect(() =>
      service.assertValid('S-1000', invalidXml, { allowUnsigned: true }),
    ).toThrow('failed XSD validation');
  });
});

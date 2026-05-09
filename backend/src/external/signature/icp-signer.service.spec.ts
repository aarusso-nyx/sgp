import { BadRequestException } from '@nestjs/common';
import forge from 'node-forge';

import { CertificateMaterial, IcpSignerService } from './icp-signer.service';

const TEST_CERT_VALID_FROM_2026_01_01T00_00_00_000Z =
  '2026-01-01T00:00:00.000Z';
const TEST_CERT_VALID_TO_2026_12_31T23_59_59_000Z = '2026-12-31T23:59:59.000Z';

function testCertificateMaterial(options?: {
  notBefore?: Date;
  notAfter?: Date;
}): CertificateMaterial {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = '01';
  certificate.validity.notBefore =
    options?.notBefore ??
    new Date(TEST_CERT_VALID_FROM_2026_01_01T00_00_00_000Z);
  certificate.validity.notAfter =
    options?.notAfter ?? new Date(TEST_CERT_VALID_TO_2026_12_31T23_59_59_000Z);
  certificate.setSubject([
    { name: 'commonName', value: 'SGP Test Software A1' },
    { name: 'organizationName', value: 'SGP Local Sandbox' },
  ]);
  certificate.setIssuer(certificate.subject.attributes);
  certificate.sign(keys.privateKey, forge.md.sha256.create());

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(certificate),
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
    subject: 'CN=SGP Test Software A1,O=SGP Local Sandbox',
  };
}

describe('IcpSignerService', () => {
  const service = new IcpSignerService();

  it('signs and verifies XML with a software A1 PKCS#12 certificate', () => {
    const material = testCertificateMaterial();
    const pkcs12 = service.toUnencryptedPkcs12(material);
    const signed = service.sign({
      pkcs12,
      xml: '<Envelope Id="evt-1"><Value>ok</Value></Envelope>',
    });

    expect(signed.xml).toContain('<Signature');
    expect(signed.subject).toContain('CN=SGP Test Software A1');
    expect(service.verify(signed.xml, signed.certificatePem)).toBe(true);
    expect(
      service.verify(
        signed.xml.replace('<Value>ok</Value>', '<Value>tampered</Value>'),
        signed.certificatePem,
      ),
    ).toBe(false);
  });

  it('rejects invalid PKCS#12 material without leaking certificate secrets', () => {
    expect(() => service.readPkcs12(Buffer.from('not-pkcs12'))).toThrow(
      BadRequestException,
    );
    expect(() => service.readPkcs12(Buffer.from('not-pkcs12'))).toThrow(
      'Invalid ICP-Brasil PKCS#12 certificate',
    );
  });

  it('fails signing when the XML payload has no signed Id attribute', () => {
    const pkcs12 = service.toUnencryptedPkcs12(testCertificateMaterial());

    expect(() =>
      service.sign({
        pkcs12,
        xml: '<Envelope><Value>missing-id</Value></Envelope>',
      }),
    ).toThrow('Signed XML must include an Id attribute');
  });
});

import { PreconditionFailedException } from '@nestjs/common';
import forge from 'node-forge';

import { DatabaseService } from '../../database/database.service';
import { CertificateMaterial, IcpSignerService } from './icp-signer.service';
import { TenantFiscalCertificateService } from './tenant-fiscal-certificate.service';

type QueryMock = jest.MockedFunction<DatabaseService['query']>;

const TEST_CERT_VALID_FROM_2026_05_01T00_00_00_000Z =
  '2026-05-01T00:00:00.000Z';
const TEST_CERT_VALID_TO_2026_05_20T00_00_00_000Z = '2026-05-20T00:00:00.000Z';
const TEST_CERT_STATUS_NOW_2026_05_05T00_00_00_000Z =
  '2026-05-05T00:00:00.000Z';
const TEST_EXPIRED_CERT_VALID_FROM_2026_04_01T00_00_00_000Z =
  '2026-04-01T00:00:00.000Z';
const TEST_EXPIRED_CERT_VALID_TO_2026_04_30T00_00_00_000Z =
  '2026-04-30T00:00:00.000Z';

function createDatabaseService(query: QueryMock): DatabaseService {
  return {
    query,
  } as unknown as DatabaseService;
}

function testPkcs12(options: { notBefore: Date; notAfter: Date }): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = '02';
  certificate.validity.notBefore = options.notBefore;
  certificate.validity.notAfter = options.notAfter;
  certificate.setSubject([
    { name: 'commonName', value: 'SGP Fiscal Certificate' },
  ]);
  certificate.setIssuer(certificate.subject.attributes);
  certificate.sign(keys.privateKey, forge.md.sha256.create());

  const material: CertificateMaterial = {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(certificate),
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
    subject: 'CN=SGP Fiscal Certificate',
  };

  return new IcpSignerService().toUnencryptedPkcs12(material);
}

describe('TenantFiscalCertificateService', () => {
  it('returns non-secret status for the active software certificate', async () => {
    const pkcs12 = testPkcs12({
      notBefore: new Date(TEST_CERT_VALID_FROM_2026_05_01T00_00_00_000Z),
      notAfter: new Date(TEST_CERT_VALID_TO_2026_05_20T00_00_00_000Z),
    });
    const query = jest.fn().mockResolvedValue([
      {
        value: {
          alias: 'sgp-fiscal-a1',
          pkcs12Base64: pkcs12.toString('base64'),
        },
      },
    ]) as QueryMock;
    const service = new TenantFiscalCertificateService(
      createDatabaseService(query),
      new IcpSignerService(),
    );

    const status = await service.activeCertificateStatus(
      new Date(TEST_CERT_STATUS_NOW_2026_05_05T00_00_00_000Z),
    );
    const serialized = JSON.stringify(status);

    expect(status).toEqual({
      alias: 'sgp-fiscal-a1',
      subject: 'CN=SGP Fiscal Certificate',
      validFrom: '2026-05-01T00:00:00.000Z',
      validTo: '2026-05-20T00:00:00.000Z',
      daysUntilExpiry: 15,
      expired: false,
      nearExpiry: true,
    });
    expect(serialized).not.toContain(pkcs12.toString('base64'));
    expect(serialized).not.toContain('pkcs12');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('privateKeyPem');
    expect(serialized).not.toContain('certificatePem');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('system_parameter'),
    );
  });

  it('marks expired certificates without returning secret certificate material', async () => {
    const pkcs12 = testPkcs12({
      notBefore: new Date(
        TEST_EXPIRED_CERT_VALID_FROM_2026_04_01T00_00_00_000Z,
      ),
      notAfter: new Date(TEST_EXPIRED_CERT_VALID_TO_2026_04_30T00_00_00_000Z),
    });
    const query = jest.fn().mockResolvedValue([
      {
        value: {
          pkcs12Base64: pkcs12.toString('base64'),
        },
      },
    ]) as QueryMock;
    const service = new TenantFiscalCertificateService(
      createDatabaseService(query),
      new IcpSignerService(),
    );

    await expect(
      service.activeCertificateStatus(
        new Date(TEST_CERT_STATUS_NOW_2026_05_05T00_00_00_000Z),
      ),
    ).resolves.toMatchObject({
      alias: null,
      expired: true,
      nearExpiry: false,
      daysUntilExpiry: -5,
    });
  });

  it('fails closed when no active fiscal certificate is configured', async () => {
    const query = jest.fn().mockResolvedValue([]) as QueryMock;
    const service = new TenantFiscalCertificateService(
      createDatabaseService(query),
      new IcpSignerService(),
    );

    await expect(service.activeCertificate()).rejects.toThrow(
      PreconditionFailedException,
    );
    await expect(service.activeCertificateStatus()).rejects.toThrow(
      'No active fiscal ICP-Brasil certificate is available',
    );
  });
});

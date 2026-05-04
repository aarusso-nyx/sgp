import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import forge from 'node-forge';

export interface EsocialPadesSignInput {
  xml: string;
  tenantId: string;
  signedAt?: string;
}

export interface EsocialPadesCertificateValidation {
  status: 'VALID' | 'INVALID';
  policy: 'local-icp-brasil-sandbox-chain';
  trustedRootSubject: string;
  issuerSubjects: string[];
  validAt: string;
  errors: string[];
}

export interface EsocialPadesLtvEvidence {
  mode: 'sandbox-ltv';
  timestamp: string;
  timestampTokenSha256: string;
  ocsp: {
    status: 'GOOD';
    responder: 'SGP local OCSP sandbox';
  };
  crl: {
    status: 'NOT_REVOKED';
    distributionPoint: 'sgp://local-icp-brasil-sandbox/crl';
  };
}

export interface EsocialPadesPkcs7Envelope {
  eventKind: 'S-1299';
  profile: 'PAdES-B-B';
  container: 'PKCS7_DETACHED_SIGNED_DATA';
  signerMode: 'SOFTWARE_CERTIFICATE_A1_SANDBOX';
  hsmDecision: 'MUST_DEFER';
  tenantId: string;
  payloadXml: string;
  payloadSha256: string;
  pkcs7DerBase64: string;
  pkcs7Sha256: string;
  signedAt: string;
  signatureAlgorithm: 'sha256WithRSAEncryption';
  digestAlgorithm: 'sha256';
  signer: {
    subject: string;
    issuer: string;
    serialNumber: string;
    certificatePem: string;
  };
  certificateChainPem: string[];
  certificateChainValidation: EsocialPadesCertificateValidation;
  ltv: EsocialPadesLtvEvidence;
}

export interface EsocialPadesSoapStubResult {
  statusCode: 200 | 422;
  protocol: string | null;
  requestSha256: string;
  acceptedAt: string | null;
  message: string;
}

interface CertificateNode {
  keyPair: forge.pki.rsa.KeyPair;
  cert: forge.pki.Certificate;
}

interface SoftwareCertificateMaterial {
  root: CertificateNode;
  intermediate: CertificateNode;
  signer: CertificateNode;
}

class DeterministicHashPrng {
  private counter = 0;

  constructor(private readonly seed: string) {}

  getBytesSync(count: number): string {
    let output = '';
    while (output.length < count) {
      output += createHash('sha256')
        .update(`${this.seed}:${this.counter++}`)
        .digest()
        .toString('binary');
    }
    return output.slice(0, count);
  }
}

export class SoftwarePadesPkcs7Signer {
  private static material: SoftwareCertificateMaterial | null = null;

  signS1299(input: EsocialPadesSignInput): EsocialPadesPkcs7Envelope {
    const xml = input.xml.trim();
    this.assertS1299(xml);

    const material = this.certificateMaterial();
    const signedAt = input.signedAt ?? new Date(0).toISOString();
    const signedAtDate = new Date(signedAt);
    if (Number.isNaN(signedAtDate.getTime())) {
      throw new BadRequestException('signedAt must be an ISO-8601 timestamp');
    }

    const payloadSha256 = this.sha256(xml);
    const pkcs7Der = this.signDetachedPkcs7(xml, material, signedAtDate);
    const pkcs7Sha256 = this.sha256Buffer(pkcs7Der);
    const certificateChainPem = [
      material.signer.cert,
      material.intermediate.cert,
      material.root.cert,
    ].map((cert) => forge.pki.certificateToPem(cert));

    return {
      eventKind: 'S-1299',
      profile: 'PAdES-B-B',
      container: 'PKCS7_DETACHED_SIGNED_DATA',
      signerMode: 'SOFTWARE_CERTIFICATE_A1_SANDBOX',
      hsmDecision: 'MUST_DEFER',
      tenantId: input.tenantId,
      payloadXml: xml,
      payloadSha256,
      pkcs7DerBase64: pkcs7Der.toString('base64'),
      pkcs7Sha256,
      signedAt: signedAtDate.toISOString(),
      signatureAlgorithm: 'sha256WithRSAEncryption',
      digestAlgorithm: 'sha256',
      signer: {
        subject: this.subject(material.signer.cert),
        issuer: this.issuer(material.signer.cert),
        serialNumber: material.signer.cert.serialNumber,
        certificatePem: forge.pki.certificateToPem(material.signer.cert),
      },
      certificateChainPem,
      certificateChainValidation: this.validateCertificateChain(
        certificateChainPem,
        signedAtDate,
      ),
      ltv: this.ltvEvidence(payloadSha256, pkcs7Sha256, signedAtDate),
    };
  }

  verifyEnvelope(envelope: EsocialPadesPkcs7Envelope): boolean {
    try {
      this.assertS1299(envelope.payloadXml);
      const payloadSha256 = this.sha256(envelope.payloadXml.trim());
      if (payloadSha256 !== envelope.payloadSha256) return false;

      const der = Buffer.from(envelope.pkcs7DerBase64, 'base64');
      if (this.sha256Buffer(der) !== envelope.pkcs7Sha256) return false;

      const message = forge.pkcs7.messageFromAsn1(
        forge.asn1.fromDer(der.toString('binary')),
      ) as unknown as { type?: string; certificates?: unknown[] };
      if (
        message.type !== forge.pki.oids.signedData ||
        !Array.isArray(message.certificates) ||
        message.certificates.length < 3
      ) {
        return false;
      }

      const validation = this.validateCertificateChain(
        envelope.certificateChainPem,
        new Date(envelope.signedAt),
      );
      if (validation.status !== 'VALID') return false;

      const expected = this.signS1299({
        xml: envelope.payloadXml,
        tenantId: envelope.tenantId,
        signedAt: envelope.signedAt,
      });
      return expected.pkcs7DerBase64 === envelope.pkcs7DerBase64;
    } catch {
      return false;
    }
  }

  private signDetachedPkcs7(
    xml: string,
    material: SoftwareCertificateMaterial,
    signedAt: Date,
  ): Buffer {
    const sha256Oid = forge.pki.oids.sha256;
    if (!sha256Oid) {
      throw new BadRequestException('node-forge SHA-256 OID is unavailable');
    }
    const signedData = forge.pkcs7.createSignedData();
    signedData.content = forge.util.createBuffer(xml, 'utf8');
    signedData.addCertificate(material.signer.cert);
    signedData.addCertificate(material.intermediate.cert);
    signedData.addCertificate(material.root.cert);
    signedData.addSigner({
      key: material.signer.keyPair.privateKey,
      certificate: material.signer.cert,
      digestAlgorithm: sha256Oid,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: signedAt,
        },
      ] as never,
    });
    signedData.sign({ detached: true });
    const der = forge.asn1.toDer(signedData.toAsn1()).getBytes();
    return Buffer.from(der, 'binary');
  }

  private validateCertificateChain(
    certificateChainPem: string[],
    validAt: Date,
  ): EsocialPadesCertificateValidation {
    const [signerPem, intermediatePem, rootPem] = certificateChainPem;
    const errors: string[] = [];
    if (!signerPem || !intermediatePem || !rootPem) {
      return this.invalidChain(validAt, errors.concat('chain is incomplete'));
    }

    const signer = forge.pki.certificateFromPem(signerPem);
    const intermediate = forge.pki.certificateFromPem(intermediatePem);
    const root = forge.pki.certificateFromPem(rootPem);

    this.expectIssuedBy(signer, intermediate, 'signer', errors);
    this.expectIssuedBy(intermediate, root, 'intermediate', errors);
    this.expectIssuedBy(root, root, 'root', errors);

    [signer, intermediate, root].forEach((cert) => {
      if (!this.validAt(cert, validAt)) {
        errors.push(`${this.subject(cert)} is outside validity window`);
      }
    });

    return {
      status: errors.length === 0 ? 'VALID' : 'INVALID',
      policy: 'local-icp-brasil-sandbox-chain',
      trustedRootSubject: this.subject(root),
      issuerSubjects: [this.issuer(signer), this.issuer(intermediate)],
      validAt: validAt.toISOString(),
      errors,
    };
  }

  private invalidChain(
    validAt: Date,
    errors: string[],
  ): EsocialPadesCertificateValidation {
    return {
      status: 'INVALID',
      policy: 'local-icp-brasil-sandbox-chain',
      trustedRootSubject: '',
      issuerSubjects: [],
      validAt: validAt.toISOString(),
      errors,
    };
  }

  private expectIssuedBy(
    cert: forge.pki.Certificate,
    issuer: forge.pki.Certificate,
    label: string,
    errors: string[],
  ) {
    try {
      if (!cert.isIssuer(issuer)) {
        errors.push(`${label} certificate issuer does not match chain`);
      }
      if (!issuer.verify(cert)) {
        errors.push(`${label} certificate signature is invalid`);
      }
    } catch {
      errors.push(`${label} certificate signature is invalid`);
    }
  }

  private ltvEvidence(
    payloadSha256: string,
    pkcs7Sha256: string,
    signedAt: Date,
  ): EsocialPadesLtvEvidence {
    const timestamp = signedAt.toISOString();
    return {
      mode: 'sandbox-ltv',
      timestamp,
      timestampTokenSha256: this.sha256(
        `${payloadSha256}:${pkcs7Sha256}:${timestamp}:SGP-LTV-SANDBOX`,
      ),
      ocsp: {
        status: 'GOOD',
        responder: 'SGP local OCSP sandbox',
      },
      crl: {
        status: 'NOT_REVOKED',
        distributionPoint: 'sgp://local-icp-brasil-sandbox/crl',
      },
    };
  }

  private certificateMaterial(): SoftwareCertificateMaterial {
    if (SoftwarePadesPkcs7Signer.material) {
      return SoftwarePadesPkcs7Signer.material;
    }

    const rootKeys = this.generateKeyPair('sgp-r4-01-root');
    const intermediateKeys = this.generateKeyPair('sgp-r4-01-intermediate');
    const signerKeys = this.generateKeyPair('sgp-r4-01-s1299-signer');

    const rootSubject = this.attributes(
      'SGP ICP-Brasil Sandbox Root',
      'SGP Local ICP-Brasil Sandbox',
    );
    const intermediateSubject = this.attributes(
      'SGP ICP-Brasil Sandbox Intermediate',
      'SGP Local ICP-Brasil Sandbox',
    );
    const signerSubject = this.attributes(
      'SGP eSocial S-1299 Software Certificate',
      'SGP Local Software Certificate',
    );

    const root = this.createCertificate({
      keyPair: rootKeys,
      issuerKeyPair: rootKeys,
      serialNumber: '01',
      subject: rootSubject,
      issuer: rootSubject,
      ca: true,
    });
    const intermediate = this.createCertificate({
      keyPair: intermediateKeys,
      issuerKeyPair: rootKeys,
      serialNumber: '02',
      subject: intermediateSubject,
      issuer: rootSubject,
      ca: true,
    });
    const signer = this.createCertificate({
      keyPair: signerKeys,
      issuerKeyPair: intermediateKeys,
      serialNumber: '03',
      subject: signerSubject,
      issuer: intermediateSubject,
      ca: false,
    });

    SoftwarePadesPkcs7Signer.material = {
      root: { keyPair: rootKeys, cert: root },
      intermediate: { keyPair: intermediateKeys, cert: intermediate },
      signer: { keyPair: signerKeys, cert: signer },
    };
    return SoftwarePadesPkcs7Signer.material;
  }

  private createCertificate(input: {
    keyPair: forge.pki.rsa.KeyPair;
    issuerKeyPair: forge.pki.rsa.KeyPair;
    serialNumber: string;
    subject: forge.pki.CertificateField[];
    issuer: forge.pki.CertificateField[];
    ca: boolean;
  }): forge.pki.Certificate {
    const cert = forge.pki.createCertificate();
    cert.publicKey = input.keyPair.publicKey;
    cert.serialNumber = input.serialNumber;
    cert.validity.notBefore = new Date('2026-01-01T00:00:00.000Z');
    cert.validity.notAfter = new Date('2036-01-01T00:00:00.000Z');
    cert.setSubject(input.subject);
    cert.setIssuer(input.issuer);
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: input.ca,
        critical: true,
      },
      {
        name: 'keyUsage',
        critical: true,
        digitalSignature: !input.ca,
        nonRepudiation: !input.ca,
        keyCertSign: input.ca,
        cRLSign: input.ca,
      },
      {
        name: 'extKeyUsage',
        clientAuth: !input.ca,
        emailProtection: !input.ca,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);
    cert.sign(input.issuerKeyPair.privateKey, forge.md.sha256.create());
    return cert;
  }

  private generateKeyPair(seed: string): forge.pki.rsa.KeyPair {
    return forge.pki.rsa.generateKeyPair({
      bits: 1024,
      e: 0x10001,
      prng: new DeterministicHashPrng(seed),
      workers: 0,
    });
  }

  private attributes(
    commonName: string,
    organizationName: string,
  ): forge.pki.CertificateField[] {
    return [
      { name: 'countryName', value: 'BR' },
      { name: 'organizationName', value: organizationName },
      { name: 'organizationalUnitName', value: 'R4-01 local evidence' },
      { name: 'commonName', value: commonName },
    ];
  }

  private assertS1299(xml: string) {
    if (!/<(?:\w+:)?evtFechaEvPer\b/.test(xml)) {
      throw new BadRequestException(
        'R4-01 software PKCS#7 slice only signs eSocial S-1299 evtFechaEvPer events',
      );
    }
    if (!/\sId="[^"]+"/.test(xml)) {
      throw new BadRequestException('S-1299 XML must include an Id attribute');
    }
  }

  private validAt(cert: forge.pki.Certificate, validAt: Date): boolean {
    return (
      cert.validity.notBefore.getTime() <= validAt.getTime() &&
      cert.validity.notAfter.getTime() >= validAt.getTime()
    );
  }

  private subject(cert: forge.pki.Certificate): string {
    return cert.subject.attributes
      .map((attribute) => this.attributeLabel(attribute))
      .join(',');
  }

  private issuer(cert: forge.pki.Certificate): string {
    return cert.issuer.attributes
      .map((attribute) => this.attributeLabel(attribute))
      .join(',');
  }

  private attributeLabel(attribute: forge.pki.CertificateField): string {
    return `${attribute.shortName ?? attribute.name}=${String(
      attribute.value,
    )}`;
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private sha256Buffer(value: Buffer): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

export class EsocialPadesSoapStub {
  constructor(
    private readonly signer: SoftwarePadesPkcs7Signer = new SoftwarePadesPkcs7Signer(),
  ) {}

  transmit(envelope: EsocialPadesPkcs7Envelope): EsocialPadesSoapStubResult {
    const requestSha256 = createHash('sha256')
      .update(envelope.pkcs7DerBase64)
      .update(envelope.payloadSha256)
      .digest('hex');

    if (!this.signer.verifyEnvelope(envelope)) {
      return {
        statusCode: 422,
        protocol: null,
        requestSha256,
        acceptedAt: null,
        message: 'Rejected by local eSocial PAdES SOAP stub',
      };
    }

    return {
      statusCode: 200,
      protocol: `SGP-S1299-PADES-${requestSha256.slice(0, 16).toUpperCase()}`,
      requestSha256,
      acceptedAt: envelope.signedAt,
      message: 'Accepted by local eSocial PAdES SOAP stub',
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { XmlDSigSigner, XmlDSigVerifier } from '@stynx/signature/xmldsig';
import forge from 'node-forge';

export interface CertificateMaterial {
  certificatePem: string;
  privateKeyPem: string;
  validFrom: Date;
  validTo: Date;
  subject: string;
}

export interface SignXmlInput {
  xml: string;
  pkcs12: Buffer;
  password?: string | undefined;
}

export interface SignedXmlResult {
  xml: string;
  certificatePem: string;
  validFrom: Date;
  validTo: Date;
  subject: string;
}

@Injectable()
export class IcpSignerService {
  sign(input: SignXmlInput): SignedXmlResult {
    const material = this.readPkcs12(input.pkcs12, input.password);
    const referenceId = this.findReferenceId(input.xml);
    const xml = new XmlDSigSigner().sign(input.xml, {
      key: {
        privateKeyPem: material.privateKeyPem,
        certificatePem: material.certificatePem,
      },
      reference: { id: referenceId, idAttribute: 'Id' },
      location: { reference: `//*[@Id='${referenceId}']`, action: 'append' },
    });

    return {
      ...material,
      xml,
    };
  }

  verify(xml: string, certificatePem: string): boolean {
    return new XmlDSigVerifier().verify(xml, {
      keys: [{ publicKeyPem: certificatePem }],
    }).ok;
  }

  readPkcs12(pkcs12: Buffer, password = ''): CertificateMaterial {
    try {
      const der = forge.util.createBuffer(pkcs12.toString('binary'));
      const asn1 = forge.asn1.fromDer(der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
      const keyBagOid = forge.pki.oids.pkcs8ShroudedKeyBag;
      const certBagOid = forge.pki.oids.certBag;
      if (!keyBagOid || !certBagOid) {
        throw new BadRequestException('Unsupported PKCS#12 bag OID set');
      }
      const keyBag = this.firstBag(
        p12.getBags({
          bagType: keyBagOid,
        })[keyBagOid],
      );
      const certBag = this.firstBag(
        p12.getBags({ bagType: certBagOid })[certBagOid],
      );

      if (!keyBag?.key || !certBag?.cert) {
        throw new BadRequestException(
          'PKCS#12 certificate must contain a private key and X.509 certificate',
        );
      }

      return {
        privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
        certificatePem: forge.pki.certificateToPem(certBag.cert),
        validFrom: certBag.cert.validity.notBefore,
        validTo: certBag.cert.validity.notAfter,
        subject: certBag.cert.subject.attributes
          .map(
            (attribute: forge.pki.CertificateField) =>
              `${attribute.shortName ?? attribute.name}=${String(attribute.value)}`,
          )
          .join(','),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid ICP-Brasil PKCS#12 certificate');
    }
  }

  toUnencryptedPkcs12(material: CertificateMaterial): Buffer {
    const privateKey = forge.pki.privateKeyFromPem(material.privateKeyPem);
    const certificate = forge.pki.certificateFromPem(material.certificatePem);
    const asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, certificate, '', {
      algorithm: '3des',
    });
    return Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary');
  }

  private findReferenceId(xml: string): string {
    const id = xml.match(/\sId="([^"]+)"/)?.[1];
    if (!id) {
      throw new BadRequestException(
        'Signed XML must include an Id attribute on the signed element',
      );
    }
    return id;
  }

  private firstBag(
    bags: forge.pkcs12.Bag[] | undefined,
  ): forge.pkcs12.Bag | undefined {
    return bags?.[0];
  }
}

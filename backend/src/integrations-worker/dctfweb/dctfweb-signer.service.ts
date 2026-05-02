import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SignedXml } from 'xml-crypto';

import { DatabaseService } from '../../database/database.service';
import { CertificateStoreService } from '../../esocial-worker/certificate-store/certificate-store.service';
import { IcpSignerService } from '../../esocial-worker/signature/icp-signer.service';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebDeclarationDetailsDto } from './dctfweb.dto';

@Injectable()
export class DctfwebSignerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly declarations: DctfwebBuilderService,
    private readonly certificateStore: CertificateStoreService,
    private readonly icpSigner: IcpSignerService,
  ) {}

  async sign(id: string): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const declaration = await this.declarations.find(id);
    if (declaration.status !== 'DRAFT' && declaration.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only draft or rejected DCTFWeb declarations can be signed',
      );
    }

    let certificate: Awaited<
      ReturnType<CertificateStoreService['activeCertificate']>
    >;
    try {
      certificate = await this.certificateStore.activeCertificate();
    } catch (error) {
      throw new PreconditionFailedException(
        error instanceof Error
          ? error.message
          : 'No active ICP-Brasil certificate is available',
      );
    }

    const material = this.icpSigner.readPkcs12(certificate.pkcs12);
    const signedXml = signDctfwebXml(
      declaration.payloadXml,
      material.privateKeyPem,
      material.certificatePem,
    );
    const signedHash = sha256(signedXml);
    const signedRef = `s3://local-fiscal/dctfweb/${id}/${signedHash}.signed.xml`;

    await this.databaseService.query(
      `
      UPDATE fiscal.dctfweb_declaration
      SET status = 'SIGNED'::fiscal.dctfweb_declaration_status,
          signed_xml_ref = $2,
          signed_xml = $3,
          signed_xml_hash = $4,
          transmitted_xml_hash = NULL,
          receipt_number = NULL,
          receipt_at = NULL,
          receipt_payload = '{}'::jsonb
      WHERE id = $1::uuid
      `,
      [id, signedRef, signedXml, signedHash],
    );
    return this.declarations.find(id);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DCTFWeb signing',
      );
    }
  }
}

export function signDctfwebXml(
  xml: string,
  privateKeyPem: string,
  certificatePem: string,
): string {
  const referenceId = xml.match(/\sId="([^"]+)"/)?.[1];
  if (!referenceId) {
    throw new BadRequestException('DCTFWeb XML must include an Id attribute');
  }
  const signer = new SignedXml();
  signer.privateKey = privateKeyPem;
  signer.publicCert = certificatePem;
  signer.canonicalizationAlgorithm =
    'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  signer.signatureAlgorithm =
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  signer.addReference({
    xpath: `//*[@Id='${referenceId}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });
  signer.computeSignature(xml, {
    location: {
      reference: "//*[local-name(.)='declaracao']",
      action: 'append',
    },
  });
  return signer.getSignedXml();
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

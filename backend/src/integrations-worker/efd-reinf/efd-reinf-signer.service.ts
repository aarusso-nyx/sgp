import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SignedXml } from 'xml-crypto';

import { DatabaseService } from '../../database/database.service';
import { IcpSignerService } from '../../external/signature/icp-signer.service';
import { TenantFiscalCertificateService } from '../../external/signature/tenant-fiscal-certificate.service';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { EfdReinfEventDetailsDto } from './efd-reinf.dto';

@Injectable()
export class EfdReinfSignerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly events: EfdReinfBuilderService,
    private readonly certificateStore: TenantFiscalCertificateService,
    private readonly icpSigner: IcpSignerService,
  ) {}

  async sign(id: string): Promise<EfdReinfEventDetailsDto> {
    this.ensureDatabase();
    const event = await this.events.find(id);
    if (event.status !== 'DRAFT' && event.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only draft or rejected EFD-Reinf events can be signed',
      );
    }

    let certificate: Awaited<
      ReturnType<TenantFiscalCertificateService['activeCertificate']>
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

    const material = this.icpSigner.readPkcs12(
      certificate.pkcs12,
      certificate.password,
    );
    const signedXml = signEfdReinfXml(
      event.payloadXml,
      material.privateKeyPem,
      material.certificatePem,
    );
    const signedHash = sha256(signedXml);
    const signedRef = `s3://local-fiscal/efd-reinf/${id}/${signedHash}.signed.xml`;

    await this.databaseService.query(
      `
      UPDATE fiscal.efd_reinf_event
      SET status = 'SIGNED'::fiscal.efd_reinf_event_status,
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
    return this.events.find(id);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for EFD-Reinf signing',
      );
    }
  }
}

export function signEfdReinfXml(
  xml: string,
  privateKeyPem: string,
  certificatePem: string,
): string {
  const referenceId = xml.match(/\sId="([^"]+)"/)?.[1];
  if (!referenceId) {
    throw new BadRequestException('EFD-Reinf XML must include an Id attribute');
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
      reference: `//*[@Id='${referenceId}']`,
      action: 'append',
    },
  });
  return signer.getSignedXml();
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

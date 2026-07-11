import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sha256Hex } from '@stynx-nyx/signature';
import { XmlDSigSigner } from '@stynx-nyx/signature/xmldsig';

import { DatabaseService } from '../../database/database.service';
import { IcpSignerService } from '../../external/signature/icp-signer.service';
import { TenantFiscalCertificateService } from '../../external/signature/tenant-fiscal-certificate.service';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebDeclarationDetailsDto } from './dctfweb.dto';

@Injectable()
export class DctfwebSignerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly declarations: DctfwebBuilderService,
    private readonly certificateStore: TenantFiscalCertificateService,
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
    const signedXml = signDctfwebXml(
      declaration.payloadXml,
      material.privateKeyPem,
      material.certificatePem,
    );
    const signedHash = sha256Hex(Buffer.from(signedXml, 'utf8'));
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

  return new XmlDSigSigner().sign(xml, {
    key: { privateKeyPem, certificatePem },
    reference: { id: referenceId, idAttribute: 'Id' },
    location: {
      reference: "//*[local-name(.)='declaracao']",
      action: 'append',
    },
  });
}

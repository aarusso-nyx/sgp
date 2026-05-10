import { Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

import type { SgpEnvironmentConfig } from './sgp-environment.js';

export type SgpEdgeCertificateStackProps = StackProps &
  Readonly<{
    config: SgpEnvironmentConfig;
  }>;

export class SgpEdgeCertificateStack extends Stack {
  readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: SgpEdgeCertificateStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.config.hostedZoneId,
      zoneName: props.config.hostedZoneName,
    });

    this.certificate = new acm.Certificate(this, 'CloudFrontWildcardCertificate', {
      certificateName: `${props.config.namePrefix}-cloudfront-wildcard`,
      domainName: `*.${props.config.hostedZoneName}`,
      subjectAlternativeNames: [props.config.hostedZoneName],
      validation: acm.CertificateValidation.fromDns(zone),
    });
  }
}

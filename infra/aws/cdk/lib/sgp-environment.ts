import { App } from 'aws-cdk-lib';

export type SgpTarget = 'stage' | 'prod';

export type SgpEnvironmentConfig = Readonly<{
  target: SgpTarget;
  namePrefix: string;
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
  availabilityZones: readonly string[];
  documentsBucketName: string;
  frontendBucketName: string;
  artifactBucketName: string;
  databaseName: string;
  databaseUsername: string;
  instanceType: string;
  isProd: boolean;
  queueKinds: readonly string[];
}>;

export function buildEnvironmentConfig(app: App): SgpEnvironmentConfig {
  const target = normalizeTarget(
    app.node.tryGetContext('target') ??
      process.env.DEPLOY_TARGET ??
      process.env.SGP_TARGET ??
      'stage',
  );
  const hostedZoneName = trimTrailingDot(
    stringContext(app, 'hostedZoneName', 'detran-am.sistematech.com.br'),
  );
  const hostedZoneId = stringContext(
    app,
    'hostedZoneId',
    process.env.ROUTE53_HOSTED_ZONE_ID ?? 'ZSGPPLACEHOLDER',
  );
  const domainName = target === 'prod' ? `sgp.${hostedZoneName}` : `sgp-stage.${hostedZoneName}`;
  const namePrefix = `sgp-${target}`;
  const region = process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? 'sa-east-1';
  const availabilityZones = [`${region}a`, `${region}b`];

  return {
    target,
    namePrefix,
    domainName,
    hostedZoneName,
    hostedZoneId,
    availabilityZones,
    documentsBucketName: 'sgp-docs.detran-am.sistematech.com.br',
    frontendBucketName: 'frontend.detran-am.sistematech.com.br',
    artifactBucketName: 'sgp-artifacts.detran-am.sistematech.com.br',
    databaseName: 'sgp',
    databaseUsername: 'sgp',
    instanceType: 't4g.small',
    isProd: target === 'prod',
    queueKinds: ['govbr-sign', 'tce', 'siconfi', 'siope', 'siops', 'banking'],
  };
}

export function queueTopicNames(kind: string): readonly string[] {
  return [`sgp.adapter.${kind}.request`, `sgp.adapter.${kind}.response`, `sgp.adapter.${kind}.dlq`];
}

export function queueNameForTopic(prefix: string, topic: string): string {
  return `${prefix}-${topic.replaceAll('.', '-')}`.slice(0, 80);
}

function normalizeTarget(value: unknown): SgpTarget {
  if (value === 'stage' || value === 'prod') return value;
  throw new Error(`Invalid SGP CDK target: ${String(value)}. Use stage or prod.`);
}

function stringContext(app: App, key: string, fallback: string): string {
  const value = app.node.tryGetContext(key);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function trimTrailingDot(value: string): string {
  return value.replace(/\.+$/, '');
}

#!/usr/bin/env node

import { App, Tags } from 'aws-cdk-lib';

import { SgpAwsStack } from '../lib/sgp-aws-stack.js';
import { SgpEdgeCertificateStack } from '../lib/sgp-edge-certificate-stack.js';
import { SgpSharedStorageStack } from '../lib/sgp-shared-storage-stack.js';
import { buildEnvironmentConfig } from '../lib/sgp-environment.js';

const app = new App();
const config = buildEnvironmentConfig(app);
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION;

if (!region) {
  throw new Error('AWS_REGION or CDK_DEFAULT_REGION is required for SGP CDK synthesis.');
}

const regionalEnv = account ? { account, region } : { region };
const edgeEnv = account ? { account, region: 'us-east-1' } : { region: 'us-east-1' };

const edgeCertificate = new SgpEdgeCertificateStack(app, `sgp-${config.target}-edge-cert`, {
  config,
  env: edgeEnv,
  crossRegionReferences: true,
});

const sharedStorage = new SgpSharedStorageStack(app, 'sgp-shared-storage', {
  config,
  env: regionalEnv,
});

const appStack = new SgpAwsStack(app, `sgp-${config.target}-aws`, {
  config,
  certificate: edgeCertificate.certificate,
  documentsBucket: sharedStorage.documentsBucket,
  frontendBucket: sharedStorage.frontendBucket,
  artifactBucket: sharedStorage.artifactBucket,
  env: regionalEnv,
  crossRegionReferences: true,
});

appStack.addDependency(edgeCertificate);
appStack.addDependency(sharedStorage);

for (const stack of [edgeCertificate, sharedStorage, appStack]) {
  Tags.of(stack).add('Application', 'sgp');
  Tags.of(stack).add('ManagedBy', 'cdk');
  Tags.of(stack).add('Owner', 'sgp');
  Tags.of(stack).add('DeploymentTarget', config.target);
}

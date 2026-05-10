import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import type { SgpEnvironmentConfig } from './sgp-environment.js';

export type SgpSharedStorageStackProps = StackProps &
  Readonly<{
    config: SgpEnvironmentConfig;
  }>;

export class SgpSharedStorageStack extends Stack {
  readonly documentsBucket: s3.Bucket;
  readonly frontendBucket: s3.Bucket;
  readonly artifactBucket: s3.Bucket;
  readonly storageKey: kms.Key;

  constructor(scope: Construct, id: string, props: SgpSharedStorageStackProps) {
    super(scope, id, props);

    this.storageKey = new kms.Key(this, 'StorageKey', {
      alias: `alias/${props.config.namePrefix}/storage`,
      description: 'SGP shared S3 storage CMK for documents, frontend assets, and artifacts.',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.documentsBucket = this.secureBucket(
      'DocumentsBucket',
      props.config.documentsBucketName,
      this.storageKey,
    );
    this.frontendBucket = this.secureBucket(
      'FrontendBucket',
      props.config.frontendBucketName,
      this.storageKey,
    );
    this.artifactBucket = this.secureBucket(
      'ArtifactBucket',
      props.config.artifactBucketName,
      this.storageKey,
    );
  }

  private secureBucket(id: string, bucketName: string, encryptionKey: kms.IKey): s3.Bucket {
    return new s3.Bucket(this, id, {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      bucketKeyEnabled: true,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });
  }
}

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  SecretValue,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

import {
  queueNameForTopic,
  queueTopicNames,
  type SgpEnvironmentConfig,
} from './sgp-environment.js';

export type SgpAwsStackProps = StackProps &
  Readonly<{
    config: SgpEnvironmentConfig;
    certificate: acm.ICertificate;
    documentsBucket: s3.IBucket;
    frontendBucket: s3.IBucket;
    artifactBucket: s3.IBucket;
  }>;

export class SgpAwsStack extends Stack {
  constructor(scope: Construct, id: string, props: SgpAwsStackProps) {
    super(scope, id, props);

    const { config } = props;
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: config.hostedZoneId,
      zoneName: config.hostedZoneName,
    });

    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${config.namePrefix}-vpc`,
      availabilityZones: [...config.availabilityZones],
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'app',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'data',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetGroupName: 'app' }, { subnetGroupName: 'data' }],
    });

    const endpointServices = [
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
      ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      ec2.InterfaceVpcEndpointAwsService.KMS,
      ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      ec2.InterfaceVpcEndpointAwsService.SSM,
      ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    ];
    if (config.isProd) {
      endpointServices.push(ec2.InterfaceVpcEndpointAwsService.SQS);
    }
    for (const service of endpointServices) {
      vpc.addInterfaceEndpoint(`${service.shortName}Endpoint`, {
        service,
        subnets: { subnetGroupName: 'app' },
      });
    }

    const databaseKey = new kms.Key(this, 'DatabaseKey', {
      alias: `alias/${config.namePrefix}/database`,
      description: `${config.namePrefix} RDS PostgreSQL CMK.`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const runtimeSecretKey = new kms.Key(this, 'RuntimeSecretKey', {
      alias: `alias/${config.namePrefix}/runtime-secrets`,
      description: `${config.namePrefix} runtime Secrets Manager CMK.`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const logsKey = new kms.Key(this, 'LogsKey', {
      alias: `alias/${config.namePrefix}/logs`,
      description: `${config.namePrefix} CloudWatch Logs CMK.`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const queueKey = config.isProd
      ? new kms.Key(this, 'QueueKey', {
          alias: `alias/${config.namePrefix}/sqs`,
          description: `${config.namePrefix} SQS CMK.`,
          enableKeyRotation: true,
          removalPolicy: RemovalPolicy.RETAIN,
        })
      : undefined;

    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      securityGroupName: `${config.namePrefix}-alb-sg`,
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));

    const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc,
      securityGroupName: `${config.namePrefix}-app-sg`,
      allowAllOutbound: true,
    });
    for (const port of [3000, 3001, 3302, 3304, 3305, 3306]) {
      appSecurityGroup.addIngressRule(
        albSecurityGroup,
        ec2.Port.tcp(port),
        `ALB or private readiness access to SGP runtime port ${port}`,
      );
    }

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      securityGroupName: `${config.namePrefix}-db-sg`,
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(appSecurityGroup, ec2.Port.tcp(5432));

    const database = new rds.DatabaseInstance(this, 'Database', {
      instanceIdentifier: `${config.namePrefix}-postgres`,
      vpc,
      vpcSubnets: { subnetGroupName: 'data' },
      securityGroups: [dbSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),
      allocatedStorage: config.isProd ? 100 : 50,
      maxAllocatedStorage: config.isProd ? 500 : 100,
      multiAz: config.isProd,
      databaseName: config.databaseName,
      credentials: rds.Credentials.fromGeneratedSecret(config.databaseUsername, {
        secretName: `${config.namePrefix}/rds/sgp`,
      }),
      backupRetention: Duration.days(config.isProd ? 14 : 3),
      deletionProtection: config.isProd,
      storageEncrypted: true,
      storageEncryptionKey: databaseKey,
      removalPolicy: RemovalPolicy.RETAIN,
      publiclyAccessible: false,
    });

    const runtimeSecret = new secretsmanager.Secret(this, 'RuntimeSecret', {
      secretName: `${config.namePrefix}/runtime/stynx-identity`,
      description:
        'SGP runtime identity values supplied by Stynx. SGP consumes these values and does not provision identity.',
      encryptionKey: runtimeSecretKey,
      secretObjectValue: {
        COGNITO_ISSUER: SecretValue.unsafePlainText('SET_BY_STYNX'),
        COGNITO_CLIENT_ID: SecretValue.unsafePlainText('SET_BY_STYNX'),
        COGNITO_JWKS_URI: SecretValue.unsafePlainText('SET_BY_STYNX'),
        COGNITO_TOKEN_USE: SecretValue.unsafePlainText('access'),
        STYNX_CLAIMS_MAPPING: SecretValue.unsafePlainText('SET_BY_STYNX'),
      },
    });

    const appRole = new iam.Role(this, 'AppInstanceRole', {
      roleName: `${config.namePrefix}-ec2-role`,
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });
    props.documentsBucket.grantReadWrite(appRole);
    props.artifactBucket.grantRead(appRole);
    database.secret?.grantRead(appRole);
    runtimeSecret.grantRead(appRole);

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -euo pipefail',
      'install -d -o ec2-user -g ec2-user /opt/sgp/releases /opt/sgp/shared /opt/sgp/bin /var/log/sgp',
      'cat >/opt/sgp/shared/runtime.env <<EOF',
      'NODE_ENV=production',
      `SGP_TARGET=${config.target}`,
      `SGP_DOMAIN=https://${config.domainName}`,
      'API_BASE_PATH=/api',
      `DATABASE_URL=postgresql://${config.databaseUsername}@${database.instanceEndpoint.hostname}:5432/${config.databaseName}`,
      `RDS_HOST=${database.instanceEndpoint.hostname}`,
      `S3_DOCUMENTS_BUCKET=s3://${config.documentsBucketName}/`,
      `S3_DOCUMENTS_KEY_PREFIX=${config.target}`,
      `S3_FRONTEND_BUCKET=s3://${config.frontendBucketName}/`,
      'PORT=3000',
      'PORTAL_API_PORT=3001',
      'PAYROLL_ENGINE_PORT=3302',
      'INTEGRATIONS_WORKER_READY_PORT=3304',
      'REPORT_SERVICE_PORT=3305',
      'REPORT_WORKER_READY_PORT=3306',
      `CORS_ORIGIN=https://${config.domainName}`,
      'SGP_RATE_LIMIT_TRUST_PROXY=true',
      'EOF',
      'chown ec2-user:ec2-user /opt/sgp/shared/runtime.env',
      'chmod 0640 /opt/sgp/shared/runtime.env',
      'cat >/opt/sgp/shared/pm2-apps.json <<EOF',
      JSON.stringify(pm2ProcessList(), null, 2),
      'EOF',
      'chown ec2-user:ec2-user /opt/sgp/shared/pm2-apps.json',
      'chmod 0644 /opt/sgp/shared/pm2-apps.json',
    );

    const asg = new autoscaling.AutoScalingGroup(this, 'AppHost', {
      autoScalingGroupName: `${config.namePrefix}-app-asg`,
      vpc,
      vpcSubnets: { subnetGroupName: 'app' },
      role: appRole,
      securityGroup: appSecurityGroup,
      minCapacity: 2,
      desiredCapacity: 2,
      maxCapacity: 4,
      instanceType: new ec2.InstanceType(config.instanceType),
      machineImage: ec2.MachineImage.resolveSsmParameterAtLaunch(
        '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64',
      ),
      requireImdsv2: true,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: autoscaling.BlockDeviceVolume.ebs(40, {
            encrypted: true,
          }),
        },
      ],
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      loadBalancerName: `${config.namePrefix}-alb`,
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: { subnetGroupName: 'public' },
    });
    alb.setAttribute('load_balancing.cross_zone.enabled', 'true');
    const listener = alb.addListener('HttpListener', {
      port: 80,
      open: false,
    });

    const coreTargets = listener.addTargets('CoreApiTargets', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [asg],
      healthCheck: {
        path: '/api/v1/health/ready',
        healthyHttpCodes: '200',
      },
    });
    const portalTargets = listener.addTargets('PortalApiTargets', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/v1/portal/*', '/api/portal/*'])],
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [asg],
      healthCheck: {
        path: '/api/v1/health/ready',
        healthyHttpCodes: '200',
      },
    });
    const reportTargets = listener.addTargets('ReportServiceTargets', {
      priority: 20,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/v1/report-service/*'])],
      port: 3305,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [asg],
      healthCheck: {
        path: '/api/v1/report-service/health',
        healthyHttpCodes: '200',
      },
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        responseHeadersPolicyName: `${config.namePrefix}-security-headers`,
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
      },
    );

    const adminOrigin = new origins.S3Origin(props.frontendBucket, {
      originPath: `/${config.target}/admin`,
    });
    const portalOrigin = new origins.S3Origin(props.frontendBucket, {
      originPath: `/${config.target}/portal`,
    });
    const apiOrigin = new origins.LoadBalancerV2Origin(alb, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });
    const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
      functionName: `${config.namePrefix}-spa-rewrite`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (!request.uri.includes('.') && !request.uri.endsWith('/')) {
    request.uri = '/index.html';
  }
  if (request.uri.endsWith('/')) {
    request.uri = request.uri + 'index.html';
  }
  return request;
}`),
    });
    const spaFunctionAssociation = {
      eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      function: spaRewriteFunction,
    };

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${config.namePrefix} SGP CloudFront distribution`,
      domainNames: [config.domainName],
      certificate: props.certificate,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: adminOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy,
        functionAssociations: [spaFunctionAssociation],
      },
      additionalBehaviors: {
        '/admin/*': {
          origin: adminOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy,
          functionAssociations: [spaFunctionAssociation],
        },
        '/portal/*': {
          origin: portalOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy,
          functionAssociations: [spaFunctionAssociation],
        },
        '/api/*': {
          origin: apiOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    new route53.ARecord(this, 'DomainAlias', {
      zone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
    });

    new logs.LogGroup(this, 'AppLogGroup', {
      logGroupName: `/sgp/${config.target}/pm2`,
      retention: config.isProd ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_MONTH,
      encryptionKey: logsKey,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new cloudwatch.Alarm(this, 'Alb5xxAlarm', {
      alarmName: `${config.namePrefix}-alb-5xx`,
      alarmDescription: 'ALB 5xx responses observed for SGP API origin.',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_ELB_5XX_Count',
        dimensionsMap: { LoadBalancer: alb.loadBalancerFullName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    new cloudwatch.Alarm(this, 'CoreTargetUnhealthyAlarm', {
      alarmName: `${config.namePrefix}-core-target-unhealthy`,
      alarmDescription: 'Core API target group has unhealthy hosts.',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'UnHealthyHostCount',
        dimensionsMap: {
          LoadBalancer: alb.loadBalancerFullName,
          TargetGroup: coreTargets.targetGroupFullName,
        },
        statistic: 'Maximum',
        period: Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new ssm.StringParameter(this, 'DomainParameter', {
      parameterName: `/${config.namePrefix}/domain`,
      stringValue: `https://${config.domainName}`,
    });
    new ssm.StringParameter(this, 'DocumentsBucketParameter', {
      parameterName: `/${config.namePrefix}/s3/documents-bucket`,
      stringValue: `s3://${config.documentsBucketName}/`,
    });
    new ssm.StringParameter(this, 'FrontendBucketParameter', {
      parameterName: `/${config.namePrefix}/s3/frontend-bucket`,
      stringValue: `s3://${config.frontendBucketName}/`,
    });
    new ssm.StringParameter(this, 'DatabaseUrlTemplateParameter', {
      parameterName: `/${config.namePrefix}/database/url-template`,
      stringValue: `postgresql://${config.databaseUsername}@${database.instanceEndpoint.hostname}:5432/${config.databaseName}`,
    });

    if (config.isProd) {
      for (const kind of config.queueKinds) {
        for (const topic of queueTopicNames(kind)) {
          const deadLetterQueue = new sqs.Queue(this, queueId(topic, 'Dlq'), {
            queueName: queueNameForTopic(config.namePrefix, `${topic}.dead`),
            retentionPeriod: Duration.days(14),
            enforceSSL: true,
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: queueKey,
          });
          const queue = new sqs.Queue(this, queueId(topic, 'Queue'), {
            queueName: queueNameForTopic(config.namePrefix, topic),
            visibilityTimeout: Duration.seconds(60),
            retentionPeriod: Duration.days(4),
            enforceSSL: true,
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: queueKey,
            deadLetterQueue: {
              maxReceiveCount: 5,
              queue: deadLetterQueue,
            },
          });
          queue.grantSendMessages(appRole);
          queue.grantConsumeMessages(appRole);
          deadLetterQueue.grantSendMessages(appRole);
        }
      }
    }

    new CfnOutput(this, 'DomainName', { value: config.domainName });
    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });
    new CfnOutput(this, 'AlbDnsName', { value: alb.loadBalancerDnsName });
    new CfnOutput(this, 'CoreTargetGroupArn', {
      value: coreTargets.targetGroupArn,
    });
    new CfnOutput(this, 'PortalTargetGroupArn', {
      value: portalTargets.targetGroupArn,
    });
    new CfnOutput(this, 'ReportTargetGroupArn', {
      value: reportTargets.targetGroupArn,
    });
  }
}

function pm2ProcessList(): unknown[] {
  return [
    pm2ClusterProcess('sgp-core-api', 'backend/dist/main.js', {
      PORT: '3000',
    }),
    pm2ClusterProcess('sgp-portal-api', 'backend/dist/main-portal.js', {
      PORTAL_API_PORT: '3001',
    }),
    pm2ClusterProcess('sgp-payroll-engine', 'backend/dist/main-payroll-engine.js', {
      PAYROLL_ENGINE_PORT: '3302',
    }),
    pm2ForkProcess('sgp-integrations-worker', 'backend/dist/main-integrations-worker.js', {
      INTEGRATIONS_WORKER_READY_PORT: '3304',
    }),
    pm2ClusterProcess('sgp-report-service', 'backend/dist/main-report-service.js', {
      REPORT_SERVICE_PORT: '3305',
    }),
    pm2ForkProcess('sgp-report-worker', 'backend/dist/main-report-worker.js', {
      REPORT_WORKER_READY_PORT: '3306',
    }),
  ];
}

function pm2ClusterProcess(name: string, script: string, env: Record<string, string>): unknown {
  return {
    name,
    script,
    cwd: '/opt/sgp/current',
    exec_mode: 'cluster',
    instances: 'max',
    env,
  };
}

function pm2ForkProcess(name: string, script: string, env: Record<string, string>): unknown {
  return {
    name,
    script,
    cwd: '/opt/sgp/current',
    exec_mode: 'fork',
    instances: 1,
    env,
  };
}

function queueId(topic: string, suffix: string): string {
  return `${topic.replace(/[^a-zA-Z0-9]/g, '')}${suffix}`;
}

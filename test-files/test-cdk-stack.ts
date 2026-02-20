/**
 * CloudSave AI — Mock CDK Test Stack
 * Contains ALL anti-patterns for comprehensive testing.
 * Upload this file to CloudSave AI to see all 15 rules in action.
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class LogicSparkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // RULE 1: Lambda Overprovisioned Memory
    // 4096MB when 1024MB would suffice
    // ==========================================
    const processOrdersFunction = new lambda.Function(this, 'processOrdersFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/functions/process-orders'),
      memorySize: 4096,          // ⚠️ ANTI-PATTERN: 4x more than needed
      timeout: cdk.Duration.seconds(900), // ⚠️ ANTI-PATTERN: Max timeout (Rule 2)
      architecture: lambda.Architecture.X86_64,
    });

    const generateReportFunction = new lambda.Function(this, 'generateReportFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/functions/generate-report'),
      memorySize: 3072,          // ⚠️ ANTI-PATTERN: Over-provisioned
      timeout: cdk.Duration.seconds(600),
    });

    // ==========================================
    // RULE 3: RDS MultiAZ in Dev (CRITICAL!)
    // ==========================================
    const vpc = new ec2.Vpc(this, 'DevVPC', {
      natGateways: 3,            // ⚠️ ANTI-PATTERN: 3 NAT Gateways (Rule 11)
    });

    const devDatabase = new rds.DatabaseInstance(this, 'devDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.R5,      // ⚠️ ANTI-PATTERN: R5 in dev (Rule 4)
        ec2.InstanceSize.XLARGE   // ⚠️ ANTI-PATTERN: xlarge for dev
      ),
      multiAz: true,              // ⚠️ ANTI-PATTERN: MultiAZ in dev (Rule 3)
      vpc,
      allocatedStorage: 500,
      databaseName: 'dev_app_db',
      // Missing: prod tag → detected as dev
    });

    // ==========================================
    // RULE 5: ECS Over-Scaled (5 tasks)
    // ==========================================
    const cluster = new ecs.Cluster(this, 'DevCluster', { vpc });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
      cpu: 4096,                  // ⚠️ ANTI-PATTERN: 4 vCPU (Rule 6)
      memoryLimitMiB: 16384,     // ⚠️ ANTI-PATTERN: 16GB RAM (Rule 6)
    });

    taskDefinition.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
      portMappings: [{ containerPort: 80 }],
    });

    const appService = new ecs.FargateService(this, 'appService', {
      cluster,
      taskDefinition,
      desiredCount: 5,            // ⚠️ ANTI-PATTERN: 5 tasks for dev (Rule 5)
    });

    // ==========================================
    // RULE 7: API Gateway REST + NLB
    // ==========================================
    const nlb = new elbv2.NetworkLoadBalancer(this, 'AppNLB', {
      vpc,
      internetFacing: false,
    });

    const vpcLink = new apigateway.VpcLink(this, 'AppVpcLink', {
      targets: [nlb],
    });

    const devApi = new apigateway.RestApi(this, 'devApi', {
      restApiName: 'dev-rest-api',
      // ⚠️ ANTI-PATTERN: REST API instead of HTTP API (Rule 8)
      // ⚠️ ANTI-PATTERN: Using NLB with API Gateway (Rule 7)
      defaultIntegration: new apigateway.HttpIntegration(
        'http://internal.example.com',
        { httpMethod: 'ANY', options: { vpcLink } }
      ),
    });

    // ==========================================
    // RULE 9: S3 No Lifecycle Policy
    // ==========================================
    const appDataBucket = new s3.Bucket(this, 'appDataBucket', {
      bucketName: 'logicspark-dev-app-data',
      versioned: true,
      // ⚠️ ANTI-PATTERN: No lifecycle rules (Rule 9)
      // ⚠️ ANTI-PATTERN: No intelligent tiering (Rule 10)
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const logsBucket = new s3.Bucket(this, 'logsBucket', {
      bucketName: 'logicspark-dev-logs',
      // ⚠️ ANTI-PATTERN: No lifecycle rules for logs
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: devDatabase.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: devApi.url,
    });
  }
}

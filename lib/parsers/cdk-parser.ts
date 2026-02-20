/**
 * CloudSave AI — AWS CDK Parser
 * Parses TypeScript/JavaScript/Python CDK files using regex pattern matching.
 * Outputs NormalizedInfra JSON.
 * @module lib/parsers/cdk-parser
 */

import type { NormalizedInfra } from '../types';

/**
 * Parses an AWS CDK file (TypeScript, JavaScript, or Python) and extracts
 * infrastructure resource definitions into NormalizedInfra format.
 * @param content - Raw file content as string
 * @returns Normalized infrastructure representation
 */
export function parseCDK(content: string): NormalizedInfra {
  const infra: NormalizedInfra = {};

  parseLambdaFunctions(content, infra);
  parseRDSInstances(content, infra);
  parseECSServices(content, infra);
  parseAPIGateway(content, infra);
  parseS3Buckets(content, infra);
  parseEC2Instances(content, infra);
  parseDynamoDB(content, infra);
  parseCloudFront(content, infra);
  parseNATGateways(content, infra);
  parseElastiCache(content, infra);

  return infra;
}

/** Extract Lambda function definitions from CDK */
function parseLambdaFunctions(content: string, infra: NormalizedInfra): void {
  const functions: NormalizedInfra['lambda'] extends { functions: infer F } ? F : never = [];

  // Match new lambda.Function(...) or new NodejsFunction(...) blocks
  const lambdaBlockRegex =
    /new\s+(?:lambda|nodejs|python|go|java)(?:\.[\w]+)?(?:Function|Lambda)\s*\([^)]*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gi;
  const singleLineFunctionRegex =
    /new\s+(?:\w+\.)?(?:Function|NodejsFunction|PythonFunction|GoFunction)\s*\(\s*\w+\s*,\s*['"]([\w-]+)['"]\s*,\s*\{([^}]+)\}/gi;

  // Named function extraction — TypeScript CDK style
  const namedFunctionRegex =
    /(?:const|let|var)\s+(\w+)\s*=\s*new\s+(?:\w+\.)?(?:Function|NodejsFunction|PythonFunction)\s*\(/gi;

  // Memory size patterns
  const memoryRegex = /memorySize\s*:\s*(\d+)/gi;
  const timeoutRegex =
    /timeout\s*:\s*(?:Duration\.seconds\s*\(\s*(\d+)\s*\)|Duration\.minutes\s*\(\s*(\d+)\s*\))/gi;
  const runtimeRegex = /runtime\s*:\s*Runtime\.([\w_]+)/gi;
  const architectureRegex = /architecture(?:s)?\s*:\s*Architecture\.([\w_]+)/gi;
  const provisionedRegex = /provisionedConcurrentExecutions\s*:\s*(\d+)/gi;

  // Find all lambda blocks
  let match: RegExpExecArray | null;
  const lambdaRegion =
    /new\s+(?:\w+\.)*(?:Function|NodejsFunction|PythonFunction|GoFunction|JavaFunction)\s*\(/gi;

  const functionNames: string[] = [];
  const nameRegex = /(?:const|let|var)\s+(\w+(?:Function|Lambda|Handler|Fn))\s*=/gi;
  while ((match = nameRegex.exec(content)) !== null) {
    functionNames.push(match[1]);
  }

  // Extract all memory sizes across file
  const allMemories: number[] = [];
  const memGlobal = /memorySize\s*:\s*(\d+)/gi;
  while ((match = memGlobal.exec(content)) !== null) {
    allMemories.push(parseInt(match[1], 10));
  }

  const allTimeouts: number[] = [];
  const toGlobal =
    /timeout\s*:\s*(?:Duration\.seconds\s*\(\s*(\d+)\s*\)|Duration\.minutes\s*\(\s*(\d+)\s*\))/gi;
  while ((match = toGlobal.exec(content)) !== null) {
    const secs = match[1] ? parseInt(match[1], 10) : (parseInt(match[2], 10) || 0) * 60;
    allTimeouts.push(secs);
  }

  const allRuntimes: string[] = [];
  const rtGlobal = /runtime\s*:\s*Runtime\.([\w_]+)/gi;
  while ((match = rtGlobal.exec(content)) !== null) {
    allRuntimes.push(match[1]);
  }

  const allArchitectures: string[] = [];
  const archGlobal = /architecture(?:s)?\s*:\s*Architecture\.([\w_]+)/gi;
  while ((match = archGlobal.exec(content)) !== null) {
    allArchitectures.push(match[1]);
  }

  const allProvisioned: boolean[] = [];
  const provGlobal = /provisionedConcurrentExecutions\s*:\s*(\d+)/gi;
  while ((match = provGlobal.exec(content)) !== null) {
    allProvisioned.push(parseInt(match[1], 10) > 0);
  }

  // Count lambda instantiations
  const lambdaInstances: RegExpMatchArray[] = [];
  const instanceRegex =
    /new\s+(?:\w+\.)*(?:Function|NodejsFunction|PythonFunction|GoFunction|JavaFunction)\s*\(/gi;
  while ((match = instanceRegex.exec(content)) !== null) {
    lambdaInstances.push(match);
  }

  const count = Math.max(lambdaInstances.length, functionNames.length, 1);

  for (let i = 0; i < count; i++) {
    functions.push({
      name: functionNames[i] ?? `lambda-function-${i + 1}`,
      memory: allMemories[i] ?? 128,
      timeout: allTimeouts[i] ?? 30,
      runtime: allRuntimes[i] ?? 'NODEJS_20_X',
      provisioned: allProvisioned[i] ?? false,
      architecture: allArchitectures[i] ?? 'X86_64',
    });
  }

  if (functions.length > 0) {
    infra.lambda = { functions };
  }
}

/** Extract RDS instance definitions from CDK */
function parseRDSInstances(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:DatabaseInstance|DatabaseCluster)/i)) return;

  const instances: NonNullable<NormalizedInfra['rds']>['instances'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Db|Database|Rds|Instance)[\w]*)\s*=\s*new\s+(?:\w+\.)*Database/gi;
  const instanceClassRegex = /instanceType\s*:\s*(?:ec2\.InstanceType\.of\s*\([^)]+\)|['"]([^'"]+)['"])/gi;
  const instanceClassSimpleRegex = /instanceClass\s*:\s*ec2\.InstanceClass\.([\w]+)/gi;
  const instanceSizeRegex = /instanceSize\s*:\s*ec2\.InstanceSize\.([\w]+)/gi;
  const engineRegex = /engine\s*:\s*(?:rds\.)?DatabaseInstanceEngine\.(\w+)/gi;
  const multiAZRegex = /multiAz\s*:\s*(true|false)/gi;
  const storageRegex = /allocatedStorage\s*:\s*(\d+)/gi;
  const iopsRegex = /iops\s*:\s*(\d+)/gi;

  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const instanceClasses: string[] = [];
  const sizeMap: Record<string, string> = {
    MICRO: 'micro', SMALL: 'small', MEDIUM: 'medium',
    LARGE: 'large', XLARGE: 'xlarge', XLARGE2: '2xlarge',
  };
  const classMap: Record<string, string> = {
    T3: 't3', R5: 'r5', R6G: 'r6g', M5: 'm5',
  };

  // Collect instance class/size pairs
  const classMatches: string[] = [];
  while ((match = instanceClassSimpleRegex.exec(content)) !== null) {
    classMatches.push(classMap[match[1]] ?? match[1].toLowerCase());
  }
  const sizeMatches: string[] = [];
  while ((match = instanceSizeRegex.exec(content)) !== null) {
    sizeMatches.push(sizeMap[match[1]] ?? match[1].toLowerCase());
  }

  const count = Math.max(names.length, classMatches.length, 1);
  const multiAZValues: boolean[] = [];
  while ((match = multiAZRegex.exec(content)) !== null) {
    multiAZValues.push(match[1] === 'true');
  }

  const storageValues: number[] = [];
  while ((match = storageRegex.exec(content)) !== null) {
    storageValues.push(parseInt(match[1], 10));
  }

  const engines: string[] = [];
  while ((match = engineRegex.exec(content)) !== null) engines.push(match[1]);

  // Detect env from variable names or tags
  const isDevEnv = /dev|development|staging|test/i.test(content);
  const isProdEnv = /prod|production/i.test(content);

  for (let i = 0; i < count; i++) {
    const cls = classMatches[i] ?? 't3';
    const sz = sizeMatches[i] ?? 'medium';
    instances.push({
      name: names[i] ?? `rds-instance-${i + 1}`,
      instanceClass: `db.${cls}.${sz}`,
      engine: engines[i] ?? 'MYSQL',
      multiAZ: multiAZValues[i] ?? false,
      env: isProdEnv ? 'prod' : isDevEnv ? 'dev' : 'staging',
      storage: storageValues[i] ?? 100,
    });
  }

  if (instances.length > 0) {
    infra.rds = { instances };
  }
}

/** Extract ECS service definitions from CDK */
function parseECSServices(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:FargateService|Ec2Service|FargateTaskDefinition)/i)) return;

  const services: NonNullable<NormalizedInfra['ecs']>['services'] = [];

  const desiredCountRegex = /desiredCount\s*:\s*(\d+)/gi;
  const cpuRegex = /cpu\s*:\s*(\d+)/gi;
  const memRegex = /memoryLimitMiB\s*:\s*(\d+)/gi;
  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Service|Task)[\w]*)\s*=\s*new\s+(?:\w+\.)*(?:FargateService|Ec2Service)/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const counts: number[] = [];
  while ((match = desiredCountRegex.exec(content)) !== null) counts.push(parseInt(match[1], 10));

  const cpus: number[] = [];
  while ((match = cpuRegex.exec(content)) !== null) {
    const val = parseInt(match[1], 10);
    if (val >= 256 && val <= 16384) cpus.push(val); // ECS CPU units range
  }

  const mems: number[] = [];
  while ((match = memRegex.exec(content)) !== null) mems.push(parseInt(match[1], 10));

  const isFargate = /FargateService|FargateTaskDefinition/i.test(content);
  const count = Math.max(names.length, counts.length, 1);

  for (let i = 0; i < count; i++) {
    services.push({
      name: names[i] ?? `ecs-service-${i + 1}`,
      desiredCount: counts[i] ?? 1,
      cpu: cpus[i] ?? 256,
      memory: mems[i] ?? 512,
      launchType: isFargate ? 'FARGATE' : 'EC2',
    });
  }

  if (services.length > 0) {
    infra.ecs = { services };
  }
}

/** Extract API Gateway definitions from CDK */
function parseAPIGateway(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:RestApi|HttpApi|WebSocketApi|LambdaRestApi)/i)) return;

  const apis: NonNullable<NormalizedInfra['apiGateway']>['apis'] = [];

  const isREST = /RestApi|LambdaRestApi/i.test(content);
  const isHTTP = /HttpApi/i.test(content);
  const isWebSocket = /WebSocketApi/i.test(content);
  const usesNLB = /NetworkLoadBalancer|NLB|VpcLink/i.test(content);
  const usesVPCLink = /VpcLink/i.test(content);

  let match: RegExpExecArray | null;
  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Api|Gateway)[\w]*)\s*=\s*new\s+(?:\w+\.)*(?:RestApi|HttpApi|WebSocketApi)/gi;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const type = isREST ? 'REST' : isHTTP ? 'HTTP' : isWebSocket ? 'WebSocket' : 'REST';
  const count = Math.max(names.length, 1);

  for (let i = 0; i < count; i++) {
    apis.push({
      name: names[i] ?? `api-${i + 1}`,
      type,
      usesNLB,
      usesVPCLink,
    });
  }

  infra.apiGateway = { apis };
}

/** Extract S3 bucket definitions from CDK */
function parseS3Buckets(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:Bucket)\s*\(/i)) return;

  const buckets: NonNullable<NormalizedInfra['s3']>['buckets'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Bucket|S3)[\w]*)\s*=\s*new\s+(?:\w+\.)*Bucket/gi;
  const lifecycleRegex = /lifecycleRules\s*:/gi;
  const intelligentTieringRegex = /INTELLIGENT_TIERING|intelligentTiering/gi;
  const versioningRegex = /versioned\s*:\s*true/gi;
  const publicAccessRegex = /blockPublicAccess\s*:\s*(?:BlockPublicAccess\.)?BLOCK_ALL/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const hasLifecycle = lifecycleRegex.test(content);
  const hasIT = intelligentTieringRegex.test(content);
  const isVersioned = versioningRegex.test(content);
  const isPublicBlocked = publicAccessRegex.test(content);

  const count = Math.max(names.length, 1);
  for (let i = 0; i < count; i++) {
    buckets.push({
      name: names[i] ?? `s3-bucket-${i + 1}`,
      hasLifecyclePolicy: hasLifecycle,
      hasIntelligentTiering: hasIT,
      versioningEnabled: isVersioned,
      publicAccess: !isPublicBlocked,
    });
  }

  infra.s3 = { buckets };
}

/** Extract EC2 instance definitions from CDK */
function parseEC2Instances(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*Instance\s*\(/i)) return;

  const instances: NonNullable<NormalizedInfra['ec2']>['instances'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Instance|EC2|Server)[\w]*)\s*=\s*new\s+(?:\w+\.)*Instance/gi;
  const instanceTypeRegex = /instanceType\s*:\s*ec2\.InstanceType\.of\s*\(\s*ec2\.InstanceClass\.([\w]+)\s*,\s*ec2\.InstanceSize\.([\w]+)/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const types: string[] = [];
  while ((match = instanceTypeRegex.exec(content)) !== null) {
    types.push(`${match[1].toLowerCase()}.${match[2].toLowerCase()}`);
  }

  const isDevEnv = /dev|development|staging|test/i.test(content);
  const count = Math.max(names.length, types.length, 1);

  for (let i = 0; i < count; i++) {
    instances.push({
      name: names[i] ?? `ec2-${i + 1}`,
      instanceType: types[i] ?? 't3.medium',
      env: isDevEnv ? 'dev' : 'prod',
    });
  }

  infra.ec2 = { instances };
}

/** Extract DynamoDB table definitions from CDK */
function parseDynamoDB(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*Table\s*\(/i)) return;

  const tables: NonNullable<NormalizedInfra['dynamodb']>['tables'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Table|DDB|Dynamo)[\w]*)\s*=\s*new\s+(?:\w+\.)*Table/gi;
  const billingRegex = /billingMode\s*:\s*(?:dynamodb\.)?BillingMode\.([\w]+)/gi;
  const readCapacityRegex = /readCapacity\s*:\s*(\d+)/gi;
  const writeCapacityRegex = /writeCapacity\s*:\s*(\d+)/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const billingModes: string[] = [];
  while ((match = billingRegex.exec(content)) !== null) billingModes.push(match[1]);

  const readCaps: number[] = [];
  while ((match = readCapacityRegex.exec(content)) !== null) readCaps.push(parseInt(match[1], 10));

  const writeCaps: number[] = [];
  while ((match = writeCapacityRegex.exec(content)) !== null) writeCaps.push(parseInt(match[1], 10));

  const count = Math.max(names.length, billingModes.length, 1);
  for (let i = 0; i < count; i++) {
    tables.push({
      name: names[i] ?? `dynamodb-table-${i + 1}`,
      billingMode: billingModes[i] ?? 'PAY_PER_REQUEST',
      readCapacity: readCaps[i],
      writeCapacity: writeCaps[i],
    });
  }

  infra.dynamodb = { tables };
}

/** Extract CloudFront distribution definitions from CDK */
function parseCloudFront(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:Distribution|CloudFrontWebDistribution)/i)) return;

  const distributions: NonNullable<NormalizedInfra['cloudfront']>['distributions'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Distribution|CF|CloudFront)[\w]*)\s*=/gi;
  const priceClassRegex = /priceClass\s*:\s*(?:cloudfront\.)?PriceClass\.([\w]+)/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const priceClasses: string[] = [];
  while ((match = priceClassRegex.exec(content)) !== null) priceClasses.push(match[1]);

  const count = Math.max(names.length, priceClasses.length, 1);
  for (let i = 0; i < count; i++) {
    distributions.push({
      name: names[i] ?? `cloudfront-${i + 1}`,
      priceClass: priceClasses[i] ?? 'PRICE_CLASS_100',
    });
  }

  infra.cloudfront = { distributions };
}

/** Extract NAT Gateway definitions from CDK */
function parseNATGateways(content: string, infra: NormalizedInfra): void {
  const natMatch = content.match(/natGateways\s*:\s*(\d+)/i);
  if (!natMatch && !content.match(/NatProvider|natProvider/i)) return;

  const count = natMatch ? parseInt(natMatch[1], 10) : 1;
  infra.nat = {
    gateways: [{ name: 'vpc-nat-gateway', count }],
  };
}

/** Extract ElastiCache cluster definitions from CDK */
function parseElastiCache(content: string, infra: NormalizedInfra): void {
  if (!content.match(/new\s+(?:\w+\.)*(?:CfnReplicationGroup|CfnCacheCluster)/i)) return;

  const clusters: NonNullable<NormalizedInfra['elasticache']>['clusters'] = [];

  const nameRegex =
    /(?:const|let|var)\s+([\w]+(?:Cache|Redis|Memcached)[\w]*)\s*=/gi;
  const nodeTypeRegex = /cacheNodeType\s*:\s*['"]([^'"]+)['"]/gi;
  const numNodesRegex = /numCacheNodes\s*:\s*(\d+)/gi;
  const replicasRegex = /numNodeGroups\s*:\s*(\d+)/gi;

  let match: RegExpExecArray | null;
  const names: string[] = [];
  while ((match = nameRegex.exec(content)) !== null) names.push(match[1]);

  const nodeTypes: string[] = [];
  while ((match = nodeTypeRegex.exec(content)) !== null) nodeTypes.push(match[1]);

  const numNodes: number[] = [];
  while ((match = numNodesRegex.exec(content)) !== null) numNodes.push(parseInt(match[1], 10));

  const isRedis = /redis/i.test(content);
  const count = Math.max(names.length, nodeTypes.length, 1);

  for (let i = 0; i < count; i++) {
    clusters.push({
      name: names[i] ?? `elasticache-${i + 1}`,
      nodeType: nodeTypes[i] ?? 'cache.t3.micro',
      numNodes: numNodes[i] ?? 1,
      engine: isRedis ? 'redis' : 'memcached',
    });
  }

  infra.elasticache = { clusters };
}

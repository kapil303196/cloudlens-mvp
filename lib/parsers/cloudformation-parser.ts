/**
 * CloudSave AI — CloudFormation Parser
 * Parses CloudFormation YAML/JSON templates.
 * Outputs NormalizedInfra JSON.
 * @module lib/parsers/cloudformation-parser
 */

import type { NormalizedInfra } from '../types';

/**
 * Parses a CloudFormation template (YAML or JSON) and extracts
 * AWS resource definitions into NormalizedInfra format.
 * @param content - Raw template content as string
 * @returns Normalized infrastructure representation
 */
export function parseCloudFormation(content: string): NormalizedInfra {
  const infra: NormalizedInfra = {};

  let resources: Record<string, CFNResource> = {};

  try {
    // Try JSON first
    if (content.trim().startsWith('{')) {
      const parsed = JSON.parse(content);
      resources = parsed.Resources ?? {};
    } else {
      // Parse YAML manually with regex (no yaml library dependency)
      resources = parseYAMLResources(content);
    }
  } catch {
    // Fallback to regex-based parsing
    resources = parseYAMLResources(content);
  }

  parseLambda(resources, infra);
  parseRDS(resources, infra, content);
  parseECS(resources, infra);
  parseAPIGateway(resources, infra, content);
  parseS3(resources, infra, content);
  parseEC2(resources, infra, content);
  parseDynamoDB(resources, infra);
  parseCloudFrontDist(resources, infra);
  parseNAT(resources, infra);
  parseElastiCache(resources, infra);

  return infra;
}

interface CFNResource {
  Type: string;
  Properties?: Record<string, unknown>;
}

/**
 * Lightweight YAML resource parser using regex heuristics.
 * Handles common CloudFormation YAML patterns.
 * @param content - YAML string content
 */
function parseYAMLResources(content: string): Record<string, CFNResource> {
  const resources: Record<string, CFNResource> = {};

  // Find the Resources section
  const resourcesStart = content.indexOf('Resources:');
  if (resourcesStart === -1) return resources;

  const resourcesSection = content.slice(resourcesStart);

  // Match resource logical IDs and their types
  const resourceBlockRegex = /^  (\w+):\s*\n\s+Type:\s*(AWS::[^\n]+)/gm;
  let match: RegExpExecArray | null;

  while ((match = resourceBlockRegex.exec(resourcesSection)) !== null) {
    const logicalId = match[1];
    const type = match[2].trim();

    // Extract properties block for this resource (naive approach)
    const startIdx = match.index + match[0].length;
    const nextResourceMatch = resourcesSection.slice(startIdx).match(/^\s{2}\w+:/m);
    const endIdx = nextResourceMatch
      ? startIdx + nextResourceMatch.index!
      : resourcesSection.length;

    const propsSection = resourcesSection.slice(startIdx, endIdx);
    const props = parseYAMLProps(propsSection);

    resources[logicalId] = { Type: type, Properties: props };
  }

  return resources;
}

/**
 * Parses YAML properties into a flat key-value record.
 * @param section - YAML properties section string
 */
function parseYAMLProps(section: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Match key: value pairs (string values)
  const kvRegex = /^\s+(\w+):\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = kvRegex.exec(section)) !== null) {
    const key = match[1];
    const raw = match[2].trim();

    // Try to parse as number or boolean
    if (raw === 'true') props[key] = true;
    else if (raw === 'false') props[key] = false;
    else if (/^\d+$/.test(raw)) props[key] = parseInt(raw, 10);
    else props[key] = raw.replace(/^['"]|['"]$/g, '');
  }

  return props;
}

/** Get property from CFN resource safely */
function getProp<T>(resource: CFNResource, key: string, fallback: T): T {
  return (resource.Properties?.[key] as T) ?? fallback;
}

function getPropStr(resource: CFNResource, key: string): string | null {
  const val = resource.Properties?.[key];
  if (val === null || val === undefined) return null;
  return String(val);
}

function getPropNum(resource: CFNResource, key: string): number | null {
  const val = resource.Properties?.[key];
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function getPropBool(resource: CFNResource, key: string): boolean {
  const val = resource.Properties?.[key];
  return val === true || val === 'true';
}

function detectEnvFromId(logicalId: string): string {
  const lower = logicalId.toLowerCase();
  if (/prod|production/.test(lower)) return 'prod';
  if (/staging/.test(lower)) return 'staging';
  return 'dev';
}

function parseLambda(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const lambdas = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::Lambda::Function'
  );
  if (lambdas.length === 0) return;

  const functions: NonNullable<NormalizedInfra['lambda']>['functions'] = lambdas.map(([id, r]) => ({
    name: getPropStr(r, 'FunctionName') ?? id,
    memory: getPropNum(r, 'MemorySize') ?? 128,
    timeout: getPropNum(r, 'Timeout') ?? 30,
    runtime: getPropStr(r, 'Runtime') ?? 'nodejs20.x',
    provisioned: false,
    architecture: 'X86_64',
  }));

  infra.lambda = { functions };
}

function parseRDS(resources: Record<string, CFNResource>, infra: NormalizedInfra, content: string): void {
  const rdsInstances = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::RDS::DBInstance'
  );
  if (rdsInstances.length === 0) return;

  const instances: NonNullable<NormalizedInfra['rds']>['instances'] = rdsInstances.map(([id, r]) => {
    const multiAZVal = r.Properties?.MultiAZ;
    const multiAZ =
      multiAZVal === true ||
      multiAZVal === 'true' ||
      String(multiAZVal).toLowerCase() === 'true';

    return {
      name: getPropStr(r, 'DBInstanceIdentifier') ?? id,
      instanceClass: getPropStr(r, 'DBInstanceClass') ?? 'db.t3.medium',
      engine: getPropStr(r, 'Engine') ?? 'mysql',
      multiAZ,
      env: detectEnvFromId(id),
      storage: getPropNum(r, 'AllocatedStorage') ?? 100,
    };
  });

  infra.rds = { instances };
}

function parseECS(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const ecsServices = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::ECS::Service'
  );
  const ecsTaskDefs = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::ECS::TaskDefinition'
  );

  if (ecsServices.length === 0 && ecsTaskDefs.length === 0) return;

  const services: NonNullable<NormalizedInfra['ecs']>['services'] = [];

  if (ecsServices.length > 0) {
    for (const [id, svc] of ecsServices) {
      services.push({
        name: getPropStr(svc, 'ServiceName') ?? id,
        desiredCount: getPropNum(svc, 'DesiredCount') ?? 1,
        cpu: 256,
        memory: 512,
        launchType: getPropStr(svc, 'LaunchType') ?? 'FARGATE',
      });
    }
  } else {
    for (const [id, td] of ecsTaskDefs) {
      services.push({
        name: id,
        desiredCount: 1,
        cpu: getPropNum(td, 'Cpu') ?? 256,
        memory: getPropNum(td, 'Memory') ?? 512,
        launchType: 'FARGATE',
      });
    }
  }

  infra.ecs = { services };
}

function parseAPIGateway(resources: Record<string, CFNResource>, infra: NormalizedInfra, content: string): void {
  const restApis = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::ApiGateway::RestApi'
  );
  const httpApis = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::ApiGatewayV2::Api'
  );

  if (restApis.length === 0 && httpApis.length === 0) return;

  const apis: NonNullable<NormalizedInfra['apiGateway']>['apis'] = [];

  const hasNLB = /NetworkLoadBalancer|NLB|VpcLink/i.test(content);
  const hasVPCLink = /AWS::ApiGateway::VpcLink/i.test(content);

  for (const [id, api] of restApis) {
    apis.push({
      name: getPropStr(api, 'Name') ?? id,
      type: 'REST',
      usesNLB: hasNLB,
      usesVPCLink: hasVPCLink,
    });
  }

  for (const [id, api] of httpApis) {
    const protocol = getPropStr(api, 'ProtocolType') ?? 'HTTP';
    apis.push({
      name: getPropStr(api, 'Name') ?? id,
      type: protocol === 'WEBSOCKET' ? 'WebSocket' : 'HTTP',
      usesNLB: false,
      usesVPCLink: false,
    });
  }

  infra.apiGateway = { apis };
}

function parseS3(resources: Record<string, CFNResource>, infra: NormalizedInfra, content: string): void {
  const buckets = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::S3::Bucket'
  );
  if (buckets.length === 0) return;

  const result: NonNullable<NormalizedInfra['s3']>['buckets'] = buckets.map(([id, b]) => {
    const hasLifecycle =
      b.Properties?.LifecycleConfiguration !== undefined ||
      /LifecycleConfiguration/i.test(JSON.stringify(b.Properties ?? {}));
    const hasIT = /INTELLIGENT_TIERING/i.test(JSON.stringify(b.Properties ?? {}));
    const versioning = /Enabled/i.test(
      JSON.stringify((b.Properties as Record<string, unknown>)?.VersioningConfiguration ?? {})
    );
    const isBlocked = /BlockPublicAcls.*?true/is.test(
      JSON.stringify((b.Properties as Record<string, unknown>)?.PublicAccessBlockConfiguration ?? {})
    );

    return {
      name: getPropStr(b, 'BucketName') ?? id,
      hasLifecyclePolicy: hasLifecycle,
      hasIntelligentTiering: hasIT,
      versioningEnabled: versioning,
      publicAccess: !isBlocked,
    };
  });

  infra.s3 = { buckets: result };
}

function parseEC2(resources: Record<string, CFNResource>, infra: NormalizedInfra, content: string): void {
  const instances = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::EC2::Instance'
  );
  if (instances.length === 0) return;

  const result: NonNullable<NormalizedInfra['ec2']>['instances'] = instances.map(([id, i]) => ({
    name: id,
    instanceType: getPropStr(i, 'InstanceType') ?? 't3.medium',
    env: detectEnvFromId(id),
  }));

  infra.ec2 = { instances: result };
}

function parseDynamoDB(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const tables = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::DynamoDB::Table'
  );
  if (tables.length === 0) return;

  const result: NonNullable<NormalizedInfra['dynamodb']>['tables'] = tables.map(([id, t]) => {
    const billing = getPropStr(t, 'BillingMode') ?? 'PROVISIONED';
    const throughput = (t.Properties as Record<string, unknown>)?.ProvisionedThroughput as
      | Record<string, number>
      | undefined;

    return {
      name: getPropStr(t, 'TableName') ?? id,
      billingMode: billing,
      readCapacity: throughput?.ReadCapacityUnits,
      writeCapacity: throughput?.WriteCapacityUnits,
    };
  });

  infra.dynamodb = { tables: result };
}

function parseCloudFrontDist(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const dists = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::CloudFront::Distribution'
  );
  if (dists.length === 0) return;

  const result: NonNullable<NormalizedInfra['cloudfront']>['distributions'] = dists.map(([id, d]) => {
    const distConfig = (d.Properties as Record<string, unknown>)?.DistributionConfig as
      | Record<string, string>
      | undefined;
    const priceClass = distConfig?.PriceClass ?? 'PriceClass_100';

    return { name: id, priceClass };
  });

  infra.cloudfront = { distributions: result };
}

function parseNAT(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const nats = Object.entries(resources).filter(
    ([, r]) => r.Type === 'AWS::EC2::NatGateway'
  );
  if (nats.length === 0) return;

  infra.nat = {
    gateways: [{ name: 'nat-gateway', count: nats.length }],
  };
}

function parseElastiCache(resources: Record<string, CFNResource>, infra: NormalizedInfra): void {
  const clusters = Object.entries(resources).filter(
    ([, r]) =>
      r.Type === 'AWS::ElastiCache::CacheCluster' ||
      r.Type === 'AWS::ElastiCache::ReplicationGroup'
  );
  if (clusters.length === 0) return;

  const result: NonNullable<NormalizedInfra['elasticache']>['clusters'] = clusters.map(([id, c]) => ({
    name: id,
    nodeType: getPropStr(c, 'CacheNodeType') ?? 'cache.t3.micro',
    numNodes: getPropNum(c, 'NumCacheNodes') ?? getPropNum(c, 'NumNodeGroups') ?? 1,
    engine: getPropStr(c, 'Engine') ?? 'redis',
  }));

  infra.elasticache = { clusters: result };
}

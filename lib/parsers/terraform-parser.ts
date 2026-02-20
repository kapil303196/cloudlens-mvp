/**
 * CloudSave AI — Terraform Parser
 * Parses Terraform HCL (.tf) files using regex pattern matching.
 * Outputs NormalizedInfra JSON.
 * @module lib/parsers/terraform-parser
 */

import type { NormalizedInfra } from '../types';

/**
 * Parses a Terraform HCL file and extracts AWS resource definitions
 * into NormalizedInfra format.
 * @param content - Raw .tf file content
 * @returns Normalized infrastructure representation
 */
export function parseTerraform(content: string): NormalizedInfra {
  const infra: NormalizedInfra = {};

  // Extract all resource blocks for routing
  const resources = extractResourceBlocks(content);

  parseLambda(resources, infra, content);
  parseRDS(resources, infra, content);
  parseECS(resources, infra, content);
  parseAPIGateway(resources, infra, content);
  parseS3(resources, infra, content);
  parseEC2(resources, infra, content);
  parseDynamoDB(resources, infra, content);
  parseCloudFront(resources, infra, content);
  parseNAT(resources, infra, content);
  parseElastiCache(resources, infra, content);

  return infra;
}

/** Extracted Terraform resource block */
interface TFResource {
  type: string;
  name: string;
  body: string;
}

/**
 * Extracts all resource blocks from Terraform HCL content.
 * @param content - Raw HCL content
 */
function extractResourceBlocks(content: string): TFResource[] {
  const blocks: TFResource[] = [];
  const resourceRegex = /resource\s+"([\w]+)"\s+"([\w-]+)"\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gis;

  let match: RegExpExecArray | null;
  while ((match = resourceRegex.exec(content)) !== null) {
    blocks.push({
      type: match[1],
      name: match[2],
      body: match[3],
    });
  }
  return blocks;
}

/**
 * Extracts a string attribute value from an HCL block body.
 * @param body - Block body content
 * @param key - Attribute key to find
 */
function getAttribute(body: string, key: string): string | null {
  const regex = new RegExp(`${key}\\s*=\\s*["']?([\\w./:-]+)["']?`, 'i');
  const match = body.match(regex);
  return match ? match[1] : null;
}

/**
 * Extracts a numeric attribute value from an HCL block body.
 * @param body - Block body content
 * @param key - Attribute key to find
 */
function getNumericAttribute(body: string, key: string): number | null {
  const regex = new RegExp(`${key}\\s*=\\s*(\\d+)`, 'i');
  const match = body.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detects the environment from resource names and tags.
 * @param name - Resource name
 * @param body - Resource body
 */
function detectEnv(name: string, body: string): string {
  const combined = `${name} ${body}`.toLowerCase();
  if (/prod|production/.test(combined)) return 'prod';
  if (/staging/.test(combined)) return 'staging';
  return 'dev';
}

function parseLambda(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const lambdaResources = resources.filter(
    (r) => r.type === 'aws_lambda_function'
  );
  if (lambdaResources.length === 0) return;

  const functions: NonNullable<NormalizedInfra['lambda']>['functions'] = lambdaResources.map((r) => {
    const memory = getNumericAttribute(r.body, 'memory_size') ?? 128;
    const timeout = getNumericAttribute(r.body, 'timeout') ?? 30;
    const runtime = getAttribute(r.body, 'runtime') ?? 'nodejs20.x';
    const arch = r.body.match(/architectures\s*=\s*\["([^"]+)"\]/i)?.[1] ?? 'x86_64';
    const provisioned = /provisioned_concurrent_executions/.test(r.body);

    return {
      name: r.name,
      memory,
      timeout,
      runtime,
      provisioned,
      architecture: arch.toUpperCase(),
    };
  });

  infra.lambda = { functions };
}

function parseRDS(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const rdsResources = resources.filter(
    (r) => r.type === 'aws_db_instance' || r.type === 'aws_rds_cluster'
  );
  if (rdsResources.length === 0) return;

  const instances: NonNullable<NormalizedInfra['rds']>['instances'] = rdsResources.map((r) => {
    const instanceClass =
      getAttribute(r.body, 'instance_class') ??
      getAttribute(r.body, 'db_instance_class') ??
      'db.t3.medium';
    const engine =
      getAttribute(r.body, 'engine') ?? 'mysql';
    const multiAZ = /multi_az\s*=\s*true/i.test(r.body);
    const storage = getNumericAttribute(r.body, 'allocated_storage') ?? 100;
    const iops = getNumericAttribute(r.body, 'iops') ?? undefined;
    const env = detectEnv(r.name, r.body);

    return {
      name: r.name,
      instanceClass,
      engine,
      multiAZ,
      env,
      storage,
      ...(iops ? { iops } : {}),
    };
  });

  infra.rds = { instances };
}

function parseECS(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const ecsServices = resources.filter(
    (r) => r.type === 'aws_ecs_service'
  );
  const ecsTaskDefs = resources.filter(
    (r) => r.type === 'aws_ecs_task_definition'
  );

  if (ecsServices.length === 0 && ecsTaskDefs.length === 0) return;

  const services: NonNullable<NormalizedInfra['ecs']>['services'] = [];

  if (ecsServices.length > 0) {
    for (const svc of ecsServices) {
      const desiredCount = getNumericAttribute(svc.body, 'desired_count') ?? 1;
      const launchType = getAttribute(svc.body, 'launch_type') ?? 'FARGATE';

      // Find associated task def
      const taskDefRef = svc.body.match(/task_definition\s*=\s*.*?([\w-]+)\.arn/)?.[1];
      const taskDef = ecsTaskDefs.find((t) => t.name === taskDefRef);
      const cpu = taskDef ? getNumericAttribute(taskDef.body, 'cpu') ?? 256 : 256;
      const memory = taskDef ? getNumericAttribute(taskDef.body, 'memory') ?? 512 : 512;

      services.push({
        name: svc.name,
        desiredCount,
        cpu,
        memory,
        launchType,
      });
    }
  } else {
    // Only task defs, no service definitions
    for (const td of ecsTaskDefs) {
      services.push({
        name: td.name,
        desiredCount: 1,
        cpu: getNumericAttribute(td.body, 'cpu') ?? 256,
        memory: getNumericAttribute(td.body, 'memory') ?? 512,
        launchType: 'FARGATE',
      });
    }
  }

  if (services.length > 0) {
    infra.ecs = { services };
  }
}

function parseAPIGateway(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const restApis = resources.filter((r) => r.type === 'aws_api_gateway_rest_api');
  const httpApis = resources.filter((r) => r.type === 'aws_apigatewayv2_api');

  if (restApis.length === 0 && httpApis.length === 0) return;

  const apis: NonNullable<NormalizedInfra['apiGateway']>['apis'] = [];

  for (const api of restApis) {
    const usesNLB = /nlb|network_load_balancer|vpc_link/i.test(api.body + content);
    const usesVPCLink = /aws_api_gateway_vpc_link/i.test(content);
    apis.push({ name: api.name, type: 'REST', usesNLB, usesVPCLink });
  }

  for (const api of httpApis) {
    const protocol = getAttribute(api.body, 'protocol_type') ?? 'HTTP';
    apis.push({
      name: api.name,
      type: protocol === 'WEBSOCKET' ? 'WebSocket' : 'HTTP',
      usesNLB: false,
      usesVPCLink: false,
    });
  }

  infra.apiGateway = { apis };
}

function parseS3(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const buckets = resources.filter((r) => r.type === 'aws_s3_bucket');
  if (buckets.length === 0) return;

  const lifecycleResources = resources.filter(
    (r) => r.type === 'aws_s3_bucket_lifecycle_configuration'
  );
  const intelligentTieringResources = resources.filter(
    (r) => r.type === 'aws_s3_bucket_intelligent_tiering_configuration'
  );

  const result: NonNullable<NormalizedInfra['s3']>['buckets'] = buckets.map((b) => {
    const hasLifecycle = lifecycleResources.some((l) =>
      l.body.includes(b.name)
    ) || /lifecycle_rule/i.test(b.body);
    const hasIT = intelligentTieringResources.some((i) =>
      i.body.includes(b.name)
    ) || /INTELLIGENT_TIERING/i.test(b.body);
    const versioning = /versioning\s*\{[^}]*enabled\s*=\s*true/is.test(b.body);
    const publicAccess = /block_public_acls\s*=\s*true/i.test(b.body);

    return {
      name: b.name,
      hasLifecyclePolicy: hasLifecycle,
      hasIntelligentTiering: hasIT,
      versioningEnabled: versioning,
      publicAccess: !publicAccess,
    };
  });

  infra.s3 = { buckets: result };
}

function parseEC2(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const instances = resources.filter((r) => r.type === 'aws_instance');
  if (instances.length === 0) return;

  const result: NonNullable<NormalizedInfra['ec2']>['instances'] = instances.map((i) => ({
    name: i.name,
    instanceType: getAttribute(i.body, 'instance_type') ?? 't3.medium',
    env: detectEnv(i.name, i.body),
  }));

  infra.ec2 = { instances: result };
}

function parseDynamoDB(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const tables = resources.filter((r) => r.type === 'aws_dynamodb_table');
  if (tables.length === 0) return;

  const result: NonNullable<NormalizedInfra['dynamodb']>['tables'] = tables.map((t) => {
    const billingMode =
      getAttribute(t.body, 'billing_mode') ?? 'PROVISIONED';
    const readCapacity = getNumericAttribute(t.body, 'read_capacity') ?? undefined;
    const writeCapacity = getNumericAttribute(t.body, 'write_capacity') ?? undefined;

    return {
      name: t.name,
      billingMode,
      ...(readCapacity !== undefined ? { readCapacity } : {}),
      ...(writeCapacity !== undefined ? { writeCapacity } : {}),
    };
  });

  infra.dynamodb = { tables: result };
}

function parseCloudFront(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const dists = resources.filter((r) => r.type === 'aws_cloudfront_distribution');
  if (dists.length === 0) return;

  const result: NonNullable<NormalizedInfra['cloudfront']>['distributions'] = dists.map((d) => {
    const priceClass =
      d.body.match(/price_class\s*=\s*["']([^"']+)["']/i)?.[1] ?? 'PriceClass_100';
    return { name: d.name, priceClass };
  });

  infra.cloudfront = { distributions: result };
}

function parseNAT(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const nats = resources.filter((r) => r.type === 'aws_nat_gateway');
  if (nats.length === 0) return;

  infra.nat = {
    gateways: [{ name: 'nat-gateway', count: nats.length }],
  };
}

function parseElastiCache(resources: TFResource[], infra: NormalizedInfra, content: string): void {
  const clusters = resources.filter(
    (r) =>
      r.type === 'aws_elasticache_cluster' ||
      r.type === 'aws_elasticache_replication_group'
  );
  if (clusters.length === 0) return;

  const result: NonNullable<NormalizedInfra['elasticache']>['clusters'] = clusters.map((c) => {
    const nodeType =
      getAttribute(c.body, 'cache_node_type') ??
      getAttribute(c.body, 'node_type') ??
      'cache.t3.micro';
    const numNodes =
      getNumericAttribute(c.body, 'num_cache_nodes') ??
      getNumericAttribute(c.body, 'num_node_groups') ??
      1;
    const engine = getAttribute(c.body, 'engine') ?? 'redis';

    return {
      name: c.name,
      nodeType,
      numNodes,
      engine,
    };
  });

  infra.elasticache = { clusters: result };
}

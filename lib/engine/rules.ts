/**
 * CloudSave AI — Anti-Pattern Detection Rules Registry
 * All 15 detection rules as defined in the specification.
 * Each rule checks NormalizedInfra and returns DetectedIssue[].
 * @module lib/engine/rules
 */

import type { DetectedIssue, DetectionRule, NormalizedInfra } from '../types';
import { AWS_PRICING } from '../utils/constants';

/** Generates a unique issue ID */
function issueId(ruleId: string, resourceName: string): string {
  return `${ruleId}-${resourceName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
}

/** Calculates saving percent */
function savingPercent(current: number, optimized: number): number {
  if (current <= 0) return 0;
  return Math.round(((current - optimized) / current) * 100 * 10) / 10;
}

// =================== RULE IMPLEMENTATIONS ===================

/**
 * Rule 1: Lambda Overprovisioned Memory
 * Flags Lambda functions with memory > 2048MB.
 */
const lambdaOverprovisionedMemory: DetectionRule = {
  id: 'rule-01',
  name: 'Lambda Overprovisioned Memory',
  service: 'Lambda',
  severity: 'high',
  category: 'overprovisioned',
  estimatedMonthlySaving: 160,
  description: 'Lambda function has memory allocation exceeding 2048MB.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const fn of infra.lambda?.functions ?? []) {
      if (fn.memory > 2048) {
        const recommendedMemory = 1024;
        // Estimate: 10M requests/month, 200ms avg duration
        const requests = 10_000_000;
        const durationSec = 0.2;
        const currentCost =
          (fn.memory / 1024) * durationSec * requests * AWS_PRICING.lambda.perGBSecond +
          requests * AWS_PRICING.lambda.perRequest;
        const optimizedCost =
          (recommendedMemory / 1024) * durationSec * requests * AWS_PRICING.lambda.perGBSecond +
          requests * AWS_PRICING.lambda.perRequest;

        issues.push({
          id: issueId('rule-01', fn.name),
          service: 'Lambda',
          issue: 'Overprovisioned Memory',
          description: `Function "${fn.name}" allocates ${fn.memory}MB but typical workloads rarely exceed 1024MB. Over-allocating memory increases cost without performance benefit once CPU/network are no longer the bottleneck.`,
          severity: 'high',
          currentConfig: `${fn.memory}MB memory`,
          recommendedConfig: '1024MB with ARM64 (Graviton2)',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: fn.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 2: Lambda Long Timeout
 * Flags Lambda functions with timeout > 300 seconds.
 */
const lambdaLongTimeout: DetectionRule = {
  id: 'rule-02',
  name: 'Lambda Long Timeout',
  service: 'Lambda',
  severity: 'medium',
  category: 'overprovisioned',
  estimatedMonthlySaving: 40,
  description: 'Lambda function has an excessively long timeout.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const fn of infra.lambda?.functions ?? []) {
      if (fn.timeout > 300) {
        // Cost impact: longer timeout means slower error recovery and higher cost per invocation
        const currentCost = 40;
        const optimizedCost = 20;
        issues.push({
          id: issueId('rule-02', fn.name),
          service: 'Lambda',
          issue: 'Excessively Long Timeout',
          description: `Function "${fn.name}" has a ${fn.timeout}s timeout (max allowed: 900s). Long timeouts increase cost when functions hang on errors, and indicate architectural issues. Most API-backed functions should complete in under 30s.`,
          severity: 'medium',
          currentConfig: `${fn.timeout}s timeout`,
          recommendedConfig: '30s timeout (or redesign for async processing)',
          currentCost,
          optimizedCost,
          saving: currentCost - optimizedCost,
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: fn.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 3: RDS MultiAZ in Dev/Staging
 * Flags RDS instances with MultiAZ enabled in non-prod environments.
 */
const rdsMultiAZInDev: DetectionRule = {
  id: 'rule-03',
  name: 'RDS MultiAZ in Non-Production',
  service: 'RDS',
  severity: 'critical',
  category: 'env-mismatch',
  estimatedMonthlySaving: 200,
  description: 'RDS instance has MultiAZ enabled in a non-production environment.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const db of infra.rds?.instances ?? []) {
      if (db.multiAZ && db.env !== 'prod') {
        const baseMonthly =
          AWS_PRICING.rds.instances[db.instanceClass] ??
          AWS_PRICING.rds.defaultMonthlyCost;
        const currentCost = baseMonthly * AWS_PRICING.rds.multiAZMultiplier;
        const optimizedCost = baseMonthly;

        issues.push({
          id: issueId('rule-03', db.name),
          service: 'RDS',
          issue: 'MultiAZ Enabled in Non-Production',
          description: `Database "${db.name}" (${db.env}) has MultiAZ enabled, doubling its cost. MultiAZ provides synchronous replication for high availability — unnecessary for ${db.env} environments where downtime is acceptable.`,
          severity: 'critical',
          currentConfig: `${db.instanceClass} + MultiAZ (${db.env})`,
          recommendedConfig: `${db.instanceClass}, Single-AZ (${db.env})`,
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'env-mismatch',
          resourceName: db.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 4: RDS Oversized Instance in Dev
 * Flags RDS instances using xlarge+ in dev environments.
 */
const rdsOversizedInDev: DetectionRule = {
  id: 'rule-04',
  name: 'RDS Oversized Instance in Dev',
  service: 'RDS',
  severity: 'high',
  category: 'overprovisioned',
  estimatedMonthlySaving: 300,
  description: 'RDS instance uses an oversized instance class in a dev environment.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const db of infra.rds?.instances ?? []) {
      if (db.env !== 'prod' && db.instanceClass.includes('xlarge')) {
        const currentCost =
          AWS_PRICING.rds.instances[db.instanceClass] ??
          AWS_PRICING.rds.defaultMonthlyCost;
        const optimizedClass = 'db.t3.medium';
        const optimizedCost = AWS_PRICING.rds.instances[optimizedClass] ?? 58.40;

        issues.push({
          id: issueId('rule-04', db.name),
          service: 'RDS',
          issue: 'Oversized Instance in Dev Environment',
          description: `Database "${db.name}" uses ${db.instanceClass} in a ${db.env} environment. Dev workloads rarely need more than db.t3.medium. Downsize to reduce compute cost while maintaining adequate performance for development.`,
          severity: 'high',
          currentConfig: `${db.instanceClass} (${db.env})`,
          recommendedConfig: `db.t3.medium (${db.env})`,
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: db.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 5: ECS Over-Scaled in Non-Prod
 * Flags ECS services with desiredCount > 2 in non-prod environments.
 */
const ecsOverScaled: DetectionRule = {
  id: 'rule-05',
  name: 'ECS Over-Scaled in Non-Production',
  service: 'ECS',
  severity: 'high',
  category: 'overprovisioned',
  estimatedMonthlySaving: 150,
  description: 'ECS service has more than 2 tasks in a non-production environment.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const svc of infra.ecs?.services ?? []) {
      const isNonProd = /dev|staging|test/i.test(svc.name);
      if (svc.desiredCount > 2) {
        const vcpu = svc.cpu / 1024;
        const memGB = svc.memory / 1024;
        const hourly =
          vcpu * AWS_PRICING.ecs.fargate.perVCPUHour +
          memGB * AWS_PRICING.ecs.fargate.perGBHour;
        const currentCost = hourly * AWS_PRICING.ecs.hoursPerMonth * svc.desiredCount;
        const optimizedCost = hourly * AWS_PRICING.ecs.hoursPerMonth * 1; // 1 task

        issues.push({
          id: issueId('rule-05', svc.name),
          service: 'ECS',
          issue: 'Over-Scaled ECS Service',
          description: `ECS service "${svc.name}" runs ${svc.desiredCount} tasks. Non-production environments typically only need 1 task for testing. Running ${svc.desiredCount} tasks multiplies Fargate costs without benefit.`,
          severity: 'high',
          currentConfig: `${svc.desiredCount} tasks, ${svc.cpu} CPU units, ${svc.memory}MB`,
          recommendedConfig: '1 task for non-production environments',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: svc.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 6: ECS Fargate CPU/Memory Over-Allocation
 * Flags ECS services with CPU < 25% utilization estimate (high allocation, low CPU).
 */
const ecsFargateWaste: DetectionRule = {
  id: 'rule-06',
  name: 'ECS Fargate CPU/Memory Over-Allocated',
  service: 'ECS',
  severity: 'medium',
  category: 'overprovisioned',
  estimatedMonthlySaving: 100,
  description: 'ECS Fargate task has very high CPU allocation relative to typical usage.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const svc of infra.ecs?.services ?? []) {
      if (svc.launchType === 'FARGATE' && svc.cpu >= 4096 && svc.memory >= 8192) {
        const vcpu = svc.cpu / 1024;
        const memGB = svc.memory / 1024;
        const hourly =
          vcpu * AWS_PRICING.ecs.fargate.perVCPUHour +
          memGB * AWS_PRICING.ecs.fargate.perGBHour;
        const currentCost = hourly * AWS_PRICING.ecs.hoursPerMonth;
        const optimizedVCPU = 2;
        const optimizedMemGB = 4;
        const optimizedHourly =
          optimizedVCPU * AWS_PRICING.ecs.fargate.perVCPUHour +
          optimizedMemGB * AWS_PRICING.ecs.fargate.perGBHour;
        const optimizedCost = optimizedHourly * AWS_PRICING.ecs.hoursPerMonth;

        issues.push({
          id: issueId('rule-06', svc.name),
          service: 'ECS',
          issue: 'Fargate Task Over-Allocated',
          description: `Service "${svc.name}" allocates ${svc.cpu} CPU units (${vcpu} vCPU) and ${svc.memory}MB. Based on typical application patterns, this is over-provisioned. Right-sizing to 2 vCPU / 4GB reduces cost significantly.`,
          severity: 'medium',
          currentConfig: `${svc.cpu} CPU units, ${svc.memory}MB memory`,
          recommendedConfig: '2048 CPU units (2 vCPU), 4096MB — measure then adjust',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: svc.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 7: API Gateway + NLB (Unnecessary NLB Cost)
 * Flags API Gateway using Network Load Balancer integration unnecessarily.
 */
const apiGatewayNLB: DetectionRule = {
  id: 'rule-07',
  name: 'API Gateway with Unnecessary NLB',
  service: 'API Gateway',
  severity: 'high',
  category: 'architectural',
  estimatedMonthlySaving: 180,
  description: 'API Gateway is paired with a Network Load Balancer, adding unnecessary cost.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const api of infra.apiGateway?.apis ?? []) {
      if (api.usesNLB) {
        const nlbMonthly = AWS_PRICING.nlb.monthlyBase + 730 * AWS_PRICING.nlb.perLCUHour * 10;
        issues.push({
          id: issueId('rule-07', api.name),
          service: 'API Gateway',
          issue: 'NLB + API Gateway Anti-Pattern',
          description: `API "${api.name}" uses a Network Load Balancer with API Gateway. NLBs add ~$32/month+ and are unnecessary when API Gateway can directly integrate with ALB, Lambda, or HTTP endpoints via VPC Link with lower cost.`,
          severity: 'high',
          currentConfig: `${api.type} API + NLB + VPC Link`,
          recommendedConfig: 'API Gateway HTTP API with direct Lambda or ALB integration',
          currentCost: Math.round(nlbMonthly + 35),
          optimizedCost: 35,
          saving: Math.round(nlbMonthly),
          savingPercent: savingPercent(nlbMonthly + 35, 35),
          category: 'architectural',
          resourceName: api.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 8: API Gateway REST vs HTTP API
 * Flags REST APIs where HTTP API would be sufficient (3.5x cheaper).
 */
const apiGatewayRESTvsHTTP: DetectionRule = {
  id: 'rule-08',
  name: 'API Gateway REST Instead of HTTP API',
  service: 'API Gateway',
  severity: 'medium',
  category: 'architectural',
  estimatedMonthlySaving: 70,
  description: 'API Gateway REST API is used where the cheaper HTTP API would suffice.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const api of infra.apiGateway?.apis ?? []) {
      if (api.type === 'REST' && !api.usesNLB) {
        const requestsM = AWS_PRICING.apiGateway.assumedMonthlyRequestsM;
        const currentCost = requestsM * AWS_PRICING.apiGateway.rest;
        const optimizedCost = requestsM * AWS_PRICING.apiGateway.http;

        issues.push({
          id: issueId('rule-08', api.name),
          service: 'API Gateway',
          issue: 'REST API — Consider Migrating to HTTP API',
          description: `API "${api.name}" uses REST API ($3.50/M requests) vs HTTP API ($1.00/M requests). HTTP API supports Lambda proxy, JWT auth, and CORS natively — sufficient for most use cases at 71% lower cost.`,
          severity: 'medium',
          currentConfig: 'REST API ($3.50/million requests)',
          recommendedConfig: 'HTTP API ($1.00/million requests)',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'architectural',
          resourceName: api.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 9: S3 No Lifecycle Policy
 * Flags S3 buckets without lifecycle policies (objects grow indefinitely).
 */
const s3NoLifecycle: DetectionRule = {
  id: 'rule-09',
  name: 'S3 Missing Lifecycle Policy',
  service: 'S3',
  severity: 'medium',
  category: 'missing-feature',
  estimatedMonthlySaving: 50,
  description: 'S3 bucket has no lifecycle policy, allowing objects to accumulate indefinitely.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const bucket of infra.s3?.buckets ?? []) {
      if (!bucket.hasLifecyclePolicy) {
        const sizeGB = AWS_PRICING.s3.assumedBucketSizeGB;
        const currentCost = sizeGB * AWS_PRICING.s3.standard;
        // Lifecycle moves ~40% to IA, ~20% to Glacier
        const optimizedCost =
          sizeGB * 0.4 * AWS_PRICING.s3.standard +
          sizeGB * 0.4 * AWS_PRICING.s3.ia +
          sizeGB * 0.2 * AWS_PRICING.s3.glacier;

        issues.push({
          id: issueId('rule-09', bucket.name),
          service: 'S3',
          issue: 'No Lifecycle Policy',
          description: `Bucket "${bucket.name}" has no lifecycle policy. Without lifecycle rules, objects remain in S3 Standard indefinitely. Transitioning older objects to S3 Infrequent Access or Glacier can reduce storage costs by 40-80%.`,
          severity: 'medium',
          currentConfig: 'S3 Standard — no lifecycle transitions',
          recommendedConfig: 'Lifecycle: 30d → S3-IA, 90d → Glacier',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'missing-feature',
          resourceName: bucket.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 10: S3 No Intelligent Tiering
 * Flags S3 buckets without Intelligent Tiering for unpredictable access patterns.
 */
const s3NoIntelligentTiering: DetectionRule = {
  id: 'rule-10',
  name: 'S3 Missing Intelligent Tiering',
  service: 'S3',
  severity: 'low',
  category: 'missing-feature',
  estimatedMonthlySaving: 30,
  description: 'S3 bucket does not use Intelligent Tiering for automatic cost optimization.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const bucket of infra.s3?.buckets ?? []) {
      if (!bucket.hasIntelligentTiering && bucket.hasLifecyclePolicy) {
        // Only flag if they have lifecycle but not IT — complement, not duplicate
        issues.push({
          id: issueId('rule-10', bucket.name),
          service: 'S3',
          issue: 'Intelligent Tiering Not Enabled',
          description: `Bucket "${bucket.name}" could benefit from S3 Intelligent-Tiering, which automatically moves objects between access tiers based on usage patterns. No retrieval fees; saves ~15-30% for objects with variable access frequency.`,
          severity: 'low',
          currentConfig: 'S3 Standard without Intelligent Tiering',
          recommendedConfig: 'S3 Intelligent-Tiering for objects > 128KB',
          currentCost: 115,
          optimizedCost: 80,
          saving: 35,
          savingPercent: 30,
          category: 'missing-feature',
          resourceName: bucket.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 11: NAT Gateway Overuse
 * Flags multiple NAT Gateways in non-production environments.
 */
const natGatewayOveruse: DetectionRule = {
  id: 'rule-11',
  name: 'NAT Gateway Overuse in Non-Production',
  service: 'NAT Gateway',
  severity: 'high',
  category: 'overprovisioned',
  estimatedMonthlySaving: 90,
  description: 'Multiple NAT Gateways exist in a non-production environment.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const natGroup of infra.nat?.gateways ?? []) {
      if (natGroup.count > 1) {
        const costPerNAT =
          AWS_PRICING.natGateway.monthlyBase +
          AWS_PRICING.natGateway.perGB * AWS_PRICING.natGateway.assumedMonthlyDataGB;
        const currentCost = costPerNAT * natGroup.count;
        const optimizedCost = costPerNAT * 1; // Single NAT

        issues.push({
          id: issueId('rule-11', natGroup.name),
          service: 'NAT Gateway',
          issue: `${natGroup.count} NAT Gateways Detected`,
          description: `${natGroup.count} NAT Gateways are deployed, costing ~$${Math.round(costPerNAT)}/month each. In non-production environments, a single NAT Gateway is sufficient. Each additional NAT Gateway adds ~$32-65/month in base + data transfer costs.`,
          severity: 'high',
          currentConfig: `${natGroup.count} NAT Gateways`,
          recommendedConfig: '1 NAT Gateway for non-production (or NAT instance for dev)',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: natGroup.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 12: DynamoDB Provisioned Capacity for Variable Workload
 * Flags DynamoDB tables using PROVISIONED billing mode.
 */
const dynamoDBProvisioned: DetectionRule = {
  id: 'rule-12',
  name: 'DynamoDB Provisioned Capacity (Variable Workload)',
  service: 'DynamoDB',
  severity: 'medium',
  category: 'architectural',
  estimatedMonthlySaving: 60,
  description: 'DynamoDB table uses PROVISIONED billing, which can be wasteful for variable workloads.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const table of infra.dynamodb?.tables ?? []) {
      if (table.billingMode === 'PROVISIONED') {
        const rcu = table.readCapacity ?? AWS_PRICING.dynamodb.defaultReadCapacity;
        const wcu = table.writeCapacity ?? AWS_PRICING.dynamodb.defaultWriteCapacity;
        const currentCost =
          (rcu * AWS_PRICING.dynamodb.provisionedReadCU +
            wcu * AWS_PRICING.dynamodb.provisionedWriteCU) *
          AWS_PRICING.ecs.hoursPerMonth;
        // On-demand for equivalent 10M reads + 5M writes
        const optimizedCost =
          (10 * AWS_PRICING.dynamodb.onDemandRead + 5 * AWS_PRICING.dynamodb.onDemandWrite);

        issues.push({
          id: issueId('rule-12', table.name),
          service: 'DynamoDB',
          issue: 'Provisioned Capacity — Consider On-Demand',
          description: `Table "${table.name}" uses PROVISIONED billing (${rcu} RCU, ${wcu} WCU). For variable or unpredictable workloads, PAY_PER_REQUEST (On-Demand) eliminates waste from unused capacity. Switch if your workload varies more than 2x throughout the day.`,
          severity: 'medium',
          currentConfig: `PROVISIONED: ${rcu} RCU, ${wcu} WCU`,
          recommendedConfig: 'PAY_PER_REQUEST (On-Demand) — no capacity planning needed',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(Math.max(0, currentCost - optimizedCost)),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'architectural',
          resourceName: table.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 13: ElastiCache Oversized
 * Flags ElastiCache clusters using large nodes with multiple nodes.
 */
const elasticacheOversized: DetectionRule = {
  id: 'rule-13',
  name: 'ElastiCache Oversized Cluster',
  service: 'ElastiCache',
  severity: 'medium',
  category: 'overprovisioned',
  estimatedMonthlySaving: 120,
  description: 'ElastiCache cluster uses large node types with multiple nodes unnecessarily.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const cluster of infra.elasticache?.clusters ?? []) {
      const isLarge = cluster.nodeType.includes('large');
      if (isLarge && cluster.numNodes > 2) {
        const nodeCost =
          AWS_PRICING.elasticache.nodes[cluster.nodeType] ??
          AWS_PRICING.elasticache.defaultNodeCost;
        const currentCost = nodeCost * cluster.numNodes;
        const optimizedNodeType = 'cache.t3.medium';
        const optimizedNodeCost =
          AWS_PRICING.elasticache.nodes[optimizedNodeType] ?? 49.64;
        const optimizedCost = optimizedNodeCost * 2; // 2 nodes for HA

        issues.push({
          id: issueId('rule-13', cluster.name),
          service: 'ElastiCache',
          issue: 'Oversized ElastiCache Cluster',
          description: `Cluster "${cluster.name}" uses ${cluster.numNodes}x ${cluster.nodeType} nodes. Unless you have verified memory/throughput requirements at this scale, consider starting with 2x cache.t3.medium and scaling based on CloudWatch metrics.`,
          severity: 'medium',
          currentConfig: `${cluster.numNodes}x ${cluster.nodeType} (${cluster.engine})`,
          recommendedConfig: `2x cache.t3.medium — scale up with data`,
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: cluster.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 14: CloudFront PriceClass_All
 * Flags CloudFront distributions using PriceClass_All when regional may suffice.
 */
const cloudfrontPriceClass: DetectionRule = {
  id: 'rule-14',
  name: 'CloudFront PriceClass_All (Global Edge Network)',
  service: 'CloudFront',
  severity: 'low',
  category: 'overprovisioned',
  estimatedMonthlySaving: 25,
  description: 'CloudFront distribution uses PriceClass_All, enabling the most expensive edge locations.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const dist of infra.cloudfront?.distributions ?? []) {
      if (dist.priceClass === 'PriceClass_All' || dist.priceClass === 'ALL') {
        const transferGB = AWS_PRICING.cloudfront.assumedMonthlyTransferGB;
        const currentCost = transferGB * AWS_PRICING.cloudfront.priceClassAll;
        const optimizedCost = transferGB * AWS_PRICING.cloudfront.priceClass100;

        issues.push({
          id: issueId('rule-14', dist.name),
          service: 'CloudFront',
          issue: 'PriceClass_All — Consider Regional Price Class',
          description: `Distribution "${dist.name}" uses PriceClass_All, routing via all global edge locations including South America and Australia (most expensive). If your users are primarily in US/EU/Asia, PriceClass_200 or PriceClass_100 reduces transfer costs significantly.`,
          severity: 'low',
          currentConfig: 'PriceClass_All (global edge network)',
          recommendedConfig: 'PriceClass_100 (US, Canada, Europe, Asia) or PriceClass_200',
          currentCost: Math.round(currentCost),
          optimizedCost: Math.round(optimizedCost),
          saving: Math.round(currentCost - optimizedCost),
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: dist.name,
        });
      }
    }
    return issues;
  },
};

/**
 * Rule 15: EC2 Previous Generation Instance
 * Flags EC2 instances using old generation types (m4, c3, r3, etc.).
 */
const ec2PreviousGen: DetectionRule = {
  id: 'rule-15',
  name: 'EC2 Previous Generation Instance Type',
  service: 'EC2',
  severity: 'medium',
  category: 'overprovisioned',
  estimatedMonthlySaving: 80,
  description: 'EC2 instance uses a previous generation instance type with worse price-performance.',
  check(infra: NormalizedInfra): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    for (const instance of infra.ec2?.instances ?? []) {
      if (AWS_PRICING.ec2.previousGenPatterns.test(instance.instanceType)) {
        const currentCost = AWS_PRICING.ec2.previousGenMonthlyCost;
        const optimizedCost = AWS_PRICING.ec2.currentGenMonthlyCost;

        // Map to modern equivalent
        const modernEquivalent = instance.instanceType
          .replace(/^m4\./, 'm5.')
          .replace(/^m3\./, 'm5.')
          .replace(/^c3\./, 'c5.')
          .replace(/^r3\./, 'r5.')
          .replace(/^m1\./, 'm5.')
          .replace(/^t1\./, 't3.');

        issues.push({
          id: issueId('rule-15', instance.name),
          service: 'EC2',
          issue: 'Previous Generation Instance Type',
          description: `Instance "${instance.name}" uses ${instance.instanceType}, a previous-generation type. AWS current-generation instances (${modernEquivalent}) offer 10-40% better price-performance. Migration is typically a stop-restart operation.`,
          severity: 'medium',
          currentConfig: `${instance.instanceType} (previous generation)`,
          recommendedConfig: `${modernEquivalent} (current generation, ~33% cheaper/faster)`,
          currentCost,
          optimizedCost,
          saving: currentCost - optimizedCost,
          savingPercent: savingPercent(currentCost, optimizedCost),
          category: 'overprovisioned',
          resourceName: instance.name,
        });
      }
    }
    return issues;
  },
};

/** All 15 detection rules, in priority order */
export const ALL_RULES: DetectionRule[] = [
  lambdaOverprovisionedMemory,
  lambdaLongTimeout,
  rdsMultiAZInDev,
  rdsOversizedInDev,
  ecsOverScaled,
  ecsFargateWaste,
  apiGatewayNLB,
  apiGatewayRESTvsHTTP,
  s3NoLifecycle,
  s3NoIntelligentTiering,
  natGatewayOveruse,
  dynamoDBProvisioned,
  elasticacheOversized,
  cloudfrontPriceClass,
  ec2PreviousGen,
];

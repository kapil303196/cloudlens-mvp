/**
 * CloudSave AI — TypeScript Type Definitions
 * Single source of truth for all types across the application.
 * @module lib/types
 */

// ===== INPUT TYPES =====

/** Supported infrastructure file formats */
export type InfraFileType =
  | 'cdk'
  | 'terraform'
  | 'cloudformation'
  | 'ecs-task'
  | 'zip'
  | 'image'
  | 'unknown';

/** Represents a file uploaded by the user */
export interface UploadedFile {
  name: string;
  type: InfraFileType;
  content: string; // raw file content (base64 for images)
  size: number;
  parsedAt?: string; // ISO timestamp
}

// ===== NORMALIZED INFRA JSON (CRITICAL — ALL PARSERS OUTPUT THIS) =====

/**
 * Unified infrastructure representation output by ALL parsers.
 * Every parser must conform to this exact shape.
 */
export interface NormalizedInfra {
  lambda?: {
    functions: Array<{
      name: string;
      memory: number; // MB
      timeout: number; // seconds
      runtime: string;
      provisioned?: boolean;
      architecture?: string; // 'x86_64' | 'arm64'
    }>;
  };
  rds?: {
    instances: Array<{
      name: string;
      instanceClass: string;
      engine: string;
      multiAZ: boolean;
      env: string; // 'dev' | 'staging' | 'prod'
      storage: number; // GB
      iops?: number;
    }>;
  };
  ecs?: {
    services: Array<{
      name: string;
      desiredCount: number;
      cpu: number; // vCPU units (256 = 0.25 vCPU)
      memory: number; // MB
      launchType: string; // 'FARGATE' | 'EC2'
    }>;
  };
  apiGateway?: {
    apis: Array<{
      name: string;
      type: string; // 'REST' | 'HTTP' | 'WebSocket'
      usesNLB: boolean;
      usesVPCLink: boolean;
    }>;
  };
  s3?: {
    buckets: Array<{
      name: string;
      hasLifecyclePolicy: boolean;
      hasIntelligentTiering: boolean;
      versioningEnabled: boolean;
      publicAccess: boolean;
    }>;
  };
  ec2?: {
    instances: Array<{
      name: string;
      instanceType: string;
      env: string;
    }>;
  };
  dynamodb?: {
    tables: Array<{
      name: string;
      billingMode: string; // 'PROVISIONED' | 'PAY_PER_REQUEST'
      readCapacity?: number;
      writeCapacity?: number;
    }>;
  };
  cloudfront?: {
    distributions: Array<{
      name: string;
      priceClass: string;
    }>;
  };
  nat?: {
    gateways: Array<{
      name: string;
      count: number;
    }>;
  };
  elasticache?: {
    clusters: Array<{
      name: string;
      nodeType: string;
      numNodes: number;
      engine: string;
    }>;
  };
}

// ===== ANTI-PATTERN / ISSUE TYPES =====

/** Severity levels for detected infrastructure issues */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** A detected cost anti-pattern or optimization opportunity */
export interface DetectedIssue {
  id: string;
  service: string; // e.g., 'Lambda', 'RDS', 'ECS'
  issue: string; // Short title
  description: string; // Detailed description
  severity: Severity;
  currentConfig: string; // What they have now
  recommendedConfig: string; // What they should have
  currentCost: number; // Monthly USD
  optimizedCost: number; // Monthly USD after fix
  saving: number; // Monthly USD saved
  savingPercent: number; // Percentage saved
  category: string; // 'overprovisioned' | 'architectural' | 'missing-feature' | 'env-mismatch'
  resourceName?: string; // Specific resource identifier
}

// ===== COST TYPES =====

/** Cost comparison for a single AWS service */
export interface CostBreakdown {
  service: string;
  currentMonthlyCost: number;
  optimizedMonthlyCost: number;
  monthlySaving: number;
  annualSaving: number;
}

/** Aggregated cost summary across all services */
export interface CostSummary {
  totalCurrentCost: number;
  totalOptimizedCost: number;
  totalMonthlySaving: number;
  totalAnnualSaving: number;
  savingPercent: number;
  breakdown: CostBreakdown[];
}

// ===== AI EXPLANATION TYPES =====

/** Claude-generated explanation for a detected issue */
export interface AIExplanation {
  issueId: string;
  explanation: string;
  riskLevel: string; // 'safe' | 'moderate' | 'needs-review'
  whenToApply: string;
  prerequisites: string[];
  implementationSteps: string[];
  rollbackPlan: string;
  impactAnalysis: string;
  estimatedEffort: string;
  awsCLICommands: string[];
}

// ===== REPORT TYPES =====

/** Complete analysis report for an infrastructure file */
export interface AnalysisReport {
  id: string;
  createdAt: string;
  infra: NormalizedInfra;
  detectedServices: string[];
  issues: DetectedIssue[];
  costSummary: CostSummary;
  aiExplanations: AIExplanation[];
  inputFileName: string;
  inputFileType: InfraFileType;
}

// ===== PDF REPORT STRUCTURE =====

/** Data structure for PDF report generation */
export interface PDFReportData {
  report: AnalysisReport;
  generatedAt: string;
  version: string;
}

// ===== ANALYSIS STATE =====

/** Current state of the analysis pipeline */
export type AnalysisStep =
  | 'idle'
  | 'uploading'
  | 'detecting'
  | 'parsing'
  | 'analyzing'
  | 'ai-explaining'
  | 'saving'
  | 'complete'
  | 'error';

/** Analysis progress tracking */
export interface AnalysisProgress {
  step: AnalysisStep;
  stepLabel: string;
  percent: number;
  message?: string;
}

// ===== RULE TYPES =====

/** An anti-pattern detection rule */
export interface DetectionRule {
  id: string;
  name: string;
  service: string;
  severity: Severity;
  category: string;
  estimatedMonthlySaving: number;
  description: string;
  check: (infra: NormalizedInfra) => DetectedIssue[];
}

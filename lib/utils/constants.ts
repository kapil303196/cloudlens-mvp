/**
 * CloudSave AI — AWS Pricing Constants
 * Monthly pricing approximations used for cost estimation.
 * All values in USD. Updated: 2026.
 * @module lib/utils/constants
 */

export const AWS_PRICING = {
  lambda: {
    perGBSecond: 0.0000166667,
    perRequest: 0.0000002,
    freeRequests: 1_000_000,
    freeGBSeconds: 400_000,
    /** Estimated monthly requests for a typical function */
    typicalMonthlyRequests: 10_000_000,
    /** Estimated average duration in ms */
    typicalDurationMs: 200,
  },
  rds: {
    multiAZMultiplier: 2.0,
    instances: {
      'db.t3.micro': 12.41,
      'db.t3.small': 24.82,
      'db.t3.medium': 58.40,
      'db.t3.large': 116.80,
      'db.t3.xlarge': 233.60,
      'db.t3.2xlarge': 467.20,
      'db.r5.large': 172.80,
      'db.r5.xlarge': 345.60,
      'db.r5.2xlarge': 691.20,
      'db.r6g.large': 155.52,
      'db.r6g.xlarge': 311.04,
      'db.m5.large': 155.52,
      'db.m5.xlarge': 311.04,
    } as Record<string, number>,
    /** Default cost if instance class not found */
    defaultMonthlyCost: 100,
    storagePerGBMonth: 0.115,
  },
  ecs: {
    fargate: {
      perVCPUHour: 0.04048,
      perGBHour: 0.004445,
    },
    /** Hours per month */
    hoursPerMonth: 730,
  },
  natGateway: {
    perHour: 0.045,
    perGB: 0.045,
    monthlyBase: 32.40,
    /** Assumed monthly data transfer per gateway in GB */
    assumedMonthlyDataGB: 100,
  },
  nlb: {
    perHour: 0.0225,
    monthlyBase: 16.20,
    perLCUHour: 0.006,
  },
  s3: {
    standard: 0.023, // per GB/month
    ia: 0.0125, // per GB/month
    glacier: 0.004, // per GB/month
    intelligentTiering: 0.023, // starts at standard, optimizes
    /** Assumed bucket size in GB for estimates */
    assumedBucketSizeGB: 500,
  },
  apiGateway: {
    rest: 3.50, // per million requests
    http: 1.00, // per million requests
    /** Assumed monthly requests in millions */
    assumedMonthlyRequestsM: 10,
  },
  dynamodb: {
    provisionedReadCU: 0.00013, // per RCU per hour
    provisionedWriteCU: 0.00065, // per WCU per hour
    onDemandRead: 0.25, // per million RRU
    onDemandWrite: 1.25, // per million WRU
    storagePerGB: 0.25,
    /** Assumed default provisioned capacity */
    defaultReadCapacity: 100,
    defaultWriteCapacity: 100,
  },
  elasticache: {
    nodes: {
      'cache.t3.micro': 12.41,
      'cache.t3.small': 24.82,
      'cache.t3.medium': 49.64,
      'cache.r5.large': 121.97,
      'cache.r5.xlarge': 243.94,
      'cache.r6g.large': 109.58,
    } as Record<string, number>,
    defaultNodeCost: 50,
  },
  cloudfront: {
    priceClassAll: 0.0085, // per GB (US + all edge)
    priceClass100: 0.0050, // per GB (US + Europe + Asia)
    priceClass200: 0.0060, // per GB (US + Europe)
    /** Assumed monthly transfer in GB */
    assumedMonthlyTransferGB: 1000,
  },
  ec2: {
    /** Previous generation instance patterns */
    previousGenPatterns: /\b(t1\.|m1\.|m2\.|m3\.|c1\.|c3\.|r3\.|i2\.|hs1\.|cr1\.|m4\.)/,
    /** Estimated monthly cost for previous-gen instances */
    previousGenMonthlyCost: 120,
    /** Estimated monthly cost for current-gen equivalent */
    currentGenMonthlyCost: 80,
  },
} as const;

/** App-wide configuration constants */
export const APP_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesInZip: 50,
  maxConcurrentAIRequests: 5,
  appName: 'CloudSave AI',
  companyName: 'Prod Bois',
  version: '1.0.0',
  confettiThreshold: 500, // Show confetti when savings > $500/mo
} as const;

/** Severity color mappings for UI */
export const SEVERITY_COLORS = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500',
    hex: '#EF4444',
  },
  high: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badge: 'bg-orange-500',
    hex: '#F97316',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500',
    hex: '#F59E0B',
  },
  low: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500',
    hex: '#3B82F6',
  },
} as const;

/** AWS service icon mappings */
export const SERVICE_ICONS: Record<string, string> = {
  lambda: '⚡',
  rds: '🗄️',
  ecs: '🐳',
  apiGateway: '🌐',
  s3: '🪣',
  ec2: '💻',
  dynamodb: '⚡',
  cloudfront: '🌍',
  nat: '🔀',
  elasticache: '⚡',
};

/** Brand colors */
export const BRAND_COLORS = {
  primary: '#6C3CE1',
  secondary: '#1E293B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  backgroundDark: '#0F172A',
  backgroundLight: '#F8FAFC',
  surfaceDark: '#1E293B',
  surfaceLight: '#FFFFFF',
} as const;

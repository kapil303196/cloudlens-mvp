/**
 * CloudSave AI — Formatting Utilities
 * Currency, number, and date formatting helpers.
 * @module lib/utils/format
 */

/**
 * Formats a number as USD currency string.
 * @param amount - Amount in USD
 * @param decimals - Number of decimal places (default: 0)
 */
export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formats a number as a compact currency string (e.g., $1.2K, $3.4M).
 * @param amount - Amount in USD
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

/**
 * Formats a percentage value.
 * @param value - Percentage value (0–100)
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats memory size in MB to human-readable string.
 * @param mb - Memory in megabytes
 */
export function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Formats a storage size in GB.
 * @param gb - Storage in gigabytes
 */
export function formatStorage(gb: number): string {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(1)} TB`;
  }
  return `${gb} GB`;
}

/**
 * Formats file size in bytes to human-readable string.
 * @param bytes - File size in bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Formats an ISO timestamp to a readable date string.
 * @param iso - ISO 8601 date string
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Formats an ISO timestamp to short date (e.g., Feb 20, 2026).
 * @param iso - ISO 8601 date string
 */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

/**
 * Capitalizes the first letter of a string.
 * @param str - Input string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a camelCase service name to display label.
 * @param key - camelCase key (e.g., 'apiGateway')
 */
export function serviceKeyToLabel(key: string): string {
  const labels: Record<string, string> = {
    lambda: 'Lambda',
    rds: 'RDS',
    ecs: 'ECS',
    apiGateway: 'API Gateway',
    s3: 'S3',
    ec2: 'EC2',
    dynamodb: 'DynamoDB',
    cloudfront: 'CloudFront',
    nat: 'NAT Gateway',
    elasticache: 'ElastiCache',
  };
  return labels[key] ?? capitalize(key);
}

/**
 * Truncates a string to a maximum length with ellipsis.
 * @param str - Input string
 * @param max - Maximum length (default: 40)
 */
export function truncate(str: string, max = 40): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/**
 * Generates a short unique ID for reports.
 */
export function generateReportId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `rpt_${ts}_${rand}`;
}

/**
 * CloudSave AI — ZIP Archive Handler
 * Extracts ZIP archives and routes each file through the appropriate parser.
 * Merges multiple NormalizedInfra results into one.
 * @module lib/parsers/zip-handler
 */

import type { NormalizedInfra } from '../types';
import { APP_CONFIG } from '../utils/constants';

/** Represents a single extracted file from a ZIP */
export interface ExtractedFile {
  name: string;
  content: string;
  size: number;
}

/**
 * Extracts files from a ZIP archive (base64-encoded) and returns them
 * for individual parsing. Uses JSZip for extraction.
 * @param base64Content - Base64-encoded ZIP file content
 * @returns Array of extracted files with names and content
 */
export async function extractZip(base64Content: string): Promise<ExtractedFile[]> {
  // Dynamic import to avoid SSR issues
  const JSZip = (await import('jszip')).default;

  const binary = Buffer.from(base64Content, 'base64');
  const zip = await JSZip.loadAsync(binary);

  const files: ExtractedFile[] = [];
  const fileCount = Object.keys(zip.files).length;

  if (fileCount > APP_CONFIG.maxFilesInZip) {
    throw new Error(
      `ZIP contains ${fileCount} files, exceeding the limit of ${APP_CONFIG.maxFilesInZip}.`
    );
  }

  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue; // Skip directories

    // Only process supported file types
    if (!isSupportedFile(name)) continue;

    try {
      const content = await file.async('string');
      files.push({ name, content, size: content.length });
    } catch {
      // Skip binary files that can't be read as string
      console.warn(`[zip-handler] Skipping binary file: ${name}`);
    }
  }

  return files;
}

/**
 * Checks if a file name corresponds to a supported infrastructure file type.
 * @param name - File name with extension
 */
function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.ts') ||
    lower.endsWith('.js') ||
    lower.endsWith('.py') ||
    lower.endsWith('.tf') ||
    lower.endsWith('.tf.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.json') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.svg')
  );
}

/**
 * Merges multiple NormalizedInfra objects into a single unified one.
 * Arrays are concatenated; undefined sections are omitted.
 * @param infraList - Array of NormalizedInfra objects to merge
 * @returns Single merged NormalizedInfra
 */
export function mergeNormalizedInfra(infraList: NormalizedInfra[]): NormalizedInfra {
  const merged: NormalizedInfra = {};

  for (const infra of infraList) {
    if (infra.lambda?.functions?.length) {
      merged.lambda = merged.lambda ?? { functions: [] };
      merged.lambda.functions.push(...infra.lambda.functions);
    }
    if (infra.rds?.instances?.length) {
      merged.rds = merged.rds ?? { instances: [] };
      merged.rds.instances.push(...infra.rds.instances);
    }
    if (infra.ecs?.services?.length) {
      merged.ecs = merged.ecs ?? { services: [] };
      merged.ecs.services.push(...infra.ecs.services);
    }
    if (infra.apiGateway?.apis?.length) {
      merged.apiGateway = merged.apiGateway ?? { apis: [] };
      merged.apiGateway.apis.push(...infra.apiGateway.apis);
    }
    if (infra.s3?.buckets?.length) {
      merged.s3 = merged.s3 ?? { buckets: [] };
      merged.s3.buckets.push(...infra.s3.buckets);
    }
    if (infra.ec2?.instances?.length) {
      merged.ec2 = merged.ec2 ?? { instances: [] };
      merged.ec2.instances.push(...infra.ec2.instances);
    }
    if (infra.dynamodb?.tables?.length) {
      merged.dynamodb = merged.dynamodb ?? { tables: [] };
      merged.dynamodb.tables.push(...infra.dynamodb.tables);
    }
    if (infra.cloudfront?.distributions?.length) {
      merged.cloudfront = merged.cloudfront ?? { distributions: [] };
      merged.cloudfront.distributions.push(...infra.cloudfront.distributions);
    }
    if (infra.nat?.gateways?.length) {
      // For NAT gateways, sum the counts
      if (!merged.nat) {
        merged.nat = { gateways: [...infra.nat.gateways] };
      } else {
        const existingGW = merged.nat.gateways[0];
        const newCount = infra.nat.gateways.reduce((sum, gw) => sum + gw.count, 0);
        merged.nat.gateways = [
          { name: existingGW?.name ?? 'nat-gateway', count: (existingGW?.count ?? 0) + newCount },
        ];
      }
    }
    if (infra.elasticache?.clusters?.length) {
      merged.elasticache = merged.elasticache ?? { clusters: [] };
      merged.elasticache.clusters.push(...infra.elasticache.clusters);
    }
  }

  return merged;
}

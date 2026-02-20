/**
 * CloudSave AI — Parser Router
 * Detects infrastructure file type and routes to the appropriate parser.
 * All parsers output NormalizedInfra.
 * @module lib/parsers
 */

import type { InfraFileType, NormalizedInfra, UploadedFile } from '../types';
import { parseCDK } from './cdk-parser';
import { parseTerraform } from './terraform-parser';
import { parseCloudFormation } from './cloudformation-parser';
import { parseECSTask } from './ecs-parser';
import { extractZip, mergeNormalizedInfra } from './zip-handler';

/**
 * Detects the infrastructure file type based on name and content heuristics.
 * @param name - File name with extension
 * @param content - File content (raw string or base64 for binary)
 * @returns Detected InfraFileType
 */
export function detectFileType(name: string, content: string): InfraFileType {
  const lower = name.toLowerCase();
  const ext = lower.split('.').pop() ?? '';

  // ZIP archive
  if (ext === 'zip') return 'zip';

  // Image files
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) return 'image';

  // ECS Task Definition (JSON with containerDefinitions)
  if (ext === 'json') {
    if (
      content.includes('containerDefinitions') ||
      content.includes('taskDefinitionArn') ||
      content.includes('requiresCompatibilities')
    ) {
      return 'ecs-task';
    }
    // CloudFormation JSON
    if (
      content.includes('AWSTemplateFormatVersion') ||
      (content.includes('"Resources"') && content.includes('AWS::'))
    ) {
      return 'cloudformation';
    }
  }

  // CloudFormation YAML
  if (ext === 'yaml' || ext === 'yml') {
    if (
      content.includes('AWSTemplateFormatVersion') ||
      (content.includes('Resources:') && content.includes('AWS::'))
    ) {
      return 'cloudformation';
    }
  }

  // Terraform HCL
  if (ext === 'tf' || lower.endsWith('.tf.json')) {
    if (
      content.includes('provider "aws"') ||
      content.includes('resource "aws_') ||
      content.includes('terraform {')
    ) {
      return 'terraform';
    }
  }

  // AWS CDK
  if (['ts', 'js', 'py'].includes(ext)) {
    if (
      content.includes('aws-cdk') ||
      content.includes('aws_cdk') ||
      content.includes('from aws_cdk') ||
      content.includes('cdk.Stack') ||
      content.includes('new Stack(') ||
      content.includes('Construct') ||
      content.includes('new lambda.') ||
      content.includes('new rds.') ||
      content.includes('new ecs.')
    ) {
      return 'cdk';
    }
  }

  // Fallback CDK detection for .ts files
  if (ext === 'ts') return 'cdk';

  return 'unknown';
}

/**
 * Parses an uploaded file and returns NormalizedInfra.
 * Routes to the correct parser based on file type.
 * @param file - UploadedFile object with content and type
 * @returns Normalized infrastructure or null if unparseable
 */
export async function parseFile(file: UploadedFile): Promise<NormalizedInfra | null> {
  const type = file.type !== 'unknown' ? file.type : detectFileType(file.name, file.content);

  switch (type) {
    case 'cdk':
      return parseCDK(file.content);

    case 'terraform':
      return parseTerraform(file.content);

    case 'cloudformation':
      return parseCloudFormation(file.content);

    case 'ecs-task':
      return parseECSTask(file.content);

    case 'zip': {
      const files = await extractZip(file.content);
      const infraList: NormalizedInfra[] = [];

      for (const extracted of files) {
        const detectedType = detectFileType(extracted.name, extracted.content);
        const subFile: UploadedFile = {
          name: extracted.name,
          type: detectedType,
          content: extracted.content,
          size: extracted.size,
        };
        const result = await parseFile(subFile);
        if (result) infraList.push(result);
      }

      return infraList.length > 0 ? mergeNormalizedInfra(infraList) : null;
    }

    case 'image':
      // Image parsing is handled by Claude Vision in the API route
      // Return null here; the API route handles this case separately
      return null;

    default:
      return null;
  }
}

/**
 * Extracts the list of detected AWS service names from NormalizedInfra.
 * @param infra - Normalized infrastructure object
 * @returns Array of service name strings
 */
export function extractDetectedServices(infra: NormalizedInfra): string[] {
  const services: string[] = [];

  if (infra.lambda?.functions?.length) services.push('Lambda');
  if (infra.rds?.instances?.length) services.push('RDS');
  if (infra.ecs?.services?.length) services.push('ECS');
  if (infra.apiGateway?.apis?.length) services.push('API Gateway');
  if (infra.s3?.buckets?.length) services.push('S3');
  if (infra.ec2?.instances?.length) services.push('EC2');
  if (infra.dynamodb?.tables?.length) services.push('DynamoDB');
  if (infra.cloudfront?.distributions?.length) services.push('CloudFront');
  if (infra.nat?.gateways?.length) services.push('NAT Gateway');
  if (infra.elasticache?.clusters?.length) services.push('ElastiCache');

  return services;
}

/**
 * CloudSave AI — ECS Task Definition Parser
 * Parses ECS task definition JSON files.
 * Outputs NormalizedInfra JSON.
 * @module lib/parsers/ecs-parser
 */

import type { NormalizedInfra } from '../types';

/** ECS container definition shape */
interface ECSContainerDefinition {
  name?: string;
  image?: string;
  cpu?: number;
  memory?: number;
  memoryReservation?: number;
  essential?: boolean;
}

/** ECS task definition shape */
interface ECSTaskDefinition {
  family?: string;
  taskDefinitionArn?: string;
  containerDefinitions?: ECSContainerDefinition[];
  cpu?: string | number;
  memory?: string | number;
  networkMode?: string;
  requiresCompatibilities?: string[];
}

/**
 * Parses an ECS task definition JSON file into NormalizedInfra format.
 * @param content - Raw JSON content of the task definition
 * @returns Normalized infrastructure representation
 */
export function parseECSTask(content: string): NormalizedInfra {
  const infra: NormalizedInfra = {};

  let taskDef: ECSTaskDefinition;
  try {
    taskDef = JSON.parse(content) as ECSTaskDefinition;
  } catch {
    // Try to extract as array (some exports wrap in array)
    try {
      const arr = JSON.parse(content) as ECSTaskDefinition[];
      taskDef = Array.isArray(arr) ? arr[0] : (arr as unknown as ECSTaskDefinition);
    } catch {
      return infra;
    }
  }

  // Handle both wrapped and unwrapped formats
  const td: ECSTaskDefinition =
    (taskDef as Record<string, unknown>).taskDefinition as ECSTaskDefinition ?? taskDef;

  const cpu = parseCPU(td.cpu);
  const memory = parseMemory(td.memory);
  const launchType =
    td.requiresCompatibilities?.includes('FARGATE') ? 'FARGATE' : 'EC2';

  const family = td.family ?? extractArnFamily(td.taskDefinitionArn);
  const containers = td.containerDefinitions ?? [];

  // Build ECS service entry
  infra.ecs = {
    services: [
      {
        name: family ?? 'ecs-task',
        desiredCount: 1, // Task def doesn't specify desired count
        cpu,
        memory,
        launchType,
      },
    ],
  };

  return infra;
}

/**
 * Parses CPU value from ECS task definition (can be string "256" or number 256).
 * @param cpu - CPU value from task definition
 */
function parseCPU(cpu: string | number | undefined): number {
  if (cpu === undefined || cpu === null) return 256;
  const n = typeof cpu === 'string' ? parseInt(cpu, 10) : cpu;
  return isNaN(n) ? 256 : n;
}

/**
 * Parses memory value from ECS task definition (can be string "512" or number 512).
 * @param memory - Memory value from task definition
 */
function parseMemory(memory: string | number | undefined): number {
  if (memory === undefined || memory === null) return 512;
  const n = typeof memory === 'string' ? parseInt(memory, 10) : memory;
  return isNaN(n) ? 512 : n;
}

/**
 * Extracts family name from task definition ARN.
 * @param arn - Task definition ARN string
 */
function extractArnFamily(arn: string | undefined): string | null {
  if (!arn) return null;
  const match = arn.match(/task-definition\/([\w-]+):/);
  return match ? match[1] : null;
}

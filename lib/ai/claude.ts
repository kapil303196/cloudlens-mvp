/**
 * CloudSave AI — Claude API Integration
 * Token-optimized per-issue explanations using Anthropic SDK.
 * Never sends full infrastructure context — only the specific issue.
 * @module lib/ai/claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIExplanation, DetectedIssue } from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const getModel = () => process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY_MS = 1000;

const SYSTEM_PROMPT = `You are a Principal DevOps/SRE Engineer with 15+ years of production AWS experience, AWS SA-Pro and DevOps Professional certified. You've managed large-scale production workloads ($500K+/month AWS spend), led FinOps programs, and performed hundreds of infrastructure cost optimizations across startups and enterprises.

You will receive a single AWS infrastructure cost issue with its current vs recommended configuration and estimated savings. Provide an expert-grade, actionable analysis as a JSON response with ALL of the following fields:

1. "explanation" — A thorough 3-5 sentence technical analysis of WHY this issue wastes money. Reference specific AWS pricing mechanics (e.g., per-hour billing, data transfer tiers, Reserved Instance discounting, Graviton pricing differentials). Explain the root cause — not just the symptom.

2. "whenToApply" — Precise timing guidance: maintenance windows, traffic patterns to watch, dependency ordering, and environment-specific constraints (dev vs staging vs prod). Include specific days/times if relevant (e.g., "Apply during your lowest-traffic window, typically weekday 2-5 AM UTC").

3. "riskLevel" — Exactly one of "safe" | "moderate" | "needs-review". Base this on blast radius, data loss potential, and downtime risk. "safe" = zero-downtime, no data risk. "moderate" = brief disruption possible, rollback straightforward. "needs-review" = potential data loss, multi-service impact, or requires architecture changes.

4. "prerequisites" — Ordered array of specific, actionable steps to complete BEFORE making the change. Include exact AWS CLI commands or Console paths where applicable. Each step should be concrete enough for a junior engineer to execute.

5. "implementationSteps" — Ordered array of step-by-step instructions to implement the optimization. Include specific AWS CLI commands, Terraform/CDK snippets, or Console navigation paths. Each step must be precise and executable.

6. "rollbackPlan" — A concise but complete rollback procedure if the change causes issues. Include specific commands/steps, expected rollback time, and what to monitor during rollback.

7. "impactAnalysis" — A 2-3 sentence assessment of blast radius: which upstream/downstream services are affected, what metrics to watch post-change (latency, error rates, queue depths), and any capacity planning implications.

8. "estimatedEffort" — Time estimate to implement: one of "5 minutes" | "15 minutes" | "30 minutes" | "1 hour" | "2-4 hours" | "1 day" | "multi-day". Factor in testing and validation time.

9. "awsCLICommands" — Array of relevant AWS CLI commands that help verify current state, implement the change, or validate the result. Use placeholder values like <resource-id> where specific IDs are needed.

Rules:
- Be ruthlessly specific to the AWS service and configuration in question.
- Reference actual AWS pricing models, not approximations.
- Every recommendation must be production-battle-tested — no theoretical advice.
- CLI commands must use current AWS CLI v2 syntax.
- Never suggest changes that could cause silent data loss without explicit warnings.
- Return ONLY valid JSON — no markdown, no commentary outside the JSON object.`;

interface IssuePayload {
  issue: string;
  service: string;
  currentConfig: string;
  recommendedConfig: string;
  currentCost: string;
  saving: string;
  severity: string;
}

interface ClaudeExplanationResponse {
  explanation: string;
  whenToApply: string;
  riskLevel: 'safe' | 'moderate' | 'needs-review';
  prerequisites: string[];
  implementationSteps: string[];
  rollbackPlan: string;
  impactAnalysis: string;
  estimatedEffort: string;
  awsCLICommands: string[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  }
  return new Anthropic({ apiKey, timeout: 60_000 });
}

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status === 529 || status === 503;
  }
  return false;
}

function jitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * baseMs * 0.5);
}

/**
 * Calls Claude with retry + exponential backoff + jitter for transient errors.
 */
async function callWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const backoff = jitter(Math.min(3000 * Math.pow(2, attempt), 30000));
        console.warn(`[claude] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

function repairTruncatedJSON(raw: string): string {
  let s = raw.trim();

  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;

  if (openBraces === closeBraces && openBrackets === closeBrackets) return s;

  // Truncated inside a string value — close the string
  const lastQuote = s.lastIndexOf('"');
  const afterLast = s.slice(lastQuote + 1).trim();
  if (afterLast === '' || /^[,\s]*$/.test(afterLast)) {
    s = s.slice(0, lastQuote + 1);
  } else if (!/["}\]]/.test(afterLast.charAt(0))) {
    s += '"';
  }

  // Close unclosed arrays then objects
  for (let i = 0; i < openBrackets - closeBrackets; i++) s += ']';
  for (let i = 0; i < openBraces - closeBraces; i++) s += '}';

  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, '$1');

  return s;
}

function parseExplanationJSON(rawText: string): ClaudeExplanationResponse {
  const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}?/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');

  try {
    return JSON.parse(jsonMatch[0]) as ClaudeExplanationResponse;
  } catch {
    const repaired = repairTruncatedJSON(jsonMatch[0]);
    return JSON.parse(repaired) as ClaudeExplanationResponse;
  }
}

function fallbackExplanation(issue: DetectedIssue): AIExplanation {
  return {
    issueId: issue.id,
    explanation: `${issue.description} Applying the recommended configuration (${issue.recommendedConfig}) can save approximately $${issue.saving}/month.`,
    riskLevel: 'moderate',
    whenToApply: 'Review with your team and test in a non-production environment first.',
    prerequisites: [
      'Backup current configuration',
      'Test the change in a staging environment',
      'Monitor for 24-48 hours after applying',
    ],
    implementationSteps: [
      `Update the resource from ${issue.currentConfig} to ${issue.recommendedConfig}`,
      'Deploy to staging and validate functionality',
      'Run load tests to confirm performance parity',
      'Deploy to production during a maintenance window',
      'Monitor CloudWatch metrics for 24-48 hours',
    ],
    rollbackPlan: `Revert to ${issue.currentConfig} and redeploy. Expected recovery time: 5-15 minutes.`,
    impactAnalysis: `This change affects the ${issue.service} service (${issue.resourceName ?? 'unnamed resource'}). Monitor latency, error rates, and throughput after applying.`,
    estimatedEffort: '30 minutes',
    awsCLICommands: [],
  };
}

export async function explainIssue(issue: DetectedIssue): Promise<AIExplanation> {
  const client = createClient();

  const payload: IssuePayload = {
    issue: issue.issue,
    service: issue.service,
    currentConfig: issue.currentConfig,
    recommendedConfig: issue.recommendedConfig,
    currentCost: `$${issue.currentCost}/month`,
    saving: `$${issue.saving}/month (${issue.savingPercent}%)`,
    severity: issue.severity,
  };

  const userMessage = `Perform a deep-dive DevOps analysis on this AWS cost optimization issue:

${JSON.stringify(payload, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "explanation": "3-5 sentences: technical root cause analysis referencing AWS pricing mechanics",
  "whenToApply": "Precise timing guidance with maintenance window and environment constraints",
  "riskLevel": "safe|moderate|needs-review",
  "prerequisites": ["Ordered, actionable pre-change steps with CLI commands where applicable"],
  "implementationSteps": ["Step-by-step implementation with exact CLI commands or Console paths"],
  "rollbackPlan": "Complete rollback procedure with commands and expected recovery time",
  "impactAnalysis": "Blast radius assessment: affected services, metrics to watch, capacity implications",
  "estimatedEffort": "5 minutes|15 minutes|30 minutes|1 hour|2-4 hours|1 day|multi-day",
  "awsCLICommands": ["aws cli commands to verify, implement, or validate the change"]
}`;

  const model = getModel();
  console.log(`[claude] Explaining issue ${issue.id} using ${model}...`);
  const start = Date.now();

  try {
    const response = await callWithRetry(client, {
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const elapsed = Date.now() - start;
    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    console.log(`[claude] Got response for ${issue.id} in ${elapsed}ms (${rawText.length} chars)`);

    const parsed = parseExplanationJSON(rawText);

    return {
      issueId: issue.id,
      explanation: parsed.explanation ?? '',
      riskLevel: parsed.riskLevel ?? 'moderate',
      whenToApply: parsed.whenToApply ?? 'Review with your team before applying.',
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
      implementationSteps: Array.isArray(parsed.implementationSteps) ? parsed.implementationSteps : [],
      rollbackPlan: parsed.rollbackPlan ?? 'Revert to previous configuration and monitor.',
      impactAnalysis: parsed.impactAnalysis ?? '',
      estimatedEffort: parsed.estimatedEffort ?? '30 minutes',
      awsCLICommands: Array.isArray(parsed.awsCLICommands) ? parsed.awsCLICommands : [],
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[claude] Failed to explain issue ${issue.id} after ${elapsed}ms:`, err);
    return fallbackExplanation(issue);
  }
}

/**
 * Explains all issues in parallel with concurrency control.
 */
export async function explainAllIssues(
  issues: DetectedIssue[]
): Promise<AIExplanation[]> {
  const concurrency = Math.min(issues.length, 5);
  console.log(`[claude] Starting AI analysis for ${issues.length} issues (${concurrency} parallel) using ${getModel()}...`);
  const start = Date.now();

  const results: AIExplanation[] = new Array(issues.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < issues.length) {
      const i = nextIndex++;
      console.log(`[claude] Processing issue ${i + 1}/${issues.length}: ${issues[i].id}`);
      results[i] = await explainIssue(issues[i]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(`[claude] All ${issues.length} issues explained in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  return results;
}

/**
 * Parses an architecture diagram image using Claude Vision API.
 * Returns a NormalizedInfra-compatible description of detected services.
 * @param base64Image - Base64-encoded image data
 * @param mediaType - Image MIME type
 * @returns Partial NormalizedInfra extracted from the image
 */
export async function parseArchitectureImage(
  base64Image: string,
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
): Promise<Record<string, unknown>> {
  const client = createClient();

  try {
    const response = await callWithRetry(client, {
      model: getModel(),
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: `Analyze this AWS architecture diagram. List every AWS service visible.
For each service, estimate its configuration based on visible labels and typical setups.
Return as JSON matching this schema (include only services you can detect):
{
  "lambda": { "functions": [{ "name": string, "memory": number, "timeout": number, "runtime": string }] },
  "rds": { "instances": [{ "name": string, "instanceClass": string, "engine": string, "multiAZ": boolean, "env": string, "storage": number }] },
  "ecs": { "services": [{ "name": string, "desiredCount": number, "cpu": number, "memory": number, "launchType": string }] },
  "apiGateway": { "apis": [{ "name": string, "type": string, "usesNLB": boolean, "usesVPCLink": boolean }] },
  "s3": { "buckets": [{ "name": string, "hasLifecyclePolicy": boolean, "hasIntelligentTiering": boolean, "versioningEnabled": boolean, "publicAccess": boolean }] },
  "nat": { "gateways": [{ "name": string, "count": number }] }
}
Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    });

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch (err) {
    console.error('[claude] Image parsing failed:', err);
    return {};
  }
}

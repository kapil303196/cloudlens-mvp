/**
 * CloudSave AI — Claude API Integration
 * Token-optimized per-issue explanations using Anthropic SDK.
 * Never sends full infrastructure context — only the specific issue.
 * @module lib/ai/claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIExplanation, DetectedIssue } from '../types';
import { APP_CONFIG } from '../utils/constants';

const SYSTEM_PROMPT = `You are a Senior AWS Solutions Architect (SA-Pro certified). You will receive a single AWS infrastructure cost issue and its estimated saving. Provide a concise JSON response with:
1. A clear 2-3 sentence explanation of WHY this specific change reduces cost
2. WHEN it is safe to apply (environment constraints, prerequisites)
3. Risk level: exactly one of "safe" | "moderate" | "needs-review"
4. Prerequisites: array of strings describing what to do before making this change

Be specific to AWS services. No generic advice. No fluff. Return ONLY valid JSON.`;

/** Payload sent to Claude for each issue (minimal, token-optimized) */
interface IssuePayload {
  issue: string;
  service: string;
  currentConfig: string;
  recommendedConfig: string;
  currentCost: string;
  saving: string;
  severity: string;
}

/** Expected Claude response shape */
interface ClaudeExplanationResponse {
  explanation: string;
  whenToApply: string;
  riskLevel: 'safe' | 'moderate' | 'needs-review';
  prerequisites: string[];
}

/**
 * Creates an Anthropic client using the API key from environment.
 */
function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  }
  return new Anthropic({ apiKey });
}

/**
 * Generates a Claude AI explanation for a single detected issue.
 * Sends only the issue payload — NOT the full infrastructure.
 * @param issue - The detected cost anti-pattern issue
 * @returns AIExplanation with explanation, risk level, prerequisites
 */
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

  const userMessage = `Analyze this AWS cost issue and provide optimization guidance:

${JSON.stringify(payload, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "explanation": "2-3 sentences explaining why this change reduces cost",
  "whenToApply": "When/conditions under which this is safe to apply",
  "riskLevel": "safe|moderate|needs-review",
  "prerequisites": ["prerequisite 1", "prerequisite 2"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const parsed = JSON.parse(jsonMatch[0]) as ClaudeExplanationResponse;

    return {
      issueId: issue.id,
      explanation: parsed.explanation ?? '',
      riskLevel: parsed.riskLevel ?? 'moderate',
      whenToApply: parsed.whenToApply ?? 'Review with your team before applying.',
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
    };
  } catch (err) {
    console.error(`[claude] Failed to explain issue ${issue.id}:`, err);
    // Return a safe fallback
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
    };
  }
}

/**
 * Explains multiple issues concurrently with a configurable concurrency limit.
 * Defaults to APP_CONFIG.maxConcurrentAIRequests (5) parallel requests.
 * @param issues - Array of detected issues to explain
 * @param maxConcurrent - Maximum parallel Claude API requests
 * @returns Array of AI explanations in the same order as issues
 */
export async function explainAllIssues(
  issues: DetectedIssue[],
  maxConcurrent = APP_CONFIG.maxConcurrentAIRequests
): Promise<AIExplanation[]> {
  const results: AIExplanation[] = new Array(issues.length);

  // Process in batches to respect concurrency limit
  for (let i = 0; i < issues.length; i += maxConcurrent) {
    const batch = issues.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map((issue) => explainIssue(issue)));
    batchResults.forEach((result, j) => {
      results[i + j] = result;
    });
  }

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
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
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
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch (err) {
    console.error('[claude] Image parsing failed:', err);
    return {};
  }
}

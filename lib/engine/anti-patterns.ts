/**
 * CloudSave AI — Anti-Pattern Detection Engine
 * Runs all rules against NormalizedInfra and returns detected issues.
 * @module lib/engine/anti-patterns
 */

import type { DetectedIssue, NormalizedInfra } from '../types';
import { ALL_RULES } from './rules';

/**
 * Runs all registered detection rules against the provided infrastructure.
 * Returns a flat list of all detected issues, sorted by severity then saving.
 * @param infra - Normalized infrastructure object
 * @returns Array of detected issues
 */
export function detectAntiPatterns(infra: NormalizedInfra): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  for (const rule of ALL_RULES) {
    try {
      const ruleIssues = rule.check(infra);
      issues.push(...ruleIssues);
    } catch (err) {
      console.error(`[anti-patterns] Rule ${rule.id} (${rule.name}) threw an error:`, err);
    }
  }

  // Sort: critical > high > medium > low, then by saving amount descending
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  issues.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.saving - a.saving;
  });

  return issues;
}

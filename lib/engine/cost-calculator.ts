/**
 * CloudSave AI — Cost Calculator
 * Computes current and optimized monthly/annual costs from detected issues.
 * @module lib/engine/cost-calculator
 */

import type { CostBreakdown, CostSummary, DetectedIssue } from '../types';

/**
 * Aggregates detected issues into a full cost summary with per-service breakdowns.
 * @param issues - Array of detected issues from the anti-pattern engine
 * @returns CostSummary with totals and per-service breakdown
 */
export function calculateCostSummary(issues: DetectedIssue[]): CostSummary {
  // Group issues by service
  const byService = new Map<string, DetectedIssue[]>();

  for (const issue of issues) {
    const existing = byService.get(issue.service) ?? [];
    existing.push(issue);
    byService.set(issue.service, existing);
  }

  const breakdown: CostBreakdown[] = [];

  for (const [service, serviceIssues] of byService.entries()) {
    const currentMonthlyCost = serviceIssues.reduce((sum, i) => sum + i.currentCost, 0);
    const optimizedMonthlyCost = serviceIssues.reduce((sum, i) => sum + i.optimizedCost, 0);
    const monthlySaving = currentMonthlyCost - optimizedMonthlyCost;

    breakdown.push({
      service,
      currentMonthlyCost: Math.round(currentMonthlyCost),
      optimizedMonthlyCost: Math.round(optimizedMonthlyCost),
      monthlySaving: Math.round(monthlySaving),
      annualSaving: Math.round(monthlySaving * 12),
    });
  }

  // Sort breakdown by monthly saving descending
  breakdown.sort((a, b) => b.monthlySaving - a.monthlySaving);

  const totalCurrentCost = breakdown.reduce((sum, b) => sum + b.currentMonthlyCost, 0);
  const totalOptimizedCost = breakdown.reduce((sum, b) => sum + b.optimizedMonthlyCost, 0);
  const totalMonthlySaving = totalCurrentCost - totalOptimizedCost;
  const totalAnnualSaving = totalMonthlySaving * 12;
  const savingPercent =
    totalCurrentCost > 0
      ? Math.round(((totalMonthlySaving / totalCurrentCost) * 100) * 10) / 10
      : 0;

  return {
    totalCurrentCost: Math.round(totalCurrentCost),
    totalOptimizedCost: Math.round(totalOptimizedCost),
    totalMonthlySaving: Math.round(totalMonthlySaving),
    totalAnnualSaving: Math.round(totalAnnualSaving),
    savingPercent,
    breakdown,
  };
}

/**
 * Returns the optimization roadmap — issues categorized by implementation effort.
 * @param issues - Array of detected issues
 */
export function buildOptimizationRoadmap(issues: DetectedIssue[]): {
  quickWins: DetectedIssue[];
  mediumEffort: DetectedIssue[];
  needsPlanning: DetectedIssue[];
} {
  const quickWins: DetectedIssue[] = [];
  const mediumEffort: DetectedIssue[] = [];
  const needsPlanning: DetectedIssue[] = [];

  for (const issue of issues) {
    if (
      issue.category === 'env-mismatch' ||
      (issue.service === 'CloudFront' && issue.severity === 'low') ||
      (issue.service === 'S3' && issue.category === 'missing-feature')
    ) {
      quickWins.push(issue);
    } else if (
      issue.category === 'overprovisioned' &&
      (issue.service === 'Lambda' || issue.service === 'RDS' || issue.service === 'ECS')
    ) {
      mediumEffort.push(issue);
    } else {
      needsPlanning.push(issue);
    }
  }

  return { quickWins, mediumEffort, needsPlanning };
}

/**
 * CloudSave AI — Issues List Component
 * Displays detected anti-pattern issues as styled cards with severity indicators.
 */

'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Zap, TrendingDown } from 'lucide-react';
import type { DetectedIssue, Severity } from '../../lib/types';
import { SEVERITY_COLORS } from '../../lib/utils/constants';
import { formatCurrency, formatPercent } from '../../lib/utils/format';

interface IssuesListProps {
  issues: DetectedIssue[];
}

const SEVERITY_ICONS: Record<Severity, React.ReactNode> = {
  critical: <AlertCircle size={16} className="text-red-400" />,
  high: <AlertTriangle size={16} className="text-orange-400" />,
  medium: <Zap size={16} className="text-yellow-400" />,
  low: <Info size={16} className="text-blue-400" />,
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface IssueCardProps {
  issue: DetectedIssue;
  index: number;
}

function IssueCard({ issue, index }: IssueCardProps) {
  const colors = SEVERITY_COLORS[issue.severity];

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 hover:scale-[1.005] ${colors.bg} ${colors.border}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5">
          {SEVERITY_ICONS[issue.severity]}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-white">{issue.issue}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.text} border ${colors.border} bg-black/20`}
              >
                {SEVERITY_LABELS[issue.severity]}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400 border border-white/10">
                {issue.service}
              </span>
            </div>
            {issue.resourceName && (
              <p className="mt-0.5 text-xs text-slate-500 font-mono">{issue.resourceName}</p>
            )}
          </div>
        </div>

        {/* Saving badge */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-base font-bold font-mono text-emerald-400">
            {formatCurrency(issue.saving)}/mo
          </span>
          <span className="text-xs text-slate-500">
            {formatPercent(issue.savingPercent)} savings
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-3">{issue.description}</p>

      {/* Config comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/20 px-3 py-2 border border-white/5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Current</p>
          <p className="text-xs text-slate-300 font-mono">{issue.currentConfig}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{formatCurrency(issue.currentCost)}/mo</p>
        </div>
        <div className="rounded-lg bg-emerald-500/5 px-3 py-2 border border-emerald-500/20">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1">Recommended</p>
          <p className="text-xs text-emerald-300 font-mono">{issue.recommendedConfig}</p>
          <p className="text-xs text-emerald-600 mt-1 font-mono">{formatCurrency(issue.optimizedCost)}/mo</p>
        </div>
      </div>

      {/* Saving indicator */}
      <div className="mt-3 flex items-center gap-2">
        <TrendingDown size={12} className="text-emerald-500" />
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(issue.savingPercent, 100)}%` }}
          />
        </div>
        <span className="text-xs text-emerald-500 font-mono font-semibold">
          -{formatPercent(issue.savingPercent)}
        </span>
      </div>
    </div>
  );
}

/** Grid of detected issue cards sorted by severity */
export function IssuesList({ issues }: IssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <p className="text-emerald-400 font-semibold text-lg mb-1">No Issues Detected</p>
        <p className="text-sm text-slate-500">Your infrastructure looks well-optimized!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, i) => (
        <IssueCard key={issue.id} issue={issue} index={i} />
      ))}
    </div>
  );
}

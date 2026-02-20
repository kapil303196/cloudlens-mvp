/**
 * CloudSave AI — Service Card Component
 * Displays a detected AWS service with its status and issue count.
 */

'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DetectedIssue } from '../../lib/types';
import { SERVICE_ICONS } from '../../lib/utils/constants';
import { formatCurrency, serviceKeyToLabel } from '../../lib/utils/format';

interface ServiceCardProps {
  serviceName: string;
  issues: DetectedIssue[];
  index?: number;
}

/** Card displaying a single detected AWS service and its cost issues */
export function ServiceCard({ serviceName, issues, index = 0 }: ServiceCardProps) {
  const totalSaving = issues.reduce((sum, i) => sum + i.saving, 0);
  const maxSeverity = issues[0]?.severity ?? null;
  const icon = SERVICE_ICONS[serviceName.toLowerCase().replace(/\s+/g, '')] ?? '☁️';
  const hasIssues = issues.length > 0;

  const severityColor = {
    critical: 'border-red-500/40 bg-red-500/5',
    high: 'border-orange-500/40 bg-orange-500/5',
    medium: 'border-yellow-500/40 bg-yellow-500/5',
    low: 'border-blue-500/40 bg-blue-500/5',
  };

  const borderClass = hasIssues && maxSeverity
    ? severityColor[maxSeverity]
    : 'border-white/10 bg-white/5';

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${borderClass}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={serviceName}>
            {icon}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white">{serviceName}</h4>
            <p className="text-xs text-slate-500">
              {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {hasIssues ? (
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        )}
      </div>

      {hasIssues && totalSaving > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 border border-emerald-500/20">
          <span className="text-xs text-slate-400">Potential saving</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            {formatCurrency(totalSaving)}/mo
          </span>
        </div>
      )}

      {!hasIssues && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <CheckCircle2 size={12} />
          No issues detected
        </p>
      )}
    </div>
  );
}

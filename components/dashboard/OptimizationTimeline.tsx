/**
 * CloudSave AI — Optimization Timeline Component
 * Before/After timeline showing optimization roadmap in priority phases.
 */

'use client';

import React from 'react';
import { Clock, Zap, Calendar } from 'lucide-react';
import type { DetectedIssue } from '../../lib/types';
import { buildOptimizationRoadmap } from '../../lib/engine/cost-calculator';
import { formatCurrency } from '../../lib/utils/format';
import { SEVERITY_COLORS } from '../../lib/utils/constants';

interface OptimizationTimelineProps {
  issues: DetectedIssue[];
}

interface PhaseCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: DetectedIssue[];
  colorClass: string;
}

function PhaseCard({ title, description, icon, items, colorClass }: PhaseCardProps) {
  const totalSaving = items.reduce((sum, i) => sum + i.saving, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {totalSaving > 0 && (
          <span className="ml-auto text-sm font-mono font-bold text-emerald-400">
            {formatCurrency(totalSaving)}/mo
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-600 pl-10">None in this phase</p>
      ) : (
        <div className="space-y-1.5 pl-10">
          {items.map((item) => {
            const colors = SEVERITY_COLORS[item.severity];
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${colors.bg} ${colors.border}`}
              >
                <span className={`font-medium ${colors.text}`}>{item.issue}</span>
                <span className="font-mono text-emerald-400 font-semibold shrink-0 ml-2">
                  +{formatCurrency(item.saving)}/mo
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Three-phase optimization roadmap: Quick Wins → Medium Effort → Needs Planning */
export function OptimizationTimeline({ issues }: OptimizationTimelineProps) {
  const { quickWins, mediumEffort, needsPlanning } = buildOptimizationRoadmap(issues);

  return (
    <div className="space-y-6">
      <PhaseCard
        title="Phase 1 — Quick Wins"
        description="Config changes under 1 hour"
        icon={<Zap size={16} className="text-emerald-400" />}
        items={quickWins}
        colorClass="bg-emerald-500/15 border border-emerald-500/20"
      />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-slate-600">then</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <PhaseCard
        title="Phase 2 — Medium Effort"
        description="Changes taking 1–4 hours"
        icon={<Clock size={16} className="text-yellow-400" />}
        items={mediumEffort}
        colorClass="bg-yellow-500/15 border border-yellow-500/20"
      />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-slate-600">then</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <PhaseCard
        title="Phase 3 — Needs Planning"
        description="Architectural changes requiring planning"
        icon={<Calendar size={16} className="text-violet-400" />}
        items={needsPlanning}
        colorClass="bg-violet-500/15 border border-violet-500/20"
      />
    </div>
  );
}

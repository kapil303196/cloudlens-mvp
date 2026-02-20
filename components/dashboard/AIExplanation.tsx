/**
 * CloudSave AI — AI Explanation Component
 * Expandable accordion showing Claude-generated explanations for each issue.
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bot, Shield, AlertTriangle, Eye, Terminal, RotateCcw, Clock, Zap } from 'lucide-react';
import type { AIExplanation as AIExplanationType, DetectedIssue } from '../../lib/types';

interface AIExplanationProps {
  issues: DetectedIssue[];
  explanations: AIExplanationType[];
}

const RISK_CONFIG = {
  safe: { label: 'Safe to Apply', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Shield },
  moderate: { label: 'Review First', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Eye },
  'needs-review': { label: 'Needs Planning', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle },
};

interface ExplanationItemProps {
  issue: DetectedIssue;
  explanation: AIExplanationType | undefined;
}

function ExplanationItem({ issue, explanation }: ExplanationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const riskLevel = explanation?.riskLevel ?? 'moderate';
  const risk = RISK_CONFIG[riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.moderate;
  const RiskIcon = risk.icon;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Bot size={16} className="text-violet-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{issue.issue}</p>
            <p className="text-xs text-slate-500">{issue.service} · {issue.resourceName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${risk.color} ${risk.bg} ${risk.border}`}>
            <RiskIcon size={11} />
            {risk.label}
          </span>
          {isOpen ? (
            <ChevronUp size={16} className="text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/10 px-4 py-4 space-y-4">
          {explanation ? (
            <>
              {/* Effort + Risk badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border sm:hidden ${risk.color} ${risk.bg} ${risk.border}`}>
                  <RiskIcon size={11} />
                  {risk.label}
                </span>
                {explanation.estimatedEffort && (
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border text-sky-400 bg-sky-500/10 border-sky-500/20">
                    <Clock size={11} />
                    {explanation.estimatedEffort}
                  </span>
                )}
              </div>

              {/* Root Cause Analysis */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-2">
                  Root Cause Analysis
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{explanation.explanation}</p>
              </div>

              {/* Impact Analysis */}
              {explanation.impactAnalysis && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Zap size={11} />
                    Blast Radius
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{explanation.impactAnalysis}</p>
                </div>
              )}

              {/* When to Apply */}
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-400 mb-1">When to Apply</p>
                <p className="text-xs text-slate-400 leading-relaxed">{explanation.whenToApply}</p>
              </div>

              {/* Prerequisites */}
              {explanation.prerequisites.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Prerequisites
                  </p>
                  <ol className="space-y-1.5">
                    {explanation.prerequisites.map((prereq, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-violet-500 mt-0.5 shrink-0 font-mono text-[10px] w-4 text-right">{i + 1}.</span>
                        {prereq}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Implementation Steps */}
              {explanation.implementationSteps && explanation.implementationSteps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Terminal size={11} />
                    Implementation Steps
                  </p>
                  <ol className="space-y-1.5">
                    {explanation.implementationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-emerald-500 mt-0.5 shrink-0 font-mono text-[10px] w-4 text-right">{i + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Rollback Plan */}
              {explanation.rollbackPlan && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2.5">
                  <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                    <RotateCcw size={11} />
                    Rollback Plan
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{explanation.rollbackPlan}</p>
                </div>
              )}

              {/* AWS CLI Commands */}
              {explanation.awsCLICommands && explanation.awsCLICommands.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2 flex items-center gap-1.5">
                    <Terminal size={11} />
                    AWS CLI Commands
                  </p>
                  <div className="space-y-1.5">
                    {explanation.awsCLICommands.map((cmd, i) => (
                      <pre key={i} className="text-[11px] text-orange-300/80 bg-black/30 rounded-md px-3 py-1.5 overflow-x-auto font-mono border border-white/5">
                        {cmd}
                      </pre>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-slate-500">
                AI explanation not available — set ANTHROPIC_API_KEY to enable.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Accordion list of AI-generated explanations for each detected issue */
export function AIExplanationAccordion({ issues, explanations }: AIExplanationProps) {
  const explanationMap = new Map(explanations.map((e) => [e.issueId, e]));

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <ExplanationItem
          key={issue.id}
          issue={issue}
          explanation={explanationMap.get(issue.id)}
        />
      ))}
    </div>
  );
}

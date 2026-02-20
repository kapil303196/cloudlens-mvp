/**
 * CloudSave AI — Upload Progress Component
 * Shows analysis pipeline steps with animated progress bar.
 */

'use client';

import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { AnalysisProgress, AnalysisStep } from '../../lib/types';

interface UploadProgressProps {
  progress: AnalysisProgress;
}

const STEPS: Array<{ step: AnalysisStep; label: string }> = [
  { step: 'uploading', label: 'Upload' },
  { step: 'detecting', label: 'Detect' },
  { step: 'parsing', label: 'Parse' },
  { step: 'analyzing', label: 'Analyze' },
  { step: 'ai-explaining', label: 'AI Explain' },
  { step: 'saving', label: 'Save' },
  { step: 'complete', label: 'Done' },
];

const STEP_ORDER: AnalysisStep[] = [
  'uploading', 'detecting', 'parsing', 'analyzing', 'ai-explaining', 'saving', 'complete',
];

/** Analysis pipeline progress indicator with step-by-step visualization */
export function UploadProgress({ progress }: UploadProgressProps) {
  const currentIndex = STEP_ORDER.indexOf(progress.step);

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Step label */}
      <div className="flex items-center gap-2">
        {progress.step !== 'complete' && progress.step !== 'error' && (
          <Loader2 size={16} className="animate-spin text-violet-400 shrink-0" />
        )}
        {progress.step === 'complete' && (
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        )}
        <span className="text-sm text-slate-300 font-medium">{progress.stepLabel}</span>
        <span className="ml-auto text-xs text-slate-500 font-mono">{progress.percent}%</span>
      </div>

      {/* Steps pipeline */}
      <div className="flex items-center justify-between">
        {STEPS.map(({ step, label }, index) => {
          const stepIndex = STEP_ORDER.indexOf(step);
          const isDone = stepIndex < currentIndex;
          const isCurrent = step === progress.step;
          const isPending = stepIndex > currentIndex;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500/20'
                      : isCurrent
                      ? 'border-violet-500 bg-violet-500/20 ring-2 ring-violet-500/30'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 size={12} className="animate-spin text-violet-400" />
                  ) : (
                    <Circle size={12} className="text-slate-600" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-violet-300'
                      : 'text-slate-600'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                    stepIndex < currentIndex ? 'bg-emerald-500/40' : 'bg-white/10'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

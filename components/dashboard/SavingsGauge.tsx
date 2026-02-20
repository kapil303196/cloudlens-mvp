/**
 * CloudSave AI — Savings Gauge Component
 * Animated savings display with pulsing effect for large savings.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { TrendingDown, DollarSign } from 'lucide-react';
import type { CostSummary } from '../../lib/types';
import { AnimatedCounter } from '../shared/AnimatedCounter';
import { APP_CONFIG } from '../../lib/utils/constants';

interface SavingsGaugeProps {
  costSummary: CostSummary;
}

/** Large animated savings display with confetti trigger */
export function SavingsGauge({ costSummary }: SavingsGaugeProps) {
  const { totalMonthlySaving, totalAnnualSaving, savingPercent, totalCurrentCost } = costSummary;
  const confettiFired = useRef(false);
  const isLargeSaving = totalMonthlySaving >= APP_CONFIG.confettiThreshold;

  // Fire confetti for savings > $500/mo
  useEffect(() => {
    if (isLargeSaving && !confettiFired.current) {
      confettiFired.current = true;
      const timer = setTimeout(async () => {
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.4 },
            colors: ['#6C3CE1', '#10B981', '#F59E0B', '#8B5CF6'],
          });
        } catch {
          // canvas-confetti not available — skip
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLargeSaving]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 p-6">
      {/* Background glow */}
      {isLargeSaving && (
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 animate-pulse" />
      )}

      <div className="relative">
        {/* Icon */}
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
          <DollarSign size={22} className="text-emerald-400" />
        </div>

        {/* Monthly saving */}
        <div className={`mb-1 ${isLargeSaving ? 'animate-pulse' : ''}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Monthly Savings
          </p>
          <div className="text-4xl font-bold text-emerald-400 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-emerald-500">$</span>
            <AnimatedCounter
              value={totalMonthlySaving}
              className="text-4xl font-bold text-emerald-400"
            />
            <span className="text-base font-medium text-emerald-600">/mo</span>
          </div>
        </div>

        {/* Annual saving */}
        <p className="text-sm text-slate-400">
          <span className="text-emerald-400 font-semibold">
            ${totalAnnualSaving.toLocaleString()}
          </span>{' '}
          annual savings
        </p>

        {/* Saving percent */}
        <div className="mt-4 flex items-center gap-2">
          <TrendingDown size={16} className="text-emerald-400" />
          <div className="flex-1 bg-white/10 rounded-full h-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-1000"
              style={{ width: `${Math.min(savingPercent, 100)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            {savingPercent}%
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          of ${totalCurrentCost.toLocaleString()} current monthly spend
        </p>

        {isLargeSaving && (
          <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <p className="text-xs text-emerald-400 font-medium">
              🎉 Significant savings opportunity detected!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

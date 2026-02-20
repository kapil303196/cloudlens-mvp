/**
 * CloudSave AI — Cost Breakdown Chart
 * Recharts bar chart comparing current vs optimized costs per service.
 */

'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { CostSummary } from '../../lib/types';
import { formatCurrency } from '../../lib/utils/format';

interface CostBreakdownProps {
  costSummary: CostSummary;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono font-semibold text-white">
            {formatCurrency(entry.value)}/mo
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 border-t border-white/10 pt-2 text-xs">
          <span className="text-slate-400">Saving: </span>
          <span className="font-mono font-semibold text-emerald-400">
            {formatCurrency(payload[0]!.value - payload[1]!.value)}/mo
          </span>
        </div>
      )}
    </div>
  );
}

/** Recharts bar chart comparing current vs optimized AWS service costs */
export function CostBreakdown({ costSummary }: CostBreakdownProps) {
  const { breakdown } = costSummary;

  const chartData = breakdown.map((b) => ({
    service: b.service,
    'Current Cost': b.currentMonthlyCost,
    'Optimized Cost': b.optimizedMonthlyCost,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        No cost data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Cost Comparison by Service</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" />
            <span className="text-slate-400">Current</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-400">Optimized</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          barCategoryGap="25%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="service"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Current Cost" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={800} />
          <Bar dataKey="Optimized Cost" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={1000} animationBegin={200} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

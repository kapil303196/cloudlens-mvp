/**
 * CloudSave AI — Download PDF Button
 * Triggers PDF generation and download with loading state.
 */

'use client';

import React, { useState } from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import type { AnalysisReport } from '../../lib/types';

interface DownloadButtonProps {
  report: AnalysisReport;
  className?: string;
}

/** PDF download button with spinner → checkmark transition */
export function DownloadButton({ report, className = '' }: DownloadButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (state === 'loading') return;
    setState('loading');
    setError(null);

    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cloudsave-report-${report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      console.error('[DownloadButton]', err);
      setError('Failed to generate PDF. Try again.');
      setState('idle');
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={state === 'loading'}
        className={`
          flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200
          ${state === 'loading'
            ? 'cursor-not-allowed bg-violet-500/50 text-violet-300'
            : state === 'done'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.98] shadow-lg shadow-violet-500/20'
          }
        `}
      >
        {state === 'loading' ? (
          <Loader2 size={18} className="animate-spin" />
        ) : state === 'done' ? (
          <CheckCircle2 size={18} />
        ) : (
          <Download size={18} />
        )}
        {state === 'loading'
          ? 'Generating PDF...'
          : state === 'done'
          ? 'Downloaded!'
          : 'Download PDF Report'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

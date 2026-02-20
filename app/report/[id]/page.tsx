/**
 * CloudSave AI — Individual Report View
 * Fetches a saved report by ID from Sanity and displays it.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '../../../components/shared/Header';
import { Footer } from '../../../components/shared/Footer';
import type { AnalysisReport } from '../../../lib/types';

/** Report view page — fetches from Sanity by report ID */
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/sanity?reportId=${encodeURIComponent(reportId)}`);
        if (!res.ok) throw new Error('Report not found');
        const data = await res.json() as { data: Record<string, unknown> };

        // Reconstruct AnalysisReport from Sanity document
        const sanityDoc = data.data;
        if (!sanityDoc) throw new Error('Report not found');

        const reconstructed: AnalysisReport = {
          id: sanityDoc.reportId as string,
          createdAt: sanityDoc.createdAt as string,
          infra: JSON.parse(sanityDoc.infraSummary as string),
          detectedServices: sanityDoc.detectedServices as string[],
          issues: JSON.parse(sanityDoc.issuesDetected as string),
          costSummary: {
            totalCurrentCost: sanityDoc.totalCurrentCost as number,
            totalOptimizedCost: sanityDoc.totalOptimizedCost as number,
            totalMonthlySaving: sanityDoc.totalSavings as number,
            totalAnnualSaving: (sanityDoc.totalSavings as number) * 12,
            savingPercent: sanityDoc.savingPercent as number,
            breakdown: [],
          },
          aiExplanations: JSON.parse(sanityDoc.aiExplanations as string),
          inputFileName: sanityDoc.inputFileName as string,
          inputFileType: sanityDoc.inputFileType as AnalysisReport['inputFileType'],
        };

        setReport(reconstructed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    if (reportId) fetchReport();
  }, [reportId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-8 text-center">
            <p className="text-red-400 font-semibold mb-2">Report Not Found</p>
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        )}

        {report && !loading && (
          <div className="glass-card p-6">
            <h1 className="text-xl font-bold text-white mb-2">
              Report: {report.id}
            </h1>
            <p className="text-sm text-slate-500 mb-4">
              {report.inputFileName} · {report.createdAt}
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-2xl font-bold text-emerald-400">
                  ${report.costSummary.totalMonthlySaving.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Monthly Savings</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-2xl font-bold text-white">{report.issues.length}</p>
                <p className="text-xs text-slate-500 mt-1">Issues Found</p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-2xl font-bold text-white">{report.detectedServices.length}</p>
                <p className="text-xs text-slate-500 mt-1">Services</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

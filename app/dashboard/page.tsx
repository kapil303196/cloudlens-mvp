/**
 * CloudSave AI — Analysis Dashboard
 * Full analysis results: services, costs, issues, AI explanations, PDF download.
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  Bot,
  GitMerge,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../../components/shared/Header';
import { Footer } from '../../components/shared/Footer';
import { SavingsGauge } from '../../components/dashboard/SavingsGauge';
import { CostBreakdown } from '../../components/dashboard/CostBreakdown';
import { ServiceCard } from '../../components/dashboard/ServiceCard';
import { IssuesList } from '../../components/dashboard/IssuesList';
import { AIExplanationAccordion } from '../../components/dashboard/AIExplanation';
import { OptimizationTimeline } from '../../components/dashboard/OptimizationTimeline';
import { DownloadButton } from '../../components/report/DownloadButton';
import { useAnalysisStore } from '../../store/analysis-store';
import { formatDate } from '../../lib/utils/format';

/** Section header component */
function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/20">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
          {count}
        </span>
      )}
    </div>
  );
}

/** Analysis dashboard page */
export default function DashboardPage() {
  const router = useRouter();
  const { report, reset } = useAnalysisStore();

  useEffect(() => {
    if (!report) router.replace('/');
  }, [report, router]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-sm">Redirecting...</div>
      </div>
    );
  }

  const issuesByService = new Map<string, typeof report.issues>();
  for (const issue of report.issues) {
    const existing = issuesByService.get(issue.service) ?? [];
    existing.push(issue);
    issuesByService.set(issue.service, existing);
  }

  const criticalCount = report.issues.filter((i) => i.severity === 'critical').length;
  const highCount = report.issues.filter((i) => i.severity === 'high').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* Analysis Complete Banner */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Analysis Complete</h1>
            </div>
            <p className="text-sm text-slate-500">
              {report.inputFileName} · {formatDate(report.createdAt)}
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-400">
              <Layers size={12} />
              {report.detectedServices.length} services
            </span>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs text-red-400">
                <AlertTriangle size={12} />
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 text-xs text-orange-400">
                <AlertTriangle size={12} />
                {highCount} high
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-400">
              <FileCode size={12} />
              {report.inputFileType.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ===== TOP ROW: Savings + Chart ===== */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SavingsGauge costSummary={report.costSummary} />
          </div>
          <div className="glass-card p-5 lg:col-span-2">
            <CostBreakdown costSummary={report.costSummary} />
          </div>
        </div>

        {/* ===== DETECTED SERVICES ===== */}
        <div className="mb-6 glass-card p-5">
          <SectionHeader
            icon={<Layers size={16} className="text-violet-400" />}
            title="Detected Services"
            count={report.detectedServices.length}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {report.detectedServices.map((svc, i) => (
              <ServiceCard
                key={svc}
                serviceName={svc}
                issues={issuesByService.get(svc) ?? []}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* ===== ISSUES LIST ===== */}
        <div className="mb-6 glass-card p-5">
          <SectionHeader
            icon={<AlertTriangle size={16} className="text-amber-400" />}
            title="Detected Issues"
            count={report.issues.length}
          />
          <IssuesList issues={report.issues} />
        </div>

        {/* ===== AI EXPLANATIONS ===== */}
        {report.aiExplanations.length > 0 && (
          <div className="mb-6 glass-card p-5">
            <SectionHeader
              icon={<Bot size={16} className="text-violet-400" />}
              title="AI Explanations"
              count={report.aiExplanations.length}
            />
            <AIExplanationAccordion
              issues={report.issues}
              explanations={report.aiExplanations}
            />
          </div>
        )}

        {/* ===== OPTIMIZATION TIMELINE ===== */}
        <div className="mb-6 glass-card p-5">
          <SectionHeader
            icon={<GitMerge size={16} className="text-emerald-400" />}
            title="Optimization Roadmap"
          />
          <OptimizationTimeline issues={report.issues} />
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between glass-card p-5">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Export Your Report</h3>
            <p className="text-xs text-slate-500">
              Download a 7-page PDF with all findings and recommendations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                reset();
                router.push('/');
              }}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <RefreshCw size={16} />
              New Analysis
            </button>
            <DownloadButton report={report} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

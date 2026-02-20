/**
 * CloudSave AI — Landing / Upload Page
 * Main entry point. Users upload infrastructure files here.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Shield, FileCode, BarChart3, ArrowRight } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Footer } from '../components/shared/Footer';
import { Logo } from '../components/shared/Logo';
import { DropZone } from '../components/upload/DropZone';
import { FilePreview } from '../components/upload/FilePreview';
import { UploadProgress } from '../components/upload/UploadProgress';
import { useAnalysisStore, PROGRESS_STEPS } from '../store/analysis-store';
import type { UploadedFile } from '../lib/types';
import { detectFileType } from '../lib/parsers';
import { formatFileSize } from '../lib/utils/format';

const FEATURES = [
  { icon: FileCode, title: 'Multi-Format Support', desc: 'CDK, Terraform, CloudFormation, ECS, ZIP, Images' },
  { icon: Zap, title: '15 Anti-Pattern Rules', desc: 'Lambda, RDS, ECS, API Gateway, S3, DynamoDB & more' },
  { icon: BarChart3, title: 'AI-Powered Analysis', desc: 'Claude explains each issue with risk levels & prerequisites' },
  { icon: Shield, title: 'No AWS Access Needed', desc: 'Pure static analysis — no credentials required' },
];

export default function HomePage() {
  const router = useRouter();
  const { setReport, setProgress, setIsAnalyzing, setError, setUploadedFiles, reset } = useAnalysisStore();
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(PROGRESS_STEPS.idle);

  const handleFilesSelected = useCallback((files: File[]) => {
    const uploadedFiles: UploadedFile[] = files.map((f) => ({
      name: f.name,
      type: detectFileType(f.name, ''),
      content: '',
      size: f.size,
    }));
    setSelectedFiles(uploadedFiles);
    setLocalError(null);
  }, []);

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0 || isRunning) return;

    setIsRunning(true);
    setLocalError(null);
    reset();

    // Use the first file (multi-file via ZIP)
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    const rawFile = fileInput?.files?.[0];

    if (!rawFile) {
      setLocalError('Please re-select your file and try again.');
      setIsRunning(false);
      return;
    }

    try {
      // Update progress steps
      setCurrentProgress(PROGRESS_STEPS.uploading);

      const formData = new FormData();
      formData.append('file', rawFile);

      setCurrentProgress(PROGRESS_STEPS.detecting);
      await delay(300);
      setCurrentProgress(PROGRESS_STEPS.parsing);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      setCurrentProgress(PROGRESS_STEPS.analyzing);

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? 'Analysis failed');
      }

      setCurrentProgress(PROGRESS_STEPS['ai-explaining']);
      const data = await res.json() as { report: import('../lib/types').AnalysisReport };

      setCurrentProgress(PROGRESS_STEPS.saving);
      await delay(200);

      setReport(data.report);
      setCurrentProgress(PROGRESS_STEPS.complete);

      await delay(500);
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setLocalError(msg);
      setCurrentProgress(PROGRESS_STEPS.error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative overflow-hidden py-20 px-4 sm:px-6">
          {/* Background gradients */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" showText={true} />
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find{' '}
              <span className="text-gradient-green">AWS Cost Savings</span>
              <br />
              in Minutes
            </h1>
            <p className="mb-12 text-lg text-slate-400 max-w-2xl mx-auto">
              Upload your infrastructure files — CDK, Terraform, CloudFormation, or ECS tasks.
              Get instant AI-powered analysis with specific savings recommendations.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {['15 Detection Rules', 'Claude AI Explanations', '7-Page PDF Reports', 'No AWS Credentials'].map((f) => (
                <span key={f} className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm text-slate-400">
                  {f}
                </span>
              ))}
            </div>

            {/* Upload area */}
            <div className="mx-auto max-w-2xl">
              <DropZone onFilesSelected={handleFilesSelected} disabled={isRunning} />

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, i) => (
                    <FilePreview
                      key={`${file.name}-${i}`}
                      file={file}
                      onRemove={() => handleRemoveFile(i)}
                    />
                  ))}
                </div>
              )}

              {/* Progress indicator */}
              {isRunning && (
                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                  <UploadProgress progress={currentProgress} />
                </div>
              )}

              {/* Error */}
              {localError && (
                <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {localError}
                </div>
              )}

              {/* Analyze button */}
              {selectedFiles.length > 0 && !isRunning && (
                <button
                  onClick={handleAnalyze}
                  className="mt-6 w-full flex items-center justify-center gap-2.5 rounded-xl bg-violet-600 px-6 py-4 text-base font-semibold text-white hover:bg-violet-500 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-violet-500/20"
                >
                  <Zap size={20} />
                  Analyze Infrastructure
                  <ArrowRight size={18} className="ml-1" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-16 px-4 sm:px-6 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-white mb-10">
              How CloudSave AI Works
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card p-5 hover:border-violet-500/30 transition-colors">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                    <Icon size={18} className="text-violet-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

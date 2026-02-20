/**
 * CloudSave AI — Zustand Analysis Store
 * Global state for analysis pipeline, progress tracking, and report data.
 * @module store/analysis-store
 */

import { create } from 'zustand';
import type {
  AnalysisProgress,
  AnalysisReport,
  AnalysisStep,
  UploadedFile,
} from '../lib/types';

/** Analysis store state shape */
interface AnalysisState {
  // Upload state
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  clearUploadedFiles: () => void;

  // Progress state
  progress: AnalysisProgress;
  setProgress: (progress: AnalysisProgress) => void;
  resetProgress: () => void;

  // Report state
  report: AnalysisReport | null;
  setReport: (report: AnalysisReport) => void;
  clearReport: () => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // UI state
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;

  // Full reset
  reset: () => void;
}

const INITIAL_PROGRESS: AnalysisProgress = {
  step: 'idle',
  stepLabel: 'Ready',
  percent: 0,
};

/** Zustand store for the CloudSave AI analysis pipeline */
export const useAnalysisStore = create<AnalysisState>((set) => ({
  // Upload state
  uploadedFiles: [],
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  // Progress state
  progress: INITIAL_PROGRESS,
  setProgress: (progress) => set({ progress }),
  resetProgress: () => set({ progress: INITIAL_PROGRESS }),

  // Report state
  report: null,
  setReport: (report) => set({ report }),
  clearReport: () => set({ report: null }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // UI state
  isAnalyzing: false,
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),

  // Full reset
  reset: () =>
    set({
      uploadedFiles: [],
      progress: INITIAL_PROGRESS,
      report: null,
      error: null,
      isAnalyzing: false,
    }),
}));

/** Progress step definitions with labels and percentages */
export const PROGRESS_STEPS: Record<AnalysisStep, AnalysisProgress> = {
  idle: { step: 'idle', stepLabel: 'Ready', percent: 0 },
  uploading: { step: 'uploading', stepLabel: 'Uploading file...', percent: 10 },
  detecting: { step: 'detecting', stepLabel: 'Detecting file type...', percent: 20 },
  parsing: { step: 'parsing', stepLabel: 'Parsing infrastructure...', percent: 40 },
  analyzing: { step: 'analyzing', stepLabel: 'Detecting anti-patterns...', percent: 60 },
  'ai-explaining': { step: 'ai-explaining', stepLabel: 'Getting AI explanations...', percent: 80 },
  saving: { step: 'saving', stepLabel: 'Saving report...', percent: 90 },
  complete: { step: 'complete', stepLabel: 'Analysis complete!', percent: 100 },
  error: { step: 'error', stepLabel: 'Analysis failed', percent: 0 },
};
